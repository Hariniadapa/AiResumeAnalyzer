import os
import json
from sqlalchemy.orm import Session
from ai_engine import ai_engine
from job_service import JobService

class AIServices:
    def __init__(self, db: Session):
        self.db = db
        self.job_service = JobService(db)

    def generate_interview_questions(self, resume_text: str):
        prompt = f"""
        Based on the following resume content, generate 15 to 20 personalized interview questions.
        Provide a healthy mix across these categories: 'Technical', 'Project-based', 'Behavioral', and 'HR'.
        Format the response in JSON as follows:
        {{
            "questions": [
                {{"category": "Technical", "question": "...", "answer": "..."}},
                ...
            ]
        }}
        
        Resume:
        {resume_text[:3000]}
        """
        try:
            content = ai_engine.generate_content(
                prompt=prompt,
                system_instruction="You are a specialized AI Interviewer. Return only valid JSON. Ensure each question has a suggested 'answer'.",
                json_mode=True,
                resume_context=resume_text
            )
            return json.loads(content)
        except Exception as e:
            print(f"Interview generation error: {e}")
            # Fallback when API key is invalid or server is down
            fallback_questions = [
                {"category": "Behavioral", "question": "Can you walk me through your background and the specific experiences highlighted in your resume?", "answer": "Focus on your timeline and specifically link past achievements to the skills required for the target role."},
                {"category": "Behavioral", "question": "Tell me about a time you had to overcome a significant challenge in one of your projects.", "answer": "Use the STAR method (Situation, Task, Action, Result). Focus heavily on the 'Action' and 'Result' parts, highlighting your problem-solving process."},
                {"category": "Technical", "question": "Based on your tech stack, how do you ensure the scalability and security of the applications you build?", "answer": "Discuss caching, load balancing, proper database indexing, and avoiding common security pitfalls (like OWASP Top 10 vulnerabilities)."},
                {"category": "Technical", "question": "Can you explain a complex technical concept you worked on recently to me as if I were a beginner?", "answer": "Use an analogy. Avoid jargon and focus on the 'why' and 'how' at a high level. Ensure you verify understanding midway."},
                {"category": "Project-based", "question": "Let's discuss the most impactful project on your resume. What was your specific contribution, and what was the outcome?", "answer": "Quantify your results. If you improved performance, say 'by X%'. Clearly distinguish your work from the team's overall work."},
                {"category": "Project-based", "question": "If you could go back and redo one of your past projects, what would you do differently and why?", "answer": "Show continuous improvement. Mention recognizing architectural mistakes early, adding testing sooner, or improving documentation."},
                {"category": "HR", "question": "Where do you see yourself technically and professionally in the next three to five years?", "answer": "Align your personal goals with the trajectory of the role you're interviewing for. E.g., stepping into a technical lead or deep-dive specialist role."},
                {"category": "HR", "question": "What type of team culture and management style do you thrive in best?", "answer": "Describe a healthy, collaborative environment. Avoid complaining about past managers; focus on positives like 'autonomy paired with clear goals'."},
                {"category": "Technical", "question": "How do you keep your technical skills updated in such a fast-paced industry?", "answer": "Mention specific blogs, open-source contributions, playing with new tech on weekends, or attending conferences/meetups."},
                {"category": "Behavioral", "question": "Describe a time when you received constructive criticism. How did you handle it?", "answer": "Show humility and a growth mindset. Explain how you listened without defensiveness, asked clarifying questions, and applied the feedback."}
            ]
            return {"questions": fallback_questions}

    def chat_with_mentor(self, message: str, resume_data: dict, chat_history: list = None):
        resume_text = resume_data.get("resume_text", "")
        
        # Performance optimization: if resume text is massive, truncate it
        resume_context = resume_text[:2000] if resume_text else "No resume content provided yet."

        system_prompt = f"""
        You are an AI Resume Mentor that helps users understand and improve their resumes. 
        Your goal is to provide world-class career guidance, resume critiques, skill development roadmaps, and interview preparation.

        CONTEXT:
        --- User's Resume ---
        {resume_context}

        INSTRUCTIONS:
        1.  Explain things in simple and clear English so that beginners can understand.
        2.  Answer questions based only on the information in the provided resume.
        3.  When providing an analysis or critique, ALWAYS generate three distinct sections:
            - **Strengths**: Highlight positive aspects like strong skills, projects, or achievements.
            - **Improvements**: Suggest specific ways to make the resume clearer, stronger, or more impactful.
            - **Missing Skills**: List important skills or technologies commonly expected for the user's field but not present.
        4.  If the user asks to "rewrite a project" or "improve a description", provide a more professional and impactful version of their content.
        5.  Keep responses concise but insightful. Use Markdown (bolding, bullet points) to make the chat readable.
        6.  Be encouraging, professional, and empathetic.
        7.  If the user's message is unrelated to careers or their resume, politely steer them back.
        """
        
        # Prepare conversation history
        messages = [{"role": "system", "content": system_prompt}]
        if chat_history:
            # Only take the last 10 messages to keep context window clean
            messages.extend(chat_history[-10:])
            
        messages.append({"role": "user", "content": message})
        
        try:
            content = ai_engine.generate_content(
                prompt=message,
                system_instruction=system_prompt,
                json_mode=False,
                resume_context=resume_text
            )
            return {"reply": content}
        except Exception as e:
            print(f"Chatbot error: {e}")
            return {"reply": "### ⚠️ AI Engine Connection Issue\nI'm having trouble connecting to my specialized AI brain right now. \n\n**Common fixes:**\n1. Ensure your API keys in the `backend/.env` file are valid.\n2. Try refreshing the page and clearing your conversation.\n3. If you don't have a key, I'll automatically try to use my **Basic Mode** to give you general advice!"}

    def generate_editing_suggestions(self, resume_text: str):
        prompt = f"""
        You are an AI Resume Writing Assistant. Your task is to analyze the resume text and give useful suggestions to improve it.
        While giving suggestions, you must always copy the exact sentence from the resume and show it as original_text.
        Do not change, rewrite, or summarize the original sentence.
        Then provide a better and more professional version of that same sentence as suggested_text, and also give a short reason explaining why the improvement is helpful.
        The original_text must exactly match the sentence from the resume so that it can be correctly identified and updated in the resume editor.
        Do not create new sentences that are not present in the resume.
        Provide a JSON array of suggestions in this format:
        {{
            "suggestions": [
                {{"id": 1, "original_text": "...", "suggested_text": "...", "reason": "...", "action_type": "rewrite"}},
                {{"id": 2, "original_text": "...", "suggested_text": "", "reason": "...", "action_type": "remove"}}
            ]
        }}
        Provide around 3 to 7 high-impact suggestions.
        
        Resume Text:
        {resume_text[:3000]}
        """
        try:
            content = ai_engine.generate_content(
                prompt=prompt,
                system_instruction="You are a Resume Editing Assistant. Output only valid JSON.",
                json_mode=True,
                resume_context=resume_text
            )
            return json.loads(content)
        except Exception as e:
            print(f"Editing suggestion error: {e}")
            fallback_suggestions = [
                {
                    "id": 1,
                    "original_text": "Responsible for managing the team and talking to stakeholders on a daily basis.",
                    "suggested_text": "Spearheaded a cross-functional team and successfully managed daily stakeholder communications.",
                    "reason": "Using stronger action verbs ('Spearheaded', 'managed') makes your experience sound much more impactful.",
                    "action_type": "rewrite"
                },
                {
                    "id": 2,
                    "original_text": "Helped to make the website load much faster.",
                    "suggested_text": "Optimized web application performance, significantly reducing page load times.",
                    "reason": "Quantify your achievements if possible, but at least use professional terminology like 'Optimized' rather than 'Helped to make'.",
                    "action_type": "rewrite"
                },
                {
                    "id": 3,
                    "original_text": "In my free time I like to play video games and read books.",
                    "suggested_text": "",
                    "reason": "Hobbies are generally unnecessary on a professional resume unless they directly relate to the job role or show leadership.",
                    "action_type": "remove"
                }
            ]
            return {"suggestions": fallback_suggestions}

    def generate_bullet_point(self, sentence: str):
        prompt = f"""
        You are an expert Resume Writer. Take the following simple sentence describing a work achievement or project and expand it into a professional, impactful resume bullet point.
        Use strong action verbs and imply measurable results or specific technologies where appropriate.
        Return ONLY valid JSON in this format:
        {{
            "bullet_point": "..."
        }}
        
        Sentence: "{sentence}"
        """
        try:
            content = ai_engine.generate_content(
                prompt=prompt,
                system_instruction="You are an expert Resume Writer. Output ONLY valid JSON.",
                json_mode=True
            ).strip()
            if content.startswith("```json"): content = content[7:]
            if content.startswith("```"): content = content[3:]
            if content.endswith("```"): content = content[:-3]
            content = content.strip()
            
            data = json.loads(content)
            if "bullet_point" not in data:
                raise ValueError("Missing 'bullet_point' key")
            return data
        except Exception as e:
            print(f"Bullet point error: {e}")
            return {"bullet_point": f"Developed and optimized solutions for '{sentence}', resulting in increased overall efficiency and improved project outcomes."}

    def detect_skill_gaps(self, resume_text: str, target_role: str = "Software Engineer"):
        prompt = f"""
        Analyze this resume text against the typical requirements for a '{target_role}'.
        Identify exactly 5 crucial skills or technologies that are MISSING from the resume but are highly requested in the industry for this role.
        Return ONLY valid JSON in this format:
        {{
            "missing_skills": ["Skill1", "Skill2", "Skill3", ...]
        }}
        
        Resume Text:
        {resume_text[:2000]}
        """
        try:
            content = ai_engine.generate_content(
                prompt=prompt,
                system_instruction="You are a Technical Recruiter AI. Output ONLY valid JSON.",
                json_mode=True
            ).strip()
            if content.startswith("```json"): content = content[7:]
            if content.startswith("```"): content = content[3:]
            if content.endswith("```"): content = content[:-3]
            content = content.strip()

            data = json.loads(content)
            if "missing_skills" not in data:
                raise ValueError("Missing 'missing_skills' key")
            return data
        except Exception as e:
            print(f"Skill gap error: {e}")
            return {"missing_skills": ["TypeScript", "CI/CD Pipelines", "Docker", "AWS/Cloud", "System Design"]}

    def rewrite_section(self, text: str, mode: str):
        mode_instruction = {
            "professional": "Make it much more highly professional, corporate, and polished.",
            "concise": "Make it extremely concise, punchy, and straight to the point without losing key facts.",
            "ats": "Optimize it heavily for ATS tracking systems by ensuring standard keywords and clear syntax.",
            "grammar": "Fix all grammar, spelling, and clarity issues perfectly while keeping the original meaning."
        }.get(mode, "Make it more professional.")

        prompt = f"""
        Rewrite the following resume section.
        Instruction Context: {mode_instruction}
        
        Return ONLY valid JSON in this format:
        {{
            "rewritten_text": "..."
        }}
        
        Original Text:
        "{text}"
        """
        try:
            content = ai_engine.generate_content(
                prompt=prompt,
                system_instruction="You are a master Resume Editor. Output exactly what is requested in valid JSON.",
                json_mode=True
            ).strip()
            if content.startswith("```json"): content = content[7:]
            if content.startswith("```"): content = content[3:]
            if content.endswith("```"): content = content[:-3]
            content = content.strip()

            data = json.loads(content)
            if "rewritten_text" not in data:
                raise ValueError("Missing 'rewritten_text' key")
            return data
        except Exception as e:
            print(f"Rewrite error: {e}")
            return {"rewritten_text": f"Optimized version of: {text}"}

    def calculate_ats_score(self, resume_text: str):
        prompt = f"""
        Calculate an ATS (Applicant Tracking System) compatibility score from 0 to 100 for this resume.
        Evaluate based on structure, keyword density, clarity, and formatting.
        Also provide 3 short, actionable suggestions to improve the score.
        Return ONLY valid JSON:
        {{
            "score": 85,
            "suggestions": ["Add more keywords", "Remove tables", "..."]
        }}
        
        Resume:
        {resume_text[:3000]}
        """
        try:
            content = ai_engine.generate_content(
                prompt=prompt,
                system_instruction="You are an ATS Scoring constraints analyzer. Output ONLY valid JSON.",
                json_mode=True
            ).strip()
            if content.startswith("```json"): content = content[7:]
            if content.startswith("```"): content = content[3:]
            if content.endswith("```"): content = content[:-3]
            content = content.strip()

            data = json.loads(content)
            if "score" not in data or "suggestions" not in data:
                raise ValueError("Missing 'score' or 'suggestions' key")
            return data
        except Exception as e:
            print(f"ATS error: {e}")
            return {
                "score": 72,
                "suggestions": [
                    "Ensure you use standard section headers like 'Experience' and 'Education'.",
                    "Add more quantifiable metrics (%, $, numbers) to your bullet points.",
                    "Include more hard technical skills matching your target job titles."
                ]
            }

    def parse_resume_to_sections(self, resume_text: str):
        prompt = f"""
        You are a resume parsing assistant for an AI Resume Editor application.

        When a user uploads a resume, analyze the entire resume text and intelligently separate the content into structured sections. Do NOT place the entire resume into the summary field.

        Extract and classify the information into the following sections:

        1. Personal Information
        (Name, Email, Phone Number, LinkedIn, Portfolio, Location)

        2. Summary or Objective
        (A short professional summary describing the candidate)

        3. Skills
        (List all technical and soft skills. Return them as an array.)

        4. Education
        (University name, degree, year, and relevant academic details)

        5. Projects
        (Project names, technologies used, and descriptions)

        6. Work Experience
        (Company name, role, responsibilities, duration)

        7. Certifications
        (Professional certifications, courses, or training)

        Instructions:

        • Detect common resume headings such as "Summary", "Skills", "Education", "Projects", "Experience", and "Certifications".
        • If headings are missing, intelligently classify the text based on its meaning.
        • Do NOT mix content from different sections.
        • Skills must be returned as a list.
        • Personal information must only contain contact details.
        • If a section is not present in the resume, return an empty value for that section.

        Return the result ONLY in this JSON format:

        {{
        "personal_information": {{
        "name": "",
        "email": "",
        "phone": "",
        "linkedin": "",
        "location": ""
        }},
        "summary": "",
        "skills": [],
        "education": "",
        "projects": "",
        "experience": "",
        "certifications": ""
        }}

        The output must strictly follow this structure so that the Resume Editor UI can automatically populate each section correctly.
        
        Resume Text:
        {resume_text[:4000]}
        """
        try:
            content = ai_engine.generate_content(
                prompt=prompt,
                system_instruction="You are an expert Resume Parser. Output ONLY valid JSON with exactly the specified keys.",
                json_mode=True
            ).strip()
            if content.startswith("```json"): content = content[7:]
            if content.startswith("```"): content = content[3:]
            if content.endswith("```"): content = content[:-3]
            content = content.strip()

            data = json.loads(content)
            required_keys = ["personal_information", "summary", "skills", "experience", "education", "projects", "certifications"]
            if "reply" in data and not any(k in data for k in required_keys):
                raise ValueError("Got generic reply, fallback needed")
                
            for key in required_keys:
                if key not in data:
                    if key == "skills":
                        data[key] = []
                    elif key == "personal_information":
                        data[key] = {"name": "", "email": "", "phone": "", "linkedin": "", "location": ""}
                    else:
                        data[key] = ""
            return data
        except Exception as e:
            print(f"Parse error: {e}")
            return self._heuristic_parse_resume(resume_text)

    def _heuristic_parse_resume(self, text: str):
        parsed = {
            "summary": "",
            "experience": "",
            "education": "",
            "projects": "",
            "certifications": ""
        }
        personal_info = {"name": "", "email": "", "phone": "", "linkedin": "", "location": ""}
        skills_list = []
        
        lines = text.split('\n')
        current_section = "personal_information"
        
        for line in lines:
            tl = line.lower().strip()
            if not tl: 
                continue
                
            # Detect headers
            if tl in ["skills", "technical skills", "technologies", "core competencies"]:
                current_section = "skills"
                continue
            elif tl in ["experience", "work experience", "employment", "professional experience", "history"]:
                current_section = "experience"
                continue
            elif tl in ["education", "academic background", "academics"]:
                current_section = "education"
                continue
            elif tl in ["projects", "personal projects", "academic projects"]:
                current_section = "projects"
                continue
            elif tl in ["certifications", "licenses", "awards", "courses"]:
                current_section = "certifications"
                continue
            elif tl in ["summary", "objective", "profile", "about me", "professional summary"]:
                current_section = "summary"
                continue
                
            if current_section == "personal_information":
                # Rough logic: anything looking like an email, put in email
                if "@" in tl:
                    personal_info["email"] = line.strip()
                elif sum(c.isdigit() for c in tl) > 6:
                    personal_info["phone"] = line.strip()
                elif "linkedin" in tl:
                    personal_info["linkedin"] = line.strip()
                elif len(personal_info["name"]) == 0 and len(tl) < 30:
                     personal_info["name"] = line.strip()
                else:
                    # switch to summary if it's getting long
                    current_section = "summary"
                    parsed["summary"] += line + "\n"
                continue
                
            if current_section == "skills" or ("react" in tl or "python" in tl or "javascript" in tl or "java" in tl or "sql" in tl) and len(line) < 50:
                 if current_section != "projects" and current_section != "experience":
                    skills_list.extend([s.strip() for s in line.split(',') if s.strip()])
                    continue

            # Append to current section
            if current_section == "skills":
                skills_list.extend([s.strip() for s in line.split(',') if s.strip()])
            else:
                parsed[current_section] += line + "\n"
                
        # Cleanup
        for k in parsed:
            parsed[k] = parsed[k].strip()
                
        # Remove empty skills
        return {
            "personal_information": personal_info,
            "summary": parsed["summary"],
            "skills": [s for s in skills_list if s],
            "experience": parsed["experience"],
            "education": parsed["education"],
            "projects": parsed["projects"],
            "certifications": parsed["certifications"]
        }
