"""Canonical location: assignment_app.routes"""
from assignment_app.routes import (
    assignment_router,
    access_router,
    assessment_router,
    execution_router,
    submission_router,
    portal_router,
    proctor_router,
)

__all__ = [
    "assignment_router",
    "access_router",
    "assessment_router",
    "execution_router",
    "submission_router",
    "portal_router",
    "proctor_router",
]
