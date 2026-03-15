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

class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String)
    job_title = Column(String)
    job_location = Column(String)
    job_url = Column(String)
    job_description = Column(String)
    posted_date = Column(String)
