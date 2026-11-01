from typing import Optional
from fastapi import APIRouter, Depends, Query, Header
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database

from Assignment.schemas.assessment_schemas import AssignmentDetailsResponse
from Assignment.services.assessment_service import service_get_or_create_assignment

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
