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
from database import engine
from models import Base
from database import get_db
from sqlalchemy.orm import Session



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
    allow_origins=["http://localhost:5173"],  # frontend URL
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
    user: str = Depends(get_current_user)
):
    try:
        contents = await file.read()

        # Save temporarily
        with open("temp.pdf", "wb") as f:
            f.write(contents)

        # Extract text
        with open("temp.pdf", "rb") as f:
            resume_text = extract_text_from_pdf(f)

        # Trim long resumes
        resume_text = resume_text[:1500]

        # ---------- SIMPLE SUMMARY ----------
        lines = resume_text.split("\n")
        summary = " ".join(lines[:5])

        # ---------- SKILL KEYWORDS ----------
        keywords = ["python", "java", "react", "node", "sql", "machine learning", "html", "css"]
        found_skills = [word for word in keywords if word in resume_text.lower()]

        # ---------- ATS SCORE ----------
        ats_score = min(len(found_skills) * 12, 100)

        # ---------- JOB RECOMMENDATION ----------
        if "react" in resume_text.lower():
            job = "Frontend Developer"
        elif "python" in resume_text.lower():
            job = "Python Developer"
        elif "machine learning" in resume_text.lower():
            job = "ML Engineer"
        else:
            job = "Software Developer"

        return {
            "summary": summary,
            "ats_score": ats_score,
            "job_recommendation": job,
            "skills_found": found_skills
        }

    except Exception as e:
        print("ERROR:", e)
        return {"error": "AI processing failed"}







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
