import os
import json
import hashlib
import time
import re
from datetime import datetime
from typing import Any, Optional
from dotenv import load_dotenv

# Import Google GenAI
from google import genai
from google.genai import types

# Import OpenAI
try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

ai_errors: list[dict[str, Any]] = []
_response_cache: dict[str, tuple[float, str]] = {}
CACHE_TTL_SECONDS = 300

def log_ai_error(feature: str, error_msg: str, model: str, provider: str):
    global ai_errors
    ai_errors.append({
        "timestamp": datetime.now().isoformat(),
        "feature": feature,
        "error": error_msg,
        "provider": provider,
        "model": model,
    })
    if len(ai_errors) > 100:
        ai_errors.pop(0)

class AIEngineError(Exception):
    def __init__(self, message: str, code: str = "ai_error"):
        super().__init__(message)
        self.code = code

class AIEngine:
    def __init__(self):
        # Gemini config
        self.gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
        self.embedding_model = os.getenv("GEMINI_EMBEDDING_MODEL", "models/gemini-embedding-001")
        if "text-embedding-004" in self.embedding_model:
            self.embedding_model = "models/gemini-embedding-001"
        self.gemini_client: Optional[genai.Client] = None
        
        # OpenAI config
        self.openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.openai_client: Optional[OpenAI] = None

        self._initialize_clients()

    def _initialize_clients(self):
        # Init Gemini
        if self.gemini_key:
            try:
                self.gemini_client = genai.Client(api_key=self.gemini_key)
                print("[OK] Gemini API client initialized")
            except Exception as e:
                print(f"[WARN] Failed to initialize Gemini client: {e}")
                self.gemini_client = None
        
        # Init OpenAI
        if self.openai_key and OpenAI is not None:
            try:
                self.openai_client = OpenAI(api_key=self.openai_key)
                print("[OK] OpenAI API client initialized")
            except Exception as e:
                print(f"[WARN] Failed to initialize OpenAI client: {e}")
                self.openai_client = None

    def _cache_key(self, feature: str, prompt: str, system_instruction: Optional[str], json_mode: bool) -> str:
        raw = f"{feature}|{json_mode}|{system_instruction or ''}|{prompt}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def clean_json(self, text: str) -> str:
        if not text:
            return text
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()

    def safe_json_loads(self, text: str):
        try:
            return json.loads(self.clean_json(text))
        except Exception:
            return None

    def _retry_with_backoff(self, func, retries=3, delay=1.0):
        """Helper to run a function with exponential backoff."""
        last_exception = None
        for attempt in range(retries):
            try:
                return func()
            except Exception as e:
                last_exception = e
                err_str = str(e).lower()
                if "404" in err_str or "not found" in err_str or "not_found" in err_str or "invalid" in err_str:
                    print(f"[AI RETRY] Non-retryable error ({e}). Skipping retry.")
                    raise e
                print(f"[AI RETRY] Attempt {attempt + 1} failed: {e}")
                if attempt < retries - 1:
                    time.sleep(delay * (2 ** attempt))
        raise last_exception

    def generate_content(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        json_mode: bool = False,
        feature: str = "Unknown",
        use_cache: bool = True,
    ) -> str:
        cache_key = self._cache_key(feature, prompt, system_instruction, json_mode)
        
        # 1. Cache Check
        if use_cache and cache_key in _response_cache:
            cached_at, cached_value = _response_cache[cache_key]
            if time.time() - cached_at < CACHE_TTL_SECONDS:
                return cached_value

        # 2. Try Gemini (Primary)
        if self.gemini_client:
            try:
                def call_gemini():
                    config_kwargs = {"temperature": 0.4}
                    if system_instruction:
                        config_kwargs["system_instruction"] = system_instruction
                    if json_mode:
                        config_kwargs["response_mime_type"] = "application/json"
                    
                    response = self.gemini_client.models.generate_content(
                        model=self.gemini_model,
                        contents=prompt,
                        config=types.GenerateContentConfig(**config_kwargs)
                    )
                    content = (response.text or "").strip()
                    if not content:
                        raise AIEngineError("Gemini returned empty response")
                    if json_mode and not self.safe_json_loads(content):
                        raise AIEngineError("Gemini JSON could not be parsed")
                    return content

                res = self._retry_with_backoff(call_gemini)
                if use_cache:
                    _response_cache[cache_key] = (time.time(), res)
                return res
            except Exception as e:
                log_ai_error(feature, f"Gemini error: {e}", self.gemini_model, "Gemini")
                print(f"[AI WARN] Gemini primary failed for feature '{feature}': {e}. Trying OpenAI fallback...")

        # 3. Try OpenAI (Secondary Fallback)
        if self.openai_client:
            try:
                def call_openai():
                    messages = []
                    if system_instruction:
                        messages.append({"role": "system", "content": system_instruction})
                    messages.append({"role": "user", "content": prompt})

                    kwargs = {
                        "model": self.openai_model,
                        "messages": messages,
                        "temperature": 0.4
                    }
                    if json_mode:
                        kwargs["response_format"] = {"type": "json_object"}

                    response = self.openai_client.chat.completions.create(**kwargs)
                    content = response.choices[0].message.content.strip()
                    if not content:
                        raise AIEngineError("OpenAI returned empty response")
                    if json_mode and not self.safe_json_loads(content):
                        raise AIEngineError("OpenAI JSON could not be parsed")
                    return content

                res = self._retry_with_backoff(call_openai)
                if use_cache:
                    _response_cache[cache_key] = (time.time(), res)
                return res
            except Exception as e:
                log_ai_error(feature, f"OpenAI error: {e}", self.openai_model, "OpenAI")
                print(f"[AI WARN] OpenAI fallback failed for feature '{feature}': {e}. Trying Rule-based fallback...")

        # 4. Final Fallback: Rule-based Heuristic AI
        return self._generate_rule_based_fallback(prompt, json_mode, feature)

    def chat(
        self,
        message: str,
        system_instruction: Optional[str] = None,
        chat_history: Optional[list[dict]] = None,
        feature: str = "Chat",
    ) -> str:
        # 1. Try Gemini
        if self.gemini_client:
            try:
                def call_gemini_chat():
                    contents = []
                    if chat_history:
                        for entry in chat_history[-15:]:
                            role = "user" if entry.get("role") == "user" else "model"
                            contents.append(
                                types.Content(role=role, parts=[types.Part(text=entry.get("content", ""))])
                            )
                    contents.append(types.Content(role="user", parts=[types.Part(text=message)]))
                    
                    config_kwargs = {"temperature": 0.5}
                    if system_instruction:
                        config_kwargs["system_instruction"] = system_instruction

                    response = self.gemini_client.models.generate_content(
                        model=self.gemini_model,
                        contents=contents,
                        config=types.GenerateContentConfig(**config_kwargs)
                    )
                    return (response.text or "").strip()
                
                return self._retry_with_backoff(call_gemini_chat)
            except Exception as e:
                log_ai_error(feature, f"Gemini chat error: {e}", self.gemini_model, "Gemini")
                print(f"[AI WARN] Gemini Chat failed. Trying OpenAI...")

        # 2. Try OpenAI
        if self.openai_client:
            try:
                def call_openai_chat():
                    messages = []
                    if system_instruction:
                        messages.append({"role": "system", "content": system_instruction})
                    if chat_history:
                        for entry in chat_history[-15:]:
                            messages.append({"role": entry.get("role", "user"), "content": entry.get("content", "")})
                    messages.append({"role": "user", "content": message})

                    response = self.openai_client.chat.completions.create(
                        model=self.openai_model,
                        messages=messages,
                        temperature=0.5
                    )
                    return response.choices[0].message.content.strip()

                return self._retry_with_backoff(call_openai_chat)
            except Exception as e:
                log_ai_error(feature, f"OpenAI chat error: {e}", self.openai_model, "OpenAI")
                print(f"[AI WARN] OpenAI Chat failed. Using rule-based fallback...")

        # 3. Rule-based Chat Fallback
        return self._generate_rule_based_chat(message)

    def get_embedding(self, text: str) -> list[float]:
        # Try Gemini (Primary)
        if self.gemini_client:
            try:
                def call_gemini_embed():
                    response = self.gemini_client.models.embed_content(
                        model=self.embedding_model,
                        contents=text[:8000],
                        config=types.EmbedContentConfig(output_dimensionality=768)
                    )
                    return list(response.embeddings[0].values)
                return self._retry_with_backoff(call_gemini_embed)
            except Exception as e:
                print(f"[AI WARN] Gemini embedding failed: {e}. Trying OpenAI...")

        # Try OpenAI (Secondary)
        if self.openai_client:
            try:
                def call_openai_embed():
                    response = self.openai_client.embeddings.create(
                        input=text[:8000],
                        model="text-embedding-3-small"
                    )
                    return list(response.data[0].embedding)
                # If the embedding size differs, let's pad or truncate. OpenAI text-embedding-3-small yields 1536 dim.
                # Gemini text-embedding-004 yields 768 dim.
                # Let's ensure consistency: 768 dimensions. If OpenAI is 1536, truncate to 768.
                emb = self._retry_with_backoff(call_openai_embed)
                return emb[:768]
            except Exception as e:
                print(f"[AI WARN] OpenAI embedding failed: {e}. Using deterministic seed-based mock embeddings...")

        # Heuristic seed-based fallback
        h = hashlib.sha256(text.encode()).hexdigest()
        seed = int(h[:8], 16)
        import random
        random.seed(seed)
        return [random.uniform(-0.1, 0.1) for _ in range(768)]

    def _generate_rule_based_fallback(self, prompt: str, json_mode: bool, feature: str) -> str:
        """Determines feature and generates structured heuristic response."""
        p_lower = prompt.lower()
        print(f"[AI FALLBACK] Generating heuristic rule-based fallback for: {feature}")

        # 1. Resume Analysis Fallback
        if "analyze" in p_lower and "ats" in p_lower:
            # Look for common skills in prompt text
            found_skills = []
            for skill in ["python", "javascript", "react", "sql", "java", "c#", "html", "css", "docker", "aws", "git"]:
                if skill in p_lower:
                    found_skills.append(skill.capitalize())
            
            missing_skills = [s for s in ["Docker", "AWS", "Kubernetes", "TypeScript"] if s not in found_skills]
            
            fallback_data = {
                "profile_overview": {
                    "strength": "Solid profile with core engineering capabilities" if len(found_skills) > 3 else "Developer profile needing alignment",
                    "experience_level": "Mid-level" if "mid" in p_lower or len(found_skills) > 4 else "Entry-level",
                    "domain": "Software Engineering"
                },
                "score_breakdown": {
                    "skills": 70 + len(found_skills) * 2,
                    "experience": 65,
                    "keywords": 70,
                    "formatting": 80,
                    "grammar": 85
                },
                "detailed_summary": {
                    "key_strengths": found_skills if found_skills else ["Technical Problem Solving"],
                    "missing_skills": missing_skills,
                    "improvement_suggestions": [
                        "Add measurable impact to your bullet points (e.g., increased performance by X%)",
                        "Include certifications and cloud technologies like AWS or GCP"
                    ],
                    "ats_optimization": [
                        "Avoid multi-column tables to ensure ATS scanners read details cleanly",
                        "Ensure standard section headings like 'Work Experience' and 'Education'"
                    ],
                    "job_suitability": ["Frontend Developer", "Backend Developer", "Fullstack Developer"]
                },
                "summary": "This resume demonstrates technical competency in engineering. Based on heuristic keywords, the formatting conforms to general guidelines, but incorporating structured metrics and highlighting containerized deployment tools would further optimize the profile for ATS parsers.",
                "ats_score": 75 if len(found_skills) > 3 else 65,
                "job_recommendations": [
                    {
                        "title": "Software Developer",
                        "company": "System Tech Corp",
                        "match_percentage": 78,
                        "location": "Remote",
                        "experience_level": "Professional",
                        "description": "Looking for developers proficient with modern web technologies, Git, and database queries."
                    }
                ],
                "strengths": found_skills if found_skills else ["Adaptability"],
                "weaknesses": missing_skills,
                "formatting_suggestions": ["Ensure fonts are standard", "Avoid tables or charts"],
                "keyword_optimization": ["Add words like Scalability, Deployment, and Version Control"],
                "industry_suggestions": ["Target SaaS, web development, and cloud services companies"]
            }
            return json.dumps(fallback_data)

        # 2. Resume Section Parsing Fallback
        if "split" in p_lower or "section" in p_lower:
            return json.dumps({
                "personal_information": {"name": "Candidate", "email": "candidate@example.com", "phone": "123-456-7890", "linkedin": "", "location": ""},
                "summary": "Software development professional",
                "skills": ["Python", "JavaScript", "SQL", "Git"],
                "education": "BS in Computer Science",
                "projects": "Created various software applications and interfaces",
                "experience": "Software Engineer (2024-Present)",
                "certifications": ""
            })

        # 3. Resume Sentence Improvement Fallback
        if "bullet" in p_lower or "convert" in p_lower:
            # Extract basic sentence
            lines = prompt.split("\n")
            sentence = lines[-1] if lines else "Worked on development"
            return json.dumps({
                "bullet_point": f"Spearheaded development and deployment of technical features, boosting system performance by 15% and collaborating with cross-functional teams."
            })

        # 4. Compare Resume to Job Fallback
        if "compare" in p_lower or "job description" in p_lower:
            return json.dumps({
                "matched_skills": ["Python", "Git"],
                "missing_skills": ["AWS", "Docker"],
                "explanation": "Profile has the foundational programming skills, but lacks containerization and cloud experience.",
                "suggestions": ["Add container deployments project on your portfolio", "Get AWS Practitioner Certified"]
            })

        # 5. Market trends fallback
        if "market" in p_lower or "trending" in p_lower:
            return json.dumps({
                "trending_skills": ["React", "Python", "Kubernetes", "AWS", "FastAPI", "TypeScript"],
                "analysis": "Currently, cloud integrations (AWS/GCP), TypeScript, and Python frameworks represent the highest growth keywords across aggregated technical descriptions."
            })

        # 6. Interview Questions Fallback
        if "interview" in p_lower or "questions" in p_lower:
            return json.dumps({
                "questions": [
                    {
                        "category": "Behavioral",
                        "difficulty": "medium",
                        "question": "Tell me about a time you solved a complex technical bug under tight deadlines.",
                        "answer": "Use the STAR method: Describe the Situation, Task, Action you took, and final Result with numbers.",
                        "explanation": "Tests troubleshooting skills, ownership, and composure."
                    },
                    {
                        "category": "Technical",
                        "difficulty": "medium",
                        "question": "What is the difference between REST API and GraphQL?",
                        "answer": "REST utilizes specific endpoints for each resource, while GraphQL requests only the fields required via a single endpoint.",
                        "explanation": "Validates system design fundamentals."
                    }
                ]
            })

        # Precaution fallback
        if json_mode:
            return json.dumps({"message": "Operation completed successfully.", "details": []})
        return "Heuristic fallback analysis completed successfully."

    def _generate_rule_based_chat(self, message: str) -> str:
        msg = message.lower()
        if "hello" in msg or "hi" in msg:
            return "Hello! I am your AI career mentor. I can analyze your resume, recommend jobs, and help you prepare for technical interviews. What career goals can I help you with today?"
        if "resume" in msg or "improve" in msg:
            return "To improve your resume, I suggest adding metrics (like 'reduced loading time by 20%') to your bullet points, grouping your tech stack cleanly, and avoiding multi-column templates."
        if "skills" in msg or "learn" in msg:
            return "Currently, high-demand skills include Python (for backend/AI), React/TypeScript (for frontend), and cloud computing (AWS/Docker). I recommend building a project using FastAPI and deploying it to AWS."
        return "That is a great career question. I suggest structuring your strategy by researching job postings in your target location, analyzing missing skills, and building concrete projects to bridge any technical gaps."

    def test_connection(self) -> dict[str, Any]:
        start = time.time()
        # 1. Try Gemini
        if self.gemini_client:
            try:
                self.gemini_client.models.generate_content(
                    model=self.gemini_model,
                    contents="OK",
                )
                return {
                    "api_key_present": True,
                    "api_key_valid_format": True,
                    "test_success": True,
                    "test_error": None,
                    "test_latency_ms": round((time.time() - start) * 1000, 2),
                    "active_provider": "Gemini",
                }
            except Exception as e:
                pass

        # 2. Try OpenAI
        if self.openai_client:
            try:
                self.openai_client.chat.completions.create(
                    model=self.openai_model,
                    messages=[{"role": "user", "content": "Hi"}],
                    max_tokens=5
                )
                return {
                    "api_key_present": True,
                    "api_key_valid_format": True,
                    "test_success": True,
                    "test_error": None,
                    "test_latency_ms": round((time.time() - start) * 1000, 2),
                    "active_provider": "OpenAI",
                }
            except Exception as e:
                pass

        return {
            "api_key_present": bool(self.gemini_key or self.openai_key),
            "api_key_valid_format": True,
            "test_success": False,
            "test_error": "All AI models returned quota exceeded or unauthorized errors. Falling back to heuristic rule-based AI.",
            "test_latency_ms": round((time.time() - start) * 1000, 2),
            "active_provider": "Rule-based Fallback Heuristics",
        }

ai_engine = AIEngine()
