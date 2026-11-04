import os
import re
import json
from pathlib import Path
from typing import Dict, Any, Optional
import httpx
from dotenv import load_dotenv

# Ensure .env is resolved regardless of working directory
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
]


def get_gemini_api_key() -> str:
    key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""
    return key.strip().strip('"').strip("'")


def extract_json_from_text(raw_text: str) -> Optional[Dict[str, Any]]:
    if not raw_text:
        return None
    cleaned = raw_text.strip()

    # 1. Search for markdown code fences
    json_block = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
    if json_block:
        try:
            return json.loads(json_block.group(1).strip())
        except Exception:
            pass

    # 2. Extract outermost JSON structure
    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        try:
            return json.loads(cleaned[first_brace:last_brace + 1])
        except Exception:
            pass

    try:
        return json.loads(cleaned)
    except Exception:
        return None


async def call_gemini_api_json(
    prompt: str,
    system_instruction: str,
    timeout: float = 30.0,
    temperature: float = 0.2
) -> Optional[Dict[str, Any]]:
    """
    Executes a structured JSON generation call to Google Gemini 2.5 Flash API.
    """
    key = get_gemini_api_key()
    if not key:
        return None

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": f"{system_instruction}\n\n{prompt}"}
                ]
            }
        ],
        "generationConfig": {
            "temperature": temperature,
            "responseMimeType": "application/json"
        }
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        for model in GEMINI_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
            try:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        parsed = extract_json_from_text(text)
                        if parsed:
                            return parsed
            except Exception as exc:
                print(f"[GEMINI API EXCEPTION {model}]: {exc}")
    return None


async def call_gemini_audio_transcription(
    audio_base64: str,
    mime_type: str = "audio/webm",
    timeout: float = 35.0,
) -> Optional[str]:
    """
    Transcribes candidate's spoken response using Gemini multimodal audio capability.
    """
    key = get_gemini_api_key()
    if not key or not audio_base64:
        return None

    # Strip potential data URL prefix if present (e.g. data:audio/webm;base64,...)
    clean_base64 = audio_base64
    if "," in clean_base64:
        clean_base64 = clean_base64.split(",", 1)[1]

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": clean_base64
                        }
                    },
                    {
                        "text": "Transcribe the candidate's spoken technical interview answer into clear English text. Return ONLY the transcribed text verbatim."
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.0
        }
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        for model in GEMINI_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
            try:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if text and text.strip():
                            return text.strip()
            except Exception as exc:
                print(f"[GEMINI AUDIO TRANSCRIPTION EXCEPTION {model}]: {exc}")
    return None
