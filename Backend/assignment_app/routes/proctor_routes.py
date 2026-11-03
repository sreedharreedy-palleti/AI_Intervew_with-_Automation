from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database

from assignment_app.schemas.proctor_schemas import (
    ProctorFrameRequest,
    ProctorFrameResponse,
    ProctorTerminationRequest,
    ProctorTerminationResponse,
    ProctorPrecheckRequest,
    ProctorPrecheckResponse,
)
from assignment_app.services.proctor_service import (
    service_analyze_frame,
    service_terminate_exam_for_violation,
    service_get_proctor_logs,
    service_verify_precheck,
)

router = APIRouter()


@router.post("/{assignment_token}/proctor/verify-precheck", response_model=ProctorPrecheckResponse)
async def verify_precheck(
    assignment_token: str,
    payload: ProctorPrecheckRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Saves initial candidate face capture & audio verification to MongoDB before code editor opens.
    """
    return await service_verify_precheck(assignment_token, payload, db)


@router.post("/{assignment_token}/proctor/analyze-frame", response_model=ProctorFrameResponse)
async def analyze_proctor_frame(
    assignment_token: str,
    payload: ProctorFrameRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Analyzes live camera snapshot, audio noise/voice levels, and screen focus status.
    Flags violations (mobile phone usage, screen shifting, secondary voices).
    """
    return await service_analyze_frame(assignment_token, payload, db)


@router.post("/{assignment_token}/proctor/terminate", response_model=ProctorTerminationResponse)
async def terminate_exam(
    assignment_token: str,
    payload: ProctorTerminationRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Terminates and locks the assessment immediately due to detected proctoring violation.
    """
    return await service_terminate_exam_for_violation(assignment_token, payload, db)


@router.get("/{assignment_token}/proctor/logs")
async def get_proctor_logs(
    assignment_token: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Retrieves logged proctoring incidents for candidate review.
    """
    return await service_get_proctor_logs(assignment_token, db)

