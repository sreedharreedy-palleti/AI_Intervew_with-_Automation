import os
import uuid
import random
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from Resume_Analysis.email_templates import notify_assignment_scheduled
from Admin.schemas.admin_course_schemas import (
    CourseCreate,
    CourseUpdate,
    EnrollmentStatusUpdate,
    AdminManualEnroll,
    ScheduleAssignmentRequest,
)

def _dedup_roster(students: list) -> list:
    seen = set()
    unique = []
    for s in students:
        uid = str(s.get("user_id") or "").strip()
        email = str(s.get("email") or "").strip().lower()
        key = uid if uid else email
        if not key or key not in seen:
            if key:
                seen.add(key)
            unique.append(s)
    return unique


async def service_create_course(payload: CourseCreate, admin_id: str, db: AsyncIOMotorDatabase) -> dict:
    now = datetime.now(timezone.utc)
    course_data = {
        "title": payload.title,
        "description": payload.description,
        "instructor": payload.instructor,
        "duration_weeks": payload.duration_weeks,
        "level": payload.level or "Beginner",
        "created_by": admin_id,
        "created_at": now,
        "enrolled_students": [],
    }
    result = await db["courses"].insert_one(course_data)
    return {
        "id": str(result.inserted_id),
        "title": course_data["title"],
        "description": course_data["description"],
        "instructor": course_data["instructor"],
        "duration_weeks": course_data["duration_weeks"],
        "level": course_data["level"],
        "created_at": now,
        "enrolled_count": 0,
        "enrolled_students": [],
    }

async def service_get_all_courses_with_rosters(db: AsyncIOMotorDatabase) -> list:
    cursor = db["courses"].find().sort("created_at", -1)
    courses = []
    async for doc in cursor:
        students = _dedup_roster(doc.get("enrolled_students", []))
        courses.append({
            "id": str(doc["_id"]),
            "title": doc.get("title", ""),
            "description": doc.get("description", ""),
            "instructor": doc.get("instructor", ""),
            "duration_weeks": doc.get("duration_weeks", 0),
            "level": doc.get("level", "Beginner"),
            "created_at": doc.get("created_at", datetime.now(timezone.utc)),
            "enrolled_count": len(students),
            "enrolled_students": students,
        })
    return courses

async def service_get_single_course(course_id: str, db: AsyncIOMotorDatabase) -> dict:
    if not ObjectId.is_valid(course_id):
        raise HTTPException(status_code=400, detail="Invalid course ID format")
    doc = await db["courses"].find_one({"_id": ObjectId(course_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Course not found")
    students = doc.get("enrolled_students", [])
    return {
        "id": str(doc["_id"]),
        "title": doc.get("title", ""),
        "description": doc.get("description", ""),
        "instructor": doc.get("instructor", ""),
        "duration_weeks": doc.get("duration_weeks", 0),
        "level": doc.get("level", "Beginner"),
        "created_at": doc.get("created_at", datetime.now(timezone.utc)),
        "enrolled_count": len(students),
        "enrolled_students": students,
    }

async def service_update_course(course_id: str, payload: CourseUpdate, db: AsyncIOMotorDatabase) -> dict:
    if not ObjectId.is_valid(course_id):
        raise HTTPException(status_code=400, detail="Invalid course ID format")
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    result = await db["courses"].update_one(
        {"_id": ObjectId(course_id)},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")

    return await service_get_single_course(course_id, db)

async def service_get_course_enrolled_users(course_id: str, db: AsyncIOMotorDatabase) -> dict:
    if not ObjectId.is_valid(course_id):
        raise HTTPException(status_code=400, detail="Invalid course ID format")

    doc = await db["courses"].find_one({"_id": ObjectId(course_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Course not found")

    students = doc.get("enrolled_students", [])
    return {
        "course_id": str(doc["_id"]),
        "course_title": doc.get("title", ""),
        "total_enrolled_count": len(students),
        "enrolled_users": students,
    }

async def service_update_enrollment_status(
    course_id: str,
    user_id: str,
    payload: EnrollmentStatusUpdate,
    db: AsyncIOMotorDatabase,
) -> dict:
    if not ObjectId.is_valid(course_id):
        raise HTTPException(status_code=400, detail="Invalid course ID format")

    # Search candidate by user_id or email
    doc = await db["courses"].find_one({
        "_id": ObjectId(course_id),
        "$or": [
            {"enrolled_students.user_id": user_id},
            {"enrolled_students.email": user_id}
        ]
    })
    if not doc:
        raise HTTPException(status_code=404, detail="Enrollment record not found for this candidate")

    candidate = next(
        (s for s in doc.get("enrolled_students", []) if s.get("user_id") == user_id or s.get("email") == user_id),
        None
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate record not found in roster")

    actual_user_id = candidate.get("user_id") or user_id
    update_fields = {"enrolled_students.$.updated_at": datetime.now(timezone.utc)}

    if payload.application_status is not None:
        update_fields["enrolled_students.$.application_status"] = payload.application_status
        if payload.application_status == "shortlisted":
            if not candidate.get("assignment_token"):
                update_fields["enrolled_students.$.assignment_token"] = str(uuid.uuid4())
            if not candidate.get("unique_code"):
                update_fields["enrolled_students.$.unique_code"] = f"EXAM-{random.randint(100000, 999999)}"

    if payload.ats_score is not None:
        update_fields["enrolled_students.$.ats_score"] = payload.ats_score
    if payload.name is not None and payload.name.strip():
        update_fields["enrolled_students.$.name"] = payload.name.strip()
    if payload.email is not None and payload.email.strip():
        update_fields["enrolled_students.$.email"] = payload.email.strip().lower()
    if payload.college is not None:
        update_fields["enrolled_students.$.college"] = payload.college.strip()
    if payload.year is not None:
        update_fields["enrolled_students.$.year"] = str(payload.year).strip()
    if payload.dob is not None:
        update_fields["enrolled_students.$.dob"] = payload.dob.strip()
    if payload.unique_code is not None:
        update_fields["enrolled_students.$.unique_code"] = payload.unique_code.strip()
    if payload.assignment_datetime is not None:
        update_fields["enrolled_students.$.assignment_datetime"] = payload.assignment_datetime
    if payload.duration_minutes is not None:
        update_fields["enrolled_students.$.duration_minutes"] = int(payload.duration_minutes)

    await db["courses"].update_one(
        {
            "_id": ObjectId(course_id),
            "$or": [
                {"enrolled_students.user_id": actual_user_id},
                {"enrolled_students.email": candidate.get("email")}
            ]
        },
        {"$set": update_fields}
    )

    # Sync name and email with users collection if registered
    candidate_email = (payload.email or candidate.get("email") or "").strip().lower()
    if payload.name or payload.email:
        user_sync = {}
        if payload.name:
            user_sync["name"] = payload.name.strip()
        if payload.email:
            user_sync["email"] = candidate_email
        if user_sync and ObjectId.is_valid(actual_user_id):
            await db["users"].update_one({"_id": ObjectId(actual_user_id)}, {"$set": user_sync})

    # Sync with assignments collection if present
    assign_sync = {}
    if payload.name:
        assign_sync["candidate_name"] = payload.name.strip()
    if payload.email:
        assign_sync["candidate_email"] = candidate_email
    if payload.assignment_datetime:
        assign_sync["scheduled_at"] = payload.assignment_datetime
    if payload.duration_minutes:
        assign_sync["duration_minutes"] = int(payload.duration_minutes)
    if assign_sync:
        await db["assignments"].update_many(
            {"course_id": course_id, "$or": [{"user_id": actual_user_id}, {"candidate_email": candidate.get("email")}]},
            {"$set": assign_sync}
        )

    return {
        "message": "Candidate enrollment record updated in database successfully",
        "course_id": course_id,
        "user_id": actual_user_id,
        "application_status": payload.application_status or candidate.get("application_status"),
    }

async def service_delete_enrollment(course_id: str, user_id: str, db: AsyncIOMotorDatabase) -> dict:
    if not ObjectId.is_valid(course_id):
        raise HTTPException(status_code=400, detail="Invalid course ID format")

    result = await db["courses"].update_one(
        {"_id": ObjectId(course_id)},
        {"$pull": {"enrolled_students": {"$or": [{"user_id": user_id}, {"email": user_id}]}}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")

    # Cascade delete assignments for this candidate in this course
    await db["assignments"].delete_many({
        "course_id": course_id,
        "$or": [{"user_id": user_id}, {"candidate_email": user_id}]
    })

    return {
        "message": "Candidate enrollment and related assessment records deleted successfully",
        "course_id": course_id,
        "user_id": user_id,
    }

async def service_admin_manual_enroll(
    course_id: str,
    payload: AdminManualEnroll,
    db: AsyncIOMotorDatabase,
) -> dict:
    if not ObjectId.is_valid(course_id):
        raise HTTPException(status_code=400, detail="Invalid course ID format")

    course_doc = await db["courses"].find_one({"_id": ObjectId(course_id)})
    if not course_doc:
        raise HTTPException(status_code=404, detail="Course not found")

    user_id = str(payload.user_id or ObjectId()).strip()
    payload_email = str(payload.email or "").strip().lower()
    students = course_doc.get("enrolled_students", [])

    if any(
        (s.get("user_id") and str(s.get("user_id")).strip() == user_id)
        or (s.get("email") and str(s.get("email")).strip().lower() == payload_email)
        for s in students
    ):
        raise HTTPException(status_code=400, detail="Candidate is already enrolled in this course")

    is_shortlisted = payload.application_status == "shortlisted"
    unique_code = f"EXAM-{random.randint(100000, 999999)}" if is_shortlisted else None
    record = {
        "user_id": user_id,
        "name": payload.name,
        "email": payload.email,
        "dob": payload.dob or "",
        "college": payload.college or "",
        "year": payload.year or "",
        "resume_path": payload.resume_path or "",
        "ats_score": payload.ats_score or (75 if is_shortlisted else 50),
        "application_status": payload.application_status or "shortlisted",
        "assignment_token": str(uuid.uuid4()) if is_shortlisted else None,
        "unique_code": unique_code,
        "enrolled_at": datetime.now(timezone.utc),
    }

    res = await db["courses"].update_one(
        {
            "_id": ObjectId(course_id),
            "enrolled_students.user_id": {"$ne": user_id},
            "enrolled_students.email": {"$ne": payload.email},
        },
        {"$push": {"enrolled_students": record}}
    )

    if res.matched_count == 0 or res.modified_count == 0:
        raise HTTPException(status_code=400, detail="Candidate is already enrolled in this course")


    return {
        "message": "Candidate enrolled successfully",
        "course_id": course_id,
        "student": record,
    }

async def service_delete_course(course_id: str, db: AsyncIOMotorDatabase) -> dict:
    if not ObjectId.is_valid(course_id):
        raise HTTPException(status_code=400, detail="Invalid course ID format")
    result = await db["courses"].delete_one({"_id": ObjectId(course_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")

    # Cascade clean up assignments and interviews for this course
    await db["assignments"].delete_many({"course_id": course_id})
    await db["interviews"].delete_many({"course_id": course_id})

    return {"message": "Course and all associated rosters/assignments deleted successfully from database"}


async def service_schedule_candidate_assignment(
    course_id: str,
    user_id: str,
    payload: ScheduleAssignmentRequest,
    db: AsyncIOMotorDatabase,
) -> dict:
    if not ObjectId.is_valid(course_id):
        raise HTTPException(status_code=400, detail="Invalid course ID format")

    course_doc = await db["courses"].find_one({
        "_id": ObjectId(course_id),
        "enrolled_students.user_id": user_id,
    })
    if not course_doc:
        raise HTTPException(status_code=404, detail="Enrollment record not found for this candidate")

    candidate = next(
        (s for s in course_doc.get("enrolled_students", []) if s.get("user_id") == user_id),
        None,
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    token = candidate.get("assignment_token") or str(uuid.uuid4())
    unique_code = candidate.get("unique_code") or f"EXAM-{random.randint(100000, 999999)}"
    now = datetime.now(timezone.utc)

    update_fields = {
        "enrolled_students.$.assignment_token": token,
        "enrolled_students.$.unique_code": unique_code,
        "enrolled_students.$.assignment_datetime": payload.assignment_datetime,
        "enrolled_students.$.assignment_policy": payload.assignment_policy,
        "enrolled_students.$.duration_minutes": payload.duration_minutes,
        "enrolled_students.$.application_status": "shortlisted",
        "enrolled_students.$.updated_at": now,
    }

    email_sent = False
    if payload.send_email and candidate.get("email"):
        update_fields["enrolled_students.$.assignment_email_sent_at"] = now
        try:
            email_sent = notify_assignment_scheduled(
                email=candidate["email"],
                name=candidate.get("name", "Candidate"),
                course=course_doc.get("title", "AI Technical Track"),
                assignment_datetime=payload.assignment_datetime,
                assignment_policy=payload.assignment_policy or "",
                test_token=token,
                unique_code=unique_code,
                username=candidate.get("email"),
                duration_minutes=payload.duration_minutes or 60,
            )
        except Exception as e:
            print(f"[SCHEDULE EMAIL ERROR] {e}")

    await db["courses"].update_one(
        {"_id": ObjectId(course_id), "enrolled_students.user_id": user_id},
        {"$set": update_fields},
    )

    # Sync updated duration and schedule with assignments collection if already generated
    await db["assignments"].update_one(
        {"assignment_token": token},
        {"$set": {
            "duration_minutes": payload.duration_minutes,
            "assignment_datetime": payload.assignment_datetime,
        }}
    )

    return {
        "message": f"Assignment successfully scheduled for {candidate.get('name')}",
        "course_id": course_id,
        "user_id": user_id,
        "candidate_name": candidate.get("name"),
        "candidate_email": candidate.get("email"),
        "unique_code": unique_code,
        "scheduled_datetime": payload.assignment_datetime,
        "duration_minutes": payload.duration_minutes,
        "policy": payload.assignment_policy,
        "email_dispatched": bool(email_sent),
    }


async def service_schedule_course_assignment_broadcast(
    course_id: str,
    payload: ScheduleAssignmentRequest,
    db: AsyncIOMotorDatabase,
) -> dict:
    if not ObjectId.is_valid(course_id):
        raise HTTPException(status_code=400, detail="Invalid course ID format")

    course_doc = await db["courses"].find_one({"_id": ObjectId(course_id)})
    if not course_doc:
        raise HTTPException(status_code=404, detail="Course not found")

    students = course_doc.get("enrolled_students", [])
    now = datetime.now(timezone.utc)
    backend_origin = os.getenv("BACKEND_URL", "http://localhost:8000")

    if not students:
        raise HTTPException(
            status_code=400,
            detail="No candidates enrolled in this course track yet."
        )

    # 1. Priority: candidates marked shortlisted or with ATS score >= 70
    target_ids = {
        s.get("user_id") for s in students
        if s.get("application_status") == "shortlisted" or (s.get("ats_score") is not None and s.get("ats_score") >= 70)
    }

    # 2. If none explicitly shortlisted, include all enrolled students not marked rejected
    if not target_ids:
        target_ids = {
            s.get("user_id") for s in students
            if s.get("application_status") != "rejected"
        }

    if not target_ids:
        raise HTTPException(
            status_code=400,
            detail="No eligible candidates found (all enrolled candidates are marked as rejected)."
        )

    dispatched_count = 0
    scheduled_count = 0

    for student in students:
        if student.get("user_id") in target_ids:
            scheduled_count += 1
            token = student.get("assignment_token") or str(uuid.uuid4())
            unique_code = student.get("unique_code") or f"EXAM-{random.randint(100000, 999999)}"
            student["assignment_token"] = token
            student["unique_code"] = unique_code
            student["assignment_datetime"] = payload.assignment_datetime
            student["assignment_policy"] = payload.assignment_policy
            student["duration_minutes"] = payload.duration_minutes
            student["application_status"] = "shortlisted"
            student["updated_at"] = now

            if payload.send_email and student.get("email"):
                student["assignment_email_sent_at"] = now
                try:
                    ok = notify_assignment_scheduled(
                        email=student["email"],
                        name=student.get("name", "Candidate"),
                        course=course_doc.get("title", "AI Technical Track"),
                        assignment_datetime=payload.assignment_datetime,
                        assignment_policy=payload.assignment_policy or "",
                        test_token=token,
                        unique_code=unique_code,
                        username=student.get("email"),
                        duration_minutes=payload.duration_minutes or 60,
                    )
                    if ok:
                        dispatched_count += 1
                except Exception as e:
                    print(f"[BROADCAST EMAIL ERROR] {e}")


    await db["courses"].update_one(
        {"_id": ObjectId(course_id)},
        {"$set": {"enrolled_students": students}}
    )

    # Sync updated duration and schedule with assignments collection for all scheduled tokens
    tokens_to_update = [
        s.get("assignment_token") for s in students if s.get("assignment_token")
    ]
    if tokens_to_update:
        await db["assignments"].update_many(
            {"assignment_token": {"$in": tokens_to_update}},
            {"$set": {
                "duration_minutes": payload.duration_minutes,
                "assignment_datetime": payload.assignment_datetime,
            }}
        )

    return {
        "message": f"Assignment scheduled for {scheduled_count} candidate(s)",
        "course_id": course_id,
        "candidates_count": scheduled_count,
        "scheduled_datetime": payload.assignment_datetime,
        "policy": payload.assignment_policy,
        "email_dispatched": dispatched_count > 0,
        "emails_sent_count": dispatched_count,
    }