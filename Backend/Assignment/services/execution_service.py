from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from Assignment.services.code_runner import execute_test_cases

UNLIMITED_TRIAL_EMAILS = {"23091a32j4@rgmcet.edu.in"}


async def service_run_tests(
    assignment_token: str,
    question_id: str,
    code: str,
    language: str,
    db: AsyncIOMotorDatabase,
) -> Dict[str, Any]:
    """
    Executes candidate code against public and hidden test cases in sandbox.
    """
    assign_doc = await db["assignments"].find_one({"assignment_token": assignment_token})
    if not assign_doc:
        raise HTTPException(status_code=404, detail="Assessment not found.")

    candidate_email = (assign_doc.get("candidate_email") or "").strip().lower()
    is_unlimited = candidate_email in UNLIMITED_TRIAL_EMAILS
    if assign_doc.get("status") in ["submitted", "terminated_violation"] and not is_unlimited:
        raise HTTPException(
            status_code=403,
            detail="Assessment has already been completed. Code testing is locked for single-attempt candidates."
        )

    target_q = next((q for q in assign_doc.get("questions", []) if q.get("id") == question_id), None)
    if not target_q:
        raise HTTPException(status_code=404, detail=f"Question '{question_id}' not found in this assignment.")

    exec_result = execute_test_cases(
        code=code,
        function_name=target_q.get("function_name", "solution"),
        public_tests=target_q.get("public_test_cases", []),
        hidden_tests=target_q.get("hidden_test_cases", []),
        language=language,
    )

    await db["assignments"].update_one(
        {"assignment_token": assignment_token},
        {
            "$set": {
                f"submissions.{question_id}": {
                    "code": code,
                    "language": language,
                    "last_run_at": datetime.now(timezone.utc).isoformat(),
                }
            }
        },
    )

    return {
        "question_id": question_id,
        "all_passed": exec_result.get("all_passed", False),
        "total_tests": exec_result.get("total_tests", 0),
        "passed_tests": exec_result.get("passed_tests", 0),
        "public_results": exec_result.get("public_results", []),
        "hidden_results": exec_result.get("hidden_results", []),
        "stdout": exec_result.get("stdout", ""),
        "stderr": exec_result.get("stderr", ""),
        "compile_error": exec_result.get("compile_error"),
    }

