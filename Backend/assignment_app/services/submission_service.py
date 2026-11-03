from datetime import datetime, timezone
from typing import Dict, Any, List
from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from assignment_app.services.code_runner import execute_test_cases
from assignment_app.services.assignment_generator import (
    generate_ai_submission_review,
)

UNLIMITED_TRIAL_EMAILS = {"23091a32j4@rgmcet.edu.in"}


async def service_submit_assignment(
    assignment_token: str,
    submissions: List[Dict[str, Any]],
    db: AsyncIOMotorDatabase,
) -> Dict[str, Any]:
    """
    Evaluates candidate code submissions, scores test outcomes, runs AI review,
    and updates assignment and course student records in the database.
    """
    assign_doc = await db["assignments"].find_one({"assignment_token": assignment_token})
    if not assign_doc:
        raise HTTPException(status_code=404, detail="Assessment not found.")

    candidate_email = (assign_doc.get("candidate_email") or "").strip().lower()
    is_unlimited_tester = candidate_email in UNLIMITED_TRIAL_EMAILS

    # Enforce strict 1-attempt rule for regular candidates
    if assign_doc.get("status") in ["submitted", "terminated_violation"] and not is_unlimited_tester:
        raise HTTPException(
            status_code=403,
            detail="You have already completed your 1 permitted attempt for this coding assessment. Multiple attempts are not permitted."
        )

    submissions_map = {s["question_id"]: s for s in submissions}
    questions = assign_doc.get("questions", [])

    detailed_results = []
    total_tests_count = 0
    total_tests_passed = 0
    passed_questions = 0

    for q in questions:
        q_id = q.get("id")
        sub = submissions_map.get(q_id, {})
        code = sub.get("code", "")
        lang = sub.get("language", "python")

        exec_res = execute_test_cases(
            code=code,
            function_name=q.get("function_name", "solution"),
            public_tests=q.get("public_test_cases", []),
            hidden_tests=q.get("hidden_test_cases", []),
            language=lang,
        )

        total_tests_count += exec_res["total_tests"]
        total_tests_passed += exec_res["passed_tests"]
        if exec_res["all_passed"]:
            passed_questions += 1

        detailed_results.append({
            "question_id": q_id,
            "title": q.get("title"),
            "difficulty": q.get("difficulty"),
            "all_passed": exec_res["all_passed"],
            "total_tests": exec_res["total_tests"],
            "passed_tests": exec_res["passed_tests"],
            "public_results": exec_res["public_results"],
            "hidden_results": exec_res["hidden_results"],
            "code": code,
        })

    score = round((total_tests_passed / total_tests_count * 100) if total_tests_count > 0 else 0, 1)
    is_selected_for_interview = (score >= 50.0)
    interview_status = (
        "Selected for Next AI Interview Round" if is_selected_for_interview else "Not Selected (Score Below 50%)"
    )

    ai_review = await generate_ai_submission_review(
        course_title=assign_doc.get("course_title", "Technical Track"),
        candidate_name=assign_doc.get("candidate_name", "Candidate"),
        detailed_results=detailed_results,
    )

    now_iso = datetime.now(timezone.utc).isoformat()

    await db["assignments"].update_one(
        {"assignment_token": assignment_token},
        {
            "$set": {
                "status": "submitted",
                "submitted_at": now_iso,
                "score": score,
                "passed_questions": passed_questions,
                "total_questions": len(questions),
                "detailed_results": detailed_results,
                "ai_review": ai_review,
                "selected_for_interview": is_selected_for_interview,
                "interview_status": interview_status,
                "next_round_eligible": is_selected_for_interview,
                "interview_stage": (
                    "selected_for_ai_interview" if is_selected_for_interview else "not_qualified"
                ),
            }
        },
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
                    "enrolled_students.$.assignment_status": "submitted",
                    "enrolled_students.$.assignment_score": score,
                    "enrolled_students.$.assignment_submitted_at": now_iso,
                    "enrolled_students.$.ai_review": ai_review,
                    "enrolled_students.$.selected_for_interview": is_selected_for_interview,
                    "enrolled_students.$.interview_status": interview_status,
                    "enrolled_students.$.next_round_eligible": is_selected_for_interview,
                    "enrolled_students.$.application_status": (
                        "selected_for_interview" if is_selected_for_interview else "assignment_completed"
                    ),
                }
            },
        )

    return {
        "assignment_token": assignment_token,
        "message": (
            f"Congratulations! With a score of {score}%, you are selected for the next AI Interview process!"
            if is_selected_for_interview
            else f"Assessment submitted. Score: {score}% (A minimum of 50% is required for the next AI Interview process)."
        ),
        "status": "submitted",
        "score": score,
        "selected_for_interview": is_selected_for_interview,
        "interview_status": interview_status,
        "next_round_eligible": is_selected_for_interview,
        "passed_questions": passed_questions,
        "total_questions": len(questions),
        "total_tests_passed": total_tests_passed,
        "total_tests_count": total_tests_count,
        "submitted_at": now_iso,
        "results": detailed_results,
        "detailed_results": detailed_results,
        "ai_review": ai_review,
    }


async def service_get_assignment_results(assignment_token: str, db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    """
    Retrieves final submission evaluation results.
    """
    assign_doc = await db["assignments"].find_one({"assignment_token": assignment_token})
    if not assign_doc:
        raise HTTPException(status_code=404, detail="Assessment not found.")

    if assign_doc.get("status") != "submitted":
        raise HTTPException(status_code=400, detail="Assessment has not been submitted yet.")

    score = assign_doc.get("score") if assign_doc.get("score") is not None else 0.0
    is_selected = assign_doc.get("selected_for_interview", score >= 50.0)

    return {
        "assignment_token": assignment_token,
        "course_title": assign_doc.get("course_title"),
        "candidate_name": assign_doc.get("candidate_name"),
        "status": assign_doc.get("status"),
        "score": score,
        "selected_for_interview": is_selected,
        "interview_status": assign_doc.get("interview_status") or (
            "Selected for Next AI Interview Round" if is_selected else "Not Selected (Score Below 50%)"
        ),
        "next_round_eligible": is_selected,
        "passed_questions": assign_doc.get("passed_questions", 0),
        "total_questions": assign_doc.get("total_questions", 0),
        "submitted_at": assign_doc.get("submitted_at"),
        "detailed_results": assign_doc.get("detailed_results", []),
        "ai_review": assign_doc.get("ai_review"),
    }

