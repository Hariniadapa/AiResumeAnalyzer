# ==============================
# IMPORTS
# ==============================
import os
from datetime import datetime

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from auth import register_user, login_user
from schema import User
from resume_logic import analyze_resume_with_ai
from models import Base, ResumeHistory
from database import engine, get_db
from dependencies import get_current_user

from job_service import JobService
from job_ingestion_service import JobIngestionService
from routes.ai_routes import router as ai_router


# ==============================
# APP INIT (MUST BE FIRST)
# ==============================
app = FastAPI()


# ==============================
# CORS (ONLY ONCE)
# ==============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================
# DB INIT
# ==============================
Base.metadata.create_all(bind=engine)

# Dynamic Schema Migration to avoid manual drops
try:
    with engine.begin() as conn:
        # Check and add resume_text to resume_history
        try:
            conn.execute(text("ALTER TABLE resume_history ADD COLUMN resume_text VARCHAR"))
            print("[DB Migration] Added resume_text to resume_history ✅")
        except Exception:
            pass  # Already exists or not supported
        
        # Check and add all possible missing columns to job_postings
        columns_to_check = ["salary", "skills", "source", "job_url", "posted_date", "duration", "job_type"]
        for col in columns_to_check:
            try:
                conn.execute(text(f"ALTER TABLE job_postings ADD COLUMN {col} VARCHAR"))
                print(f"[DB Migration] Added {col} to job_postings ✅")
            except Exception:
                pass
except Exception as migration_err:
    print(f"[DB Migration WARN] Migration checks skipped/failed: {migration_err}")

app.include_router(ai_router)


# ==============================
# STARTUP (SAFE FIX)
# ==============================
@app.on_event("startup")
def startup():
    try:
        scheduler = BackgroundScheduler()
        scheduler.add_job(
            func=lambda: JobIngestionService().run_ingestion(),
            trigger=IntervalTrigger(hours=6),
            id="job_ingestion",
            replace_existing=True,
        )
        scheduler.start()
        print("[OK] Scheduler started")
    except Exception as e:
        print("[WARN] Scheduler failed:", e)


# ==============================
# ROOT
# ==============================
@app.get("/")
def home():
    return {"message": "AI Resume Backend Running 🚀"}


# ==============================
# AUTH ROUTES
# ==============================
@app.post("/register/")
def register(user: User, db: Session = Depends(get_db)):
    return register_user(user, db)


@app.post("/login/")
def login(user: User, db: Session = Depends(get_db)):
    return login_user(user, db)


# ==============================
# UPLOAD RESUME
# ==============================
@app.post("/upload/")
async def upload_resume(
    file: UploadFile = File(...),
    user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        os.makedirs("uploads", exist_ok=True)

        contents = await file.read()
        temp_path = f"temp_{file.filename}"

        with open(temp_path, "wb") as f:
            f.write(contents)

        result = analyze_resume_with_ai(temp_path)

        if os.path.exists(temp_path):
            os.remove(temp_path)

        now = datetime.now()

        db.add(
            ResumeHistory(
                user_email=user,
                filename=file.filename,
                upload_date=now.strftime("%Y-%m-%d"),
                upload_time=now.strftime("%H:%M:%S"),
                ats_score=result.get("ats_score", 0),
                job_recommendation_summary=", ".join(
                    [j.get("title", "") for j in result.get("job_recommendations", [])[:3]]
                ),
                report_filename=result.get("report_filename", ""),
                resume_text=result.get("resume_text", ""),
            )
        )
        db.commit()

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==============================
# HISTORY
# ==============================
@app.get("/upload-history/")
def history(user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(ResumeHistory).filter_by(user_email=user).all()


# ==============================
# DELETE HISTORY
# ==============================
@app.delete("/delete-history/{history_id}")
def delete_history(
    history_id: int,
    user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = db.query(ResumeHistory).filter_by(
        id=history_id,
        user_email=user
    ).first()

    if not entry:
        raise HTTPException(status_code=404, detail="Not found")

    file_path = os.path.join("uploads", entry.report_filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    db.delete(entry)
    db.commit()

    return {"message": "deleted"}


# ==============================
# DOWNLOAD REPORT
# ==============================
@app.get("/download-report/{filename}")
def download(filename: str, user: str = Depends(get_current_user)):
    path = os.path.join("uploads", filename)

    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Not found")

    return FileResponse(path, media_type="application/pdf", filename=filename)


# ==============================
# JOB RECOMMENDATION & SEARCH ENDPOINTS
# ==============================
@app.get("/jobs/trends/")
def get_trends(db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    return JobService(db).get_market_trends()


@app.post("/jobs/scrape/")
def scrape_jobs(query: str = "Software Engineer", db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    return JobService(db).scrape_and_store_jobs(query)


@app.post("/jobs/recommend/")
def recommend_jobs(data: dict, db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    resume_text = data.get("resume_text", "").strip()
    
    # Auto-load latest resume text if none is sent by frontend
    if not resume_text:
        latest = db.query(ResumeHistory).filter_by(user_email=user).order_by(ResumeHistory.id.desc()).first()
        if latest and latest.resume_text:
            resume_text = latest.resume_text
            print(f"[Jobs Recommend] Loaded resume text from history for user {user}")
        else:
            latest_any = db.query(ResumeHistory).order_by(ResumeHistory.id.desc()).first()
            if latest_any and latest_any.resume_text:
                resume_text = latest_any.resume_text
                print(f"[Jobs Recommend] Loaded latest resume text fallback for user {user}")
            
    if not resume_text:
        # Return empty list to prevent downstream exceptions with empty string
        return []

    try:
        return JobService(db).match_resume_to_jobs(
            resume_text=resume_text,
            location=data.get("location", None),
            skills=data.get("skills", None),
            experience_level=data.get("experience_level", None)
        )
    except Exception as e:
        print(f"[Jobs Recommend ERROR] Recommendation failed: {e}")
        return []

