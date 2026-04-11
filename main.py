import os
import json
import asyncio
from pathlib import Path
from fastapi import FastAPI, HTTPException, Security
from fastapi.responses import StreamingResponse
from fastapi.security.api_key import APIKeyHeader
from dotenv import load_dotenv
from scheduler import start_scheduler
from scraper import run_scraper

load_dotenv()

app = FastAPI()

MEDIA_DIR = Path(os.getenv("MEDIA_DIR", "./media"))
API_KEY = os.getenv("API_KEY")

api_key_header = APIKeyHeader(name="x-api-key", auto_error=True)

CHUNK_SIZE = 1024 * 512


def verify_api_key(key: str = Security(api_key_header)):
    if key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return key


@app.on_event("startup")
async def startup():
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    start_scheduler()
    asyncio.create_task(run_scraper())


@app.get("/health")
def health():
    return {"status": "ok", "user": os.getenv("IG_USERNAME")}


@app.get("/stories")
def get_all_stories(_: str = Security(verify_api_key)):
    result = []

    for dept_dir in sorted(MEDIA_DIR.iterdir()):
        if not dept_dir.is_dir():
            continue

        metadata_path = dept_dir / "stories.json"
        if not metadata_path.exists():
            continue

        stories = json.loads(metadata_path.read_text())
        result.append({
            "department": dept_dir.name,
            "stories": stories,
        })

    return result


@app.get("/stories/{department}")
def get_department_stories(department: str, _: str = Security(verify_api_key)):
    dept_dir = MEDIA_DIR / department.upper()
    metadata_path = dept_dir / "stories.json"

    if not metadata_path.exists():
        return {"department": department, "stories": []}

    stories = json.loads(metadata_path.read_text())
    return {"department": department, "stories": stories}


@app.get("/media/{department}/{filename}")
def stream_media(department: str, filename: str, _: str = Security(verify_api_key)):
    file_path = MEDIA_DIR / department.upper() / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    ext = file_path.suffix.lower()
    if ext == ".mp4":
        media_type = "video/mp4"
    elif ext in (".jpg", ".jpeg"):
        media_type = "image/jpeg"
    elif ext == ".png":
        media_type = "image/png"
    else:
        media_type = "application/octet-stream"

    def iter_file():
        with open(file_path, "rb") as f:
            while chunk := f.read(CHUNK_SIZE):
                yield chunk

    return StreamingResponse(
        iter_file(),
        media_type=media_type,
        headers={"Content-Length": str(file_path.stat().st_size)},
    )


@app.post("/scrape")
async def trigger_scrape(_: str = Security(verify_api_key)):
    asyncio.create_task(run_scraper())
    return {"status": "scrape started"}
