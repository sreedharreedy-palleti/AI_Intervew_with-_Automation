"""
Administrative Evaluation & Reporting Routes.
Exposes endpoints for AI Coding Assignment reports, interview shortlisting decisions,
and AI Technical Interview reports with completion duration and scores.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import get_database
from auth.services.security_service import require_admin
from Admin.services.admin_report_service import (
    service_get_assignment_reports,
    service_update_assignment_interview_decision,
    service_get_interview_reports,
)

router = APIRouter()


class AssignmentDecisionRequest(BaseModel):
    course_id: str
    user_id: Optional[str] = None
    assignment_token: Optional[str] = None
    decision: str  # "shortlisted" or "not_shortlisted"


@router.get("/assignments")
async def get_assignment_reports(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(require_admin),
):
    """
    Returns live reports for all candidate AI Coding Assignments:
    - Candidate Name, Gmail/Email, Course Title
    - Final Coding Assessment Score
    - Qualification for next interview round (Threshold >= 50%)
    - Current Interview Shortlist status
    """
    reports = await service_get_assignment_reports(db)
    return {"reports": reports, "total": len(reports)}


@router.post("/assignments/decision")
async def update_assignment_interview_decision(
    payload: AssignmentDecisionRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(require_admin),
):
    """
    Updates the candidate's interview qualification decision (shortlisted / not_shortlisted).
    Persists decision directly to both courses.enrolled_students and assignments.
    """
    if payload.decision not in ["shortlisted", "not_shortlisted"]:
        raise HTTPException(
            status_code=400,
            detail="Decision must be either 'shortlisted' or 'not_shortlisted'."
        )
    return await service_update_assignment_interview_decision(
        db=db,
        course_id=payload.course_id,
        user_id=payload.user_id or "",
        decision=payload.decision,
        assignment_token=payload.assignment_token,
    )


@router.get("/interviews")
async def get_interview_reports(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(require_admin),
):
    """
    Returns detailed reports for all candidate AI Technical Interview sessions:
    - Candidate Name, Email, Course Title
    - Duration to complete interview in minutes
    - Interview Score & Competency Breakdown
    - Hiring Verdict & Status
    """
    reports = await service_get_interview_reports(db)
    return {"reports": reports, "total": len(reports)}

