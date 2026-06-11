import sys
import os
import json

# Add backend directory to python path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "..", "..", "backend"))

from job_service import JobService
from database import SessionLocal

db = SessionLocal()
try:
    svc = JobService(db)
    resume = "Python developer with FastAPI, React, SQL, Git, and Docker experience. Strong frontend skills."
    print("Running recommendations for resume:", resume)
    recs = svc.match_resume_to_jobs(resume_text=resume)
    print(f"Found {len(recs)} matches.")
    if recs:
        print("First match details:")
        print(json.dumps(recs[0], indent=2))
finally:
    db.close()
