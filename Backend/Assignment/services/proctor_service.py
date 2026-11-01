import os
import re
import json
import httpx
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from Assignment.schemas.proctor_schemas import (
    ProctorFrameRequest,
    ProctorTerminationRequest,
    ProctorPrecheckRequest,
    ProctorPrecheckResponse,
)
from Assignment.services.yolo_proctor_service import (
    run_yolo_deep_learning_analysis,
    analyze_audio_deep_learning,
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")

# In-memory streak tracking for temporal verification per session
_MOBILE_STREAK: Dict[str, int] = {}
_PERSON_STREAK: Dict[str, int] = {}


async def _call_gemini_vision(image_base64_data: str) -> Optional[Dict[str, Any]]:
    """
    Sends webcam snapshot to Google Gemini Vision for live object and person detection.
    Detects mobile phones, person count, and gaze direction.
    """
    key = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or GEMINI_API_KEY or "").strip().strip('"').strip("'")
    if not key:
        return None

    # Clean base64 data prefix if present
    clean_b64 = image_base64_data
    if "," in clean_b64:
        clean_b64 = clean_b64.split(",", 1)[1]
    clean_b64 = clean_b64.strip()

    models = [
        "gemini-2.5-flash",
        "gemini-flash-latest",
        "gemini-2.5-flash-lite",
        "gemini-2.5-pro",
        "gemini-1.5-flash",
        "gemini-2.0-flash"
    ]
    prompt = """
You are an expert AI proctor evaluating a webcam snapshot during an official computer-based technical exam.
Your task is to strictly assess security and academic integrity with ZERO TOLERANCE for cheating devices.

CRITICAL ASSESSMENT RULES:
1. Mobile Phone Detection (mobile_detected: boolean):
   - ABSOLUTE ZERO TOLERANCE RULE: If ANY mobile phone, smartphone, cell phone, or mobile screen is visible in the candidate's hand, beside their ear/head, on their desk, or in their lap — EVEN ONCE, EVEN PARTIALLY VISIBLE OR TILTED — you MUST IMMEDIATELY set:
     "mobile_detected": true
     "violation_detected": true
     "violation_type": "mobile_phone"
   - Do not wait or give warnings. A visible mobile device triggers immediate exam termination on the first sighting.
   - Do NOT mistake ordinary computer mice, keyboards, mousepads, pens, or spectacles for mobile phones.

2. Person Count (person_count: integer):
   - Count ONLY DISTINCT, LIVING, SEPARATE HUMAN BODIES in the room.
   - The candidate in front of the camera is 1 person.
   - Overlapping detections of the same candidate's face, neck, torso, or hands are 1 person, NOT multiple persons.
   - NEVER count wall photos, clothing patterns, or reflections in eyeglasses/mirrors.
   - Set person_count >= 2 ONLY if an actual second human being is physically present in the room with the candidate.

3. Face Visibility & Gaze:
   - face_detected: boolean (is the candidate's face visible?)
   - looking_away: boolean (is the candidate looking completely away from the exam?)

Return STRICT JSON only matching this schema:
{
  "person_count": 1,
  "face_detected": true,
  "mobile_detected": false,
  "looking_away": false,
  "violation_detected": false,
  "violation_type": "none",
  "confidence": 0.95,
  "explanation": "Candidate is alone and focused on the exam."
}
"""

    async with httpx.AsyncClient(timeout=10.0) as client:
        for model in models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt},
                            {
                                "inline_data": {
                                    "mime_type": "image/jpeg",
                                    "data": clean_b64,
                                }
                            },
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.1,
                    "responseMimeType": "application/json",
                },
            }
            try:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        match = re.search(r"\{[\s\S]*\}", text)
                        if match:
                            return json.loads(match.group(0))
            except Exception as e:
                print(f"[PROCTOR GEMINI VISION {model} ERROR]: {e}")

    return None


async def service_analyze_frame(
    assignment_token: str,
    payload: ProctorFrameRequest,
    db: AsyncIOMotorDatabase,
) -> Dict[str, Any]:
    """
    Analyzes live camera snapshot, audio noise/voice levels, and screen focus status.
    Determines violations such as mobile phone usage, screen shifting, or multiple voices.
    """
    assign_doc = await db["assignments"].find_one({"assignment_token": assignment_token})
    if not assign_doc:
        raise HTTPException(status_code=404, detail="Assessment not found.")

    if assign_doc.get("status") in ("submitted", "terminated_violation"):
        return {
            "violation_detected": True,
            "violation_type": "already_closed",
            "severity": "critical",
            "should_terminate": True,
            "message": "Assessment has ended.",
            "details": {},
        }

    now_iso = datetime.now(timezone.utc).isoformat()
    violation_detected = False
    violation_type = "none"
    severity = "none"
    should_terminate = False
    message = "Proctoring active: Environment normal."
    details: Dict[str, Any] = {}

    # 1. Screen Shift Detection (Candidate navigated away or tab switched)
    if not payload.screen_visible:
        violation_detected = True
        violation_type = "screen_shift"
        severity = "warning"
        message = "SCREEN SHIFT DETECTED: You navigated away from the active examination window or switched tabs!"
        details["screen_shift"] = True
    elif not payload.fullscreen_active:
        # Fullscreen not active: flag as informational/mild warning, not automatic termination
        details["fullscreen_active"] = False

    # 2. Voice & Audio Activity Detection via Deep Learning
    audio_dl = analyze_audio_deep_learning(
        audio_noise_level=payload.audio_noise_level or 0.0,
        voice_detected=bool(payload.voice_detected),
    )
    details["audio_deep_learning"] = audio_dl["details"]
    if audio_dl["is_voice_violation"]:
        violation_detected = True
        violation_type = "other_voice"
        severity = "warning"
        message = "AUDIO ALERT: Secondary voice or external conversation detected in your room!"
        details["audio_noise_level"] = payload.audio_noise_level

    # 3. Deep Learning Vision Analysis (YOLO11n for Face & Mobile Phone Detection)
    if payload.image_base64:
        # A. Primary: Local Deep Learning YOLO Inference
        yolo_result = run_yolo_deep_learning_analysis(payload.image_base64)
        details["yolo_deep_learning"] = yolo_result

        # Check Mobile Phone / Electronic Device Detection -> Immediate termination on FIRST visual (no warning, no strikes)
        if yolo_result.get("mobile_detected"):
            mobile_conf = float(yolo_result.get("mobile_confidence") or 0.0)
            violation_detected = True
            violation_type = "mobile_phone"
            severity = "critical"
            should_terminate = True
            conf_pct = round(mobile_conf * 100)
            message = f"CRITICAL VIOLATION: Mobile phone detected ({conf_pct}%) by YOLO Deep Learning! Immediate exam exit triggered."
        elif yolo_result.get("person_count", 0) > 1 or yolo_result.get("face_count", 0) > 1:
            # Another person or multiple faces visual in camera -> Immediate termination on FIRST visual (no warning, no strikes)
            person_total = max(yolo_result.get("person_count", 0), yolo_result.get("face_count", 0))
            violation_detected = True
            violation_type = "multiple_persons"
            severity = "critical"
            should_terminate = True
            message = f"CRITICAL VIOLATION: Multiple persons ({person_total}) detected by Deep Learning in camera view! Immediate exam exit triggered."
        else:
            # Check Candidate Face / Body Left
            if yolo_result.get("person_count", 0) == 0 and not yolo_result.get("face_detected"):
                violation_detected = True
                violation_type = "no_person"
                severity = "warning"
                message = "WARNING: Candidate face not detected. Please remain centered in front of the camera."

        # B. Fallback / Secondary Cross-Verification (Gemini Vision if configured)
        if not violation_detected and GEMINI_API_KEY:
            vision_result = await _call_gemini_vision(payload.image_base64)
            if vision_result:
                details["gemini_vision_analysis"] = vision_result
                if vision_result.get("mobile_detected"):
                    violation_detected = True
                    violation_type = "mobile_phone"
                    severity = "critical"
                    should_terminate = True
                    message = "CRITICAL VIOLATION: Mobile phone detected in exam area! Immediate exam exit triggered."
                elif vision_result.get("person_count", 1) > 1 and (vision_result.get("confidence") or 0.0) >= 0.85:
                    violation_detected = True
                    violation_type = "multiple_persons"
                    severity = "critical"
                    should_terminate = True
                    message = f"CRITICAL VIOLATION: Multiple persons ({vision_result.get('person_count')}) detected in camera view!"

    # If warnings exceeded threshold (e.g. 3 or more warnings for minor infractions)
    # Note: Mobile phone and critical violations exit on single first sighting, never waiting for 3 strikes
    if (payload.warning_count or 0) >= 3 and violation_detected and not should_terminate:
        should_terminate = True
        severity = "critical"
        message = f"EXAM TERMINATED: Proctoring violation limit exceeded (3/3 strikes). Reason: {violation_type}."

    # 4. Save live face snapshot and audio status to MongoDB database
    try:
        # A. Store in proctor_frames collection for full audit trail
        await db["proctor_frames"].insert_one(
            {
                "assignment_token": assignment_token,
                "stage": "live_exam",
                "timestamp": now_iso,
                "image_base64": payload.image_base64,
                "audio_noise_level": payload.audio_noise_level or 0.0,
                "voice_detected": bool(payload.voice_detected),
                "screen_visible": payload.screen_visible,
                "fullscreen_active": payload.fullscreen_active,
                "violation_detected": violation_detected,
                "violation_type": violation_type,
                "severity": severity,
            }
        )

        # B. Update latest state on the assignment document
        assignment_update: Dict[str, Any] = {
            "$set": {
                "latest_audio_level": payload.audio_noise_level or 0.0,
                "latest_voice_detected": bool(payload.voice_detected),
                "last_proctor_ping": now_iso,
            },
            "$push": {
                "live_proctor_timeline": {
                    "$each": [
                        {
                            "timestamp": now_iso,
                            "audio_level": payload.audio_noise_level or 0.0,
                            "voice_detected": bool(payload.voice_detected),
                            "has_face_image": bool(payload.image_base64),
                            "status": "violation" if violation_detected else "normal",
                            "violation_type": violation_type,
                        }
                    ],
                    "$slice": -50,  # keep the most recent 50 heartbeat pings
                }
            },
        }
        if payload.image_base64:
            assignment_update["$set"]["latest_face_snapshot"] = payload.image_base64
            assignment_update["$set"]["latest_snapshot_at"] = now_iso

        if violation_detected:
            log_entry = {
                "timestamp": now_iso,
                "violation_type": violation_type,
                "severity": severity,
                "message": message,
                "details": details,
            }
            assignment_update["$push"]["proctor_logs"] = log_entry
            assignment_update["$inc"] = {"violation_count": 1}

            if should_terminate:
                assignment_update["$set"]["status"] = "terminated_violation"
                assignment_update["$set"]["termination_reason"] = message
                assignment_update["$set"]["terminated_at"] = now_iso
                assignment_update["$set"]["score"] = 0.0

        await db["assignments"].update_one(
            {"assignment_token": assignment_token},
            assignment_update,
        )
    except Exception as db_err:
        print(f"[PROCTOR DB STORAGE ERROR]: {db_err}")

    return {
        "violation_detected": violation_detected,
        "violation_type": violation_type,
        "severity": severity,
        "should_terminate": should_terminate,
        "message": message,
        "details": details,
    }


async def service_verify_precheck(
    assignment_token: str,
    payload: ProctorPrecheckRequest,
    db: AsyncIOMotorDatabase,
) -> ProctorPrecheckResponse:
    """
    Records initial pre-exam Face and Audio verification into MongoDB.
    Locks in candidate identity snapshot and audio working status before unlocking exam code editor.
    """
    assign_doc = await db["assignments"].find_one({"assignment_token": assignment_token})
    if not assign_doc:
        raise HTTPException(status_code=404, detail="Assessment not found.")

    now_iso = datetime.now(timezone.utc).isoformat()

    # Run YOLO Deep Learning face & person recognition on the candidate's snapshot
    yolo_verification = {}
    if payload.face_snapshot:
        yolo_verification = run_yolo_deep_learning_analysis(payload.face_snapshot)

    # Store verification in both assignments collection and proctor_frames collection
    verification_record = {
        "verified_at": now_iso,
        "face_verified": payload.face_verified,
        "audio_verified": payload.audio_verified,
        "face_snapshot": payload.face_snapshot,
        "mic_level": payload.mic_level or 0.0,
        "device_info": payload.device_info or {},
        "yolo_deep_learning": yolo_verification,
    }

    await db["assignments"].update_one(
        {"assignment_token": assignment_token},
        {
            "$set": {
                "verification_completed": True,
                "precheck_verification": verification_record,
                "initial_face_snapshot": payload.face_snapshot,
                "latest_face_snapshot": payload.face_snapshot,
            }
        },
    )

    await db["proctor_frames"].insert_one(
        {
            "assignment_token": assignment_token,
            "stage": "precheck_verification",
            "timestamp": now_iso,
            "image_base64": payload.face_snapshot,
            "audio_verified": payload.audio_verified,
            "face_verified": payload.face_verified,
            "mic_level": payload.mic_level,
            "device_info": payload.device_info or {},
        }
    )

    return ProctorPrecheckResponse(
        status="verified",
        message="Face and Audio pre-check verified and persisted in MongoDB database.",
        verified_at=now_iso,
        can_proceed=True,
    )


async def service_terminate_exam_for_violation(
    assignment_token: str,
    payload: ProctorTerminationRequest,
    db: AsyncIOMotorDatabase,
) -> Dict[str, Any]:
    """
    Terminates and locks the assessment immediately due to detected proctoring violation
    (e.g. mobile phone usage, repeated screen shifts, or secondary voice).
    """
    assign_doc = await db["assignments"].find_one({"assignment_token": assignment_token})
    if not assign_doc:
        raise HTTPException(status_code=404, detail="Assessment not found.")

    now_iso = datetime.now(timezone.utc).isoformat()

    await db["assignments"].update_one(
        {"assignment_token": assignment_token},
        {
            "$set": {
                "status": "terminated_violation",
                "termination_reason": payload.reason,
                "terminated_at": now_iso,
                "proctor_violation_history": payload.violation_history,
                "score": 0.0,
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
                    "enrolled_students.$.assignment_status": "terminated_violation",
                    "enrolled_students.$.assignment_score": 0.0,
                    "enrolled_students.$.termination_reason": payload.reason,
                }
            },
        )

    return {
        "status": "terminated",
        "message": f"Assessment terminated due to integrity violation: {payload.reason}",
        "terminated_at": now_iso,
        "assignment_token": assignment_token,
    }
    

async def service_get_proctor_logs(
    assignment_token: str,
    db: AsyncIOMotorDatabase,
) -> Dict[str, Any]:
    """
    Retrieves logged proctoring incidents for reviewer inspection.
    """
    assign_doc = await db["assignments"].find_one({"assignment_token": assignment_token})
    if not assign_doc:
        raise HTTPException(status_code=404, detail="Assessment not found.")

    return {
        "assignment_token": assignment_token,
        "violation_count": assign_doc.get("violation_count", 0),
        "status": assign_doc.get("status"),
        "termination_reason": assign_doc.get("termination_reason"),
        "proctor_logs": assign_doc.get("proctor_logs", []),
    }

