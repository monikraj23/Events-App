# reddit_worker.py
import os, time
from datetime import datetime, timezone
import praw
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from supabase import create_client

# env
SB_URL  = os.getenv("SUPABASE_URL")
SB_KEY  = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # service role key (server)
RID     = os.getenv("REDDIT_CLIENT_ID")
RSEC    = os.getenv("REDDIT_CLIENT_SECRET")
UA      = os.getenv("REDDIT_USER_AGENT", "campus-events-app/0.1")
POLL    = int(os.getenv("REDDIT_POLL_SECONDS", "300"))

# init
sb = create_client(SB_URL, SB_KEY)
analyzer = SentimentIntensityAnalyzer()

def senti(t: str) -> float:
    return analyzer.polarity_scores(t or "").get("compound", 0.0)

def reddit_client():
    return praw.Reddit(client_id=RID, client_secret=RSEC, user_agent=UA, check_for_async=False)

def fetch_events():
    # pick status you want; limit if desired
    res = sb.table("event_submissions").select("*").in_("status", ["approved","pending"]).execute()
    return res.data or []

def upsert_comment(row):
    # upsert by composite index (event_id, reddit_id) OR by reddit_id unique depending on your schema.
    # Supabase Python client supports upsert(..., on_conflict=...)
    try:
        # on_conflict string must match the unique index columns; change if you use reddit_id alone
        sb.table("reddit_comments").upsert(row, on_conflict="event_id,reddit_id").execute()
    except Exception as e:
        print("upsert error:", e)

def run_cycle(r):
    events = fetch_events()
    print(f"[worker] fetched {len(events)} events")
    for ev in events:
        event_id = str(ev.get("id"))
        title_words = (ev.get("title") or "").lower().split()
        tags = ev.get("tags") or []
        # keywords: tags first then title words, dedup, limit
        keywords = list(dict.fromkeys([*(tags or []), *title_words]))[:8] or title_words[:5]
        if not keywords:
            continue
        q = " OR ".join(k for k in keywords if k)
        subreddits = ev.get("subreddits") or ["college", "university", "technology", "CampusLife"]
        for sub_name in subreddits:
            try:
                sub = r.subreddit(sub_name)
                for post in sub.search(q, sort="new", limit=20):
                    created = datetime.fromtimestamp(post.created_utc, tz=timezone.utc)
                    payload = {"permalink": getattr(post, "permalink", None), "url": getattr(post, "url", None)}
                    row_post = {
                        "event_id": event_id,
                        "reddit_id": getattr(post, "id", None),
                        "subreddit": sub_name,
                        "type": "post",
                        "title": post.title,
                        "body": post.selftext or None,
                        "author": str(post.author) if post.author else None,
                        "sentiment": senti((post.title or "") + " " + (post.selftext or "")),
                        "created_utc": created.isoformat(),
                        "payload": payload
                    }
                    upsert_comment(row_post)

                    # comments
                    post.comments.replace_more(limit=0)
                    for c in post.comments.list()[:50]:
                        ts = getattr(c, "created_utc", post.created_utc)
                        row_comment = {
                            "event_id": event_id,
                            "reddit_id": getattr(c, "id", None),
                            "subreddit": sub_name,
                            "type": "comment",
                            "title": None,
                            "body": getattr(c, "body", ""),
                            "author": str(c.author) if c.author else None,
                            "sentiment": senti(getattr(c, "body", "")),
                            "created_utc": datetime.fromtimestamp(ts, tz=timezone.utc).isoformat(),
                            "payload": {"link_id": getattr(c, "link_id", None)}
                        }
                        upsert_comment(row_comment)
            except Exception as e:
                print(f"[worker] subreddit {sub_name} error:", e)

def main_loop():
    r = reddit_client()
    while True:
        try:
            run_cycle(r)
        except Exception as e:
            print("[worker] cycle error:", e)
        time.sleep(POLL)

if __name__ == "__main__":
    main_loop()
