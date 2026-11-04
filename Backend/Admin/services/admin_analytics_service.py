from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

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

async def service_get_dashboard_analytics(db: AsyncIOMotorDatabase) -> dict:
    """
    Computes real-time live platform data visualization and statistics across:
    - users (candidates, admins)
    - courses and course rosters (enrolled candidates, ATS scores, shortlist states)
    - assignments (proctored simulations, violations, submissions)
    - proctor_frames (visual integrity telemetry)
    """
    # 1. Users metrics
    total_users = await db["users"].count_documents({})
    candidate_users = await db["users"].count_documents({"role": {"$ne": "admin"}})
    admin_users = await db["users"].count_documents({"role": "admin"})
    verified_users = await db["users"].count_documents({"is_verified": True})

    # 2. Courses & Rosters metrics
    courses_cursor = db["courses"].find().sort("created_at", -1)
    courses_list = []
    all_applicants = []
    
    course_levels = {"Beginner": 0, "Intermediate": 0, "Advanced": 0}

    async for doc in courses_cursor:
        cid = str(doc["_id"])
        c_title = doc.get("title", "Untitled Course")
        c_instructor = doc.get("instructor", "Platform Faculty")
        c_level = doc.get("level", "Beginner")
        c_duration = doc.get("duration_weeks", 0)
        c_created_at = doc.get("created_at", datetime.now(timezone.utc))
        
        # Count level
        if c_level in course_levels:
            course_levels[c_level] += 1
        else:
            course_levels[c_level] = 1

        students = _dedup_roster(doc.get("enrolled_students", []))
        
        course_shortlisted = 0
        course_rejected = 0
        course_pending = 0
        course_ats_sum = 0
        course_ats_count = 0

        for s in students:
            ats = s.get("ats_score")
            status_val = s.get("application_status", "pending")
            
            is_short = (status_val == "shortlisted") or (ats is not None and ats >= 70)
            is_rej = (status_val == "rejected") or (ats is not None and ats < 70)
            
            if is_short:
                course_shortlisted += 1
            elif is_rej:
                course_rejected += 1
            else:
                course_pending += 1

            if ats is not None and isinstance(ats, (int, float)):
                course_ats_sum += ats
                course_ats_count += 1

            all_applicants.append({
                "student_id": str(s.get("user_id") or ""),
                "name": s.get("name", "Applicant"),
                "email": s.get("email", ""),
                "college": s.get("college", "N/A"),
                "year": s.get("year", "N/A"),
                "course_id": cid,
                "course_title": c_title,
                "ats_score": ats,
                "application_status": "shortlisted" if is_short else ("rejected" if is_rej else "pending"),
                "enrolled_at": s.get("enrolled_at", c_created_at),
                "assignment_scheduled": s.get("assignment_scheduled", False),
                "assignment_datetime": s.get("assignment_datetime"),
                "assignment_duration_minutes": s.get("assignment_duration_minutes", 60),
                "assignment_token": s.get("assignment_token"),
                "assignment_status": s.get("assignment_status"),
                "assignment_score": s.get("assignment_score"),
                "selected_for_interview": s.get("selected_for_interview", (s.get("assignment_score") or 0) >= 50 if s.get("assignment_status") == "submitted" else False),
                "interview_token": s.get("interview_token"),
                "interview_status": s.get("interview_status"),
                "interview_score": s.get("interview_score"),
                "interview_verdict": s.get("interview_verdict"),
                "app_downloaded": s.get("app_downloaded", False),
                "app_downloaded_at": s.get("app_downloaded_at").isoformat() if hasattr(s.get("app_downloaded_at"), "isoformat") else s.get("app_downloaded_at"),
            })

        courses_list.append({
            "id": cid,
            "title": c_title,
            "instructor": c_instructor,
            "level": c_level,
            "duration_weeks": c_duration,
            "created_at": c_created_at.isoformat() if hasattr(c_created_at, "isoformat") else str(c_created_at),
            "enrolled_count": len(students),
            "shortlisted_count": course_shortlisted,
            "rejected_count": course_rejected,
            "pending_count": course_pending,
            "avg_ats_score": round(course_ats_sum / course_ats_count, 1) if course_ats_count > 0 else 0,
        })

    total_courses = len(courses_list)
    total_enrollments = len(all_applicants)

    # Calculate percentage of total enrollments for each course
    for c in courses_list:
        c["percentage_of_total"] = (
            round((c["enrolled_count"] / total_enrollments) * 100, 1) if total_enrollments > 0 else 0
        )

    # 3. Overall Shortlist & ATS Distribution
    total_shortlisted = sum(c["shortlisted_count"] for c in courses_list)
    total_rejected = sum(c["rejected_count"] for c in courses_list)
    total_pending = sum(c["pending_count"] for c in courses_list)

    ats_scores = [a["ats_score"] for a in all_applicants if a.get("ats_score") is not None and isinstance(a["ats_score"], (int, float))]
    overall_avg_ats = round(sum(ats_scores) / len(ats_scores), 1) if ats_scores else 0.0

    ats_distribution = {
        "tier_90_100": sum(1 for score in ats_scores if score >= 90),
        "tier_80_89": sum(1 for score in ats_scores if 80 <= score < 90),
        "tier_70_79": sum(1 for score in ats_scores if 70 <= score < 80),
        "tier_50_69": sum(1 for score in ats_scores if 50 <= score < 70),
        "tier_below_50": sum(1 for score in ats_scores if score < 50),
    }

    # 4. Assignments & Integrity telemetry
    total_assignments = await db["assignments"].count_documents({})
    completed_assignments = await db["assignments"].count_documents({"status": "completed"})
    in_progress_assignments = await db["assignments"].count_documents({"status": "in_progress"})
    violation_lockouts = await db["assignments"].count_documents({
        "$or": [
            {"status": "terminated_violation"},
            {"terminated": True},
            {"proctor_terminated": True}
        ]
    })
    scheduled_assignments = await db["assignments"].count_documents({"status": "scheduled"})
    
    total_proctor_frames = await db["proctor_frames"].count_documents({})

    # 5. Desktop Application Downloads Telemetry
    total_app_downloads = await db["app_downloads"].count_documents({})
    distinct_emails = await db["app_downloads"].distinct("email")
    unique_candidates = [e for e in distinct_emails if e and e != "anonymous"]

    # Recent downloads (100)
    downloads_cursor = db["app_downloads"].find().sort("downloaded_at", -1).limit(100)
    recent_app_downloads = []
    async for d in downloads_cursor:
        dt = d.get("downloaded_at", datetime.now(timezone.utc))
        recent_app_downloads.append({
            "id": str(d["_id"]),
            "email": d.get("email", ""),
            "name": d.get("name", ""),
            "course_title": d.get("course_title", ""),
            "assignment_token": d.get("assignment_token", ""),
            "ip_address": d.get("ip_address", ""),
            "user_agent": d.get("user_agent", ""),
            "downloaded_at": dt.isoformat() if hasattr(dt, "isoformat") else str(dt),
        })

    # 6. Recent Activity
    # Sort applicants by enrolled_at descending
    def _parse_dt(item):
        val = item.get("enrolled_at")
        if isinstance(val, datetime):
            return val
        return datetime.min.replace(tzinfo=timezone.utc)

    recent_applicants = sorted(all_applicants, key=_parse_dt, reverse=True)[:10]
    for r in recent_applicants:
        if hasattr(r["enrolled_at"], "isoformat"):
            r["enrolled_at"] = r["enrolled_at"].isoformat()
        else:
            r["enrolled_at"] = str(r["enrolled_at"])

    # Recent assignments
    recent_assign_cursor = db["assignments"].find().sort("created_at", -1).limit(6)
    recent_assignments = []
    async for a in recent_assign_cursor:
        cat = a.get("created_at", datetime.now(timezone.utc))
        recent_assignments.append({
            "id": str(a["_id"]),
            "candidate_name": a.get("candidate_name", "Candidate"),
            "candidate_email": a.get("candidate_email", ""),
            "course_title": a.get("course_title", "Assignment"),
            "status": a.get("status", "pending"),
            "score": a.get("score"),
            "proctor_verdict": a.get("proctor_verdict", "Clear"),
            "created_at": cat.isoformat() if hasattr(cat, "isoformat") else str(cat),
        })

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_users": total_users,
            "candidate_users": candidate_users,
            "admin_users": admin_users,
            "verified_users": verified_users,
            "total_courses": total_courses,
            "total_enrollments": total_enrollments,
            "total_shortlisted": total_shortlisted,
            "total_rejected": total_rejected,
            "total_pending": total_pending,
            "shortlist_rate": round((total_shortlisted / total_enrollments * 100), 1) if total_enrollments > 0 else 0,
            "avg_ats_score": overall_avg_ats,
            "total_assignments": total_assignments,
            "completed_assignments": completed_assignments,
            "in_progress_assignments": in_progress_assignments,
            "violation_lockouts": violation_lockouts,
            "scheduled_assignments": scheduled_assignments,
            "total_proctor_frames": total_proctor_frames,
            "total_app_downloads": total_app_downloads,
            "unique_app_downloads": len(unique_candidates),
        },
        "courses_breakdown": courses_list,
        "ats_distribution": ats_distribution,
        "status_distribution": {
            "shortlisted": total_shortlisted,
            "rejected": total_rejected,
            "pending": total_pending,
        },
        "course_levels": course_levels,
        "recent_applicants": recent_applicants,
        "recent_assignments": recent_assignments,
        "app_downloads": recent_app_downloads,
    }


async def service_get_app_downloads(db: AsyncIOMotorDatabase) -> dict:
    """
    Returns the total count, unique candidate count, and full list of
    users who downloaded the Windows desktop application (.exe).
    """
    total_downloads = await db["app_downloads"].count_documents({})
    distinct_emails = await db["app_downloads"].distinct("email")
    unique_candidates = [e for e in distinct_emails if e and e != "anonymous"]

    cursor = db["app_downloads"].find().sort("downloaded_at", -1).limit(500)
    downloads_list = []
    async for d in cursor:
        dt = d.get("downloaded_at", datetime.now(timezone.utc))
        downloads_list.append({
            "id": str(d["_id"]),
            "email": d.get("email", ""),
            "name": d.get("name", ""),
            "course_title": d.get("course_title", ""),
            "assignment_token": d.get("assignment_token", ""),
            "ip_address": d.get("ip_address", ""),
            "user_agent": d.get("user_agent", ""),
            "downloaded_at": dt.isoformat() if hasattr(dt, "isoformat") else str(dt),
        })

    return {
        "total_downloads": total_downloads,
        "unique_users_count": len(unique_candidates),
        "downloads": downloads_list,
    }

