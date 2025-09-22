# worker/reddit_worker.py
import os
import time
import json
from datetime import datetime, timezone
import praw
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from supabase import create_client, Client
from postgrest.exceptions import APIError

# --- Config / env checks ---
SB_URL = os.getenv("SUPABASE_URL")
SB_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
RID = os.getenv("REDDIT_CLIENT_ID")
RSEC = os.getenv("REDDIT_CLIENT_SECRET")
UA = os.getenv("REDDIT_USER_AGENT", "campus-events-app/0.1")
POLL = int(os.getenv("REDDIT_POLL_SECONDS", "60"))

missing = [k for k, v in {
    "SUPABASE_URL": SB_URL,
    "SUPABASE_SERVICE_ROLE_KEY": SB_KEY,
    "REDDIT_CLIENT_ID": RID,
    "REDDIT_CLIENT_SECRET": RSEC,
}.items() if not v]

if missing:
    raise SystemExit(f"[worker] Missing required env vars: {', '.join(missing)}")

# --- Clients ---
sb: Client = create_client(SB_URL, SB_KEY)

reddit = praw.Reddit(client_id=RID, client_secret=RSEC, user_agent=UA)
analyzer = SentimentIntensityAnalyzer()


def to_iso(ts):
    try:
        return datetime.fromtimestamp(float(ts), tz=timezone.utc).isoformat()
    except Exception:
        return datetime.now(timezone.utc).isoformat()


def senti(text: str) -> float:
    return analyzer.polarity_scores(text or "").get("compound", 0.0)


def extract_response(res):
    """
    Normalize different possible return shapes from supabase client execute().
    Returns (data, error) where either may be None.
    """
    # common: object with .data and .error
    data = getattr(res, "data", None)
    err = getattr(res, "error", None)

    # if not present, maybe it's a dict-like response
    if data is None and isinstance(res, dict):
        data = res.get("data")
        err = res.get("error")

    return data, err


def fetch_events():
    """
    Fetch events that should be processed.
    Uses `status = 'approved'` per your schema (not `published`).
    Robust to different return shapes from supabase client.
    """
    try:
        res = sb.table("event_submissions").select("*").eq("status", "approved").execute()
        data, err = extract_response(res)
        if err:
            # Some clients embed error as {'message':...} or similar
            print("[worker] Supabase returned error fetching events:", err)
            return []
        if data is None:
            # unexpected shape: log repr for debugging
            print("[worker] Unexpected supabase response shape in fetch_events:", repr(res))
            return []
        return data or []
    except APIError as e:
        print("[worker] APIError fetching events:", e)
        return []
    except Exception as e:
        print("[worker] Unexpected error fetching events:", e)
        return []


def build_keywords(ev):
    subs = []
    if ev.get("subreddits"):
        subs = [s for s in (ev.get("subreddits") or []) if s]
    if not subs:
        tags = ev.get("tags") or []
        if isinstance(tags, str):
            try:
                tags = json.loads(tags)
            except Exception:
                tags = [tags]
        title_words = (ev.get("title") or "").lower().split()
        seen = set()
        for t in [*tags, *title_words]:
            if not t:
                continue
            tt = str(t).strip()
            if tt and tt not in seen:
                seen.add(tt)
                subs.append(tt)
            if len(subs) >= 8:
                break
    return subs[:8]


def fetch_reddit_for_keyword(ev, kw):
    posts = []
    try:
        sub = reddit.subreddit(kw)
        for p in sub.hot(limit=5):
            posts.append(p)
        if posts:
            return posts
    except Exception as e:
        print(f"[worker] subreddit fetch failed for '{kw}': {e} — trying search fallback")
    try:
        for p in reddit.subreddit("all").search(kw, sort="new", limit=8):
            posts.append(p)
    except Exception as e:
        print(f"[worker] search failed for '{kw}': {e}")
    return posts


def transform_post(ev, p, kw):
    created_iso = to_iso(getattr(p, "created_utc", time.time()))
    body = getattr(p, "selftext", None)
    title = getattr(p, "title", None)
    payload = {
        "permalink": getattr(p, "permalink", None),
        "url": getattr(p, "url", None),
        "id": getattr(p, "id", None),
    }
    return {
        "event_id": ev["id"],
        "reddit_id": f"t3_{getattr(p, 'id', '')}",
        "subreddit": kw,
        "type": "post",
        "title": title,
        "body": body or None,
        "author": str(getattr(p, "author", None)) if getattr(p, "author", None) else None,
        "sentiment": senti((title or "") + " " + (body or "")),
        "created_utc": created_iso,
        "payload": payload,
    }


def store_reddit_data(rows):
    if not rows:
        return
    try:
        res = sb.table("reddit_comments").insert(rows).execute()
        data, err = extract_response(res)
        if err:
            print("[worker] Supabase insert error:", err)
        else:
            print(f"[worker] Inserted {len(rows)} reddit rows")
    except Exception as e:
        print("[worker] Exception inserting reddit rows:", e)


def process_event(ev):
    kws = build_keywords(ev)
    if not kws:
        print(f"[worker] No keywords/subreddits found for event {ev.get('id')}")
        return
    out = []
    for kw in kws:
        posts = fetch_reddit_for_keyword(ev, kw)
        for p in posts:
            try:
                row = transform_post(ev, p, kw)
                out.append(row)
            except Exception as e:
                print(f"[worker] transform error for post {getattr(p,'id',None)}: {e}")
    store_reddit_data(out)


def main_loop():
    print("[worker] started, poll seconds:", POLL)
    while True:
        try:
            events = fetch_events()
            if not events:
                print("[worker] No approved events to process this cycle.")
            else:
                print(f"[worker] Processing {len(events)} approved event(s).")
                for ev in events:
                    process_event(ev)
        except Exception as e:
            print("[worker] cycle error:", e)
        time.sleep(POLL)


if __name__ == "__main__":
    main_loop()
