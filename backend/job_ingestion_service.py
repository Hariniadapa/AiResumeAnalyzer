import requests
import hashlib
import json
from datetime import datetime
from sqlalchemy.orm import Session
from models import JobPosting
from job_service import JobService  
from database import SessionLocal
from job_scraper import normalize_job_dict

class JobIngestionService:
    def __init__(self, db: Session = None):
        self.db = db if db else SessionLocal()
        self.job_service = JobService(self.db)
        
    def generate_id(self, url: str) -> str:
        return hashlib.sha256(url.encode('utf-8')).hexdigest()

    def run_ingestion(self):
        print(f"[{datetime.now()}] Starting job ingestion...")
        jobs = []
        jobs.extend(self.fetch_remotive_jobs(limit=30))
        jobs.extend(self.fetch_arbeitnow_jobs(limit=30))
        
        self.process_and_store_jobs(jobs)
        print(f"[{datetime.now()}] Job ingestion completed.")
        
    def fetch_remotive_jobs(self, limit=30):
        print("Fetching from Remotive API...")
        try:
            response = requests.get(f"https://remotive.com/api/remote-jobs?limit={limit}")
            if response.status_code == 200:
                data = response.json().get("jobs", [])
                normalized = []
                for job in data[:limit]:
                    normalized.append({
                        "id": self.generate_id(job.get("url", "")),
                        "job_title": job.get("title", ""),
                        "company_name": job.get("company_name", ""),
                        "job_description": job.get("description", "")[:2000],  # truncate for vector DB and DB size limits
                        "job_location": job.get("candidate_required_location", "Remote"),
                        "salary": job.get("salary", "Not specified"),
                        "skills": json.dumps(job.get("tags", [])),
                        "source": "Remotive",
                        "job_url": job.get("url", ""),
                        "posted_date": job.get("publication_date", datetime.now().isoformat())
                    })
                return normalized
        except Exception as e:
            print(f"Remotive fetch failed: {e}")
        return []

    def fetch_arbeitnow_jobs(self, limit=30):
        print("Fetching from Arbeitnow API...")
        try:
            response = requests.get("https://www.arbeitnow.com/api/job-board-api")
            if response.status_code == 200:
                data = response.json().get("data", [])
                normalized = []
                for job in data[:limit]:
                    normalized.append({
                        "id": self.generate_id(job.get("url", "")),
                        "job_title": job.get("title", ""),
                        "company_name": job.get("company_name", ""),
                        "job_description": job.get("description", "")[:2000],
                        "job_location": job.get("location", ""),
                        "salary": "Not specified",
                        "skills": json.dumps(job.get("tags", [])),
                        "source": "Arbeitnow",
                        "job_url": job.get("url", ""),
                        "posted_date": str(job.get("created_at", datetime.now().isoformat()))
                    })
                return normalized
        except Exception as e:
            print(f"Arbeitnow fetch failed: {e}")
        return []

    def process_and_store_jobs(self, jobs):
        saved_count = 0
        vectors_to_upsert = []

        for job_data in jobs:
            normalized = normalize_job_dict(job_data)
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
                    source=normalized["source"],
                    job_url=normalized["job_url"],
                    posted_date=normalized["posted_date"],
                    job_type=normalized["job_type"],
                    duration=normalized["duration"]
                )
                self.db.add(db_job)
                
                # Get Embedding
                embedding = self.job_service.get_embedding(job_data["job_description"] + " " + job_data["job_title"])
                if embedding and self.job_service.index:
                    vectors_to_upsert.append({
                        "id": db_job.id,
                        "values": embedding,
                        "metadata": {
                            "title": db_job.job_title,
                            "company": db_job.company_name,
                            "location": db_job.job_location,
                            "source": db_job.source,
                            "url": db_job.job_url,
                            "skills": db_job.skills
                        }
                    })
                
                saved_count += 1

        try:
            self.db.commit()
            print(f"Saved {saved_count} new jobs to database.")
        except Exception as e:
            self.db.rollback()
            print(f"Database commit error: {e}")

        # Batch upsert to pinecone
        if self.job_service.index and vectors_to_upsert:
            try:
                batch_size = 100
                for i in range(0, len(vectors_to_upsert), batch_size):
                    batch = vectors_to_upsert[i:i + batch_size]
                    self.job_service.index.upsert(vectors=batch)
                print(f"Upserted {len(vectors_to_upsert)} jobs to pinecone.")
            except Exception as e:
                print(f"Pinecone upsert error: {e}")
