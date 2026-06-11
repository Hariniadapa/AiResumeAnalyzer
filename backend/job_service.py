import os
import hashlib
from datetime import datetime
from sqlalchemy.orm import Session
from models import JobPosting
from matcher import Matcher
from job_scraper import scrape_linkedin_jobs
from ai_services import AIServices

class JobService:
    def __init__(self, db: Session):
        self.db = db
        self.matcher = Matcher(self.db)

    def get_embedding(self, text: str):
        return self.matcher.get_embedding(text)

    @property
    def index(self):
        return self.matcher.index

    def scrape_and_store_jobs(self, query: str = "Software Engineer"):
        # 1. Fetch live jobs using scraper (with fallback chains)
        scraped_jobs = scrape_linkedin_jobs(query, location="Remote", limit=15)
        
        saved_count = 0
        vectors_to_upsert = []

        # 2. Iterate and store in Database + Pinecone
        for job in scraped_jobs:
            existing = self.db.query(JobPosting).filter(JobPosting.job_url == job["job_url"]).first()
            if not existing:
                db_job = JobPosting(
                    id=job["id"],
                    company_name=job["company_name"],
                    job_title=job["job_title"],
                    job_location=job["job_location"],
                    job_url=job["job_url"],
                    job_description=job["job_description"],
                    posted_date=job["posted_date"],
                    salary=job.get("salary", "Based on Experience"),
                    skills=job.get("skills", "[]"),
                    source=job.get("source", "Scraper"),
                    job_type=job.get("job_type", "job"),
                    duration=job.get("duration", "Permanent")
                )
                self.db.add(db_job)
                self.db.commit()
                self.db.refresh(db_job)
                
                # If Pinecone is set up, embed and upsert
                if self.matcher.index:
                    try:
                        emb = self.matcher.get_embedding(db_job.job_description)
                        if emb and sum(emb) != 0.0:
                            vectors_to_upsert.append({
                                "id": str(db_job.id),
                                "values": emb,
                                "metadata": {
                                    "title": db_job.job_title,
                                    "company": db_job.company_name
                                }
                            })
                    except Exception as e:
                        print(f"[JobService WARN] Failed embedding for Pinecone: {e}")

                saved_count += 1
        
        # 3. Pinecone Batch Upsert
        if self.matcher.index and vectors_to_upsert:
            try:
                self.matcher.index.upsert(vectors=vectors_to_upsert)
                print(f"[JobService] Upserted {len(vectors_to_upsert)} jobs to Pinecone.")
            except Exception as e:
                print(f"[JobService WARN] Pinecone upsert failed: {e}")

        return {"message": f"Successfully fetched and synchronized {saved_count} jobs for: {query}"}

    def match_resume_to_jobs(
        self,
        resume_text: str,
        location: str = None,
        skills: str = None,
        experience_level: str = None
    ):
        # Delegate directly to our Matcher module
        return self.matcher.match_resume_to_jobs(
            resume_text=resume_text,
            location=location,
            skills=skills,
            experience_level=experience_level
        )

    def get_market_trends(self):
        jobs = self.db.query(JobPosting).all()
        if not jobs:
            return {
                "trending_skills": ["Python", "React", "FastAPI", "SQL", "Git"],
                "analysis": "Currently no jobs are loaded. Execute 'Collect Jobs' to synchronize trends."
            }

        # Analyze description strings
        all_descriptions = " ".join([j.job_description for j in jobs[:20]])
        try:
            return AIServices(self.db).analyze_market_trends(all_descriptions)
        except Exception as e:
            print(f"[JobService WARN] Trends analysis failed: {e}")
            return {
                "trending_skills": ["React", "Python", "SQL", "Docker", "AWS"],
                "analysis": "Unable to calculate trend summaries. Displaying general technical keywords."
            }
