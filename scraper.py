import os
import json
import time
import httpx
import asyncio
from pathlib import Path
from datetime import datetime, timezone
from playwright.async_api import async_playwright, BrowserContext

MEDIA_DIR = Path(os.getenv("MEDIA_DIR", "./media"))
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

IG_USERNAME = os.getenv("IG_USERNAME")
IG_SESSION_COOKIE = os.getenv("IG_SESSION_COOKIE")

DEPARTMENT_HANDLES = {
    "SAO": "sao_aui",
    "CLE": "aui_cle",
    "EEO": "aui.eeo",
    "SAC": "sacaui",
    "SGA": "auisga",
    "AUI": "alakhawayn_university",
}


def parse_cookies(cookie_string: str) -> list[dict]:
    cookies = []
    for pair in cookie_string.split(";"):
        pair = pair.strip()
        if "=" in pair:
            name, _, value = pair.partition("=")
            cookies.append({
                "name": name.strip(),
                "value": value.strip(),
                "domain": ".instagram.com",
                "path": "/",
            })
    return cookies


async def download_media(url: str, dest: Path):
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        headers = {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
            "Referer": "https://www.instagram.com/",
        }
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        dest.write_bytes(response.content)


async def scrape_stories_for_handle(context: BrowserContext, department: str, handle: str):
    page = await context.new_page()
    dept_dir = MEDIA_DIR / department
    dept_dir.mkdir(parents=True, exist_ok=True)

    stories = []

    try:
        await page.goto(f"https://www.instagram.com/{handle}/", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)

        story_ring = page.locator(f"a[href='/{handle}/']").first
        if not await story_ring.is_visible():
            print(f"[{department}] No story ring visible for @{handle}")
            return []

        await story_ring.click()
        await asyncio.sleep(3)

        story_index = 0
        seen_ids = set()

        while True:
            try:
                video = page.locator("video.x1lliihq").first
                image = page.locator("img.x5yr21d").first

                media_url = None
                media_type = None
                story_id = None

                if await video.is_visible(timeout=2000):
                    media_url = await video.get_attribute("src")
                    media_type = "video"
                elif await image.is_visible(timeout=2000):
                    media_url = await image.get_attribute("src")
                    media_type = "image"

                if not media_url:
                    break

                story_id = str(abs(hash(media_url)))[:16]

                if story_id in seen_ids:
                    break
                seen_ids.add(story_id)

                timestamp = int(datetime.now(timezone.utc).timestamp())
                ext = "mp4" if media_type == "video" else "jpg"
                filename = f"{story_id}.{ext}"
                dest = dept_dir / filename

                if not dest.exists():
                    await download_media(media_url, dest)

                stories.append({
                    "id": story_id,
                    "department": department,
                    "handle": handle,
                    "mediaType": media_type,
                    "filename": filename,
                    "timestamp": timestamp,
                })

                story_index += 1

                next_btn = page.locator("[aria-label='Next']").first
                if await next_btn.is_visible(timeout=2000):
                    await next_btn.click()
                    await asyncio.sleep(1.5)
                else:
                    break

            except Exception as e:
                print(f"[{department}] Error on story {story_index}: {e}")
                break

    except Exception as e:
        print(f"[{department}] Failed to scrape @{handle}: {e}")
    finally:
        await page.close()

    metadata_path = dept_dir / "stories.json"
    metadata_path.write_text(json.dumps(stories, indent=2))
    print(f"[{department}] Scraped {len(stories)} stories")
    return stories


async def run_scraper():
    if not IG_SESSION_COOKIE:
        print("No IG_SESSION_COOKIE set, skipping scrape")
        return

    cookies = parse_cookies(IG_SESSION_COOKIE)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
            ],
        )

        context = await browser.new_context(
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            viewport={"width": 390, "height": 844},
            device_scale_factor=3,
            is_mobile=True,
            has_touch=True,
        )

        await context.add_cookies(cookies)

        for department, handle in DEPARTMENT_HANDLES.items():
            await scrape_stories_for_handle(context, department, handle)
            await asyncio.sleep(3)

        await browser.close()

    print("Scrape run complete")
