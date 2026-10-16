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
from Resume_Analysis.ollama_client import run_ats_evaluation
from Resume_Analysis.email_templates import notify_shortlisted_candidate, notify_rejected_candidate

STORAGE_FOLDER = Path("uploads/resumes")
STORAGE_FOLDER.mkdir(parents=True, exist_ok=True)
VALID_FILE_TYPES = {".pdf", ".doc", ".docx"}

# Concurrency lock set to prevent simultaneous submissions for the same user & course
_active_enrollments = set()


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

    # Pre-check existing enrollment in roster
    active_students = course_doc.get("enrolled_students", [])
    if any(
        (s.get("user_id") and str(s.get("user_id")).strip() == user_id)
        or (s.get("email") and str(s.get("email")).strip().lower() == user_email)
        for s in active_students
    ):
        raise HTTPException(
            status_code=400,
            detail="You are already enrolled in this course track. Re-enrollment is not allowed."
        )

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

        # 2. Read bytes and save to disk
        file_bytes = await resume_file.read()
        timestamp_slug = int(datetime.now(timezone.utc).timestamp())
        saved_name = f"{user_id}_{timestamp_slug}_{resume_file.filename}"
        file_dest = STORAGE_FOLDER / saved_name

        with open(file_dest, "wb") as disk_file:
            disk_file.write(file_bytes)

        # 3. Extract text using Resume_Analysis
        extracted_text = extract_resume_text(file_bytes, resume_file.filename)
        if not extracted_text:
            extracted_text = "No extractable text was found in the uploaded file."

        # 4. Evaluate ATS match with Ollama / Gemini / Groq
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

        # Scheduled routine date & time window
        now_utc = datetime.now(timezone.utc)
        assignment_datetime = (
            f"{now_utc.strftime('%B %d, %Y %I:%M %p UTC')} (Assessment window active for 48 Hours)"
            if is_shortlisted else None
        )

        # 5. Store record in MongoDB (including resume path, raw extracted text, unique exam code, and routine)
        record = {
            "user_id": user_id,
            "name": full_name,
            "email": current_user["email"],
            "dob": dob,
            "college": college,
            "year": year,
            "resume_path": f"/uploads/resumes/{saved_name}",
            "resume_raw_text": extracted_text,
            "ats_score": ats_score,
            "application_status": status_label,
            "assignment_token": assignment_token,
            "unique_code": unique_code,
            "assignment_datetime": assignment_datetime,
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

        backend_origin = os.getenv("BACKEND_URL", "http://localhost:8000")
        app_download_url = f"{backend_origin}/api/v1/assignment/{assignment_token}/download"

        # 6. Dispatch email in background
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
                app_download_url=app_download_url,
            )
        else:
            background_tasks.add_task(
                notify_rejected_candidate,
                email=current_user["email"],
                name=full_name,
                course=course_doc.get("title", "Course"),
                ats_score=ats_score
            )

        link = f"http://localhost:5173/assignment/{assignment_token}" if is_shortlisted else None

        return {
            "message": "Application analyzed and shortlisted!" if is_shortlisted else "Application processed. ATS score was below the 70% threshold.",
            "course_id": course_id,
            "full_name": full_name,
            "ats_score": ats_score,
            "status": status_label,
            "assignment_link": link,
            "username": current_user["email"] if is_shortlisted else None,
            "unique_code": unique_code,
            "assignment_datetime": assignment_datetime,
            "app_download_url": app_download_url if is_shortlisted else None,
            "is_app_required": False,
            "strengths": evaluation_result.get("strengths", []),
            "missing_skills": evaluation_result.get("missing_skills", []),
        }

    finally:
        _active_enrollments.discard(lock_key)
        _active_enrollments.discard(email_lock_key)