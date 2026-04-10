import os
import json
import instaloader
from fastapi import FastAPI, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

IG_USERNAME = os.getenv("IG_USERNAME")
IG_SESSION_COOKIE = os.getenv("IG_SESSION_COOKIE")
API_KEY = os.getenv("API_KEY")

api_key_header = APIKeyHeader(name="x-api-key", auto_error=True)

L = instaloader.Instaloader(
    download_pictures=False,
    download_videos=False,
    download_video_thumbnails=False,
    download_geotags=False,
    download_comments=False,
    save_metadata=False,
    compress_json=False,
    quiet=True,
)


session_initialized = False


def init_session():
    global session_initialized
    if session_initialized:
        return
    if not IG_USERNAME or not IG_SESSION_COOKIE:
        raise RuntimeError("IG_USERNAME and IG_SESSION_COOKIE must be set")
    for pair in IG_SESSION_COOKIE.split(";"):
        pair = pair.strip()
        if "=" in pair:
            name, _, value = pair.partition("=")
            L.context._session.cookies.set(name.strip(), value.strip(), domain=".instagram.com")
    L.context.username = IG_USERNAME
    session_initialized = True


def verify_api_key(key: str = Security(api_key_header)):
    if key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return key


@app.get("/health")
def health():
    init_session()
    return {"status": "ok", "user": IG_USERNAME}


@app.get("/stories/{username}")
def get_stories(username: str, _: str = Security(verify_api_key)):
    init_session()
    try:
        profile = instaloader.Profile.from_username(L.context, username)
        stories = []

        for story in L.get_stories(userids=[profile.userid]):
            for item in story.get_items():
                stories.append({
                    "id": str(item.mediaid),
                    "mediaType": "video" if item.is_video else "image",
                    "mediaUrl": item.url,
                    "timestamp": int(item.date_utc.timestamp()),
                })

        return {"username": username, "stories": stories}

    except instaloader.exceptions.ProfileNotExistsException:
        raise HTTPException(status_code=404, detail=f"Profile {username} not found")
    except instaloader.exceptions.LoginRequiredException:
        raise HTTPException(status_code=401, detail="Instagram session expired")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
