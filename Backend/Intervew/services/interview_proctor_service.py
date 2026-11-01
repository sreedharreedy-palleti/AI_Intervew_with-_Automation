import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from Intervew.schemas.proctor_schemas import (
    InterviewProctorFrameRequest,
    InterviewProctorFrameResponse,
)
from Assignment.services.yolo_proctor_service import (
    run_yolo_deep_learning_analysis,
    analyze_audio_deep_learning,
)

logger = logging.getLogger("interview.proctor")


async def service_analyze_interview_frame(
    interview_token: str,
    payload: InterviewProctorFrameRequest,
    db: AsyncIOMotorDatabase
) -> Dict[str, Any]:
    """
    Performs real-time YOLO11n computer vision and audio analysis on the candidate's interview stream:
    1. Mobile phone detection (cell phone, tablet, secondary screen)
    2. Multiple faces / additional person detection
    3. Second person sound / external conversation detection
    Logs flagged violations to MongoDB for recruiter audit and final scoring.
    """
    session = await db["interviews"].find_one({"interview_token": interview_token})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found."
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    mobile_detected = False
    multiple_faces = False
    second_person_sound = False
    face_count = 1
    person_count = 1
    face_detected = True
    violation_detected = False
    violation_type = "none"
    severity = "none"
    message = "Proctoring active: Environment secure and normal."
    details: Dict[str, Any] = {}

    # 1. Vision Analysis via YOLO11n Deep Learning & OpenCV Face Cascade
    if payload.image_base64:
        try:
            yolo_res = run_yolo_deep_learning_analysis(payload.image_base64)
            details["yolo"] = yolo_res

            face_count = int(yolo_res.get("face_count", 1))
            person_count = int(yolo_res.get("person_count", 1))
            face_detected = bool(yolo_res.get("face_detected", True))

            # Check Mobile Phone Detection
            if yolo_res.get("mobile_detected"):
                mobile_conf = float(yolo_res.get("mobile_confidence") or 0.0)
                mobile_detected = True
                violation_detected = True
                violation_type = "mobile_phone"
                severity = "critical"
                conf_pct = round(mobile_conf * 100)
                message = f"SECURITY ALERT: Mobile phone detected ({conf_pct}%) in camera feed! Mobile devices are strictly prohibited during the interview."

            # Check Multiple Faces / Multiple People Detection
            elif face_count > 1 or person_count > 1:
                total_detected = max(face_count, person_count)
                multiple_faces = True
                violation_detected = True
                violation_type = "multifaces"
                severity = "critical"
                message = f"SECURITY ALERT: Multiple people/faces ({total_detected}) detected in camera view! Only the candidate may be present in the room."

            # Check Face Missing
            elif not face_detected and person_count == 0:
                violation_detected = True
                violation_type = "no_face"
                severity = "warning"
                message = "WARNING: Candidate face not detected. Please remain centered and clearly visible to the camera."

        except Exception as exc:
            logger.warning(f"YOLO analysis notice: {exc}")

    # 2. Audio & Second Person Sound Analysis
    audio_level = float(payload.audio_noise_level or 0.0)
    voice_detected = bool(payload.voice_detected)
    phase = str(payload.conversation_phase or "candidate_turn")

    # A. External Voice while AI Agent is Speaking (Candidate should only be listening)
    if phase == "ai_asking" and voice_detected and audio_level > 40:
        second_person_sound = True
        if not violation_detected:
            violation_detected = True
            violation_type = "second_person_sound"
            severity = "warning"
            message = "AUDIO ALERT: External voice or background conversation detected while AI Interviewer was speaking!"

    # B. Voice while Microphone is Paused
    elif phase == "candidate_paused" and voice_detected and audio_level > 35:
        second_person_sound = True
        if not violation_detected:
            violation_detected = True
            violation_type = "second_person_sound"
            severity = "warning"
            message = "AUDIO ALERT: Voice activity detected while candidate microphone was paused!"

    # C. High Vocal Energy / Loud Secondary Conversation (deep learning check)
    elif audio_level > 60 and voice_detected:
        audio_dl = analyze_audio_deep_learning(audio_level, voice_detected)
        details["audio_deep_learning"] = audio_dl.get("details", {})
        if audio_dl.get("is_voice_violation"):
            second_person_sound = True
            if not violation_detected:
                violation_detected = True
                violation_type = "second_person_sound"
                severity = "warning"
                message = "AUDIO ALERT: High-volume secondary conversation or external speaker detected!"

    # 3. Log Flagged Violation to MongoDB
    if violation_detected and violation_type != "none":
        violation_event = {
            "timestamp": now_iso,
            "type": violation_type,
            "severity": severity,
            "message": message,
            "phase": phase,
            "question_id": payload.question_id,
            "details": {
                "mobile_detected": mobile_detected,
                "multiple_faces": multiple_faces,
                "second_person_sound": second_person_sound,
                "face_count": face_count,
                "person_count": person_count,
                "audio_level": audio_level,
            }
        }

        try:
            await db["interviews"].update_one(
                {"interview_token": interview_token},
                {
                    "$push": {"proctor_violations": violation_event},
                    "$inc": {
                        f"proctor_summary.{violation_type}": 1,
                        "proctor_summary.total_violations": 1,
                    },
                    "$set": {
                        "last_proctor_flag_at": now_iso
                    }
                }
            )
        except Exception as e:
            logger.error(f"Failed to record proctor violation to db: {e}")

    return {
        "mobile_detected": mobile_detected,
        "multiple_faces": multiple_faces,
        "second_person_sound": second_person_sound,
        "face_count": face_count,
        "person_count": person_count,
        "face_detected": face_detected,
        "violation_detected": violation_detected,
        "violation_type": violation_type,
        "severity": severity,
        "message": message,
        "details": details,
    }

