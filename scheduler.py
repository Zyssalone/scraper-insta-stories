import asyncio
from apscheduler.schedulers.background import BackgroundScheduler
from scraper import run_scraper


def scrape_job():
    asyncio.run(run_scraper())


def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(scrape_job, "interval", minutes=15, id="ig_scraper")
    scheduler.start()
    print("Scheduler started — scraping every 15 minutes")
    scrape_job()
    return scheduler
