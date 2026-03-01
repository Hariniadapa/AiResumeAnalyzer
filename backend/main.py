# ==============================
# IMPORTS
# ==============================
import os
import json
import pdfplumber
from dotenv import load_dotenv

from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError

from auth import register_user, login_user
from schema import User
from utils import SECRET_KEY, ALGORITHM
from resume_logic import enhance_resume
from sqlalchemy.orm import Session
from datetime import datetime
from models import Base, ResumeHistory
from database import engine, get_db



import PyPDF2

def extract_text_from_pdf(file):
    reader = PyPDF2.PdfReader(file)
    text = ""
    for page in reader.pages:
        text += page.extract_text()
    return text



# ==============================
# LOAD ENV VARIABLES
# ==============================
load_dotenv()



# ==============================
# CREATE FASTAPI APP
# ==============================
app = FastAPI()



# ==============================
# CREATE DATABASE TABLES
# ==============================
Base.metadata.create_all(bind=engine)



# ==============================
# CORS CONFIGURATION
# ==============================
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175"
    ],  # expanded frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# ==============================
# AUTH CONFIG
# ==============================
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# ==============================
# JWT HELPER
# ==============================
def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")

        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        return email

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ==============================
# ROOT ROUTE
# ==============================
@app.get("/")
def home():
    return {"message": "AI Resume Analyzer Backend Running 🚀"}


# ==============================
# REGISTER
# ==============================
@app.post("/register/")
def register(user: User, db: Session = Depends(get_db)):
    return register_user(user, db)


# ==============================
# LOGIN
# ==============================
@app.post("/login/")
def login(user: User, db: Session = Depends(get_db)):
    return login_user(user, db)

# ==============================
# UPLOAD & ANALYZE RESUME
# ==============================

@app.post("/upload/")
async def upload_resume(
    file: UploadFile = File(...),
    user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if not os.path.exists("uploads"):
            os.makedirs("uploads")

        contents = await file.read()
        temp_path = f"temp_{file.filename}"

        # Save temporarily
        with open(temp_path, "wb") as f:
            f.write(contents)

        # Use the logic from resume_logic.py
        from resume_logic import analyze_resume_with_ai
        result = analyze_resume_with_ai(temp_path)

        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

        # Save to History
        now = datetime.now()
        history_entry = ResumeHistory(
            user_email=user,
            filename=file.filename,
            upload_date=now.strftime("%Y-%m-%d"),
            upload_time=now.strftime("%H:%M:%S"),
            ats_score=result.get("ats_score", 0),
            job_recommendation_summary=", ".join([j.get("title", "") for j in result.get("job_recommendations", [])[:3]]),
            report_filename=result.get("report_filename", "")
        )
        db.add(history_entry)
        db.commit()

        return result

    except Exception as e:
        print("ERROR:", e)
        return {"error": f"AI processing failed: {str(e)}"}


@app.get("/upload-history/")
def get_upload_history(
    user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    history = db.query(ResumeHistory).filter(ResumeHistory.user_email == user).all()
    return history


@app.delete("/delete-history/{history_id}")
def delete_history(
    history_id: int,
    user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    entry = db.query(ResumeHistory).filter(ResumeHistory.id == history_id, ResumeHistory.user_email == user).first()
    if not entry:
        raise HTTPException(status_code=404, detail="History item not found")
    
    # Optionally delete the report file
    report_path = os.path.join("uploads", entry.report_filename)
    if os.path.exists(report_path):
        os.remove(report_path)

    db.delete(entry)
    db.commit()
    return {"message": "History item deleted"}







# ==============================
# DOWNLOAD REPORT
# ==============================
@app.get("/download-report/{filename}")
def download_report(
    filename: str,
    user: str = Depends(get_current_user)
):
    file_path = os.path.join("uploads", filename)

    if os.path.exists(file_path):
        return FileResponse(
            path=file_path,
            media_type="application/pdf",
            filename=filename
        )

    raise HTTPException(status_code=404, detail="File not found")


# ==============================
# AI RESUME ENHANCEMENT
# ==============================
@app.post("/enhance-resume/")
def enhance_resume_endpoint(
    data: dict,
    user: str = Depends(get_current_user)
):
    text = data.get("text")

    if not text:
        raise HTTPException(status_code=400, detail="No resume text provided")

    suggestions = enhance_resume(text)

    return {"suggestions": suggestions}
