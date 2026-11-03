from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database

from assignment_app.schemas.execution_schemas import (
    RunTestsRequest,
    RunTestsResponse,
)
from assignment_app.services.execution_service import service_run_tests

router = APIRouter()


@router.post("/{assignment_token}/run-tests", response_model=RunTestsResponse)
async def run_assignment_tests(
    assignment_token: str,
    payload: RunTestsRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Executes candidate code against test cases in sandbox.
    """
    return await service_run_tests(
        assignment_token=assignment_token,
        question_id=payload.question_id,
        code=payload.code,
        language=payload.language,
        db=db,
    )

