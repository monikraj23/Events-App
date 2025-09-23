#!/usr/bin/env python3
"""
worker/reddit_worker.py (updated)

Polls event_submissions for newly created events, searches reddit for posts/comments
matching the event (by tags + title keywords + optional subreddits) and inserts into
public.reddit_comments.

Improvements in this version:
 - strong env validation and helpful logs
 - will skip processing an event if reddit_comments already exist for that event (avoids double-work)
 - deduped subreddit list (explicit subreddits preferred, then mapped from tags)
 - safer handling of PRAW exceptions and DB insert errors
 - small jitter between polls to avoid thundering behavior
 - configurable polling interval via REDDIT_POLL_SECONDS env var
 - clear logging so you can see what is happening in Railway/Render logs

Requirements (same as before):
  - set env vars SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
  - set REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT
  - install deps: praw, supabase-py, vaderSentiment, psycopg2-binary (or use requirements.txt)
"""

import os
import time
import logging
import random
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

import praw
from supabase import create_client, Client
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# Basic logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [reddit_worker] %(levelname)s: %(message)s"
)
logger = logging.getLogger("reddit_worker")

# Environment config
SB_URL = os.getenv("SUPABASE_URL")
SB_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
RID = os.getenv("REDDIT_CLIENT_ID")
RSEC = os.getenv("REDDIT_CLIENT_SECRET")
UA = os.getenv("REDDIT_USER_AGENT", "CampusEventsApp/0.1")
POLL_SECONDS = int(os.getenv("REDDIT_POLL_SECONDS", "300"))  # default 5 minutes
MAX_POSTS_PER_SUB = int(os.getenv("REDDIT_MAX_POSTS", "20"))
MAX_COMMENTS_PER_POST = int(os.getenv("REDDIT_MAX_COMMENTS", "50"))

if not SB_URL or not SB_KEY:
    logger.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment")
    raise SystemExit(1)
if not RID or not RSEC:
    logger.error("REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET must be set in environment")
    raise SystemExit(1)

# create supabase client
sb: Client = create_client(SB_URL, SB_KEY)

# create reddit client
reddit = praw.Reddit(client_id=RID, client_secret=RSEC, user_agent=UA)

# sentiment analyzer
analyzer = SentimentIntensityAnalyzer()


def senti(text: Optional[str]) -> float:
    if not text:
        return 0.0
    return float(analyzer.polarity_scores(text).get("compound", 0.0))


# Mapping from simple category tags to suggested subreddits
CATEGORY_SUBREDDITS = {
    "crypto": ["CryptoCurrency", "Bitcoin", "CryptoMarkets"],
    "crypto_currency": ["CryptoCurrency", "Bitcoin", "CryptoMarkets"],
    "blockchain": ["CryptoCurrency", "Bitcoin"],
    "tech": ["technology", "programming"],
    "technology": ["technology", "programming"],
    "music": ["Music", "listentothis"],
    "sports": ["sports", "soccer", "nba"],
    "food": ["food", "cooking"],
    "study": ["college", "AskAcademia"],
    "futsal": ["soccer"],
    "hackathon": ["programming", "technology"],
    "workshop": ["learnprogramming", "programming"],
    "cultural": ["culture", "AskReddit"],
    # add more mappings as you like...
}


def normalize_event_row(ev: Dict[str, Any]) -> Dict[str, Any]:
    """Return a normalized event dict with safe keys."""
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
    """Build a deduped list of subreddits for an event.

    Priority:
      1) explicit ev.subreddits if provided
      2) map tags/categories -> known subreddits
      3) fallback to a small general list
    """
    # 1) explicit subreddits provided by the event
    explicit = [s.strip() for s in (ev.get("subreddits") or []) if s and str(s).strip()]
    if explicit:
        # dedupe preserving order
        return list(dict.fromkeys(explicit))

    # 2) map tags -> subreddits
    subs: List[str] = []
    for tag in (ev.get("tags") or []):
        key = str(tag).strip().lower().replace(" ", "_")
        mapped = CATEGORY_SUBREDDITS.get(key)
        if mapped:
            subs.extend(mapped)

    # 3) fallback general subreddits
    if not subs:
        subs = ["technology", "news"]

    # dedupe and return
    return list(dict.fromkeys([s for s in subs if s]))


def event_already_processed(event_id: str) -> bool:
    """Return True if reddit_comments already contain rows for this event_id."""
    try:
        res = sb.table("reddit_comments").select("id").eq("event_id", event_id).limit(1).execute()
        if res.error:
            logger.warning("check processed query error for event %s: %s", event_id, res.error)
            return False
        return bool(res.data)
    except Exception as e:
        logger.exception("error checking if event already processed: %s", e)
        return False


def insert_comment_row(row: Dict[str, Any]) -> None:
    """Insert a single reddit comment/post row into reddit_comments with duplicate handling."""
    try:
        res = sb.table("reddit_comments").insert(row).execute()
        if res.error:
            # common case: duplicate reddit_id -> skip
            msg = getattr(res.error, "message", str(res.error)).lower()
            if "unique" in msg or "duplicate" in msg or "already exists" in msg:
                logger.debug("duplicate reddit_id %s -> skipping", row.get("reddit_id"))
            else:
                logger.warning("db insert error reddit_id=%s: %s", row.get("reddit_id"), res.error)
        else:
            logger.info("inserted reddit row reddit_id=%s type=%s", row.get("reddit_id"), row.get("type"))
    except Exception as e:
        logger.exception("unexpected insert error reddit_id=%s: %s", row.get("reddit_id"), e)


def search_and_store_for_event(ev: Dict[str, Any]) -> None:
    """Search reddit for posts/comments for the given normalized event and store results."""
    event_id = ev["id"]
    if not event_id:
        logger.warning("empty event id, skipping")
        return

    # If we already have reddit rows for this event, skip (prevents duplicate processing)
    if event_already_processed(event_id):
        logger.info("event %s already has reddit_comments -> skipping", event_id)
        return

    title_words = (ev.get("title") or "").lower().split()
    # keywords prefer tags first then title words; cap to avoid huge queries
    raw_keywords = [k for k in (ev.get("tags") or []) if k] + title_words
    keywords = list(dict.fromkeys(raw_keywords))[:8] if raw_keywords else title_words[:5]

    if not keywords:
        logger.info("no keywords for event %s - skipping", event_id)
        return

    query = " OR ".join([str(k) for k in keywords if k])
    subreddits = build_subreddit_list(ev)
    logger.info("processing event=%s query=%r subs=%s", event_id, query, subreddits)

    for sub_name in subreddits:
        try:
            subreddit = reddit.subreddit(sub_name)
        except Exception as e:
            logger.warning("cannot access subreddit %s: %s", sub_name, e)
            continue

        try:
            # Search posts (newest first) matching the query
            for post in subreddit.search(query, sort="new", limit=MAX_POSTS_PER_SUB):
                try:
                    post_id = getattr(post, "id", None)
                    created_ts = getattr(post, "created_utc", None)
                    created = datetime.fromtimestamp(created_ts, tz=timezone.utc) if created_ts else datetime.now(timezone.utc)
                    post_row = {
                        "event_id": event_id,
                        "reddit_id": post_id,
                        "subreddit": sub_name,
                        "type": "post",
                        "title": getattr(post, "title", None),
                        "body": getattr(post, "selftext", None) or None,
                        "author": str(getattr(post, "author", None)) if getattr(post, "author", None) else None,
                        "sentiment": float(senti((getattr(post, "title", "") or "") + " " + (getattr(post, "selftext", "") or ""))),
                        "created_utc": created.isoformat(),
                        "payload": {
                            "permalink": getattr(post, "permalink", None),
                            "url": getattr(post, "url", None),
                            "score": getattr(post, "score", None),
                        },
                    }
                    insert_comment_row(post_row)
                except Exception as e:
                    logger.exception("error handling post in %s: %s", sub_name, e)

                # Fetch top-level comments for the post (limited)
                try:
                    post.comments.replace_more(limit=0)
                    comments = post.comments.list()[:MAX_COMMENTS_PER_POST]
                    for c in comments:
                        try:
                            c_id = getattr(c, "id", None)
                            c_ts = getattr(c, "created_utc", None) or created_ts
                            crow = {
                                "event_id": event_id,
                                "reddit_id": c_id,
                                "subreddit": sub_name,
                                "type": "comment",
                                "title": None,
                                "body": getattr(c, "body", None) or None,
                                "author": str(getattr(c, "author", None)) if getattr(c, "author", None) else None,
                                "sentiment": float(senti(getattr(c, "body", "") or "")),
                                "created_utc": datetime.fromtimestamp(c_ts, tz=timezone.utc).isoformat() if c_ts else datetime.now(timezone.utc).isoformat(),
                                "payload": {"link_id": getattr(c, "link_id", None), "parent_id": getattr(c, "parent_id", None)},
                            }
                            insert_comment_row(crow)
                        except Exception as e:
                            logger.exception("error inserting comment for post %s: %s", getattr(post, "id", None), e)
                except Exception as e:
                    # Non-fatal if comments can't be fetched for a post
                    logger.debug("could not fetch comments for post %s: %s", getattr(post, "id", None), e)

        except Exception as e:
            logger.exception("error searching subreddit %s for event %s: %s", sub_name, event_id, e)


def fetch_new_events(since_iso: str) -> List[Dict[str, Any]]:
    """Fetch event_submissions rows created since `since_iso` (inclusive).
       We return raw rows as provided by Supabase client.
    """
    try:
        q = sb.from_("event_submissions").select("*").gte("created_at", since_iso).order("created_at", {"ascending": True}).limit(200)
        resp = q.execute()
        if resp.error:
            logger.error("fetch_new_events supabase error: %s", resp.error)
            return []
        return resp.data or []
    except Exception as e:
        logger.exception("fetch_new_events exception: %s", e)
        return []


def main_loop():
    # Start a bit in the past so immediately picks recently created rows
    last_check = datetime.now(timezone.utc) - timedelta(seconds=POLL_SECONDS + 5)
    last_iso = last_check.isoformat()

    logger.info("reddit worker started, poll interval=%s seconds", POLL_SECONDS)

    while True:
        try:
            now = datetime.now(timezone.utc)
            logger.debug("checking for new events since %s", last_iso)
            events = fetch_new_events(last_iso)
            if events:
                logger.info("found %d new event(s) since %s", len(events), last_iso)
                for ev_raw in events:
                    ev = normalize_event_row(ev_raw)
                    if not ev.get("id"):
                        logger.warning("skipping event without id: %s", ev_raw)
                        continue
                    try:
                        search_and_store_for_event(ev)
                    except Exception as e:
                        logger.exception("error processing event %s: %s", ev.get("id"), e)
            else:
                logger.debug("no new events found since %s", last_iso)

            # advance last_iso to now so we don't re-scan the same window
            last_iso = now.isoformat()

        except Exception as e:
            logger.exception("main loop error: %s", e)
        finally:
            # add small jitter to avoid hitting exact schedule repeatedly
            jitter = random.uniform(0, min(5, POLL_SECONDS * 0.1))
            sleep_for = max(1, POLL_SECONDS + jitter)
            logger.debug("sleeping %s seconds (jitter=%s)", sleep_for, jitter)
            time.sleep(sleep_for)


if __name__ == "__main__":
    main_loop()
