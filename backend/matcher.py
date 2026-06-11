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
        limit: int = 15
    ) -> list[dict]:
        
        # 1. Clean inputs
        resume_text_clean = resume_text.strip()
        if not resume_text_clean:
            return []

        # 2. Get resume embedding
        resume_emb = self.get_embedding(resume_text_clean)
        
        matched_job_ids_scores = {}
        
        # 3. Vector Similarity Search
        if self.index and sum(resume_emb) != 0.0:
            try:
                query_res = self.index.query(
                    vector=resume_emb,
                    top_k=50,
                    include_metadata=False
                )
                for match in query_res.get("matches", []):
                    matched_job_ids_scores[str(match["id"])] = float(match["score"])
            except Exception as e:
                print(f"[Matcher WARN] Pinecone query failed: {e}. Switching to local cosine fallback.")
        
        # 4. Fetch and Filter jobs from Database
        query = self.db.query(JobPosting)
        
        # Apply filters at DB level if specified
        if location:
            query = query.filter(JobPosting.job_location.ilike(f"%{location}%"))
        if experience_level:
            query = query.filter(
                JobPosting.job_title.ilike(f"%{experience_level}%") | 
                JobPosting.job_description.ilike(f"%{experience_level}%")
            )
            
        jobs_in_db = query.all()
        
        # 5. Local Similarity Calculation if Pinecone wasn't used/available
        if not matched_job_ids_scores:
            print(f"[Matcher] Running local comparison on {len(jobs_in_db)} jobs...")
            for job in jobs_in_db:
                # If we have embedding, compute local cosine similarity
                job_text = f"{job.job_title} {job.job_description}"
                job_emb = self.get_embedding(job_text)
                
                if sum(job_emb) != 0.0 and sum(resume_emb) != 0.0:
                    score = self.cosine_similarity(resume_emb, job_emb)
                else:
                    # Pure keyword overlap fallback score
                    words_resume = set(resume_text_clean.lower().split())
                    words_job = set(job_text.lower().split())
                    intersect = words_resume.intersection(words_job)
                    score = len(intersect) / max(1, len(words_job))
                    # Scale to fit around similarity range (0.3 to 0.8)
                    score = 0.3 + (score * 0.5)
                
                matched_job_ids_scores[str(job.id)] = score

        # 6. Build and Enrich Match Objects
        enriched_jobs = []
        
        # Sort jobs by matching scores
        sorted_jobs = sorted(jobs_in_db, key=lambda j: matched_job_ids_scores.get(str(j.id), 0.0), reverse=True)[:limit]
        
        for job in sorted_jobs:
            score = matched_job_ids_scores.get(str(job.id), 0.5)
            
            # AI Comparison Analysis
            analysis = self._run_ai_job_comparison(resume_text_clean, job.job_description)
            
            # Extract metrics
            total_skills = len(analysis.get("matched_skills", [])) + len(analysis.get("missing_skills", []))
            skill_match_percent = int((len(analysis.get("matched_skills", [])) / max(1, total_skills)) * 100)
            
            db_job_type = getattr(job, 'job_type', None)
            if not db_job_type:
                is_intern = "intern" in job.job_title.lower() or "intern" in (job.job_description or "").lower()
                job_type = "internship" if is_intern else "job"
            else:
                job_type = db_job_type.lower()
                
            db_duration = getattr(job, 'duration', None)
            duration = db_duration or ("3 Months" if job_type == "internship" else "Permanent")
            
            # Workplace type heuristics
            desc_lower = (job.job_description or "").lower()
            loc_lower = (job.job_location or "").lower()
            if "remote" in loc_lower or "remote" in desc_lower:
                workplace_type = "Remote"
            elif "hybrid" in loc_lower or "hybrid" in desc_lower:
                workplace_type = "Hybrid"
            else:
                workplace_type = "Onsite"
                
            # Experience level heuristics
            if "senior" in job.job_title.lower() or "lead" in job.job_title.lower() or "5+ years" in desc_lower or "7+ years" in desc_lower:
                experience_required = "Senior"
            elif "mid" in job.job_title.lower() or "3+ years" in desc_lower or "4+ years" in desc_lower:
                experience_required = "Mid-level"
            else:
                experience_required = "Entry-level"
                
            matched_list = analysis.get("matched_skills", [])
            missing_list = analysis.get("missing_skills", [])
            required_skills_list = list(set(matched_list + missing_list))
            
            enriched_jobs.append({
                "id": job.id,
                "job_role_title": job.job_title,
                "company_name": job.company_name,
                "job_type": job_type,
                "job_location": job.job_location,
                "salary_or_stipend": job.salary or ("Paid Stipend" if job_type == "internship" else "Based on Experience"),
                "experience_level": "Internship" if job_type == "internship" else "Professional",
                "job_link": job.job_url,
                "match_score": int(score * 100),
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

    def _run_ai_job_comparison(self, resume_text: str, job_desc: str) -> dict:
        """Runs the AI comparison with heuristic fallback protection."""
        try:
            return AIServices(self.db).compare_resume_to_job(resume_text, job_desc)
        except Exception as e:
            print(f"[Matcher WARN] AI Job comparison failed: {e}. Running local keyword overlap fallback.")
            
            # Simple keyword overlap analysis fallback
            matched = []
            missing = []
            
            # Key technical skills
            known_skills = [
                "python", "javascript", "react", "fastapi", "django", "nodejs",
                "java", "c#", "cpp", "docker", "aws", "gcp", "azure", "kubernetes",
                "postgresql", "mongodb", "mysql", "sql", "git", "typescript"
            ]
            
            res_lower = resume_text.lower()
            desc_lower = job_desc.lower()
            
            for skill in known_skills:
                # If skill is in both description and resume -> Matched
                if re.search(r'\b' + re.escape(skill) + r'\b', desc_lower):
                    if re.search(r'\b' + re.escape(skill) + r'\b', res_lower):
                        matched.append(skill.capitalize())
                    else:
                        missing.append(skill.capitalize())
            
            if not matched:
                matched.append("Software Engineering")
                
            return {
                "matched_skills": matched,
                "missing_skills": missing[:5],
                "explanation": "Heuristic match based on overlap of programming languages, frameworks, and tools.",
                "suggestions": [f"Gain experience in {s}" for s in missing[:3]] if missing else ["Optimize resume keyword density"]
            }
