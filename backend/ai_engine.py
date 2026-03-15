import os
import json
import re
import google.generativeai as genai
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

class AIEngine:
    def __init__(self):
        self.openai_client = None
        self.gemini_model = None
        
        # Initialize OpenAI
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key and "your-openai" not in openai_key and len(openai_key) > 20:
            try:
                self.openai_client = OpenAI(api_key=openai_key)
            except Exception as e:
                print(f"Failed to initialize OpenAI: {e}")

        # Initialize Gemini
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key and "your-gemini" not in gemini_key and len(gemini_key) > 10:
            try:
                genai.configure(api_key=gemini_key)
                self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
            except Exception as e:
                print(f"Failed to initialize Gemini: {e}")

    def generate_content(self, prompt, system_instruction=None, json_mode=False, resume_context=None):
        """
        Tries OpenAI first, then falls back to Gemini, and finally to a Heuristic Engine.
        """
        # 1. Try OpenAI
        if self.openai_client:
            try:
                messages = []
                if system_instruction:
                    messages.append({"role": "system", "content": system_instruction})
                messages.append({"role": "user", "content": prompt})
                
                # Use 3.5-turbo as it's more widely available for free/basic tiers
                response = self.openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=messages,
                    response_format={"type": "json_object"} if json_mode else None
                )
                return response.choices[0].message.content
            except Exception as e:
                print(f"OpenAI Error: {e}. Trying Gemini...")

        # 2. Try Gemini
        if self.gemini_model:
            try:
                full_prompt = prompt
                if system_instruction:
                    full_prompt = f"{system_instruction}\n\n{prompt}"
                
                generation_config = {}
                if json_mode:
                    generation_config["response_mime_type"] = "application/json"
                
                response = self.gemini_model.generate_content(
                    full_prompt, 
                    generation_config=generation_config
                )
                return response.text
            except Exception as e:
                print(f"Gemini Error: {e}")

        # 3. Last Resort: Heuristic Fallback (Free, No Key Required)
        print("Using Heuristic Fallback Engine...")
        return self._heuristic_response(prompt, system_instruction, json_mode, resume_context)

    def _heuristic_response(self, prompt, system_instruction, json_mode, context):
        """
        A rule-based response engine that provides helpful career advice by scanning the resume context.
        """
        prompt_l = re.sub(r'[^a-zA-Z\s]', '', prompt.lower())
        context_raw = context or ""
        context_l = context_raw.lower()
        
        if json_mode:
            # --- DYNAMIC INTERVIEW QUESTIONS ---
            if "interview" in prompt_l:
                print("Generating dynamic interview questions via Heuristic Engine...")
                
                # Extract potential tech keywords for better technical questions
                tech_keywords = []
                common_tech = ["react", "node", "python", "javascript", "java", "sql", "aws", "docker", "flutter", "fastapi"]
                for t in common_tech:
                    if t in context_l: tech_keywords.append(t.title())
                
                tech_focus = tech_keywords[0] if tech_keywords else "your stack"
                
                dynamic_questions = [
                    {
                        "category": "Behavioral",
                        "question": "Can you walk me through your background and your most significant achievement noted in your resume?",
                        "answer": "Focus on the STAR method (Situation, Task, Action, Result). Highlight key milestones in your career and emphasize the impact of your proudest achievement, ideally backing it up with metrics."
                    },
                    {
                        "category": "Technical",
                        "question": f"Based on your resume, how do you handle complex debugging or architectural challenges in {tech_focus}?",
                        "answer": "Discuss a systematic approach: reproducing the issue, isolating the cause, reading logs, and writing tests to prevent regression. Mention specific tools you use for debugging and architectural design patterns."
                    },
                    {
                        "category": "Project-based",
                        "question": "Tell me about the specific technical hurdles you faced while building your most recent project.",
                        "answer": "Pick a real challenge from your latest project. Explain what made it difficult, how you researched or brainstormed solutions, the trade-offs considered, and the final successful implementation."
                    },
                    {
                        "category": "HR",
                        "question": "Why do you believe your specific experience makes you the best fit for this role?",
                        "answer": "Connect the dots between your past experiences and the job requirements. Mention 2-3 specific skills or projects that directly align with what the company is trying to achieve."
                    },
                    {
                        "category": "Behavioral",
                        "question": "Describe a time when you had to learn a new technology or framework quickly. How did you approach it?",
                        "answer": "Emphasize your adaptability. Mention reading official documentation, building small proof-of-concept projects, and seeking guidance from experienced peers. Show that you are a fast, self-directed learner."
                    },
                    {
                        "category": "Project-based",
                        "question": "If you had an extra month to work on your most prominent project, what features or improvements would you add?",
                        "answer": "Show your forward-thinking mindset. Good answers involve suggesting performance optimizations, adding testing coverage, improving user experience, or scaling the architecture."
                    },
                    {
                        "category": "HR",
                        "question": "Where do you see your career heading in the next 3 to 5 years?",
                        "answer": "Express ambition but align it with the role. For example, mention graduating from a mid-level to a senior position, taking on more architectural responsibilities, or mentoring junior developers."
                    },
                    {
                        "category": "Behavioral",
                        "question": "Tell me about a time you disagreed with a colleague on a technical approach. How was it resolved?",
                        "answer": "Highlight your communication and teamwork skills. Explain that you focused on objective pros/cons (like performance vs. development time), compromised, or deferred to data and best practices rather than ego."
                    }
                ]
                
                # Add more questions if there's enough context
                if len(tech_keywords) > 1:
                    dynamic_questions.append({
                        "category": "Technical",
                        "question": f"How do you ensure seamless integration between {tech_keywords[0]} and {tech_keywords[1]} in a production environment?",
                        "answer": f"Discuss API contracts, data serialization, handling asynchronous operations, and setting up proper CI/CD pipelines to ensure {tech_keywords[0]} and {tech_keywords[1]} communicate securely and reliably."
                    })
                
                if "leadership" in context_l or "managed" in context_l or "team" in context_l:
                    dynamic_questions.append({
                        "category": "Behavioral",
                        "question": "You mentioned team interaction in your resume. Tell me about a time you resolved a conflict within your team.",
                        "answer": "Share an example where you acted as a mediator. Discuss how you actively listened to all parties, identified the root cause of the conflict, and helped the team reach a constructive consensus."
                    })
                    dynamic_questions.append({
                        "category": "HR",
                        "question": "How do you balance guiding a team while still maintaining your own technical contributions?",
                        "answer": "Explain how you delegate effectively, set clear goals, use agile methodologies to track progress, and allocate block time for your own deep work."
                    })

                return json.dumps({"questions": dynamic_questions})
            
            return json.dumps({"reply": "I've analyzed your resume content, but need a valid API key for advanced JSON formatting."})

        # --- SMART CONTEXT SEARCHER ---
        # 1. Check for Education
        if any(w in prompt_l for w in ["education", "degree", "university", "college", "school", "studied", "graduation"]):
            if any(w in context_l for w in ["education", "degree", "university", "bachelor", "master", "college", "school"]):
                # Try to find the education block
                lines = context_raw.split('\n')
                edu_info = []
                found = False
                for i, line in enumerate(lines):
                    if any(w in line.lower() for w in ["education", "degree", "university", "bachelor", "master", "college"]):
                        found = True
                        edu_info.extend(lines[max(0, i):min(len(lines), i+6)])
                        break
                if found:
                    return f"### 🎓 Education Details from your Resume\n\nI found the following information regarding your education:\n\n" + "\n".join([f"> {L.strip()}" for L in edu_info if L.strip()])
            return "### 🎓 Education Info\nI couldn't find a specific 'Education' section in the resume text you provided. Make sure your education details are clearly listed so recruiters can see them easily!"

        # 2. Check for Projects
        if any(w in prompt_l for w in ["project", "worked on", "built", "apps", "application"]):
            if "project" in context_l:
                lines = context_raw.split('\n')
                proj_info = []
                found = False
                for i, line in enumerate(lines):
                    if "project" in line.lower():
                        found = True
                        proj_info.extend(lines[max(0, i):min(len(lines), i+8)])
                        break
                if found:
                    return f"### 🚀 Projects Found in your Resume\n\nHere are the projects I detected:\n\n" + "\n".join([f"> {L.strip()}" for L in proj_info if L.strip()])
            return "### 🚀 Projects\nI couldn't find a dedicated 'Projects' section. Consider adding a section highlighting your top 2-3 projects to show off your practical skills!"

        # 3. Check for Skills
        if any(w in prompt_l for w in ["skill", "know", "technology", "tech stack", "software", "tools"]):
            tech_matches = []
            common_tech = ["react", "python", "javascript", "java", "sql", "aws", "docker", "node", "html", "css", "git"]
            for t in common_tech:
                if t in context_l:
                    tech_matches.append(t.title())
            
            if tech_matches:
                return f"### 🛠️ Skills Detected\n\nBased on your resume, you have experience with:\n* **" + "**\n* **".join(tech_matches) + "**\n\n**Mentor Tip:** These are great! Try to add 1-2 more specialized tools to stand out further."
            return "### 🛠️ Skills\nI couldn't detect specific technical skills in the text. Make sure to list your tech stack clearly in a 'Skills' section!"

        # 4. Structured Analysis (Strengths, Improvements, Missing Skills)
        is_analysis_request = any(w in prompt_l for w in ["analyze", "structure", "audit", "review", "summary", "audit", "critique", "feedback", "report"])
        is_specific_section = any(w in prompt_l for w in ["strength", "positive", "improvement", "missing", "gap", "lack"])
        
        if is_analysis_request or is_specific_section:
            print(f"Triggered Structured Analysis for prompt: {prompt_l}")
            res = "### 📊 Strategic Resume Analysis\n\n"
            
            # --- STRENGTHS ---
            res += "#### 💪 Strengths\n"
            strengths_list = []
            if len(context_l) > 800:
                strengths_list.append("Depth of Experience: You have a solid amount of content which shows effort and professional involvement.")
            if any(w in context_l for w in ["project", "developed", "built", "spearheaded", "engineered"]):
                strengths_list.append("Project-Oriented: Your resume highlights practical applications of your skills.")
            if any(w in context_l for w in ["react", "python", "sql", "aws", "cloud", "javascript", "java"]):
                strengths_list.append("Modern Tech Stack: You are listing high-demand, industry-standard technologies.")
            
            if not strengths_list:
                res += "* I couldn't detect clear strengths yet. Try adding more specific technologies and detailed project descriptions!\n"
            else:
                for s in strengths_list: res += f"* **{s}**\n"
            
            # --- IMPROVEMENTS ---
            res += "\n#### 📈 Improvements\n"
            imp_list = []
            if "%" not in context_l and "impact" not in context_l:
                imp_list.append("Quantify Achievements: Use numbers (e.g., 'Reduced costs by 15%') to prove your impact to recruiters.")
            if len(re.findall(r'\d{4}', context_l)) < 2:
                imp_list.append("Timeline Clarity: Make sure your employment dates are clear so recruiters can understand your career progression.")
            if "summary" not in context_l and "objective" not in context_l:
                imp_list.append("Professional Summary: Add a short 2rd-person summary at the top to highlight your unique value immediately.")
            
            if not imp_list:
                res += "* Your resume structure looks good! Focus on fine-tuning your bullet points to be even more action-oriented.\n"
            else:
                for imp in imp_list: res += f"* **{imp}**\n"

            # --- MISSING SKILLS ---
            res += "\n#### 🔍 Missing Skills (Recommended for your field)\n"
            field_skills = {
                "web": ["TypeScript", "Next.js", "Docker", "CI/CD Pipelines", "State Management (Redux/Zustand)"],
                "data": ["Pandas", "Scikit-Learn", "Tableau/PowerBI", "NoSQL", "Machine Learning Concepts"],
                "software": ["System Design", "Microservices", "Kubernetes", "Redis", "Unit Testing (PyTest/Jest)"]
            }
            detected_field = "web" # Default
            if any(w in context_l for w in ["data", "analytics", "science", "statistic"]): detected_field = "data"
            elif any(w in context_l for w in ["java", "c++", "c#", "backend", "algorithm"]): detected_field = "software"
            
            missing_count = 0
            for s in field_skills[detected_field]:
                if s.lower() not in context_l:
                    res += f"* **{s}**: Adding this tool would significantly boost your marketability in {detected_field}.\n"
                    missing_count += 1
            
            if missing_count == 0:
                res += f"* Great job! You already have the most important {detected_field} skills covered.\n"
            
            return res

        # 5. Project Rewriting / Improvement
        if any(w in prompt_l for w in ["rewrite", "description", "professional version", "wordings", "bullet point"]):
            print(f"Triggered Project Rewrite for prompt: {prompt_l}")
            lines = [L.strip() for L in context_raw.split('\n') if len(L.strip()) > 15]
            
            # Try to pick a project line
            target_proj = "Worked on building features for a web application using various tools."
            for line in lines:
                if any(w in line.lower() for w in ["project", "developed", "built", "spearheaded"]):
                    target_proj = line
                    break
            
            res = "### ✍️ Professional Content Rewrite\n\n"
            res += f"**Original Sentence:** \n> *{target_proj}*\n\n"
            res += "**Improved (High Impact):**\n"
            res += "> **Spearheaded the development of complex features using industry best practices, resulting in a 25% increase in system efficiency and significantly enhanced user satisfaction through modular architecture.**\n\n"
            res += "**Key Improvements Made:**\n"
            res += "* **Stronger Verbs**: Swapped 'worked' for 'Spearheaded'.\n"
            res += "* **Measured Impact**: Added '25% increase' to show results.\n"
            res += "* **Professional Tone**: Used 'modular architecture' and 'best practices'."
            return res

        # 6. Improvement Advice (Simple fallback that triggers analysis)
        if any(w in prompt_l for w in ["improve", "better", "fix", "critique", "change"]):
            print("Redirecting 'improve' request to structured analysis...")
            return self._heuristic_response("analyze my resume summary", system_instruction, json_mode, context)

        # 7. Greetings
        if any(w in prompt_l for w in ["hello", "hi", "hey", "greetings", "morning", "afternoon"]):
            return "👋 Hello! I'm your AI Career Mentor. I've read your resume and I'm ready to assist you!\n\n**Ask me things like:**\n* 'Can you **analyze** my resume?'\n* 'What **skills** am I missing?'\n* 'Can you **rewrite** a project for me?'"

        # 8. Catch-all generic help
        print(f"No specific match for prompt: {prompt_l}. Providing generic help.")
        return (
            "### 🔍 I'm ready to help!\n\n"
            "I've scanned your resume context. To get specific advice, try using keywords like:\n"
            "* **'Analyze'** -> For a full Strengths & Improvements report.\n"
            "* **'Rewrite'** -> To see how to make your bullet points stronger.\n"
            "* **'Skills'** -> To see what's missing from your tech stack.\n"
            "* **'Education'** -> To see what I found about your schooling."
        )

ai_engine = AIEngine()
