from apscheduler.schedulers.asyncio import AsyncIOScheduler
from scraper import run_scraper

scheduler = AsyncIOScheduler()


def start_scheduler():
    scheduler.add_job(run_scraper, "interval", minutes=15, id="ig_scraper")
    scheduler.start()
    print("Scheduler started — scraping every 15 minutes")
