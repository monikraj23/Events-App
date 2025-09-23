#!/usr/bin/env python3
"""
worker/reddit_worker.py (job-queue version)

This worker polls the reddit_jobs table for unprocessed jobs, claims them,
fetches the associated event_submissions row, searches Reddit, inserts results
into public.reddit_comments and then marks the job as processed (or logs the error
and increments attempts).

Env variables required:
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY  (service_role)
  - REDDIT_CLIENT_ID
  - REDDIT_CLIENT_SECRET
  - REDDIT_USER_AGENT (optional)
  - REDDIT_POLL_SECONDS (optional, default 300)
  - REDDIT_MAX_POSTS (optional)
  - REDDIT_MAX_COMMENTS (optional)
"""

import os
import time
import logging
import random
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

import praw
from supabase import create_client, Client
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [reddit_worker] %(levelname)s: %(message)s")
logger = logging.getLogger("reddit_worker")

# --- Env ---
SB_URL = os.getenv("SUPABASE_URL")
SB_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
RID = os.getenv("REDDIT_CLIENT_ID")
RSEC = os.getenv("REDDIT_CLIENT_SECRET")
UA = os.getenv("REDDIT_USER_AGENT", "CampusEventsApp/0.1")
POLL_SECONDS = int(os.getenv("REDDIT_POLL_SECONDS", "300"))
MAX_POSTS_PER_SUB = int(os.getenv("REDDIT_MAX_POSTS", "20"))
MAX_COMMENTS_PER_POST = int(os.getenv("REDDIT_MAX_COMMENTS", "50"))
JOB_BATCH_SIZE = int(os.getenv("REDDIT_JOB_BATCH_SIZE", "5"))  # how many jobs to claim at once
MAX_ATTEMPTS = int(os.getenv("REDDIT_JOB_MAX_ATTEMPTS", "5"))

if not SB_URL or not SB_KEY:
    logger.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    raise SystemExit(1)
if not RID or not RSEC:
    logger.error("REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET are required")
    raise SystemExit(1)

# --- Clients ---
sb: Client = create_client(SB_URL, SB_KEY)
reddit = praw.Reddit(client_id=RID, client_secret=RSEC, user_agent=UA)
analyzer = SentimentIntensityAnalyzer()


def senti(text: Optional[str]) -> float:
    if not text:
        return 0.0
    return float(analyzer.polarity_scores(text).get("compound", 0.0))


# Category -> subreddit mapping (expand as needed)
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
}


def normalize_event_row(ev: Dict[str, Any]) -> Dict[str, Any]:
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
    explicit = [s.strip() for s in (ev.get("subreddits") or []) if s and str(s).strip()]
    if explicit:
        return list(dict.fromkeys(explicit))
    subs: List[str] = []
    for tag in (ev.get("tags") or []):
        key = str(tag).strip().lower().replace(" ", "_")
        mapped = CATEGORY_SUBREDDITS.get(key)
        if mapped:
            subs.extend(mapped)
    if not subs:
        subs = ["technology", "news"]
    return list(dict.fromkeys([s for s in subs if s]))


def event_already_processed(event_id: str) -> bool:
    try:
        resp = sb.table("reddit_comments").select("id").eq("event_id", event_id).limit(1).execute()
        if resp.error:
            logger.warning("event_already_processed query error for %s: %s", event_id, resp.error)
            return False
        return bool(resp.data)
    except Exception as e:
        logger.exception("error checking processed status for event %s: %s", event_id, e)
        return False


def insert_comment_row(row: Dict[str, Any]) -> None:
    try:
        resp = sb.table("reddit_comments").insert(row).execute()
        if resp.error:
            msg = getattr(resp.error, "message", str(resp.error)).lower()
            if "unique" in msg or "duplicate" in msg or "already exists" in msg:
                logger.debug("duplicate reddit_id %s: skipping", row.get("reddit_id"))
            else:
                logger.warning("insert error reddit_id=%s: %s", row.get("reddit_id"), resp.error)
        else:
            logger.info("inserted reddit row reddit_id=%s type=%s", row.get("reddit_id"), row.get("type"))
    except Exception as e:
        logger.exception("unexpected insert exception for reddit_id=%s: %s", row.get("reddit_id"), e)


def search_and_store_for_event(ev: Dict[str, Any]) -> None:
    event_id = ev.get("id")
    if not event_id:
        logger.warning("search_and_store_for_event: empty event id, skipping")
        return

    # guard: if already have reddit rows, skip
    if event_already_processed(event_id):
        logger.info("event %s already processed (reddit_comments present) -> skipping", event_id)
        return

    title_words = (ev.get("title") or "").lower().split()
    raw_keywords = [k for k in (ev.get("tags") or []) if k] + title_words
    keywords = list(dict.fromkeys(raw_keywords))[:8] if raw_keywords else title_words[:5]
    if not keywords:
        logger.info("no keywords for event %s - skipping", event_id)
        return

    query = " OR ".join([str(k) for k in keywords if k])
    subreddits = build_subreddit_list(ev)
    logger.info("event=%s searching query=%r subs=%s", event_id, query, subreddits)

    for sub in subreddits:
        try:
            subreddit = reddit.subreddit(sub)
        except Exception as e:
            logger.warning("cannot access subreddit %s: %s", sub, e)
            continue

        try:
            for post in subreddit.search(query, sort="new", limit=MAX_POSTS_PER_SUB):
                try:
                    post_id = getattr(post, "id", None)
                    created_ts = getattr(post, "created_utc", None)
                    created = datetime.fromtimestamp(created_ts, tz=timezone.utc) if created_ts else datetime.now(timezone.utc)
                    post_row = {
                        "event_id": event_id,
                        "reddit_id": post_id,
                        "subreddit": sub,
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
                    logger.exception("error handling post in %s: %s", sub, e)

                # comments (best-effort)
                try:
                    post.comments.replace_more(limit=0)
                    for c in post.comments.list()[:MAX_COMMENTS_PER_POST]:
                        try:
                            c_id = getattr(c, "id", None)
                            c_ts = getattr(c, "created_utc", None) or created_ts
                            crow = {
                                "event_id": event_id,
                                "reddit_id": c_id,
                                "subreddit": sub,
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
                    logger.debug("couldn't fetch comments for post %s: %s", getattr(post, "id", None), e)

        except Exception as e:
            logger.exception("search error for subreddit %s: %s", sub, e)


def claim_jobs(limit: int = JOB_BATCH_SIZE) -> List[Dict[str, Any]]:
    """
    Claim a small batch of unprocessed jobs. We use a simple
    'select where processed=false order by created_at limit N' then update attempts.
    For stronger guarantees you'd use SELECT ... FOR UPDATE SKIP LOCKED but Supabase/PostgREST
    doesn't expose that directly; this approach is OK for small scale.
    """
    try:
        # get unprocessed jobs
        res = sb.table("reddit_jobs").select("*").eq("processed", False).order("created_at", {"ascending": True}).limit(limit).execute()
        if res.error:
            logger.error("claim_jobs select error: %s", res.error)
            return []
        rows = res.data or []
        # increment attempts to indicate claim (best-effort)
        for r in rows:
            try:
                sb.table("reddit_jobs").update({"attempts": (r.get("attempts") or 0) + 1}).eq("id", r["id"]).execute()
            except Exception:
                logger.debug("failed to bump attempts for job %s (ignore)", r.get("id"))
        return rows
    except Exception as e:
        logger.exception("claim_jobs exception: %s", e)
        return []


def mark_job_processed(job_id: str) -> None:
    try:
        sb.table("reddit_jobs").update({"processed": True, "processed_at": datetime.now(timezone.utc).isoformat()}).eq("id", job_id).execute()
    except Exception as e:
        logger.exception("failed to mark job %s processed: %s", job_id, e)


def mark_job_error(job_id: str, err: str) -> None:
    try:
        sb.table("reddit_jobs").update({"last_error": err, "processed": False}).eq("id", job_id).execute()
    except Exception as e:
        logger.exception("failed to update job error for %s: %s", job_id, e)


def fetch_event_by_id(event_id: str) -> Optional[Dict[str, Any]]:
    try:
        resp = sb.table("event_submissions").select("*").eq("id", event_id).limit(1).execute()
        if resp.error:
            logger.error("fetch_event_by_id error: %s", resp.error)
            return None
        rows = resp.data or []
        return rows[0] if rows else None
    except Exception as e:
        logger.exception("fetch_event_by_id exception: %s", e)
        return None


def main_loop():
    logger.info("reddit worker started (job queue mode), poll interval=%s secs", POLL_SECONDS)
    while True:
        try:
            jobs = claim_jobs(JOB_BATCH_SIZE)
            if not jobs:
                logger.debug("no jobs claimed - sleeping")
            else:
                logger.info("claimed %d job(s)", len(jobs))
                for job in jobs:
                    job_id = job.get("id")
                    event_id = job.get("event_id")
                    attempts = job.get("attempts", 0) or 0
                    logger.info("processing job=%s event=%s attempts=%s", job_id, event_id, attempts)

                    if attempts > MAX_ATTEMPTS:
                        logger.warning("job %s exceeded max attempts (%s) - marking error and skipping", job_id, attempts)
                        mark_job_error(job_id, f"exceeded max attempts {attempts}")
                        continue

                    event_row = fetch_event_by_id(event_id)
                    if not event_row:
                        msg = f"event id {event_id} not found"
                        logger.warning(msg)
                        mark_job_error(job_id, msg)
                        continue

                    # normalize and process
                    ev = normalize_event_row(event_row)
                    try:
                        search_and_store_for_event(ev)
                        mark_job_processed(job_id)
                        logger.info("job %s completed for event %s", job_id, event_id)
                    except Exception as e:
                        logger.exception("error processing job %s: %s", job_id, e)
                        # record last_error and keep processed=false so it can be retried (or mark attempts > max to stop)
                        mark_job_error(job_id, str(e))

            # small jitter before next poll
            jitter = random.uniform(0, min(5, POLL_SECONDS * 0.1))
            to_sleep = max(1, POLL_SECONDS + jitter)
            logger.debug("sleeping %s seconds (jitter=%s)", to_sleep, jitter)
            time.sleep(to_sleep)

        except KeyboardInterrupt:
            logger.info("received KeyboardInterrupt - exiting")
            break
        except Exception as e:
            logger.exception("main loop unexpected error: %s", e)
            time.sleep(max(5, POLL_SECONDS // 2))


if __name__ == "__main__":
    main_loop()
