import re

def analyze_resume_with_ai(text: str):

    # Extract email
    email = re.findall(r'\S+@\S+', text)
    email = email[0] if email else "Not Found"

    # Extract phone
    phone = re.findall(r'\+?\d[\d -]{8,12}\d', text)
    phone = phone[0] if phone else "Not Found"

    # Simple skill detection
    skills_list = ["Python", "Java", "C++", "React", "Node", "SQL", "Machine Learning", "HTML", "CSS"]
    found_skills = [skill for skill in skills_list if skill.lower() in text.lower()]

    # Simple summary (first 5 lines)
    lines = text.split("\n")
    summary = " ".join(lines[:5])

    # Simple ATS Score
    ats_score = min(len(found_skills) * 10, 100)

    return {
        "summary": summary,
        "email": email,
        "phone": phone,
        "skills": found_skills,
        "ats_score": ats_score
    }
