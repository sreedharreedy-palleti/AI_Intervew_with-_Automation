import os
import base64
import logging
from typing import Dict, Any, Optional, List, Tuple

import cv2
import numpy as np

logger = logging.getLogger("proctor.yolo")

# -----------------------------
# YOLO Model Singleton
# -----------------------------
_YOLO_MODEL = None
_YOLO_MODEL_NAME = "yolo11n.pt"


def _resolve_yolo11_path():
    candidates = [
        os.path.join(os.path.dirname(__file__), "..", "..", "yolo11n.pt"),
        os.path.join(os.path.dirname(__file__), "..", "yolo11n.pt"),
        os.path.join(os.getcwd(), "yolo11n.pt"),
        "yolo11n.pt"
    ]

    for p in candidates:
        if os.path.exists(os.path.normpath(p)):
            return os.path.normpath(p)

    return "yolo11n.pt"


def get_yolo_model():
    global _YOLO_MODEL

    if _YOLO_MODEL is None:
        from ultralytics import YOLO

        path = _resolve_yolo11_path()
        logger.info(f"Loading YOLO model: {path}")

        _YOLO_MODEL = YOLO(path)

    return _YOLO_MODEL


# -----------------------------
# Image Decoder
# -----------------------------
def decode_base64_image(image_base64_data):

    if not image_base64_data:
        return None

    try:
        if "," in image_base64_data:
            image_base64_data = image_base64_data.split(",", 1)[1]

        img_bytes = base64.b64decode(image_base64_data)
        arr = np.frombuffer(img_bytes, np.uint8)

        return cv2.imdecode(arr, cv2.IMREAD_COLOR)

    except Exception as e:
        logger.error(e)
        return None


# -----------------------------
# Face Detector
# -----------------------------
try:
    if hasattr(cv2, "CascadeClassifier") and hasattr(cv2, "data") and hasattr(cv2.data, "haarcascades"):
        FACE_CASCADE = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
    else:
        FACE_CASCADE = None
except Exception as e:
    logger.warning(f"Could not load Haar cascade face detector: {e}")
    FACE_CASCADE = None


# -----------------------------
# Person Deduplication
# -----------------------------
def _deduplicate_person_boxes(raw_boxes, frame_width, frame_height):

    if not raw_boxes:
        return []

    frame_area = frame_width * frame_height

    min_area = max(4000, frame_area * 0.012)

    raw_boxes = sorted(raw_boxes, key=lambda x: x[4], reverse=True)

    valid = []

    for box in raw_boxes:

        x1, y1, x2, y2, conf = box

        bw = x2 - x1
        bh = y2 - y1

        area = bw * bh

        if area < min_area:
            continue

        merged = False

        for i, vb in enumerate(valid):

            vx1, vy1, vx2, vy2, vc = vb

            ix1 = max(x1, vx1)
            iy1 = max(y1, vy1)
            ix2 = min(x2, vx2)
            iy2 = min(y2, vy2)

            iw = max(0, ix2 - ix1)
            ih = max(0, iy2 - iy1)

            inter = iw * ih

            union = area + ((vx2-vx1)*(vy2-vy1)) - inter

            iou = inter / union if union else 0

            if iou > 0.18:

                valid[i] = (
                    min(x1, vx1),
                    min(y1, vy1),
                    max(x2, vx2),
                    max(y2, vy2),
                    max(conf, vc)
                )

                merged = True
                break

        if not merged:
            valid.append(box)

    return valid


# -----------------------------
# Main Vision Analysis
# -----------------------------
def run_yolo_deep_learning_analysis(image_base64_data):

    result = {
        "model_used": "yolo11n.pt",
        "engine": "YOLO11n + OpenCV Face Detection",
        "person_count": 0,
        "face_detected": False,
        "face_count": 0,
        "face_centered": True,
        "mobile_detected": False,
        "mobile_confidence": 0.0,
        "other_devices": [],
        "detections": [],
        "explanation": "No frame analyzed."
    }

    img = decode_base64_image(image_base64_data)

    if img is None:
        result["explanation"] = "Invalid image."
        return result

    height, width = img.shape[:2]

    model = get_yolo_model()

    # Better inference settings
    preds = model.predict(
        source=img,
        conf=0.18,
        imgsz=960,
        iou=0.45,
        verbose=False
    )

    boxes = preds[0].boxes

    raw_person_boxes = []

    mobile_detected = False
    max_mobile_conf = 0

    other_devices = []

    detections = []

    for b in boxes:

        cls = int(b.cls[0])
        conf = float(b.conf[0])

        x1, y1, x2, y2 = map(float, b.xyxy[0])

        w = x2 - x1
        h = y2 - y1

        name = model.names[cls]

        detections.append({
            "class_name": name,
            "confidence": round(conf, 3),
            "bbox": [round(x1), round(y1), round(x2), round(y2)]
        })

        # Person
        if name == "person":

            if conf >= 0.30:
                raw_person_boxes.append((x1, y1, x2, y2, conf))

        # Mobile / Tablet / Secondary screen devices (Immediate violation)
        elif (
            cls == 67
            or name.lower() in ["cell phone", "laptop", "tv", "remote"]
            or any(term in name.lower() for term in ["phone", "cell", "tablet", "mobile"])
        ):
            if conf >= 0.18 and w >= 12 and h >= 12:
                mobile_detected = True
                max_mobile_conf = max(max_mobile_conf, conf)

        # Other unauthorized peripherals
        elif name in ["book"]:
            if conf >= 0.30:
                other_devices.append(f"{name} ({round(conf*100)}%)")

    # Person cleanup
    persons = _deduplicate_person_boxes(raw_person_boxes, width, height)

    person_count = len(persons)

    # -----------------------------
    # Face Detection
    # -----------------------------
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    if FACE_CASCADE is not None and not FACE_CASCADE.empty():
        faces = FACE_CASCADE.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(40,40)
        )
    else:
        faces = []

    face_count = len(faces)
    face_detected = face_count > 0

    # Face centering
    face_centered = True

    if face_count == 1:

        x, y, w, h = faces[0]

        center_x = x + w/2

        if center_x < width*0.15 or center_x > width*0.85:
            face_centered = False

    explanation = []

    if person_count == 0:
        explanation.append("No candidate detected.")

    elif person_count == 1:
        explanation.append("Single candidate detected.")

    else:
        explanation.append(f"{person_count} persons detected.")

    if mobile_detected:
        explanation.append(
            f"Mobile detected ({round(max_mobile_conf*100)}%)."
        )

    if other_devices:
        explanation.append(
            "Other devices: " + ", ".join(other_devices)
        )

    result.update({
        "person_count": person_count,
        "face_detected": face_detected,
        "face_count": face_count,
        "face_centered": face_centered,
        "mobile_detected": mobile_detected,
        "mobile_confidence": round(max_mobile_conf,3),
        "other_devices": other_devices,
        "detections": detections,
        "explanation": " ".join(explanation)
    })

    return result


# -----------------------------
# Audio Analysis
# -----------------------------
def analyze_audio_deep_learning(
    audio_noise_level,
    voice_detected,
    spike_counter=0
):

    violation = False

    details = {
        "audio_level": audio_noise_level,
        "voice_detected": voice_detected,
        "classification": "Quiet"
    }

    if voice_detected and audio_noise_level > 55:

        details["classification"] = "Active Conversation"
        violation = True

    elif audio_noise_level > 70:
        details["classification"] = "Loud Environment"

    elif audio_noise_level > 30:
        details["classification"] = "Normal Room"

    return {
        "is_voice_violation": violation,
        "details": details
    }


# -----------------------------
# Pre-warm model
# -----------------------------
try:
    model = get_yolo_model()
    dummy = np.zeros((480,640,3), dtype=np.uint8)
    model.predict(dummy, conf=0.18, imgsz=640, verbose=False)
except Exception as e:
    logger.warning(e)