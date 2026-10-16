import os
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from Assignment.services.assignment_generator import (
    generate_coding_assignment_with_ollama,
    generate_ai_submission_review,
)
from Assignment.services.code_runner import execute_test_cases
from Assignment.schemas import (
    AssignmentDetailsResponse,
    CodingQuestionOut,
    RunTestsResponse,
    PublicTestResult,
    HiddenTestResult,
    SubmitAssignmentResponse,
)



def sanitize_assignment_for_client(assign_doc: Dict[str, Any], locked: bool = False, lock_msg: Optional[str] = None) -> Dict[str, Any]:
    """
    Strips hidden test cases from the question payload so candidate cannot inspect them.
    Only returns hidden_test_cases_count and public_test_cases[cite: 4].
    """
    sanitized_questions = []
    if not locked:
        for q in assign_doc.get("questions", []):
            sanitized_questions.append({
                "id": q.get("id"),
                "title": q.get("title"),
                "difficulty": q.get("difficulty", "Medium"),
                "category": q.get("category", "General"),
                "problem_statement": q.get("problem_statement", ""),
                "constraints": q.get("constraints", []),
                "function_name": q.get("function_name", "solution"),
                "starter_code": q.get("starter_code", ""),
                "public_test_cases": q.get("public_test_cases", []),
                "hidden_test_cases_count": len(q.get("hidden_test_cases", [])),
            })

    app_download_url = os.getenv("EXAM_APP_DOWNLOAD_URL", f"/api/v1/assignment/{assign_doc['assignment_token']}/download")
    download_url = f"/api/v1/assignment/{assign_doc['assignment_token']}/download"

    return {
        "assignment_token": assign_doc["assignment_token"],
        "course_id": str(assign_doc.get("course_id", "")),
        "course_title": assign_doc.get("course_title", ""),
        "candidate_name": assign_doc.get("candidate_name", ""),
        "candidate_email": assign_doc.get("candidate_email", ""),
        "duration_minutes": assign_doc.get("duration_minutes", 60),
        "status": "locked" if locked else assign_doc.get("status", "pending"),
        "questions": sanitized_questions,
        "created_at": assign_doc.get("created_at"),
        "started_at": assign_doc.get("started_at"),
        "submitted_at": assign_doc.get("submitted_at"),
        "score": assign_doc.get("score"),
        "ai_review": assign_doc.get("ai_review"),
        "unique_code": assign_doc.get("unique_code") if not locked else None,
        "app_download_url": app_download_url,
        "download_url": download_url,
        "is_app_required": False,
        "locked": locked,
        "lock_message": lock_msg,
    }


async def service_verify_exam_access(
    assignment_token: str,
    username: str,
    unique_code: str,
    from_app: bool,
    db: AsyncIOMotorDatabase
) -> Dict[str, Any]:
    """
    Verifies that the provided Username and Unique Exam Number match the
    shortlisted candidate record for this assessment token[cite: 4].
    """
    course = await db["courses"].find_one({"enrolled_students.assignment_token": assignment_token})
    if not course:
        raise HTTPException(status_code=404, detail="Invalid or expired assessment token.")

    student = next((s for s in course.get("enrolled_students", []) if s.get("assignment_token") == assignment_token), None)
    if not student:
        raise HTTPException(status_code=404, detail="Candidate record not found for this assessment.")

    student_email = (student.get("email") or "").strip().lower()
    provided_user = username.strip().lower()

    student_code = (student.get("unique_code") or "").strip().upper()
    provided_code = unique_code.strip().upper()

    if student_email != provided_user or student_code != provided_code:
        raise HTTPException(
            status_code=403,
            detail="Access Denied: The Username or Unique Exam Number does not match the invitation credentials."
        )

    app_download_url = os.getenv("EXAM_APP_DOWNLOAD_URL", "/app/download-apk")

    return {
        "valid": True,
        "message": "Credentials verified. Access granted to the official Exam Application.",
        "assignment_token": assignment_token,
        "candidate_name": student.get("name", "Candidate"),
        "candidate_email": student.get("email", ""),
        "course_title": course.get("title", ""),
        "unique_code": student.get("unique_code", ""),
        "duration_minutes": student.get("duration_minutes", 60),
        "app_download_url": app_download_url,
    }


async def service_get_or_create_assignment(
    assignment_token: str,
    db: AsyncIOMotorDatabase,
    unique_code: Optional[str] = None,
    username: Optional[str] = None,
    from_app: bool = False,
) -> Dict[str, Any]:
    """
    Retrieves existing assignment or generates questions tailored to candidate's resume and course[cite: 4].
    Enforces dedicated Exam App lock unless launched from the official app or unlocked with
    candidate Username and Unique Exam Number[cite: 4].
    """
    course = await db["courses"].find_one({"enrolled_students.assignment_token": assignment_token})
    if not course:
        raise HTTPException(status_code=404, detail="Invalid or expired assessment token.")

    student = next((s for s in course.get("enrolled_students", []) if s.get("assignment_token") == assignment_token), None)
    if not student:
        raise HTTPException(status_code=404, detail="Candidate record not found for this assessment.")

    candidate_name = student.get("name", "Candidate")
    candidate_email = student.get("email", "")
    student_unique_code = student.get("unique_code", "")
    course_title = course.get("title", "Technical Track")
    course_desc = course.get("description", "")
    duration_minutes = student.get("duration_minutes", 60)

    require_app = os.getenv("REQUIRE_APP_FOR_EXAM", "false").lower() == "true"
    is_unlocked = not require_app

    if from_app:
        is_unlocked = True
    elif username and unique_code:
        if (username.strip().lower() == candidate_email.strip().lower() and
                unique_code.strip().upper() == student_unique_code.strip().upper()):
            is_unlocked = True

    if not is_unlocked:
        temp_doc = {
            "assignment_token": assignment_token,
            "course_id": str(course["_id"]),
            "course_title": course_title,
            "candidate_name": candidate_name,
            "candidate_email": candidate_email,
            "duration_minutes": duration_minutes,
            "status": "locked",
            "questions": [],
            "created_at": None,
            "started_at": None,
            "submitted_at": None,
            "score": None,
            "ai_review": None,
            "unique_code": None,
        }
        return sanitize_assignment_for_client(
            temp_doc,
            locked=True,
            lock_msg="Please enter your Username and Unique Exam Number to access your coding assessment."
        )

    assign_doc = await db["assignments"].find_one({"assignment_token": assignment_token})
    if assign_doc:
        return sanitize_assignment_for_client(assign_doc, locked=False)

    resume_text = student.get("resume_raw_text", "")
    questions = await generate_coding_assignment_with_ollama(
        candidate_name=candidate_name,
        resume_text=resume_text,
        course_title=course_title,
        course_description=course_desc
    )

    now_iso = datetime.now(timezone.utc).isoformat()
    assign_doc = {
        "assignment_token": assignment_token,
        "course_id": str(course["_id"]),
        "course_title": course_title,
        "user_id": student.get("user_id"),
        "candidate_name": candidate_name,
        "candidate_email": candidate_email,
        "unique_code": student_unique_code,
        "duration_minutes": duration_minutes,
        "status": "in_progress",
        "questions": questions,
        "created_at": now_iso,
        "started_at": now_iso,
        "submitted_at": None,
        "score": None,
        "submissions": {},
        "ai_review": None,
    }

    await db["assignments"].insert_one(assign_doc)
    return sanitize_assignment_for_client(assign_doc, locked=False)


async def service_run_tests(
    assignment_token: str,
    question_id: str,
    code: str,
    language: str,
    db: AsyncIOMotorDatabase
) -> Dict[str, Any]:
    assign_doc = await db["assignments"].find_one({"assignment_token": assignment_token})
    if not assign_doc:
        raise HTTPException(status_code=404, detail="Assessment not found.")

    target_q = next((q for q in assign_doc.get("questions", []) if q.get("id") == question_id), None)
    if not target_q:
        raise HTTPException(status_code=404, detail=f"Question '{question_id}' not found in this assignment.")

    exec_result = execute_test_cases(
        code=code,
        function_name=target_q.get("function_name", "solution"),
        public_tests=target_q.get("public_test_cases", []),
        hidden_tests=target_q.get("hidden_test_cases", []),
        language=language
    )

    await db["assignments"].update_one(
        {"assignment_token": assignment_token},
        {"$set": {f"submissions.{question_id}": {"code": code, "language": language, "last_run_at": datetime.now(timezone.utc).isoformat()}}}
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


async def service_submit_assignment(
    assignment_token: str,
    submissions: List[Dict[str, Any]],
    db: AsyncIOMotorDatabase
) -> Dict[str, Any]:
    assign_doc = await db["assignments"].find_one({"assignment_token": assignment_token})
    if not assign_doc:
        raise HTTPException(status_code=404, detail="Assessment not found.")

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
            language=lang
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

    ai_review = await generate_ai_submission_review(
        course_title=assign_doc.get("course_title", "Technical Track"),
        candidate_name=assign_doc.get("candidate_name", "Candidate"),
        detailed_results=detailed_results
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
            }
        }
    )

    course_id = assign_doc.get("course_id")
    if course_id and ObjectId.is_valid(course_id):
        await db["courses"].update_one(
            {
                "_id": ObjectId(course_id),
                "enrolled_students.assignment_token": assignment_token
            },
            {
                "$set": {
                    "enrolled_students.$.assignment_status": "submitted",
                    "enrolled_students.$.assignment_score": score,
                    "enrolled_students.$.assignment_submitted_at": now_iso,
                    "enrolled_students.$.ai_review": ai_review
                }
            }
        )

    return {
        "message": "Coding assessment successfully submitted and evaluated!",
        "status": "submitted",
        "score": score,
        "passed_questions": passed_questions,
        "total_questions": len(questions),
        "total_tests_passed": total_tests_passed,
        "total_tests_count": total_tests_count,
        "detailed_results": detailed_results,
        "ai_review": ai_review,
    }


async def service_get_assignment_results(assignment_token: str, db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    assign_doc = await db["assignments"].find_one({"assignment_token": assignment_token})
    if not assign_doc:
        raise HTTPException(status_code=404, detail="Assessment not found.")

    if assign_doc.get("status") != "submitted":
        raise HTTPException(status_code=400, detail="Assessment has not been submitted yet.")

    return {
        "assignment_token": assignment_token,
        "course_title": assign_doc.get("course_title"),
        "candidate_name": assign_doc.get("candidate_name"),
        "status": assign_doc.get("status"),
        "score": assign_doc.get("score"),
        "passed_questions": assign_doc.get("passed_questions", 0),
        "total_questions": assign_doc.get("total_questions", 0),
        "submitted_at": assign_doc.get("submitted_at"),
        "detailed_results": assign_doc.get("detailed_results", []),
        "ai_review": assign_doc.get("ai_review"),
    }


async def service_download_assignment_document(
    assignment_token: str,
    db: AsyncIOMotorDatabase
) -> Dict[str, Any]:
    """
    Synthesizes and exports the full AI Coding Assignment document
    with questions, problem statements, constraints, and starter code.
    """
    assign_doc = await service_get_or_create_assignment(
        assignment_token=assignment_token,
        db=db,
        from_app=True,
    )

    course_title = assign_doc.get("course_title", "AI Technical Track")
    candidate_name = assign_doc.get("candidate_name", "Candidate")
    candidate_email = assign_doc.get("candidate_email", "")
    unique_code = assign_doc.get("unique_code", "")
    duration = assign_doc.get("duration_minutes", 60)
    questions = assign_doc.get("questions", [])
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    portal_url = f"{frontend_url}/assignment/{assignment_token}"

    clean_course = "".join(c for c in course_title if c.isalnum() or c in (" ", "_", "-")).strip().replace(" ", "_")
    filename = f"AI_Assignment_{clean_course}.txt"

    lines = [
        "=" * 80,
        "                    AI CODING ASSIGNMENT & ASSESSMENT BRIEF",
        "=" * 80,
        f"Course Track:        {course_title}",
        f"Candidate Name:      {candidate_name}",
        f"Candidate Email:     {candidate_email}",
        f"Unique Exam Code:    {unique_code}",
        f"Allotted Duration:   {duration} Minutes",
        f"Interactive Web URL: {portal_url}",
        "=" * 80,
        "",
        "GENERAL INSTRUCTIONS:",
        "1. Read each question statement and review all input constraints carefully.",
        "2. Implement your solutions in Python adhering strictly to the required function signatures.",
        "3. You can execute code, run automated tests, and submit directly online at:",
        f"   {portal_url}",
        "4. Automated evaluation checks both public examples and hidden test cases with Ollama AI.",
        "",
        "=" * 80,
        f"ASSIGNMENT QUESTIONS (Total Problems: {len(questions)})",
        "=" * 80,
        "",
    ]

    for idx, q in enumerate(questions, 1):
        q_title = q.get("title", f"Problem {idx}")
        q_diff = q.get("difficulty", "Medium")
        q_cat = q.get("category", "Algorithms")
        q_statement = (q.get("problem_statement") or "").strip()
        q_func = q.get("function_name", "solution")
        q_starter = (q.get("starter_code") or f"def {q_func}(data):\n    # Write your solution here\n    pass").strip()
        constraints = q.get("constraints", [])
        public_tests = q.get("public_test_cases", [])

        lines.extend([
            "-" * 80,
            f"QUESTION {idx}: {q_title.upper()}",
            "-" * 80,
            f"Difficulty:       {q_diff}",
            f"Category:         {q_cat}",
            f"Function Target:  def {q_func}(...)",
            "",
            "PROBLEM STATEMENT:",
            q_statement,
            "",
        ])

        if constraints:
            lines.append("CONSTRAINTS:")
            for c in constraints:
                lines.append(f"  • {c}")
            lines.append("")

        lines.extend([
            "STARTER CODE TEMPLATE:",
            q_starter,
            "",
        ])

        if public_tests:
            lines.append("SAMPLE PUBLIC TEST CASES:")
            for t_idx, test in enumerate(public_tests, 1):
                inp = test.get("input")
                exp = test.get("expected_output")
                expl = test.get("explanation")
                lines.append(f"  [Case {t_idx}]")
                lines.append(f"    Input:           {inp}")
                lines.append(f"    Expected Output: {exp}")
                if expl:
                    lines.append(f"    Explanation:     {expl}")
            lines.append("")

    lines.extend([
        "=" * 80,
        "                    END OF AI ASSIGNMENT BRIEF",
        "=" * 80,
        f"Direct Submission Portal: {portal_url}",
    ])

    return {
        "filename": filename,
        "content": "\n".join(lines),
        "course_title": course_title,
    }