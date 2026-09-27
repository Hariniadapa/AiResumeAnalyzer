import os
import re
import math
import json
import numpy as np
from sqlalchemy.orm import Session
from models import JobPosting
from ai_engine import ai_engine
from ai_services import AIServices

# Pinecone import
try:
    from pinecone import Pinecone, ServerlessSpec
    PINECONE_AVAILABLE = True
except ImportError:
    PINECONE_AVAILABLE = False

class Matcher:
    def __init__(self, db: Session):
        self.db = db
        
        # Initialize Pinecone
        pinecone_key = os.getenv("PINECONE_API_KEY", "").strip()
        if PINECONE_AVAILABLE and pinecone_key and pinecone_key != "your-pinecone-api-key-here":
            try:
                self.pc = Pinecone(api_key=pinecone_key)
                self.index_name = "ai-resume-jobs"
                # Check if index exists
                existing_indexes = [idx.name for idx in self.pc.list_indexes()]
                if self.index_name not in existing_indexes:
                    self.pc.create_index(
                        name=self.index_name,
                        dimension=768,
                        metric="cosine",
                        spec=ServerlessSpec(cloud="aws", region="us-east-1")
                    )
                self.index = self.pc.Index(self.index_name)
                print("[OK] Pinecone initialized and ready ✅")
            except Exception as e:
                print(f"[WARN] Pinecone initialization failed: {e}. Using local fallback.")
                self.index = None
        else:
            self.index = None

    def get_embedding(self, text: str) -> list[float]:
        try:
            return ai_engine.get_embedding(text)
        except Exception as e:
            print(f"[Matcher WARN] Failed to get embedding: {e}")
            return [0.0] * 768

    def cosine_similarity(self, v1: list[float], v2: list[float]) -> float:
        if not v1 or not v2 or len(v1) != len(v2):
            return 0.0
        try:
            arr1 = np.array(v1)
            arr2 = np.array(v2)
            norm1 = np.linalg.norm(arr1)
            norm2 = np.linalg.norm(arr2)
            if norm1 == 0.0 or norm2 == 0.0:
                return 0.0
            return float(np.dot(arr1, arr2) / (norm1 * norm2))
        except Exception:
            # Fallback pure python
            dot = sum(a * b for a, b in zip(v1, v2))
            m1 = math.sqrt(sum(a * a for a in v1))
            m2 = math.sqrt(sum(b * b for b in v2))
            if m1 == 0.0 or m2 == 0.0:
                return 0.0
            return dot / (m1 * m2)

    def match_resume_to_jobs(
        self,
        resume_text: str,
        location: str = None,
        skills: str = None,
        experience_level: str = None,
        limit: int = 25
    ) -> list[dict]:
        
        # 1. Clean inputs
        resume_text_clean = resume_text.strip()
        if not resume_text_clean:
            return []

        # 2. Extract key resume skills/terms for candidate job search
        res_lower = resume_text_clean.lower()
        extracted_skills = []
        skill_catalog = ["python", "react", "javascript", "typescript", "java", "c#", "c++", "node", "fastapi", "django", "data analyst", "full stack", "frontend", "backend", "software engineer", "devops"]
        for s in skill_catalog:
            if re.search(r'\b' + re.escape(s) + r'\b', res_lower):
                extracted_skills.append(s.title() if len(s) > 3 else s.upper())
        
        search_query = extracted_skills[0] if extracted_skills else "Software Engineer"

        # 3. Fetch valid jobs from Database
        from job_scraper import is_url_valid, scrape_linkedin_jobs
        
        query_db = self.db.query(JobPosting)
        if location:
            query_db = query_db.filter(JobPosting.job_location.ilike(f"%{location}%"))
        if experience_level:
            query_db = query_db.filter(
                JobPosting.job_title.ilike(f"%{experience_level}%") | 
                JobPosting.job_description.ilike(f"%{experience_level}%")
            )
            
        jobs_in_db = query_db.all()
        # Filter DB jobs to retain only those with reachable/valid URLs
        valid_jobs_in_db = [j for j in jobs_in_db if j.job_url and is_url_valid(j.job_url)]

        # 4. If insufficient valid jobs in DB, dynamically fetch live LinkedIn jobs & internships
        if len(valid_jobs_in_db) < 10:
            print(f"[Matcher] DB has {len(valid_jobs_in_db)} valid jobs. Fetching live LinkedIn jobs for: '{search_query}'...")
            try:
                scraped = scrape_linkedin_jobs(search_query, location=location or "Remote", limit=20)
                for sj in scraped:
                    existing = self.db.query(JobPosting).filter(JobPosting.id == sj["id"]).first()
                    if not existing:
                        db_j = JobPosting(
                            id=sj["id"],
                            job_title=sj["job_title"],
                            company_name=sj["company_name"],
                            job_description=sj["job_description"],
                            job_location=sj["job_location"],
                            salary=sj["salary"],
                            skills=sj["skills"],
                            source="LinkedIn",
                            job_url=sj["job_url"],
                            posted_date=sj["posted_date"],
                            job_type=sj["job_type"],
                            duration=sj["duration"]
                        )
                        self.db.add(db_j)
                self.db.commit()
            except Exception as scrape_err:
                print(f"[Matcher WARN] Dynamic LinkedIn scraping failed: {scrape_err}")
            
            # Re-fetch after dynamic search
            jobs_in_db = query_db.all()
            valid_jobs_in_db = [j for j in jobs_in_db if j.job_url and is_url_valid(j.job_url)]

        if not valid_jobs_in_db:
            print("[Matcher WARN] No valid job postings available.")
            return []

        # 5. Attempt vector search if Pinecone is configured
        matched_job_ids_scores = {}
        resume_emb = None
        
        if self.index:
            try:
                resume_emb = self.get_embedding(resume_text_clean)
                if resume_emb and sum(resume_emb) != 0.0:
                    query_res = self.index.query(
                        vector=resume_emb,
                        top_k=50,
                        include_metadata=False
                    )
                    for match in query_res.get("matches", []):
                        matched_job_ids_scores[str(match["id"])] = float(match["score"])
            except Exception as e:
                print(f"[Matcher WARN] Pinecone query failed: {e}. Switching to local matching fallback.")

        # 6. Calculate local scores and analyses for each valid job
        print(f"[Matcher] Processing {len(valid_jobs_in_db)} valid LinkedIn jobs...")
        job_evaluations = []

        for job in valid_jobs_in_db:
            local_score, analysis = self._calculate_local_match_score(resume_text_clean, job)
            final_score = matched_job_ids_scores.get(str(job.id), local_score)
            job_evaluations.append((job, final_score, analysis))

        # 7. Sort jobs by match score descending
        job_evaluations.sort(key=lambda item: item[1], reverse=True)
        top_jobs = job_evaluations[:limit]

        # 6. Build enriched job objects for response
        enriched_jobs = []
        for job, score, analysis in top_jobs:
            total_skills = len(analysis.get("matched_skills", [])) + len(analysis.get("missing_skills", []))
            skill_match_percent = int((len(analysis.get("matched_skills", [])) / max(1, total_skills)) * 100)
            
            db_job_type = getattr(job, 'job_type', None)
            if not db_job_type:
                is_intern = "intern" in (job.job_title or "").lower() or "intern" in (job.job_description or "").lower()
                job_type = "internship" if is_intern else "job"
            else:
                job_type = db_job_type.lower()
                
            db_duration = getattr(job, 'duration', None)
            duration = db_duration or ("3 Months" if job_type == "internship" else "Permanent")
            
            desc_lower = (job.job_description or "").lower()
            loc_lower = (job.job_location or "").lower()
            if "remote" in loc_lower or "remote" in desc_lower:
                workplace_type = "Remote"
            elif "hybrid" in loc_lower or "hybrid" in desc_lower:
                workplace_type = "Hybrid"
            else:
                workplace_type = "Onsite"
                
            job_title_clean = (job.job_title or "").strip()
            if not job_title_clean and job.job_url and "jobs/view/" in job.job_url:
                try:
                    title_part = job.job_url.split("jobs/view/")[1].split("-at-")[0]
                    job_title_clean = title_part.replace("-", " ").title()
                except Exception:
                    pass
            if not job_title_clean:
                job_title_clean = "Software Developer"

            company_clean = (job.company_name or "").strip()
            if not company_clean and job.job_url and "-at-" in job.job_url:
                try:
                    comp_part = job.job_url.split("-at-")[1].split("-")[0]
                    company_clean = comp_part.title()
                except Exception:
                    pass
            if not company_clean:
                company_clean = "Tech Enterprise"

            if "senior" in job_title_clean.lower() or "lead" in job_title_clean.lower() or "5+ years" in desc_lower:
                experience_required = "Senior"
            elif "mid" in job_title_clean.lower() or "3+ years" in desc_lower:
                experience_required = "Mid-level"
            else:
                experience_required = "Entry-level"
                
            matched_list = analysis.get("matched_skills", [])
            missing_list = analysis.get("missing_skills", [])
            required_skills_list = list(set(matched_list + missing_list))
            
            match_score_int = int(score * 100) if score <= 1.0 else int(score)

            enriched_jobs.append({
                "id": job.id,
                "job_role_title": job_title_clean,
                "company_name": company_clean,
                "job_type": job_type,
                "job_location": job.job_location or "Remote",
                "salary_or_stipend": job.salary or ("Paid Stipend" if job_type == "internship" else "Based on Experience"),
                "experience_level": "Internship" if job_type == "internship" else "Professional",
                "job_link": job.job_url,
                "match_score": match_score_int,
                "match_percent": match_score_int,
                "skill_match_percent": skill_match_percent,
                "matched_skills": matched_list,
                "missing_skills": missing_list,
                "required_skills": required_skills_list,
                "explanation": analysis.get("explanation", ""),
                "suggestions": analysis.get("suggestions", []),
                "duration": duration,
                "workplace_type": workplace_type,
                "experience_required": experience_required
            })
            
        return enriched_jobs

    def _calculate_local_match_score(self, resume_text: str, job: JobPosting) -> tuple[float, dict]:
        """Calculates deterministic match score and skill breakdown based on keyword matching."""
        res_lower = resume_text.lower()
        job_title_lower = (job.job_title or "").lower()
        job_desc_lower = (job.job_description or "").lower()
        job_skills_lower = (getattr(job, "skills", "") or "").lower()
        full_job_text = f"{job_title_lower} {job_desc_lower} {job_skills_lower}"

        skill_catalog = [
            "python", "javascript", "typescript", "react", "fastapi", "django", "nodejs", "node.js",
            "java", "c#", "c++", "golang", "go", "rust", "php", "ruby", "swift", "kotlin",
            "docker", "aws", "gcp", "azure", "kubernetes", "k8s", "terraform", "ci/cd", "jenkins",
            "postgresql", "postgres", "mongodb", "mysql", "sql", "sqlite", "redis", "elasticsearch",
            "git", "github", "gitlab", "rest", "restful", "graphql", "microservices",
            "html", "css", "tailwind", "bootstrap", "express", "flask", "next.js", "vue", "angular",
            "machine learning", "deep learning", "nlp", "ai", "pandas", "numpy", "pytorch", "tensorflow",
            "scikit-learn", "data analysis", "data science", "agile", "scrum", "jira", "linux", "unix"
        ]

        matched_skills = []
        missing_skills = []

        for skill in skill_catalog:
            pattern = r'\b' + re.escape(skill) + r'\b'
            if re.search(pattern, full_job_text):
                if re.search(pattern, res_lower):
                    matched_skills.append(skill.title() if len(skill) > 3 else skill.upper())
                else:
                    missing_skills.append(skill.title() if len(skill) > 3 else skill.upper())

        total_job_skills = len(matched_skills) + len(missing_skills)
        skill_ratio = (len(matched_skills) / total_job_skills) if total_job_skills > 0 else 0.6

        title_words = set(re.findall(r'\b[a-z]{3,}\b', job_title_lower))
        title_matches = [w for w in title_words if w in res_lower]
        title_ratio = (len(title_matches) / len(title_words)) if title_words else 0.5

        resume_words = set(re.findall(r'\b[a-z]{3,}\b', res_lower))
        job_words = set(re.findall(r'\b[a-z]{3,}\b', full_job_text))
        stop_words = {"and", "the", "for", "with", "that", "this", "from", "you", "are", "will", "our", "have", "been", "work", "team", "year", "years"}
        resume_words -= stop_words
        job_words -= stop_words

        text_overlap_ratio = (len(resume_words.intersection(job_words)) / max(10, min(100, len(job_words)))) if job_words else 0.4
        text_overlap_ratio = min(1.0, text_overlap_ratio)

        raw_score = (0.50 * skill_ratio) + (0.30 * title_ratio) + (0.20 * text_overlap_ratio)
        final_score = round(min(0.96, max(0.45, 0.45 + (raw_score * 0.50))), 2)

        analysis = {
            "matched_skills": matched_skills if matched_skills else ["Software Engineering", "Problem Solving"],
            "missing_skills": missing_skills[:5],
            "explanation": f"Matched skills: {', '.join((matched_skills if matched_skills else ['Software Engineering'])[:3])}",
            "suggestions": [f"Acquire experience in {s}" for s in missing_skills[:3]] if missing_skills else ["Optimize keywords"]
        }

        return final_score, analysis
