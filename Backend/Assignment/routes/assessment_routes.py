from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, Query, Header, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database

from Assignment.schemas.assessment_schemas import AssignmentDetailsResponse
from Assignment.services.assessment_service import service_get_or_create_assignment, UNLIMITED_TRIAL_EMAILS

router = APIRouter()


@router.get("/{assignment_token}", response_model=AssignmentDetailsResponse)
async def get_or_start_assignment(
    assignment_token: str,
    unique_code: Optional[str] = Query(None, description="Unique Exam Passcode from invitation email"),
    username: Optional[str] = Query(None, description="Candidate Username/Email"),
    from_app: Optional[bool] = Query(False, description="Flag indicating invocation inside dedicated Exam App"),
    x_exam_app: Optional[str] = Header(None, alias="X-Exam-App"),
    x_exam_code: Optional[str] = Header(None, alias="X-Exam-Code"),
    x_exam_username: Optional[str] = Header(None, alias="X-Exam-Username"),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Fetch the candidate's personalized AI coding assessment.
    """
    effective_from_app = bool(
        from_app or (x_exam_app and x_exam_app.strip().lower() in ("true", "1", "yes"))
    )
    effective_code = unique_code or x_exam_code
    effective_user = username or x_exam_username

    return await service_get_or_create_assignment(
        assignment_token=assignment_token,
        db=db,
        unique_code=effective_code,
        username=effective_user,
        from_app=effective_from_app,
    )


@router.post("/{assignment_token}/reset-trial")
async def reset_assignment_for_unlimited_trial(
    assignment_token: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Resets coding assessment for authorized unlimited trial accounts (23091a32j4@rgmcet.edu.in).
    Normal candidates are locked to 1 attempt.
    """
    assign_doc = await db["assignments"].find_one({"assignment_token": assignment_token})
    if not assign_doc:
        raise HTTPException(status_code=404, detail="Assessment not found.")

    candidate_email = (assign_doc.get("candidate_email") or "").strip().lower()
    if candidate_email not in UNLIMITED_TRIAL_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Resetting assessments is only permitted for the unlimited trial account (23091a32j4@rgmcet.edu.in). Regular candidates have a strict 1-attempt limit."
        )

    # Reset assignment state to in_progress
    await db["assignments"].update_one(
        {"assignment_token": assignment_token},
        {
            "$set": {
                "status": "in_progress",
                "score": None,
                "submitted_at": None,
                "ai_review": None,
                "detailed_results": [],
                "proctor_logs": [],
                "proctor_violation_history": [],
                "termination_reason": None,
                "terminated_at": None,
            }
        }
    )

    course_id = assign_doc.get("course_id")
    if course_id and ObjectId.is_valid(course_id):
        await db["courses"].update_one(
            {
                "_id": ObjectId(course_id),
                "enrolled_students.assignment_token": assignment_token,
            },
            {
                "$set": {
                    "enrolled_students.$.assignment_status": "in_progress",
                    "enrolled_students.$.assignment_score": None,
                    "enrolled_students.$.assignment_submitted_at": None,
                    "enrolled_students.$.application_status": "shortlisted",
                }
            }
        )

    return {"message": "Assessment reset successfully. You may retake the test now.", "status": "in_progress"}
