import requests
import hashlib
import json
from datetime import datetime
from sqlalchemy.orm import Session
from models import JobPosting
from job_service import JobService  
from database import SessionLocal
from job_scraper import scrape_linkedin_jobs, normalize_job_dict, is_url_valid

class JobIngestionService:
    def __init__(self, db: Session = None):
        self.db = db if db else SessionLocal()
        self.job_service = JobService(self.db)
        
    def generate_id(self, url: str) -> str:
        return hashlib.sha256(url.encode('utf-8')).hexdigest()

    def run_ingestion(self):
        print(f"[{datetime.now()}] Starting LinkedIn job ingestion...")
        queries = [
            "Software Engineer",
            "Frontend Developer",
            "Backend Developer",
            "Full Stack Engineer",
            "Data Analyst",
            "Software Engineer Internship"
        ]
        
        jobs = []
        for q in queries:
            try:
                results = scrape_linkedin_jobs(q, location="Remote", limit=15)
                jobs.extend(results)
            except Exception as e:
                print(f"[Ingestion WARN] Error scraping query '{q}': {e}")

        self.process_and_store_jobs(jobs)
        print(f"[{datetime.now()}] LinkedIn job ingestion completed.")

    def process_and_store_jobs(self, jobs):
        saved_count = 0
        vectors_to_upsert = []

        for job_data in jobs:
            normalized = normalize_job_dict(job_data)
            
            # Validate URL before storing
            if not is_url_valid(normalized["job_url"]):
                continue

            existing = self.db.query(JobPosting).filter(JobPosting.id == normalized["id"]).first()
            if not existing:
                db_job = JobPosting(
                    id=normalized["id"],
                    job_title=normalized["job_title"],
                    company_name=normalized["company_name"],
                    job_description=normalized["job_description"],
                    job_location=normalized["job_location"],
                    salary=normalized["salary"],
                    skills=normalized["skills"],
                    source="LinkedIn",
                    job_url=normalized["job_url"],
                    posted_date=normalized["posted_date"],
                    job_type=normalized["job_type"],
                    duration=normalized["duration"]
                )
                self.db.add(db_job)
                saved_count += 1

        try:
            self.db.commit()
            print(f"Saved {saved_count} new LinkedIn jobs to database.")
        except Exception as e:
            self.db.rollback()
            print(f"Database commit error: {e}")
