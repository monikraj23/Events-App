#!/usr/bin/env python3
"""
reddit_worker.py

- Polls Supabase table `event_submissions` for events.
- Builds a search query from event tags/title and searches configured subreddits.
- Inserts posts/comments into public.reddit_comments.

Make sure these environment variables are set:
 - SUPABASE_URL
 - SUPABASE_SERVICE_ROLE_KEY   (use service role key, not anon key)
 - REDDIT_CLIENT_ID
 - REDDIT_CLIENT_SECRET
 - REDDIT_USER_AGENT (optional)
 - REDDIT_POLL_SECONDS (optional, default 300)
"""

import os
import time
import logging
from datetime import datetime, timezone

import praw
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# supabase python client
# pip package: supabase
from supabase import create_client

# ---- logging ----
logging.basicConfig(level=logging.INFO, format="[worker] %(message)s")
log = logging.getLogger("reddit_worker")

# ---- read environment ----
SB_URL = os.getenv("SUPABASE_URL")
SB_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
RID = os.getenv("REDDIT_CLIENT_ID")
RSEC = os.getenv("REDDIT_CLIENT_SECRET")
UA = os.getenv("REDDIT_USER_AGENT", "campus-events-app/0.1")
POLL = int(os.getenv("REDDIT_POLL_SECONDS", "300"))

# sanity checks
missing = []
if not SB_URL:
    missing.append("SUPABASE_URL")
if not SB_KEY:
    missing.append("SUPABASE_SERVICE_ROLE_KEY")
if not RID:
    missing.append("REDDIT_CLIENT_ID")
if not RSEC:
    missing.append("REDDIT_CLIENT_SECRET")

if missing:
    log.error("Missing required env vars: %s. Exiting.", ", ".join(missing))
    raise SystemExit(1)

# create supabase client
sb = create_client(SB_URL, SB_KEY)

# initialize sentiment analyzer
analyzer = SentimentIntensityAnalyzer()


def senti(text: str) -> float:
    if not text:
        return 0.0
    return analyzer.polarity_scores(text).get("compound", 0.0)


def reddit_client():
    return praw.Reddit(client_id=RID, client_secret=RSEC, user_agent=UA)


def fetch_events():
    """Return list of event rows from event_submissions"""
    try:
        res = sb.table("event_submissions").select("*").eq("published", True).execute()
        # if using RLS and needs specific role, service key should bypass it
        if res.error:
            log.error("Failed to fetch events: %s", getattr(res, "error", "unknown"))
            return []
        return res.data or []
    except Exception as e:
        log.exception("Exception while fetching events: %s", e)
        return []


def insert_row(row: dict):
    """Insert a reddit comment/post row into reddit_comments. If reddit_id already exists, skip."""
    try:
        # try insert (unique constraint on reddit_id will throw). We catch and ignore duplicates.
        res = sb.table("reddit_comments").insert(row).execute()
        if getattr(res, "error", None):
            # Unique conflict or other error
            msg = res.error.get("message") if isinstance(res.error, dict) else str(res.error)
            # Detect duplicate reddit_id message (Postgres unique violation)
            if "duplicate key" in str(msg).lower() or "unique" in str(msg).lower():
                log.debug("Duplicate reddit_id, skipping: %s", row.get("reddit_id"))
            else:
                log.warning("Insert returned error (reddit_id=%s): %s", row.get("reddit_id"), msg)
    except Exception as e:
        # Most likely duplicate unique key or transient; we log and continue
        log.debug("Insert exception for reddit_id=%s: %s", row.get("reddit_id"), e)


def run_cycle(r: praw.Reddit):
    events = fetch_events()
    if not events:
        log.info("No events to process this cycle.")
        return

    for ev in events:
        # build keywords from tags + title
        title = (ev.get("title") or "").lower()
        tags = ev.get("tags") or []
        title_words = [w.strip() for w in title.split() if w.strip()]
        keywords = list(dict.fromkeys([*(tags or []), *title_words]))[:8] or title_words[:5]
        if not keywords:
            log.debug("Skipping event %s (no keywords)", ev.get("id"))
            continue

        # simple query: OR joined keywords
        q = " OR ".join([k for k in keywords if k])
        subs = ev.get("subreddits") or ["technology", "programming", "MachineLearning", "blockchain"]

        log.info("Event %s: searching for keywords (%s) in subreddits %s", ev.get("id"), q, subs)

        for s in subs:
            try:
                sub = r.subreddit(s)
            except Exception as e:
                log.warning("Failed to access subreddit %s: %s", s, e)
                continue

            try:
                for p in sub.search(q, sort="new", limit=20):
                    created = datetime.fromtimestamp(p.created_utc, tz=timezone.utc)
                    post_row = {
                        "event_id": ev["id"],
                        "reddit_id": p.id,
                        "subreddit": s,
                        "type": "post",
                        "title": p.title,
                        "body": p.selftext or None,
                        "author": str(p.author) if p.author else None,
                        "sentiment": float(senti((p.title or "") + " " + (p.selftext or ""))),
                        "created_utc": created.isoformat(),
                        "payload": {"permalink": getattr(p, "permalink", None), "url": getattr(p, "url", None)},
                    }
                    insert_row(post_row)

                    # fetch comments for the post (limit)
                    try:
                        p.comments.replace_more(limit=0)
                        for c in p.comments.list()[:50]:
                            ts = getattr(c, "created_utc", p.created_utc)
                            comment_row = {
                                "event_id": ev["id"],
                                "reddit_id": c.id,
                                "subreddit": s,
                                "type": "comment",
                                "title": None,
                                "body": getattr(c, "body", ""),
                                "author": str(c.author) if c.author else None,
                                "sentiment": float(senti(getattr(c, "body", ""))),
                                "created_utc": datetime.fromtimestamp(ts, tz=timezone.utc).isoformat(),
                                "payload": {"permalink": getattr(c, "permalink", None), "link_id": getattr(c, "link_id", None)},
                            }
                            insert_row(comment_row)
                    except Exception as ce:
                        log.debug("Failed fetching comments for post %s: %s", p.id, ce)

            except Exception as e:
                log.warning("Search error on subreddit %s for event %s: %s", s, ev.get("id"), e)


def main():
    r = reddit_client()
    log.info("Worker started. Poll interval: %s seconds", POLL)
    while True:
        try:
            run_cycle(r)
        except Exception as e:
            # Log full exception (Railway logs will capture this)
            log.exception("cycle error: %s", e)
        time.sleep(POLL)


if __name__ == "__main__":
    main()
