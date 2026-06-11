import sys
import os

# Add backend directory to python path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "..", "..", "backend"))

from job_ingestion_service import JobIngestionService
from database import SessionLocal

print("Starting manual ingestion run...")
db = SessionLocal()
try:
    ingestion = JobIngestionService(db)
    ingestion.run_ingestion()
    print("Ingestion run complete!")
finally:
    db.close()
