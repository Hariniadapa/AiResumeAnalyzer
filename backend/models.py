from sqlalchemy import Column, Integer, String
from database import Base


class UserDB(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class ResumeHistory(Base):
    __tablename__ = "resume_history"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True)
    filename = Column(String)
    upload_date = Column(String)
    upload_time = Column(String)
    ats_score = Column(Integer)
    job_recommendation_summary = Column(String)
    report_filename = Column(String)
    resume_text = Column(String, nullable=True)

class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(String, primary_key=True, index=True)
    job_title = Column(String)
    company_name = Column(String)
    job_description = Column(String)
    job_location = Column(String)
    salary = Column(String, nullable=True)
    skills = Column(String) # Store as JSON string or comma-separated
    source = Column(String)
    job_url = Column(String)
    posted_date = Column(String)
    duration = Column(String, nullable=True)
    job_type = Column(String, nullable=True)

