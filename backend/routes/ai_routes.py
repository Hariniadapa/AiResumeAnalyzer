from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from ai_services import AIServices
from dependencies import get_current_user

router = APIRouter(tags=["AI"])


def _svc(db: Session = Depends(get_db)) -> AIServices:
    return AIServices(db)


def _auth(user: str = Depends(get_current_user)) -> str:
    return user


@router.post("/resume/edit-suggestions/")
def edit_suggestions(data: dict, _user: str = Depends(_auth), svc: AIServices = Depends(_svc)):
    return {"suggestions": svc.generate_editing_suggestions(data.get("resume_text", ""))}


@router.post("/resume/generate-bullet/")
def generate_bullet(data: dict, _user: str = Depends(_auth), svc: AIServices = Depends(_svc)):
    return svc.generate_bullet_point(data.get("sentence", ""))


@router.post("/resume/parse-sections/")
def parse_sections(data: dict, _user: str = Depends(_auth), svc: AIServices = Depends(_svc)):
    return svc.parse_resume_to_sections(data.get("resume_text", ""))


@router.post("/resume/skill-gap/")
def skill_gap(data: dict, _user: str = Depends(_auth), svc: AIServices = Depends(_svc)):
    return svc.detect_skill_gaps(
        data.get("resume_text", ""),
        data.get("target_role", "Software Engineer"),
    )


@router.post("/resume/rewrite-section/")
def rewrite_section(data: dict, _user: str = Depends(_auth), svc: AIServices = Depends(_svc)):
    return svc.rewrite_section(data.get("text", ""), data.get("mode", "professional"))


@router.post("/resume/ats-score/")
def ats_score(data: dict, _user: str = Depends(_auth), svc: AIServices = Depends(_svc)):
    return svc.calculate_ats_score(data.get("resume_text", ""))


@router.post("/chat/")
def chat_mentor(data: dict, _user: str = Depends(_auth), svc: AIServices = Depends(_svc)):
    return svc.chat_with_mentor(
        message=data.get("message", ""),
        resume_data={"resume_text": data.get("resume_text", "")},
        chat_history=data.get("chat_history", []),
    )


@router.post("/interview/generate/")
def generate_interview(data: dict, _user: str = Depends(_auth), svc: AIServices = Depends(_svc)):
    return svc.generate_interview_questions(
        resume_text=data.get("resume_text", ""),
        target_role=data.get("target_role", "Software Engineer"),
    )


@router.post("/interview/simulate/")
def simulate_interview(data: dict, _user: str = Depends(_auth), svc: AIServices = Depends(_svc)):
    return svc.simulate_interview_chat(
        message=data.get("message", ""),
        chat_history=data.get("chat_history", []),
        resume_text=data.get("resume_text", ""),
        category=data.get("category", "Technical"),
    )


@router.get("/debug/ai/")
def ai_diagnostics(_user: str = Depends(_auth), svc: AIServices = Depends(_svc)):
    return svc.get_diagnostics()
