from fastapi import APIRouter
from .portal_routes import router as portal_router
from .assessment_routes import router as assessment_router
from .download_routes import router as download_router

assignment_router = APIRouter(tags=["AI Coding Assignments"])

assignment_router.include_router(portal_router)
assignment_router.include_router(assessment_router)
assignment_router.include_router(download_router)

__all__ = ["assignment_router"]
