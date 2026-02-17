import os
from PyPDF2 import PdfReader
from docx import Document
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

# ==============================
# Extract Text
# ==============================

def extract_text_from_pdf(file_path):
    text = ""
    with open(file_path, "rb") as file:
        reader = PdfReader(file)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text
    return text


def extract_text_from_docx(file_path):
    doc = Document(file_path)
    text = ""
    for para in doc.paragraphs:
        text += para.text
    return text


# ==============================
# ATS Score Logic
# ==============================

def calculate_ats_score(text):
    keywords = ["python", "java", "sql", "machine learning", "react", "fastapi"]
    score = 0

    for word in keywords:
        if word.lower() in text.lower():
            score += 15

    return min(score, 100)


# ==============================
# Job Recommendation
# ==============================

def recommend_jobs(text):
    text = text.lower()
    jobs = []

    if "python" in text:
        jobs.append("Python Developer")
    if "machine learning" in text:
        jobs.append("Machine Learning Engineer")
    if "react" in text:
        jobs.append("Frontend Developer")
    if "java" in text:
        jobs.append("Java Developer")

    if not jobs:
        jobs.append("Software Developer")

    return jobs


# ==============================
# AI Summary (Basic LLM Ready)
# ==============================

def generate_summary(text):
    words = text.split()
    return " ".join(words[:100]) + "..."


# ==============================
# AI Suggestions
# ==============================

def enhance_resume(text):
    suggestions = []

    if "python" not in text.lower():
        suggestions.append("Consider adding Python skills.")
    if "machine learning" not in text.lower():
        suggestions.append("Add ML projects if possible.")
    if len(text.split()) < 200:
        suggestions.append("Add more measurable achievements.")
    if not suggestions:
        suggestions.append("Your resume looks strong. Improve formatting slightly.")

    return suggestions


# ==============================
# Main Analyzer
# ==============================

def analyze_resume_with_ai(file_path):

    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf":
        resume_text = extract_text_from_pdf(file_path)
    elif ext in [".docx", ".doc"]:
        resume_text = extract_text_from_docx(file_path)
    else:
        resume_text = ""

    ats_score = calculate_ats_score(resume_text)
    jobs = recommend_jobs(resume_text)
    summary = generate_summary(resume_text)
    suggestions = enhance_resume(resume_text)

    # Generate PDF Report
    report_filename = os.path.join(
        "uploads",
        f"{os.path.basename(file_path).split('.')[0]}_report.pdf"
    )

    doc = SimpleDocTemplate(report_filename)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph(f"ATS Score: {ats_score}%", styles["Normal"]))
    elements.append(Spacer(1, 12))
    elements.append(Paragraph("Summary:", styles["Normal"]))
    elements.append(Paragraph(summary, styles["Normal"]))
    elements.append(Spacer(1, 12))
    elements.append(Paragraph("Job Recommendations:", styles["Normal"]))

    for job in jobs:
        elements.append(Paragraph(job, styles["Normal"]))

    elements.append(Spacer(1, 12))
    elements.append(Paragraph("Suggestions:", styles["Normal"]))

    for s in suggestions:
        elements.append(Paragraph(s, styles["Normal"]))

    doc.build(elements)

    return {
        "summary": summary,
        "ats_score": ats_score,
        "job_recommendations": jobs,
        "suggestions": suggestions,
        "report_filename": os.path.basename(report_filename)
    }
