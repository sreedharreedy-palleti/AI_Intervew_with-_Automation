import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from Intervew.schemas.session_schemas import (
    InterviewStartRequest,
    InterviewQuestion,
)
from Intervew.schemas.answer_schemas import (
    SubmitAnswerRequest,
)
from .question_generator_service import generate_interview_questions
from .answer_evaluation_service import evaluate_candidate_answer
from .report_service import generate_final_interview_report
from .gemini_client import call_gemini_audio_transcription


DEMO_TESTING_EMAILS = {
    "23091a32j4@rgmcet.edu.in",
}


async def service_start_or_resume_interview(
    payload: InterviewStartRequest,
    db: AsyncIOMotorDatabase
) -> Dict[str, Any]:
    """
    Initializes or resumes an AI Technical Interview session for a qualified candidate.
    Prerequisite: Coding assessment score >= 50% (or authorized demo/testing access).
    """
    req_email = (payload.candidate_email or "").strip().lower()
    is_demo_access = req_email in DEMO_TESTING_EMAILS

    # Check if user_id belongs to a demo testing email
    if not is_demo_access and payload.user_id and ObjectId.is_valid(payload.user_id):
        user_rec = await db["users"].find_one({"_id": ObjectId(payload.user_id)})
        if user_rec and user_rec.get("email", "").strip().lower() in DEMO_TESTING_EMAILS:
            is_demo_access = True
            req_email = user_rec.get("email", "").strip().lower()

    assign_doc = None
    if payload.assignment_token:
        assign_doc = await db["assignments"].find_one({"assignment_token": payload.assignment_token})

    if not assign_doc and payload.user_id:
        assign_doc = await db["assignments"].find_one({
            "user_id": payload.user_id,
            "status": "submitted"
        })

    if not assign_doc and req_email:
        assign_doc = await db["assignments"].find_one({
            "candidate_email": req_email,
            "status": "submitted"
        })

    # If demo access tester and no submitted assignment found, look for any assignment for this user
    if not assign_doc and is_demo_access:
        assign_doc = await db["assignments"].find_one({
            "$or": [
                {"candidate_email": req_email},
                {"user_id": payload.user_id} if payload.user_id else {"candidate_email": req_email}
            ]
        })

    # Validate assignment submission and passing score (bypassed for authorized demo testing)
    score = assign_doc.get("score") if assign_doc else None
    if not is_demo_access:
        if not assign_doc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No completed coding assignment found. Please complete the coding assessment first."
            )

        if score is None or float(score) < 50.0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Candidate scored {score or 0.0}%. A minimum score of 50% is required to unlock the AI Interview process."
            )
    else:
        # Guarantee passing score for demo testing
        if score is None or float(score) < 50.0:
            score = 95.0

    assignment_token = (
        (assign_doc.get("assignment_token") if assign_doc else None)
        or payload.assignment_token
        or f"demo-assign-{uuid.uuid4().hex[:8]}"
    )
    candidate_name = (
        (assign_doc.get("candidate_name") if assign_doc else None)
        or payload.candidate_name
        or "Candidate"
    )
    candidate_email = (
        (assign_doc.get("candidate_email") if assign_doc else None)
        or req_email
        or payload.candidate_email
        or ""
    )
    course_id = (
        (assign_doc.get("course_id") if assign_doc else None)
        or payload.course_id
        or ""
    )
    user_id = (
        (assign_doc.get("user_id") if assign_doc else None)
        or payload.user_id
        or ""
    )

    # Resolve course title, description, and candidate resume text
    course_title = (assign_doc.get("course_title") if assign_doc else None)
    course_desc = ""
    resume_text = (assign_doc.get("resume_text") if assign_doc else "") or ""

    if course_id and ObjectId.is_valid(course_id):
        cdoc = await db["courses"].find_one({"_id": ObjectId(course_id)})
        if cdoc:
            if not course_title:
                course_title = cdoc.get("title", "")
            course_desc = cdoc.get("description", "")
            if not resume_text:
                for s in cdoc.get("enrolled_students", []):
                    if (s.get("email", "").strip().lower() == candidate_email) or (s.get("user_id") == user_id):
                        resume_text = s.get("resume_raw_text", "")
                        break

    if not course_title:
        course_title = "Technical Track"

    # Check for existing session to resume
    existing_session = await db["interviews"].find_one({
        "$or": [
            {"assignment_token": assignment_token},
            {"user_id": user_id, "course_id": course_id} if (user_id and course_id) else {"candidate_email": candidate_email}
        ]
    })

    if existing_session:
        idx = existing_session.get("current_question_index", 0)
        questions = existing_session.get("questions", [])
        curr_q = questions[idx] if idx < len(questions) else None

        return {
            "interview_token": existing_session["interview_token"],
            "status": existing_session.get("status", "in_progress"),
            "candidate_name": candidate_name,
            "course_title": course_title,
            "assignment_score": float(score),
            "current_question_index": idx,
            "total_questions": len(questions),
            "current_question": curr_q,
            "questions": questions,
            "started_at": existing_session.get("started_at", datetime.now(timezone.utc).isoformat()),
            "completed_at": existing_session.get("completed_at"),
            "precheck_verified": existing_session.get("precheck_verified", False),
        }

    # Generate custom progressive questions via Gemini
    generated_questions = await generate_interview_questions(
        candidate_name=candidate_name,
        course_title=course_title,
        course_description=course_desc,
        assignment_score=float(score),
        resume_text=resume_text,
    )

    new_token = f"interview-{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    new_session_doc = {
        "interview_token": new_token,
        "assignment_token": assignment_token,
        "user_id": user_id,
        "candidate_name": candidate_name,
        "candidate_email": candidate_email,
        "course_id": course_id,
        "course_title": course_title,
        "assignment_score": float(score),
        "status": "in_progress",
        "current_question_index": 0,
        "questions": generated_questions,
        "answers": [],
        "proctor_violations": [],
        "proctor_summary": {
            "total_violations": 0,
            "mobile_phone": 0,
            "multifaces": 0,
            "second_person_sound": 0,
        },
        "started_at": now_iso,
        "completed_at": None,
        "final_report": None,
        "precheck_verified": False,
    }

    await db["interviews"].insert_one(new_session_doc)

    # Link interview token in courses collection
    if course_id and ObjectId.is_valid(course_id):
        try:
            await db["courses"].update_one(
                {
                    "_id": ObjectId(course_id),
                    "enrolled_students": {
                        "$elemMatch": {
                            "$or": [
                                {"assignment_token": assignment_token},
                                {"user_id": user_id},
                                {"email": candidate_email}
                            ]
                        }
                    }
                },
                {
                    "$set": {
                        "enrolled_students.$.interview_token": new_token,
                        "enrolled_students.$.interview_status": "in_progress",
                        "enrolled_students.$.interview_started_at": now_iso,
                    }
                }
            )
        except Exception as e:
            print(f"[WARN] Could not link interview_token into course document: {e}")

    return {
        "interview_token": new_token,
        "status": "in_progress",
        "candidate_name": candidate_name,
        "course_title": course_title,
        "assignment_score": float(score),
        "current_question_index": 0,
        "total_questions": len(generated_questions),
        "current_question": generated_questions[0] if generated_questions else None,
        "questions": generated_questions,
        "started_at": now_iso,
        "completed_at": None,
        "precheck_verified": False,
    }


async def service_get_interview_session(
    interview_token: str,
    db: AsyncIOMotorDatabase
) -> Dict[str, Any]:
    """
    Fetches the active interview session, questions, and current question index.
    """
    session = await db["interviews"].find_one({"interview_token": interview_token})
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    idx = session.get("current_question_index", 0)
    questions = session.get("questions", [])
    curr_q = questions[idx] if idx < len(questions) else None

    return {
        "interview_token": session["interview_token"],
        "status": session.get("status", "in_progress"),
        "candidate_name": session.get("candidate_name", "Candidate"),
        "course_title": session.get("course_title", "Technical Track"),
        "assignment_score": session.get("assignment_score"),
        "current_question_index": idx,
        "total_questions": len(questions),
        "current_question": curr_q,
        "questions": questions,
        "started_at": session.get("started_at"),
        "completed_at": session.get("completed_at"),
        "final_report": session.get("final_report"),
        "precheck_verified": session.get("precheck_verified", False),
    }


async def service_submit_answer(
    interview_token: str,
    payload: SubmitAnswerRequest,
    db: AsyncIOMotorDatabase
) -> Dict[str, Any]:
    """
    Evaluates candidate's answer for current question, updates score,
    and moves to the next question or compiles the final scorecard.
    """
    session = await db["interviews"].find_one({"interview_token": interview_token})
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    if session.get("status") == "completed":
        raise HTTPException(status_code=400, detail="This interview has already been completed.")

    questions = session.get("questions", [])
    curr_idx = session.get("current_question_index", 0)

    # Locate current question
    target_q = None
    for q in questions:
        if q.get("question_id") == payload.question_id:
            target_q = q
            break
    if not target_q and curr_idx < len(questions):
        target_q = questions[curr_idx]

    if not target_q:
        raise HTTPException(status_code=400, detail="Invalid question ID for this interview.")

    course_title = session.get("course_title", "Technical Track")

    resolved_answer = (payload.answer_text or "").strip()

    # If answer text is empty or too short, and audio_base64 was provided, transcribe via Gemini
    if len(resolved_answer) < 10 and payload.audio_base64:
        try:
            transcribed = await call_gemini_audio_transcription(
                audio_base64=payload.audio_base64,
                mime_type=payload.audio_mime_type or "audio/webm"
            )
            if transcribed and len(transcribed.strip()) >= 5:
                resolved_answer = transcribed.strip()
        except Exception as exc:
            print(f"[WARN] SessionService audio transcription fallback notice: {exc}")

    # Live evaluation via Gemini
    evaluation = await evaluate_candidate_answer(
        question_text=target_q.get("question_text", ""),
        topic=target_q.get("topic", ""),
        expected_points=target_q.get("expected_points", []),
        candidate_answer=resolved_answer,
        course_title=course_title
    )

    answer_record = {
        "question_id": target_q.get("question_id"),
        "question_text": target_q.get("question_text"),
        "topic": target_q.get("topic"),
        "candidate_answer": resolved_answer,
        "duration_seconds": payload.duration_seconds or 0,
        "evaluation": evaluation,
        "score": evaluation.get("score", 70.0),
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "input_mode": "voice",
        "audio_metrics": payload.audio_metrics or {},
    }

    answers = session.get("answers", [])
    answers.append(answer_record)

    next_idx = curr_idx + 1
    is_complete = next_idx >= len(questions)

    update_fields = {
        "answers": answers,
        "current_question_index": next_idx,
    }

    final_report = None
    if is_complete:
        now_iso = datetime.now(timezone.utc).isoformat()
        assignment_score = float(session.get("assignment_score", 75.0))

        report_data = await generate_final_interview_report(
            candidate_name=session.get("candidate_name", "Candidate"),
            course_title=course_title,
            assignment_score=assignment_score,
            answers_evaluation=[a["evaluation"] for a in answers]
        )

        final_report = {
            "interview_token": interview_token,
            "candidate_name": session.get("candidate_name"),
            "course_title": course_title,
            "status": "completed",
            "overall_score": report_data["overall_score"],
            "technical_score": report_data["technical_score"],
            "communication_score": report_data["communication_score"],
            "problem_solving_score": report_data["problem_solving_score"],
            "hiring_verdict": report_data["hiring_verdict"],
            "executive_summary": report_data["executive_summary"],
            "key_strengths": report_data["key_strengths"],
            "growth_recommendations": report_data["growth_recommendations"],
            "questions_count": len(questions),
            "completed_at": now_iso,
            "proctor_summary": session.get("proctor_summary", {}),
            "proctor_violations_count": len(session.get("proctor_violations", [])),
            "detailed_question_reviews": [
                {
                    "question_id": a["question_id"],
                    "question_text": a["question_text"],
                    "topic": a["topic"],
                    "score": a["score"],
                    "verdict": a["evaluation"].get("verdict"),
                    "feedback": a["evaluation"].get("feedback"),
                    "candidate_answer": a["candidate_answer"],
                }
                for a in answers
            ]
        }

        update_fields["status"] = "completed"
        update_fields["completed_at"] = now_iso
        update_fields["final_report"] = final_report

        # Update course student record
        course_id = session.get("course_id")
        if course_id and ObjectId.is_valid(course_id):
            await db["courses"].update_one(
                {
                    "_id": ObjectId(course_id),
                    "enrolled_students.interview_token": interview_token
                },
                {
                    "$set": {
                        "enrolled_students.$.interview_status": "completed",
                        "enrolled_students.$.interview_score": report_data["overall_score"],
                        "enrolled_students.$.interview_verdict": report_data["hiring_verdict"],
                        "enrolled_students.$.interview_completed_at": now_iso,
                    }
                }
            )

    await db["interviews"].update_one(
        {"interview_token": interview_token},
        {"$set": update_fields}
    )

    next_q = questions[next_idx] if next_idx < len(questions) else None

    return {
        "question_id": target_q.get("question_id"),
        "score": evaluation.get("score", 70.0),
        "verdict": evaluation.get("verdict", "Good Answer"),
        "technical_accuracy": evaluation.get("technical_accuracy", 70.0),
        "clarity_of_thought": evaluation.get("clarity_of_thought", 70.0),
        "feedback": evaluation.get("feedback", ""),
        "strengths": evaluation.get("strengths", []),
        "improvements": evaluation.get("improvements", []),
        "next_question": next_q,
        "current_index": next_idx,
        "total_questions": len(questions),
        "is_interview_complete": is_complete,
        "final_report": final_report,
    }

