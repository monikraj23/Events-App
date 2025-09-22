#!/usr/bin/env python3
"""
worker/reddit_worker.py

Polls event_submissions for newly created events, searches reddit for posts/comments
matching the event (by tags + title keywords + optional subreddits) and inserts into
public.reddit_comments.

Requirements:
  - set env vars SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
  - set REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT
"""

import os
import time
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any

import praw
from supabase import create_client, Client
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from psycopg2.errors import UniqueViolation

# Basic logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [worker] %(levelname)s: %(message)s")
logger = logging.getLogger("reddit_worker")

# env
SB_URL = os.environ.get("SUPABASE_URL")
SB_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
RID = os.environ.get("REDDIT_CLIENT_ID")
RSEC = os.environ.get("REDDIT_CLIENT_SECRET")
UA = os.environ.get("REDDIT_USER_AGENT", "CampusEventsApp/0.1")
POLL_SECONDS = int(os.environ.get("REDDIT_POLL_SECONDS", "300"))

if not SB_URL or not SB_KEY:
    logger.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in env")
    raise SystemExit(1)
if not RID or not RSEC:
    logger.error("REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET must be set in env")
    raise SystemExit(1)

# supabase client
sb: Client = create_client(SB_URL, SB_KEY)

# reddit client
reddit = praw.Reddit(client_id=RID, client_secret=RSEC, user_agent=UA)

# sentiment
analyzer = SentimentIntensityAnalyzer()


def senti(text: str) -> float:
    if not text:
        return 0.0
    return analyzer.polarity_scores(text).get("compound", 0.0)


# Default category -> subreddits mapping. Add more as you want.
CATEGORY_SUBREDDITS = {
    "crypto": ["CryptoCurrency", "Bitcoin", "CryptoMarkets"],
    "tech": ["technology", "programming"],
    "music": ["Music", "listentothis"],
    "sports": ["sports", "soccer", "nba"],
    "food": ["food", "cooking"],
    "study": ["college", "AskAcademia"],
    "futsal": ["soccer"],
    # add more mappings...
}


def normalize_event_row(ev: Dict[str, Any]) -> Dict[str, Any]:
    """Return event dict with expected keys."""
    return {
        "id": ev.get("id"),
        "title": ev.get("title") or "",
        "description": ev.get("description") or "",
        "tags": ev.get("tags") or [],
        "subreddits": ev.get("subreddits") or [],
        "created_at": ev.get("created_at"),
        "start_time": ev.get("start_time"),
    }


def build_subreddit_list(ev: Dict[str, Any]) -> List[str]:
    # Prefer explicit subreddits
    if ev.get("subreddits"):
        return ev["subreddits"]
    # Otherwise, map tags/categories -> subreddits
    subs = []
    for tag in (ev.get("tags") or []):
        key = str(tag).strip().lower()
        mapped = CATEGORY_SUBREDDITS.get(key)
        if mapped:
            subs.extend(mapped)
    # fallback to some general subreddits
    if not subs:
        subs = ["technology", "news"]
    # dedupe and return
    return list(dict.fromkeys([s for s in subs if s]))


def search_and_store_for_event(ev: Dict[str, Any]):
    event_id = ev["id"]
    title_words = (ev["title"] or "").lower().split()
    keywords = list(dict.fromkeys([*(ev.get("tags") or []), *title_words]))[:8] or title_words[:5]
    if not keywords:
        logger.info("no keywords for event %s - skipping", event_id)
        return
    query = " OR ".join([k for k in keywords if k])
    subreddits = build_subreddit_list(ev)
    logger.info("event=%s query=%r subs=%s", event_id, query, subreddits)

    for sub_name in subreddits:
        try:
            subreddit = reddit.subreddit(sub_name)
            # use .search to find relevant new posts
            for post in subreddit.search(query, sort="new", limit=20):
                try:
                    post_id = getattr(post, "id", None)
                    created = datetime.fromtimestamp(post.created_utc, tz=timezone.utc)
                    row = {
                        "event_id": event_id,
                        "reddit_id": post_id,
                        "subreddit": sub_name,
                        "type": "post",
                        "title": post.title,
                        "body": post.selftext or None,
                        "author": str(post.author) if post.author else None,
                        "sentiment": float(senti((post.title or "") + " " + (post.selftext or ""))),
                        "created_utc": created.isoformat(),
                        "payload": {"permalink": getattr(post, "permalink", None), "url": getattr(post, "url", None)},
                    }
                    insert_comment_row(row)
                except Exception as e:
                    logger.exception("error inserting post row for %s/%s: %s", sub_name, post.id if hasattr(post, "id") else "?", e)

                # now fetch top comments (limit to 50)
                try:
                    post.comments.replace_more(limit=0)
                    for c in post.comments.list()[:50]:
                        ts = getattr(c, "created_utc", post.created_utc)
                        crow = {
                            "event_id": event_id,
                            "reddit_id": getattr(c, "id", None),
                            "subreddit": sub_name,
                            "type": "comment",
                            "title": None,
                            "body": getattr(c, "body", "") or None,
                            "author": str(c.author) if getattr(c, "author", None) else None,
                            "sentiment": float(senti(getattr(c, "body", "") or "")),
                            "created_utc": datetime.fromtimestamp(ts, tz=timezone.utc).isoformat(),
                            "payload": {"link_id": getattr(c, "link_id", None)},
                        }
                        insert_comment_row(crow)
                except Exception as e:
                    logger.exception("error fetching/inserting comments for post %s: %s", getattr(post, "id", None), e)

        except Exception as e:
            logger.exception("error searching subreddit %s: %s", sub_name, e)


def insert_comment_row(row: Dict[str, Any]):
    """Insert into supabase table reddit_comments. Unique constraint on reddit_id will avoid duplicates.
       We catch DB errors and continue."""
    try:
        res = sb.table("reddit_comments").insert(row).execute()
        if res.error:
            # If duplicate, ignore. Other errors -> log
            # Supabase returns something in res.error
            msg = getattr(res.error, "message", str(res.error))
            logger.debug("insert response error for reddit_id=%s: %s", row.get("reddit_id"), msg)
            # duplicate skip
            if "duplicate" in msg.lower() or "unique" in msg.lower() or "already exists" in msg.lower():
                logger.debug("duplicate reddit_id %s -> skipping", row.get("reddit_id"))
            else:
                logger.warning("insert error for reddit_id=%s: %s", row.get("reddit_id"), msg)
        else:
            logger.info("inserted reddit row reddit_id=%s type=%s", row.get("reddit_id"), row.get("type"))
    except Exception as e:
        logger.exception("unexpected insert error for reddit_id=%s: %s", row.get("reddit_id"), e)


def fetch_new_events(since_iso: str) -> List[Dict[str, Any]]:
    """Get event_submissions rows created since 'since_iso' (ISO timestamp string)."""
    try:
        q = sb.from_("event_submissions").select("*").gte("created_at", since_iso).order("created_at", {"ascending": True}).limit(50)
        resp = q.execute()
        if resp.error:
            logger.error("supabase fetch_new_events error: %s", resp.error)
            return []
        return resp.data or []
    except Exception as e:
        logger.exception("fetch_new_events exception: %s", e)
        return []


def main_loop():
    # keep track of last check time in UTC ISO format
    last_check = datetime.now(timezone.utc) - timedelta(seconds=POLL_SECONDS + 5)
    last_iso = last_check.isoformat()

    logger.info("worker started, poll interval=%s seconds", POLL_SECONDS)
    while True:
        try:
            now = datetime.now(timezone.utc)
            # fetch events created since last_iso
            events = fetch_new_events(last_iso)
            if events:
                logger.info("found %d new events since %s", len(events), last_iso)
                for ev_raw in events:
                    ev = normalize_event_row(ev_raw)
                    # guard: ensure event has id
                    if not ev.get("id"):
                        logger.warning("skipping event without id: %s", ev_raw)
                        continue
                    # process event
                    try:
                        search_and_store_for_event(ev)
                    except Exception as e:
                        logger.exception("error processing event %s: %s", ev.get("id"), e)
            else:
                logger.debug("no new events since %s", last_iso)

            # update last_iso to now (so next poll doesn't reprocess)
            last_iso = now.isoformat()
        except Exception as e:
            logger.exception("cycle error: %s", e)
        finally:
            time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main_loop()
