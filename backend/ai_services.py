import json
import re
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ai_engine import ai_engine, ai_errors, AIEngineError

MAX_RESUME_LEN = 5000


def _raise_http_from_ai(exc: AIEngineError):
    status = 503 if exc.code in ("quota_exceeded", "timeout", "network_error", "api_failure") else 400
    if exc.code in ("missing_api_key", "invalid_api_key", "client_init_failed"):
        status = 503
    raise HTTPException(status_code=status, detail=str(exc))


def clean_resume_text(text: str) -> str:
    if not text:
        return ""
    text = text.replace("\x00", " ")
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


class AIServices:
    """Single backend service for all Gemini-powered features."""

    def __init__(self, db: Optional[Session] = None):
        self.db = db

    def _parse_json_response(self, content: str, feature: str) -> dict:
        data = ai_engine.safe_json_loads(content)
        if not data:
            err = AIEngineError("Failed to parse AI response as valid JSON", "invalid_json")
            _raise_http_from_ai(err)
        return data

    # ---------------- RESUME ANALYZER ---------------- #

    def analyze_resume_text(self, resume_text: str) -> dict[str, Any]:
        cleaned = clean_resume_text(resume_text)
        if not cleaned:
            raise HTTPException(status_code=400, detail="Resume text is empty or could not be extracted")

        prompt = f"""
Analyze this resume for ATS compatibility and career fit.

Return JSON with this exact structure:
{{
  "profile_overview": {{
    "strength": "Overall profile strength",
    "experience_level": "Entry-level | Mid-level | Senior",
    "domain": "Primary professional domain"
  }},
  "score_breakdown": {{
    "skills": 0,
    "experience": 0,
    "keywords": 0,
    "formatting": 0,
    "grammar": 0
  }},
  "detailed_summary": {{
    "key_strengths": ["..."],
    "missing_skills": ["..."],
    "improvement_suggestions": ["..."],
    "ats_optimization": ["..."],
    "job_suitability": ["..."]
  }},
  "summary": "Detailed analytical summary (300-500 words). No contact details.",
  "ats_score": 0,
  "job_recommendations": [
    {{
      "title": "Job Title",
      "company": "Example Corp",
      "match_percentage": 0,
      "location": "Remote",
      "experience_level": "Mid-level",
      "description": "Short role description"
    }}
  ],
  "strengths": ["skill or strength"],
  "weaknesses": ["gap or weakness"],
  "formatting_suggestions": ["..."],
  "keyword_optimization": ["..."],
  "industry_suggestions": ["..."]
}}

Resume:
{cleaned[:MAX_RESUME_LEN]}
"""
        try:
            content = ai_engine.generate_content(
                prompt,
                system_instruction="You are an expert ATS resume analyst. Output only valid JSON.",
                json_mode=True,
                feature="Resume Analysis",
            )
            result = self._parse_json_response(content, "Resume Analysis")
            if "summary" not in result or "ats_score" not in result:
                raise HTTPException(status_code=502, detail="AI response missing required resume analysis fields")
            result["resume_text"] = cleaned
            return result
        except AIEngineError as e:
            _raise_http_from_ai(e)

    def generate_editing_suggestions(self, resume_text: str) -> list[str]:
        cleaned = clean_resume_text(resume_text)
        if not cleaned:
            raise HTTPException(status_code=400, detail="Resume text is empty")

        prompt = f"""
Provide 3-5 specific, actionable resume improvement suggestions.
Return JSON: {{"suggestions": ["suggestion 1", "suggestion 2"]}}

Resume:
{cleaned[:2000]}
"""
        try:
            content = ai_engine.generate_content(
                prompt,
                system_instruction="You are a top-tier resume reviewer. Output only valid JSON.",
                json_mode=True,
                feature="Resume Suggestions",
            )
            data = self._parse_json_response(content, "Resume Suggestions")
            suggestions = data.get("suggestions", [])
            if not suggestions:
                raise HTTPException(status_code=502, detail="AI returned no suggestions")
            return suggestions
        except AIEngineError as e:
            _raise_http_from_ai(e)

    def parse_resume_to_sections(self, resume_text: str) -> dict:
        cleaned = clean_resume_text(resume_text)
        if not cleaned:
            raise HTTPException(status_code=400, detail="Resume text is empty")

        prompt = f"""
Split this resume into structured JSON sections:
{{
  "personal_information": {{"name":"","email":"","phone":"","linkedin":"","location":""}},
  "summary": "",
  "skills": [],
  "education": "",
  "projects": "",
  "experience": "",
  "certifications": ""
}}

Resume:
{cleaned[:4000]}
"""
        try:
            content = ai_engine.generate_content(
                prompt,
                system_instruction="Output only valid JSON.",
                json_mode=True,
                feature="Resume Parser",
            )
            data = self._parse_json_response(content, "Resume Parser")
            return {
                "personal_information": data.get("personal_information", {}),
                "summary": data.get("summary", ""),
                "skills": data.get("skills", []),
                "education": data.get("education", ""),
                "projects": data.get("projects", ""),
                "experience": data.get("experience", ""),
                "certifications": data.get("certifications", ""),
            }
        except AIEngineError as e:
            _raise_http_from_ai(e)

    def calculate_ats_score(self, resume_text: str) -> dict:
        cleaned = clean_resume_text(resume_text)
        if not cleaned:
            raise HTTPException(status_code=400, detail="Resume text is empty")

        prompt = f"""
Score this resume for ATS compatibility.
Return JSON: {{"score": 0, "suggestions": ["..."]}}

Resume:
{cleaned[:MAX_RESUME_LEN]}
"""
        try:
            content = ai_engine.generate_content(
                prompt,
                system_instruction="Output only valid JSON.",
                json_mode=True,
                feature="ATS Score",
            )
            return self._parse_json_response(content, "ATS Score")
        except AIEngineError as e:
            _raise_http_from_ai(e)

    def generate_bullet_point(self, sentence: str) -> dict:
        if not sentence or not sentence.strip():
            raise HTTPException(status_code=400, detail="Sentence is empty")

        prompt = f"""
Convert this into a strong resume bullet point with measurable impact.
Return JSON: {{"bullet_point": ""}}

Sentence: {sentence.strip()}
"""
        try:
            content = ai_engine.generate_content(
                prompt,
                system_instruction="Output only valid JSON.",
                json_mode=True,
                feature="Bullet Point Generator",
            )
            data = self._parse_json_response(content, "Bullet Point Generator")
            if "bullet_point" not in data:
                raise HTTPException(status_code=502, detail="Invalid AI response for bullet point")
            return data
        except AIEngineError as e:
            _raise_http_from_ai(e)

    def detect_skill_gaps(self, resume_text: str, target_role: str = "Software Engineer") -> dict:
        cleaned = clean_resume_text(resume_text)
        if not cleaned:
            raise HTTPException(status_code=400, detail="Resume text is empty")

        prompt = f"""
Identify missing skills for the target role.
Return JSON: {{"missing_skills": ["skill1", "skill2"]}}

Target role: {target_role}

Resume:
{cleaned[:2000]}
"""
        try:
            content = ai_engine.generate_content(
                prompt,
                system_instruction="Output only valid JSON.",
                json_mode=True,
                feature="Skill Gap Analysis",
            )
            return self._parse_json_response(content, "Skill Gap Analysis")
        except AIEngineError as e:
            _raise_http_from_ai(e)

    def rewrite_section(self, text: str, mode: str) -> dict:
        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="Text is empty")

        instructions = {
            "professional": "Make it professional and impact-focused",
            "concise": "Make it shorter while keeping impact",
            "ats": "Optimize for ATS keyword matching",
            "grammar": "Fix grammar and clarity",
        }.get(mode, "Improve clarity and impact")

        prompt = f"""
Rewrite the text below.
Instruction: {instructions}
Return JSON: {{"rewritten_text": ""}}

Text:
{text}
"""
        try:
            content = ai_engine.generate_content(
                prompt,
                system_instruction="Output only valid JSON.",
                json_mode=True,
                feature="Resume Rewriter",
            )
            return self._parse_json_response(content, "Resume Rewriter")
        except AIEngineError as e:
            _raise_http_from_ai(e)

    # ---------------- AI MENTOR ---------------- #

    def chat_with_mentor(
        self,
        message: str,
        resume_data: Optional[dict] = None,
        chat_history: Optional[list] = None,
    ) -> dict:
        if not message or not message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")

        resume_text = clean_resume_text((resume_data or {}).get("resume_text", ""))[:MAX_RESUME_LEN]
        system_prompt = (
            "You are an elite FAANG-level career mentor with 15+ years of experience in tech hiring. "
            "Provide deep, structured, actionable guidance. Never give vague or generic advice. "
            "Always tailor your response to the candidate's specific background.\n\n"
            "Your expertise covers:\n"
            "- Resume optimization and ATS strategies\n"
            "- Interview coaching (technical, behavioral, system design)\n"
            "- Skill gap identification and learning roadmaps\n"
            "- Salary negotiation tactics\n"
            "- Career pivots and promotions\n"
            "- Job search strategy and networking\n\n"
            "Format responses with:\n"
            "- ## Headings for major sections\n"
            "- Bullet points for actionable items\n"
            "- 📌 Priority markers for urgent actions\n"
            "- Concrete timelines (e.g. 'Week 1-2: ...')\n"
            "- Real examples and metrics where possible\n\n"
            "IMPORTANT: Always give COMPLETE responses. Never truncate or say 'continued below'."
        )
        if resume_text:
            system_prompt += f"\n\n---\n**Candidate's Resume:**\n{resume_text}\n---"

        try:
            reply = ai_engine.chat(
                message=message.strip(),
                system_instruction=system_prompt,
                chat_history=chat_history or [],
                feature="AI Mentor",
            )
            return {"reply": reply}
        except AIEngineError as e:
            _raise_http_from_ai(e)

    # ---------------- INTERVIEW PREP ---------------- #

    def generate_interview_questions(
        self,
        resume_text: str = "",
        target_role: str = "Software Engineer",
    ) -> dict:
        cleaned = clean_resume_text(resume_text)
        context = cleaned[:MAX_RESUME_LEN] if cleaned else "No resume provided. Generate general role-based questions."

        prompt = f"""Generate exactly 20 interview questions for a {target_role} candidate.

STRICT DISTRIBUTION — you MUST follow this exactly:
- 10 Technical questions (category: "Technical")
- 5 Behavioral questions (category: "Behavioral")
- 5 HR questions (category: "HR")

Total = 20 questions. Do NOT generate fewer.

For each question include:
- "category": "Technical" | "Behavioral" | "HR"
- "difficulty": "easy" | "medium" | "hard"
- "question": the interview question text
- "answer": a strong, specific sample answer (3-5 sentences)
- "explanation": why this question is asked and what interviewers look for (2-3 sentences)

Technical questions should test hands-on skills, code design, and problem solving relevant to {target_role}.
Behavioral questions should use the STAR method (Situation, Task, Action, Result).
HR questions should cover motivation, career goals, salary, and culture fit.

Return ONLY valid JSON in this exact format:
{{
  "questions": [
    {{
      "category": "Technical",
      "difficulty": "easy",
      "question": "...",
      "answer": "...",
      "explanation": "..."
    }}
  ]
}}

Resume context:
{context}
"""
        try:
            content = ai_engine.generate_content(
                prompt,
                system_instruction="You are an expert interview coach. Output only valid JSON with exactly 20 questions.",
                json_mode=True,
                feature="Interview Prep",
            )
            data = self._parse_json_response(content, "Interview Prep")
            questions = data.get("questions", [])

            # --- Enforce minimum counts by category ---
            by_cat: dict[str, list] = {"Technical": [], "Behavioral": [], "HR": []}
            for q in questions:
                cat = q.get("category", "Technical")
                if cat in by_cat:
                    by_cat[cat].append(q)
                else:
                    by_cat["Technical"].append(q)

            tech_defaults = [
                "Explain the difference between REST and GraphQL APIs.",
                "What is the time complexity of binary search?",
                "How does garbage collection work in your primary language?",
                "Describe the CAP theorem and give a real-world example.",
                "What are SOLID principles? Give one concrete example.",
                "How would you design a URL shortener system at scale?",
                "What is the difference between a process and a thread?",
                "Explain database indexing and when you would use a composite index.",
                "What is Big-O notation? Compare O(n log n) vs O(n²).",
                "How do you handle race conditions in concurrent code?",
            ]
            beh_defaults = [
                "Tell me about a time you disagreed with a team member and how you resolved it.",
                "Describe a project where you had to meet a very tight deadline.",
                "Give an example of when you took initiative without being asked.",
                "Tell me about a significant failure and what you learned from it.",
                "Describe how you prioritize tasks when multiple deadlines compete.",
            ]
            hr_defaults = [
                "Why do you want to work at our company specifically?",
                "Where do you see yourself professionally in 5 years?",
                "What are your salary expectations for this role?",
                "How do you handle constructive feedback and criticism?",
                "What makes you the best candidate for this position?",
            ]

            def _pad(cat_list, defaults, target_count, cat_label):
                while len(cat_list) < target_count:
                    idx = len(cat_list) % len(defaults)
                    cat_list.append({
                        "category": cat_label,
                        "difficulty": "medium",
                        "question": defaults[idx],
                        "answer": "Provide a specific, structured answer using concrete examples from your experience.",
                        "explanation": "This is a standard interview question to assess your fit, skills, and preparation level.",
                    })
                return cat_list[:target_count]

            by_cat["Technical"] = _pad(by_cat["Technical"], tech_defaults, 10, "Technical")
            by_cat["Behavioral"] = _pad(by_cat["Behavioral"], beh_defaults, 5, "Behavioral")
            by_cat["HR"] = _pad(by_cat["HR"], hr_defaults, 5, "HR")

            final_questions = by_cat["Technical"] + by_cat["Behavioral"] + by_cat["HR"]
            return {"questions": final_questions, "target_role": target_role, "total": len(final_questions)}
        except AIEngineError as e:
            _raise_http_from_ai(e)

    def simulate_interview_chat(
        self,
        message: str,
        chat_history: Optional[list],
        resume_text: str,
        category: str = "Technical",
    ) -> dict:
        cleaned = clean_resume_text(resume_text)[:MAX_RESUME_LEN]
        system_prompt = f"""
You are a FAANG interviewer running a {category} mock interview.
Return ONLY JSON with this shape:
{{
  "evaluation": "",
  "ideal_answer": "",
  "tips": [],
  "common_mistakes": [],
  "next_question": ""
}}

Resume context:
{cleaned}
"""
        user_prompt = message.strip() if message and message.strip() else "Start the interview with the first question."

        try:
            if chat_history:
                content = ai_engine.chat(
                    message=user_prompt,
                    system_instruction=system_prompt,
                    chat_history=chat_history,
                    feature="Mock Interview",
                )
            else:
                content = ai_engine.generate_content(
                    user_prompt,
                    system_instruction=system_prompt,
                    json_mode=True,
                    feature="Mock Interview",
                )

            data = ai_engine.safe_json_loads(content)
            if not data:
                raise HTTPException(status_code=502, detail="Invalid mock interview response from AI")
            return data
        except AIEngineError as e:
            _raise_http_from_ai(e)

    # ---------------- JOB AI HELPERS ---------------- #

    def compare_resume_to_job(self, resume_text: str, job_desc: str) -> dict:
        cleaned = clean_resume_text(resume_text)
        if not cleaned:
            raise HTTPException(status_code=400, detail="Resume text is empty")

        prompt = f"""
Compare this resume with the job description.

Return JSON:
{{
  "matched_skills": ["skill1"],
  "missing_skills": ["skill2"],
  "explanation": "Brief match explanation",
  "suggestions": ["Improvement suggestion"]
}}

Resume:
{cleaned[:1500]}

Job Description:
{(job_desc or "")[:1500]}
"""
        try:
            content = ai_engine.generate_content(
                prompt,
                system_instruction="You are an expert job matching assistant. Output only valid JSON.",
                json_mode=True,
                feature="Job Match Analysis",
            )
            data = self._parse_json_response(content, "Job Match Analysis")
            return {
                "matched_skills": data.get("matched_skills", []),
                "missing_skills": data.get("missing_skills", []),
                "explanation": data.get("explanation", ""),
                "suggestions": data.get("suggestions", []),
            }
        except AIEngineError as e:
            _raise_http_from_ai(e)

    def analyze_market_trends(self, descriptions: str) -> dict:
        if not descriptions or not descriptions.strip():
            return {"trending_skills": [], "analysis": "No job data available."}

        prompt = f"""
Analyze aggregated job descriptions and identify trending skills.

Return JSON:
{{
  "trending_skills": ["skill1", "skill2"],
  "analysis": "2-3 sentence market overview"
}}

Descriptions:
{descriptions[:3000]}
"""
        try:
            content = ai_engine.generate_content(
                prompt,
                system_instruction="You are a job market analyst. Output only valid JSON.",
                json_mode=True,
                feature="Market Trends",
            )
            return self._parse_json_response(content, "Market Trends")
        except AIEngineError as e:
            _raise_http_from_ai(e)

    def get_diagnostics(self) -> dict:
        test = ai_engine.test_connection()
        return {
            **test,
            "provider": "Google Gemini (AI Studio)",
            "default_model": ai_engine.gemini_model,
            "embedding_model": ai_engine.embedding_model,
            "recent_errors": ai_errors,
        }
