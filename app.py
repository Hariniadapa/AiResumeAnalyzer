import streamlit as st
import pandas as pd
import pdfplumber
import os
import re
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import letter

# ================= PAGE CONFIG =================
st.set_page_config(page_title="AI Resume Analyzer", layout="centered")

USER_FILE = "users.csv"
HISTORY_FILE = "resume_history.csv"

# ================= STYLING =================
st.markdown("""
<style>
.stApp {
    background: linear-gradient(-45deg, #020617, #1e3a8a, #020617, #312e81);
    background-size: 400% 400%;
    animation: gradientBG 15s ease infinite;
}
@keyframes gradientBG {
    0% {background-position: 0% 50%;}
    50% {background-position: 100% 50%;}
    100% {background-position: 0% 50%;}
}
h1, h2, h3, h4, h5, h6, p, span, label, div {
    color: white !important;
}
</style>
""", unsafe_allow_html=True)

# ================= USER FUNCTIONS =================
def load_users():
    if os.path.exists(USER_FILE):
        return pd.read_csv(USER_FILE)
    return pd.DataFrame(columns=["username", "password"])

def save_user(username, password):
    df = load_users()
    df.loc[len(df)] = [username, password]
    df.to_csv(USER_FILE, index=False)

def save_history(username, score, role, skills):
    if os.path.exists(HISTORY_FILE):
        df = pd.read_csv(HISTORY_FILE)
    else:
        df = pd.DataFrame(columns=["username", "score", "job_role", "skills", "date"])

    new_data = {
        "username": username,
        "score": score,
        "job_role": role,
        "skills": ", ".join(skills),
        "date": pd.Timestamp.now()
    }

    df.loc[len(df)] = new_data
    df.to_csv(HISTORY_FILE, index=False)

def generate_pdf(username, score, role, skills):
    filename = f"{username}_Resume_Report.pdf"
    doc = SimpleDocTemplate(filename, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()

    elements.append(Paragraph("<b>Resume Analysis Report</b>", styles["Title"]))
    elements.append(Spacer(1, 12))
    elements.append(Paragraph(f"User: {username}", styles["Normal"]))
    elements.append(Spacer(1, 8))
    elements.append(Paragraph(f"Resume Score: {score}/100", styles["Normal"]))
    elements.append(Spacer(1, 8))
    elements.append(Paragraph(f"Recommended Role: {role}", styles["Normal"]))
    elements.append(Spacer(1, 8))
    elements.append(Paragraph(f"Detected Skills: {', '.join(skills)}", styles["Normal"]))

    doc.build(elements)
    return filename

# ================= SESSION =================
if "logged_in" not in st.session_state:
    st.session_state.logged_in = False
if "role" not in st.session_state:
    st.session_state.role = "user"
if "username" not in st.session_state:
    st.session_state.username = ""

st.title("📄 AI Resume Analysis System")

# ================= LOGIN / REGISTER =================
menu = st.sidebar.selectbox("Menu", ["Login", "Register"])

if not st.session_state.logged_in:

    if menu == "Register":
        st.subheader("📝 Register")
        u = st.text_input("Username")
        p = st.text_input("Password", type="password")

        if st.button("Register"):
            if u and p:
                save_user(u, p)
                st.success("Registered successfully! Please login.")
            else:
                st.warning("Fill all fields")

    if menu == "Login":
        st.subheader("🔐 Login")
        u = st.text_input("Username")
        p = st.text_input("Password", type="password")

        if st.button("Login"):

            if u == "admin" and p == "admin123":
                st.session_state.logged_in = True
                st.session_state.role = "admin"
                st.session_state.username = "admin"
                st.rerun()

            users = load_users()
            if ((users.username == u) & (users.password == p)).any():
                st.session_state.logged_in = True
                st.session_state.role = "user"
                st.session_state.username = u
                st.rerun()
            else:
                st.error("Invalid credentials")

if st.session_state.logged_in:
    if st.sidebar.button("🚪 Logout"):
        st.session_state.logged_in = False
        st.session_state.role = "user"
        st.session_state.username = ""
        st.rerun()

# ================= RESUME FUNCTIONS =================
def extract_text_from_pdf(pdf_file):
    text = ""
    with pdfplumber.open(pdf_file) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
    return text.lower()

def analyze_resume(text):

    skill_categories = {
        "Programming": ["python", "java", "c++"],
        "Web Development": ["html", "css", "javascript"],
        "AI & Data": ["machine learning", "data science"],
        "Database": ["sql"]
    }

    detected_skills = []
    skill_frequency = {}
    category_count = {}

    for category, keywords in skill_categories.items():
        category_count[category] = 0

        for keyword in keywords:
            matches = re.findall(keyword, text)
            if matches:
                skill_name = keyword.title()
                detected_skills.append(skill_name)
                skill_frequency[skill_name] = len(matches)
                category_count[category] += len(matches)

    return detected_skills, skill_frequency, category_count

def resume_score(skills, frequency, text):
    base_score = sum(frequency.values()) * 5
    project_bonus = 10 if "project" in text else 0
    return min(base_score + project_bonus, 100)

def resume_level(score):
    if score < 40:
        return "Beginner"
    elif score < 75:
        return "Intermediate"
    else:
        return "Advanced"

def confidence_score(skills):
    return 35 if not skills else min(60 + len(skills) * 5, 95)

def ai_summary(skills, score):
    if not skills:
        return "The resume lacks technical exposure. Add structured projects and certifications."

    if score > 75:
        return "This resume demonstrates strong technical capability and domain clarity."

    if score > 40:
        return "The resume shows good foundation but needs more project depth."

    return "The resume requires improvement in technical skills and structured formatting."

def suggestions(skills):
    tips = []
    for s in ["Python", "SQL", "Java"]:
        if s not in skills:
            tips.append(f"Consider adding {s}.")
    tips += [
        "Add career objective",
        "Include internships",
        "Use bullet points",
        "Keep resume 1-2 pages"
    ]
    return tips

def job_role(skills):
    if not skills:
        return "Fresher"
    if "Machine Learning" in skills or "Data Science" in skills:
        return "ML Engineer / Data Analyst"
    if "Html" in skills and "Css" in skills and "Javascript" in skills:
        return "Web Developer"
    return "Software Developer"

# ================= ADMIN DASHBOARD =================
if st.session_state.logged_in and st.session_state.role == "admin":
    st.header("🛠️ Admin Dashboard")
    users_df = load_users()
    st.metric("👥 Total Registered Users", len(users_df))
    if not users_df.empty:
        st.dataframe(users_df)

# ================= USER DASHBOARD =================
if st.session_state.logged_in and st.session_state.role == "user":

    st.subheader(f"Welcome {st.session_state.username} 👋")
    uploaded = st.file_uploader("📤 Upload Resume (PDF only)", type=["pdf"])

    if uploaded:
        text = extract_text_from_pdf(uploaded)
        skills, frequency, category_count = analyze_resume(text)
        score = resume_score(skills, frequency, text)
        role = job_role(skills)

        save_history(st.session_state.username, score, role, skills)

        st.progress(score)
        st.write(f"Score: {score}/100")
        st.info(f"Resume Level: {resume_level(score)}")
        st.metric("AI Confidence", f"{confidence_score(skills)}%")
        st.write("Summary:", ai_summary(skills, score))
        st.success(f"Recommended Role: {role}")

        st.subheader("🛠 Skill Strength Analysis")
        for skill, count in frequency.items():
            st.write(f"{skill} mentioned {count} times")

        st.subheader("📊 Skill Category Distribution")
        category_df = pd.DataFrame(
            list(category_count.items()),
            columns=["Category", "Count"]
        )

        if category_df["Count"].sum() > 0:
            st.bar_chart(category_df.set_index("Category"))

        st.subheader("Suggestions:")
        for tip in suggestions(skills):
            st.write("•", tip)

        if os.path.exists(HISTORY_FILE):
            history_df = pd.read_csv(HISTORY_FILE)
            user_history = history_df[history_df["username"] == st.session_state.username]
            if not user_history.empty:
                st.subheader("📊 Resume History")
                st.dataframe(user_history)
                st.line_chart(user_history["score"])

        pdf_file = generate_pdf(
            st.session_state.username,
            score,
            role,
            skills
        )

        with open(pdf_file, "rb") as f:
            st.download_button(
                label="📥 Download Resume Report",
                data=f,
                file_name=pdf_file,
                mime="application/pdf"
            )







