import os
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from PyPDF2 import PdfReader
from docx import Document

from ai_services import AIServices, clean_resume_text


def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    with open(file_path, "rb") as file:
        reader = PdfReader(file)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text
    return text


def extract_text_from_docx(file_path: str) -> str:
    doc = Document(file_path)
    return "\n".join(para.text for para in doc.paragraphs if para.text)


def extract_resume_text(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        raw = extract_text_from_pdf(file_path)
    elif ext in (".docx", ".doc"):
        raw = extract_text_from_docx(file_path)
    else:
        raw = ""
    return clean_resume_text(raw)


def _build_report_pdf(report_path: str, analysis: dict):
    doc = SimpleDocTemplate(report_path)
    styles = getSampleStyleSheet()
    elements = []

    ats_score = analysis.get("ats_score", 0)
    summary = analysis.get("summary", "")
    profile_overview = analysis.get("profile_overview", {})
    detailed_summary = analysis.get("detailed_summary", {})
    jobs = analysis.get("job_recommendations", [])

    elements.append(Paragraph(f"ATS Score: {ats_score}%", styles["Heading1"]))
    elements.append(Spacer(1, 12))
    elements.append(Paragraph("Executive Summary:", styles["Heading2"]))
    elements.append(Paragraph(summary, styles["Normal"]))
    elements.append(Spacer(1, 12))

    if profile_overview:
        elements.append(Paragraph("Profile Overview:", styles["Heading3"]))
        elements.append(Paragraph(f"<b>Strength:</b> {profile_overview.get('strength', '')}", styles["Normal"]))
        elements.append(Paragraph(f"<b>Experience Level:</b> {profile_overview.get('experience_level', '')}", styles["Normal"]))
        elements.append(Paragraph(f"<b>Key Domain:</b> {profile_overview.get('domain', '')}", styles["Normal"]))
        elements.append(Spacer(1, 12))

    if detailed_summary:
        for key, title in [
            ("key_strengths", "Key Strengths"),
            ("missing_skills", "Missing Skills"),
            ("improvement_suggestions", "Improvement Suggestions"),
            ("ats_optimization", "ATS Optimization Tips"),
            ("job_suitability", "Job Role Suitability"),
        ]:
            elements.append(Paragraph(f"{title}:", styles["Heading3"]))
            for item in detailed_summary.get(key, []):
                elements.append(Paragraph(f"• {item}", styles["Normal"]))
            elements.append(Spacer(1, 12))

    elements.append(Paragraph("Job Recommendations:", styles["Heading2"]))
    for job in jobs:
        job_text = (
            f"<b>{job.get('title', 'Unknown')}</b> at {job.get('company', 'Unknown Corp')} "
            f"({job.get('match_percentage', 0)}% Match)<br/>"
            f"Location: {job.get('location', 'N/A')} | Level: {job.get('experience_level', 'N/A')}<br/>"
            f"{job.get('description', '')}"
        )
        elements.append(Paragraph(job_text, styles["Normal"]))
        elements.append(Spacer(1, 6))

    doc.build(elements)


def analyze_resume_with_ai(file_path: str) -> dict:
    resume_text = extract_resume_text(file_path)
    analysis = AIServices().analyze_resume_text(resume_text)

    os.makedirs("uploads", exist_ok=True)
    report_filename = f"{os.path.basename(file_path).split('.')[0]}_report.pdf"
    report_path = os.path.join("uploads", report_filename)
    _build_report_pdf(report_path, analysis)

    return {
        "summary": analysis.get("summary", ""),
        "profile_overview": analysis.get("profile_overview", {}),
        "detailed_summary": analysis.get("detailed_summary", {}),
        "score_breakdown": analysis.get("score_breakdown", {}),
        "ats_score": analysis.get("ats_score", 0),
        "job_recommendations": analysis.get("job_recommendations", []),
        "strengths": analysis.get("strengths", []),
        "weaknesses": analysis.get("weaknesses", []),
        "formatting_suggestions": analysis.get("formatting_suggestions", []),
        "keyword_optimization": analysis.get("keyword_optimization", []),
        "industry_suggestions": analysis.get("industry_suggestions", []),
        "report_filename": report_filename,
        "resume_text": analysis.get("resume_text", resume_text),
    }


def enhance_resume(text: str) -> list[str]:
    return AIServices().generate_editing_suggestions(text)
