import os
import uuid
import random
from datetime import datetime, timezone
from pathlib import Path
from bson import ObjectId
from fastapi import HTTPException, UploadFile, BackgroundTasks
from motor.motor_asyncio import AsyncIOMotorDatabase

# Imports pointing directly to your Resume_Analysis folder
from Resume_Analysis.resume_parser import extract_resume_text
from Resume_Analysis.gemini_ats_client import run_ats_evaluation
from Resume_Analysis.email_templates import notify_shortlisted_candidate, notify_rejected_candidate
from Users.services.resume_storage_service import (
    service_store_resume,
    service_get_resume_file,
)

VALID_FILE_TYPES = {".pdf", ".doc", ".docx"}

# Concurrency lock set to prevent simultaneous submissions for the same user & course
_active_enrollments = set()


DEMO_TESTING_EMAILS = {"23091a32j4@rgmcet.edu.in"}
UNLIMITED_TRIAL_EMAILS = DEMO_TESTING_EMAILS


def format_user_course(doc: dict, user_id: str, user_email: str = "") -> dict:
    roster = doc.get("enrolled_students", [])
    uid_str = str(user_id).strip() if user_id else ""
    email_clean = str(user_email).strip().lower() if user_email else ""

    student_record = next(
        (
            s for s in roster
            if (uid_str and str(s.get("user_id") or "").strip() == uid_str)
            or (email_clean and str(s.get("email") or "").strip().lower() == email_clean)
        ),
        None
    )
    is_demo = email_clean in DEMO_TESTING_EMAILS

    return {
        "id": str(doc["_id"]),
        "title": doc.get("title", ""),
        "description": doc.get("description", ""),
        "instructor": doc.get("instructor", ""),
        "duration_weeks": doc.get("duration_weeks", 0),
        "level": doc.get("level", "Beginner"),
        "created_at": doc.get("created_at", datetime.now(timezone.utc)),
        "enrolled_count": len(roster),
        "is_enrolled": student_record is not None,
        "application_status": student_record.get("application_status") if student_record else None,
        "assignment_token": student_record.get("assignment_token") if student_record else None,
        "assignment_status": student_record.get("assignment_status") if student_record else None,
        "assignment_score": student_record.get("assignment_score") if student_record else None,
        "assignment_datetime": student_record.get("assignment_datetime") if student_record else None,
        "duration_minutes": student_record.get("duration_minutes", 60) if student_record else 60,
        "interview_token": student_record.get("interview_token") if student_record else None,
        "interview_status": student_record.get("interview_status") if student_record else None,
        "is_demo_interview_access": is_demo,
        "is_unlimited_trial": is_demo,
        "attempt_limit": "unlimited" if is_demo else 1,
    }


async def service_get_user_courses(user_id: str, db: AsyncIOMotorDatabase, user_email: str = "") -> list:
    cursor = db["courses"].find().sort("created_at", -1)
    results = []
    async for entry in cursor:
        results.append(format_user_course(entry, user_id, user_email))
    return results


async def service_get_user_course_detail(course_id: str, user_id: str, db: AsyncIOMotorDatabase, user_email: str = "") -> dict:
    if not ObjectId.is_valid(course_id):
        raise HTTPException(status_code=400, detail="Invalid course identifier")
    record = await db["courses"].find_one({"_id": ObjectId(course_id)})
    if not record:
        raise HTTPException(status_code=404, detail="Target course not found")
    return format_user_course(record, user_id, user_email)


async def service_enroll_user_with_ai(
    course_id: str,
    full_name: str,
    dob: str,
    college: str,
    year: str,
    resume_file: UploadFile,
    current_user: dict,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase,
) -> dict:
    if not ObjectId.is_valid(course_id):
        raise HTTPException(status_code=400, detail="Invalid course identifier")

    course_doc = await db["courses"].find_one({"_id": ObjectId(course_id)})
    if not course_doc:
        raise HTTPException(status_code=404, detail="Course does not exist")

    user_id = str(current_user["_id"]).strip()
    user_email = str(current_user.get("email") or "").strip().lower()
    is_unlimited_tester = user_email in UNLIMITED_TRIAL_EMAILS

    # Pre-check existing enrollment in roster
    active_students = course_doc.get("enrolled_students", [])
    already_enrolled = any(
        (s.get("user_id") and str(s.get("user_id")).strip() == user_id)
        or (s.get("email") and str(s.get("email")).strip().lower() == user_email)
        for s in active_students
    )

    if already_enrolled:
        if not is_unlimited_tester:
            raise HTTPException(
                status_code=400,
                detail="You have already applied and enrolled in this course track. Candidates are allowed 1 attempt only."
            )
        else:
            # Unlimited free trial for 23091a32j4@rgmcet.edu.in: remove prior records for fresh retry
            await db["courses"].update_one(
                {"_id": ObjectId(course_id)},
                {"$pull": {
                    "enrolled_students": {
                        "$or": [
                            {"user_id": user_id},
                            {"email": user_email}
                        ]
                    }
                }}
            )
            await db["assignments"].delete_many({
                "course_id": str(course_id),
                "$or": [{"user_id": user_id}, {"candidate_email": user_email}]
            })
            await db["interviews"].delete_many({
                "course_id": str(course_id),
                "$or": [{"user_id": user_id}, {"candidate_email": user_email}]
            })

    # In-memory lock keys to prevent duplicate in-flight requests (race condition)
    lock_key = f"{user_id}:{course_id}"
    email_lock_key = f"{user_email}:{course_id}"
    if lock_key in _active_enrollments or email_lock_key in _active_enrollments:
        raise HTTPException(
            status_code=409,
            detail="Your enrollment application is currently being analyzed by AI. Please wait a moment."
        )

    _active_enrollments.add(lock_key)
    _active_enrollments.add(email_lock_key)

    try:
        # 1. Validate extension
        file_ext = Path(resume_file.filename).suffix.lower()
        if file_ext not in VALID_FILE_TYPES:
            raise HTTPException(status_code=400, detail="Only PDF and DOCX resume files are supported")

        # 2. Read bytes into memory (never saved to disk or code repository)
        file_bytes = await resume_file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded resume file is empty")

        # 3. Extract text from in-memory bytes using Resume_Analysis
        extracted_text = extract_resume_text(file_bytes, resume_file.filename)
        if not extracted_text:
            extracted_text = "No extractable text was found in the uploaded file."

        # 4. Evaluate ATS match with Google Gemini API
        evaluation_result = await run_ats_evaluation(
            resume_text=extracted_text,
            course_title=course_doc.get("title", ""),
            course_description=course_doc.get("description", "")
        )

        ats_score = int(evaluation_result.get("ats_score", 0))
        is_shortlisted = ats_score >= 70
        status_label = "shortlisted" if is_shortlisted else "rejected"
        assignment_token = str(uuid.uuid4()) if is_shortlisted else None
        unique_code = f"EXAM-{random.randint(100000, 999999)}" if is_shortlisted else None

        # Interview schedule is pending until assigned by Admin
        now_utc = datetime.now(timezone.utc)
        assignment_datetime = None

        # 5. Store resume file bytes directly in MongoDB collection `resumes`
        content_type = resume_file.content_type
        if not content_type:
            if file_ext == ".pdf":
                content_type = "application/pdf"
            elif file_ext in (".docx", ".doc"):
                content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            else:
                content_type = "application/octet-stream"

        stored_resume = await service_store_resume(
            user_id=user_id,
            course_id=course_id,
            candidate_name=full_name,
            candidate_email=current_user["email"],
            filename=resume_file.filename,
            file_bytes=file_bytes,
            content_type=content_type,
            extracted_text=extracted_text,
            db=db,
        )
        resume_id = stored_resume["resume_id"]
        resume_path = stored_resume["resume_path"]

        # 6. Store candidate record in course's enrolled_students list
        record = {
            "user_id": user_id,
            "name": full_name,
            "email": current_user["email"],
            "dob": dob,
            "college": college,
            "year": year,
            "resume_id": resume_id,
            "resume_path": resume_path,
            "resume_raw_text": extracted_text,
            "ats_score": ats_score,
            "application_status": status_label,
            "assignment_token": assignment_token,
            "unique_code": unique_code,
            "assignment_datetime": None,
            "duration_minutes": 60,
            "ai_analysis": evaluation_result,
            "enrolled_at": now_utc,
        }

        # Atomic push: Only push if user_id or email doesn't already exist in enrolled_students
        update_result = await db["courses"].update_one(
            {
                "_id": ObjectId(course_id),
                "enrolled_students.user_id": {"$ne": user_id},
                "enrolled_students.email": {"$ne": current_user["email"]},
            },
            {"$push": {"enrolled_students": record}}
        )

        if update_result.matched_count == 0 or update_result.modified_count == 0:
            fresh_check = await db["courses"].find_one({"_id": ObjectId(course_id)})
            if not fresh_check:
                raise HTTPException(status_code=404, detail="Course does not exist")
            raise HTTPException(
                status_code=400,
                detail="You are already enrolled in this course track. Re-enrollment is not allowed."
            )

        # 7. Dispatch email in background
        if is_shortlisted:
            background_tasks.add_task(
                notify_shortlisted_candidate,
                email=current_user["email"],
                name=full_name,
                course=course_doc.get("title", "Course"),
                ats_score=ats_score,
                test_token=assignment_token,
                unique_code=unique_code,
                username=current_user["email"],
                assignment_datetime=assignment_datetime,
                duration_minutes=60,
            )
        else:
            background_tasks.add_task(
                notify_rejected_candidate,
                email=current_user["email"],
                name=full_name,
                course=course_doc.get("title", "Course"),
                ats_score=ats_score
            )

        # Do not provide direct start link on enrollment; interview must be scheduled by Admin
        link = None

        return {
            "message": "Application analyzed and shortlisted! Waiting for Admin to schedule your interview date and time." if is_shortlisted else "Application processed. ATS score was below the 70% threshold.",
            "course_id": course_id,
            "full_name": full_name,
            "ats_score": ats_score,
            "status": status_label,
            "assignment_link": None,
            "username": current_user["email"] if is_shortlisted else None,
            "unique_code": unique_code,
            "assignment_datetime": None,
            "is_app_required": False,
            "strengths": evaluation_result.get("strengths", []),
            "missing_skills": evaluation_result.get("missing_skills", []),
        }

    finally:
        _active_enrollments.discard(lock_key)
        _active_enrollments.discard(email_lock_key)
