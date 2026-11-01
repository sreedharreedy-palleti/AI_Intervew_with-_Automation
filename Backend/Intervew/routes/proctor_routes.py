from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database

from Intervew.schemas.proctor_schemas import (
    InterviewProctorFrameRequest,
    InterviewProctorFrameResponse,
)
from Intervew.services.interview_proctor_service import (
    service_analyze_interview_frame,
)

router = APIRouter()


@router.post("/{interview_token}/proctor/analyze-frame", response_model=InterviewProctorFrameResponse, status_code=status.HTTP_200_OK)
async def analyze_interview_proctor_frame(
    interview_token: str,
    payload: InterviewProctorFrameRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Real-time AI proctoring analysis during live technical interview:
    - Mobile phone / unauthorized device detection (YOLO11n)
    - Multiple faces / secondary persons detection (OpenCV + YOLO)
    - Second person sound / external conversation detection (Audio energy)
    """
    return await service_analyze_interview_frame(interview_token, payload, db)

