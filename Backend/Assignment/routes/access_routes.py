from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database

from Assignment.schemas.access_schemas import (
    VerifyExamAccessRequest,
    VerifyExamAccessResponse,
)
from Assignment.services.access_service import service_verify_exam_access

router = APIRouter()


@router.post("/{assignment_token}/verify-access", response_model=VerifyExamAccessResponse)
async def verify_candidate_exam_access(
    assignment_token: str,
    payload: VerifyExamAccessRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Verifies that the provided Username and Unique Exam Number match the record.
    """
    return await service_verify_exam_access(
        assignment_token=assignment_token,
        username=payload.username,
        unique_code=payload.unique_code,
        from_app=bool(payload.from_app),
        db=db,
    )

