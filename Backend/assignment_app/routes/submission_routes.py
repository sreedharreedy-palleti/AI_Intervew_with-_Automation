from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database

from assignment_app.schemas.submission_schemas import (
    SubmitAssignmentRequest,
    SubmitAssignmentResponse,
)
from assignment_app.services.submission_service import (
    service_submit_assignment,
    service_get_assignment_results,
)

router = APIRouter()


@router.post("/{assignment_token}/submit", response_model=SubmitAssignmentResponse)
async def submit_assignment(
    assignment_token: str,
    payload: SubmitAssignmentRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Submits all solutions and triggers AI evaluation review.
    """
    submissions_data = [
        s.model_dump() if hasattr(s, "model_dump") else s.dict()
        for s in payload.submissions
    ]
    return await service_submit_assignment(
        assignment_token=assignment_token,
        submissions=submissions_data,
        db=db,
    )


@router.get("/{assignment_token}/results")
async def get_assignment_results(
    assignment_token: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Retrieves final submission evaluation results.
    """
    return await service_get_assignment_results(assignment_token, db)

