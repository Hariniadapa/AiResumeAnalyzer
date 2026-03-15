import os
import json
import math
from sqlalchemy.orm import Session
from models import JobPosting
from ai_engine import ai_engine
from datetime import datetime
from pinecone import Pinecone, ServerlessSpec

class JobService:
    def __init__(self, db: Session):
        self.db = db
        
        # Pinecone Initialization
        pinecone_key = os.getenv("PINECONE_API_KEY")
        if pinecone_key and pinecone_key != "your-pinecone-api-key-here":
            self.pc = Pinecone(api_key=pinecone_key)
            self.index_name = "ai-resume-jobs"
            try:
                # Check if index exists, else create
                if self.index_name not in [idx.name for idx in self.pc.list_indexes()]:
                    self.pc.create_index(
                        name=self.index_name,
                        dimension=1536,
                        metric="cosine",
                        spec=ServerlessSpec(
                            cloud="aws",
                            region="us-east-1"
                        )
                    )
                self.index = self.pc.Index(self.index_name)
            except Exception as e:
                print(f"Pinecone init error: {e}")
                self.index = None
        else:
            self.index = None

    def get_embedding(self, text: str):
        # We disabled local Pinecone vector embeddings usage since we use AI direct matching now.
        return None

    def cosine_similarity(self, v1, v2):
        if not v1 or not v2:
            return 0.0
        dot_product = sum(a * b for a, b in zip(v1, v2))
        magnitude_v1 = math.sqrt(sum(a * a for a in v1))
        magnitude_v2 = math.sqrt(sum(b * b for b in v2))
        if magnitude_v1 == 0 or magnitude_v2 == 0:
            return 0.0
        return dot_product / (magnitude_v1 * magnitude_v2)

    def scrape_and_store_jobs(self, query: str = "Software Engineer"):
        # This is a demonstration scraper
        # In a real scenario, this would call Selenium or a Job API
        # Here we provide sample data to demonstrate the system
        
        sample_jobs = [
            {
                "company_name": "Google",
                "job_title": f"Senior {query}",
                "job_location": "Mountain View, CA",
                "job_url": f"https://careers.google.com/jobs/results/{query.lower().replace(' ', '-')}/",
                "job_description": f"Join Google as a {query}. You will work on massive scale systems, develop new features, and collaborate with cross-functional teams. Requirements: Python, Java, Distributing Systems, 5+ years experience."
            },
            {
                "company_name": "Microsoft",
                "job_title": f"Azure {query}",
                "job_location": "Redmond, WA",
                "job_url": "https://careers.microsoft.com/",
                "job_description": f"Help build the future of cloud computing at Microsoft. We are looking for a {query} with experience in C#, Azure, and SQL. You will be responsible for designing and implementing scalable cloud services."
            },
            {
                "company_name": "Amazon",
                "job_title": f"AWS {query}",
                "job_location": "Seattle, WA",
                "job_url": "https://amazon.jobs/",
                "job_description": f"Amazon is seeking a {query} to join our AWS team. Experience with React, Node.js, and cloud native applications is a must. You will build tools that power thousands of developers."
            },
            {
                "company_name": "Meta",
                "job_title": f"Frontend {query}",
                "job_location": "Menlo Park, CA",
                "job_url": "https://www.metacareers.com/",
                "job_description": f"Engage with the world's largest social network. We need a {query} proficient in React, JavaScript, and UI/UX patterns. Passion for user experience is essential."
            }
        ]
        
        saved_count = 0
        vectors_to_upsert = []

        for job in sample_jobs:
            existing = self.db.query(JobPosting).filter(JobPosting.job_url == job["job_url"]).first()
            if not existing:
                db_job = JobPosting(
                    company_name=job["company_name"],
                    job_title=job["job_title"],
                    job_location=job["job_location"],
                    job_url=job["job_url"],
                    job_description=job["job_description"],
                    posted_date=datetime.now().strftime("%Y-%m-%d")
                )
                self.db.add(db_job)
                self.db.commit() # commit to generate ID
                self.db.refresh(db_job)
                
                # Get Embedding and prep for Pinecone
                embedding = self.get_embedding(job["job_description"])
                if embedding and self.index:
                    vectors_to_upsert.append({
                        "id": str(db_job.id),
                        "values": embedding,
                        "metadata": {
                            "title": db_job.job_title,
                            "company": db_job.company_name
                        }
                    })
                
                saved_count += 1
        
        if self.index and vectors_to_upsert:
            try:
                self.index.upsert(vectors=vectors_to_upsert)
                print(f"Upserted {len(vectors_to_upsert)} jobs to pinecone.")
            except Exception as e:
                print(f"Pinecone upsert error: {e}")

        return {"message": f"Scraped and saved {saved_count} new jobs for query: {query}"}

    def match_resume_to_jobs(self, resume_text: str):
        jobs_in_db = self.db.query(JobPosting).all()
        # limit to prevent massive payload, e.g. last 30 scraped jobs
        jobs_in_db = jobs_in_db[-30:] if jobs_in_db else []
        
        db_jobs_context = ""
        for j in jobs_in_db:
            db_jobs_context += f"ID: {j.id} | Title: {j.job_title} | Company: {j.company_name} | Location: {j.job_location}\nDescription: {j.job_description[:500]}...\n\n"

        if not db_jobs_context:
            db_jobs_context = "No pre-scraped jobs found. Generate highly relevant mock jobs instead."

        prompt = f"""
        Analyze this candidate's resume and generate 8 highly relevant job opportunities that perfectly match the user's profile based strictly on their skills, technologies, and experience.
        IMPORTANT: Your recommendations MUST be heavily influenced by the provided resume insight. Do not return generic jobs.
        
        Resume insight: {resume_text[:3000]}
        
        Available scraped jobs in exactly this market (try to match from these if possible):
        {db_jobs_context}
        
        For each job role, provide EXACTLY these fields:
        - "job_role_title": The exact Job Role Title (e.g., Frontend Developer at Google)
        - "job_type": Exactly "Full-Time" or "Internship"
        - "required_skills": A list of 5 Required Skills that the candidate HAS which MATCHES the job.
        - "salary_or_stipend": Estimated Salary or Stipend for this role
        - "experience_level": Appropriate experience level (e.g., "Full-time • Mid-Level" or "Internship • 6 Months")
        - "job_link": The actual job_url if from available scraped jobs, or an empty string.
        
        Exactly 4 opportunities should be Full-Time roles and exactly 4 opportunities should be Internships.
        Return a JSON object with a single key "jobs" containing a list of these job objects.
        """
        try:
            content = ai_engine.generate_content(
                prompt=prompt,
                system_instruction="You are an expert career advisory AI matching resumes to jobs. Output only valid JSON.",
                json_mode=True
            )
            data = None
            if content:
                try:
                    data = json.loads(content)
                except:
                    pass
            
            jobs = data.get("jobs", []) if isinstance(data, dict) else []

            if not jobs:
                jobs = [
                    {
                        "job_role_title": "Software Developer Intern",
                        "job_type": "Internship",
                        "required_skills": ["Python", "Algorithms", "React"],
                        "salary_or_stipend": "$4,000 / month",
                        "experience_level": "Internship"
                    }
                ]

            for job in jobs:
                if not job.get("job_link"):
                    title = job.get("job_role_title", "Software Engineer")
                    skills = job.get("required_skills", [])
                    skill_query = " ".join(skills[:2]) if skills else "Software"
                    search_term = f"{title} {skill_query}".strip()
                    import urllib.parse
                    keywords = urllib.parse.quote(search_term)
                    job["job_link"] = f"https://www.linkedin.com/jobs/search/?keywords={keywords}"
            return jobs
        except Exception as e:
            print(f"GPT dynamic jobs error: {e}")
            return []

    def _generate_detailed_analysis(self, resume_text, job_desc):
        prompt = f"""
        Compare this Resume with this Job Description.
        
        Resume: {resume_text[:1500]}
        
        Job Description: {job_desc[:1500]}
        
        Return a JSON object with:
        {{
            "matched_skills": ["skill1", "skill2"],
            "missing_skills": ["skill3", "skill4"],
            "explanation": "Brief explanation of why this job matches the resume",
            "suggestions": ["Improvement suggestion 1", "Improvement suggestion 2"]
        }}
        """
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo-0125",
                messages=[
                    {"role": "system", "content": "You are an expert job matching assistant. Output only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"GPT analysis error: {e}")
            return {
                "matched_skills": [],
                "missing_skills": [],
                "explanation": "Analysis failed.",
                "suggestions": []
            }

    def get_market_trends(self):
        jobs = self.db.query(JobPosting).all()
        if not jobs:
            return {"trending_skills": [], "analysis": "No job data available."}
        
        all_descriptions = " ".join([j.job_description for j in jobs])
        
        prompt = f"""
        Analyze the following aggregated job descriptions and identify trending skills and technologies in the current market.
        
        Descriptions: {all_descriptions[:3000]}
        
        Return a JSON object with:
        {{
            "trending_skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
            "analysis": "A brief 2-3 sentence overview of why these technologies are trending and what users should focus on."
        }}
        """
        try:
            content = ai_engine.generate_content(
                prompt=prompt,
                system_instruction="You are a job market analyst. Output only valid JSON.",
                json_mode=True
            )
            data = json.loads(content) if content else {}
            if "trending_skills" in data:
                return data
            raise ValueError("Invalid format")
        except Exception as e:
            print(f"Market analysis error: {e}")
            return {
                "trending_skills": ["React", "Python", "AWS", "Machine Learning", "FastAPI"],
                "analysis": "The market is currently seeing a massive shift towards AI-integrated applications, with Python and cloud infrastructure taking the lead. Full-stack engineers with modern framework experience remain heavily demanded."
            }
