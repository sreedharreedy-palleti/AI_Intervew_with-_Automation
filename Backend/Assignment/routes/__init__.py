from fastapi import APIRouter
from .access_routes import router as access_router
from .assessment_routes import router as assessment_router
from .execution_routes import router as execution_router
from .submission_routes import router as submission_router
from .portal_routes import router as portal_router
from .proctor_routes import router as proctor_router

assignment_router = APIRouter(tags=["AI Coding Assignments"])

assignment_router.include_router(access_router)
assignment_router.include_router(assessment_router)
assignment_router.include_router(execution_router)
assignment_router.include_router(submission_router)
assignment_router.include_router(portal_router)
assignment_router.include_router(proctor_router)

__all__ = ["assignment_router"]
