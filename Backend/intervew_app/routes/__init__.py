from fastapi import APIRouter
from .admin_routes import router as admin_router
from .precheck_routes import router as precheck_router
from .session_routes import router as session_router
from .answer_routes import router as answer_router
from .report_routes import router as report_router
from .proctor_routes import router as proctor_router

interview_router = APIRouter()

# Mount modular route sections
interview_router.include_router(admin_router, tags=["AI Interview Admin"])
interview_router.include_router(precheck_router, tags=["AI Interview Precheck"])
interview_router.include_router(proctor_router, tags=["AI Interview Proctoring"])
interview_router.include_router(session_router, tags=["AI Interview Session"])
interview_router.include_router(answer_router, tags=["AI Interview Evaluation"])
interview_router.include_router(report_router, tags=["AI Interview Report"])

__all__ = [
    "interview_router",
    "admin_router",
    "precheck_router",
    "proctor_router",
    "session_router",
    "answer_router",
    "report_router",
]