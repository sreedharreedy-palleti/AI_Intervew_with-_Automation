from typing import Optional
from fastapi import APIRouter, Depends, Query, Header
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database

from Assignment.schemas import (
    AssignmentDetailsResponse,
    RunTestsRequest,
    RunTestsResponse,
    SubmitAssignmentRequest,
    SubmitAssignmentResponse,
    VerifyExamAccessRequest,
    VerifyExamAccessResponse,
)
from Assignment.services import (
    service_get_or_create_assignment,
    service_verify_exam_access,
    service_run_tests,
    service_submit_assignment,
    service_get_assignment_results,
)

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


@router.post("/{assignment_token}/submit", response_model=SubmitAssignmentResponse)
async def submit_assignment(
    assignment_token: str,
    payload: SubmitAssignmentRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Submits all solutions and triggers AI evaluation review.
    """
    submissions_data = [s.model_dump() if hasattr(s, "model_dump") else s.dict() for s in payload.submissions]
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
