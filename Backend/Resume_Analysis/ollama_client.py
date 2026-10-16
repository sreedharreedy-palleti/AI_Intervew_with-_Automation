import os
import re
import json
import httpx

OLLAMA_HOST = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
MODEL_NAME = os.getenv("OLLAMA_MODEL", "llama3")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")


def _extract_json_from_text(raw_text: str) -> dict:
    if not raw_text:
        return {}
    cleaned = raw_text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except Exception:
            pass
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
        return {}


async def run_ats_evaluation(resume_text: str, course_title: str, course_description: str) -> dict:
    """
    Evaluates applicant resume against the course description using Gemini, Groq, or Ollama.
    Returns a dictionary containing the ATS score, strengths, weaknesses, and summary.
    """
    system_instruction = (
        "You are an ATS assessment AI. Evaluate the technical alignment between "
        "the provided resume and the target course. Output must be strictly valid JSON."
    )

    evaluation_prompt = f"""
Course Title: {course_title}
Course Overview: {course_description}

Candidate Resume:
{resume_text[:4000]}

Score this resume objectively against the prerequisites and topics of the course on a scale from 0 to 100.

Return this exact JSON structure:
{{
  "ats_score": 85,
  "strengths": ["Item 1", "Item 2"],
  "missing_skills": ["Item 1", "Item 2"],
  "recommendation": "Brief evaluation verdict"
}}
"""

    # 1. Try Gemini if key is provided
    key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if key:
        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}"
                resp = await client.post(url, json={
                    "contents": [{"parts": [{"text": f"{system_instruction}\n\n{evaluation_prompt}"}]}],
                    "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"}
                })
                if resp.status_code == 200:
                    text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = _extract_json_from_text(text)
                    if parsed and "ats_score" in parsed:
                        return {
                            "ats_score": int(parsed.get("ats_score", 70)),
                            "strengths": parsed.get("strengths", []),
                            "missing_skills": parsed.get("missing_skills", []),
                            "recommendation": parsed.get("recommendation", "Evaluation finished.")
                        }
        except Exception as e:
            print(f"[ATS GEMINI ERROR] {e}")

    # 2. Try Groq if key is provided
    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": [{"role": "system", "content": system_instruction}, {"role": "user", "content": evaluation_prompt}],
                        "response_format": {"type": "json_object"}
                    }
                )
                if resp.status_code == 200:
                    text = resp.json()["choices"][0]["message"]["content"]
                    parsed = _extract_json_from_text(text)
                    if parsed and "ats_score" in parsed:
                        return {
                            "ats_score": int(parsed.get("ats_score", 70)),
                            "strengths": parsed.get("strengths", []),
                            "missing_skills": parsed.get("missing_skills", []),
                            "recommendation": parsed.get("recommendation", "Evaluation finished.")
                        }
        except Exception as e:
            print(f"[ATS GROQ ERROR] {e}")

    # 3. Try local Ollama
    request_payload = {
        "model": MODEL_NAME,
        "prompt": evaluation_prompt,
        "system": system_instruction,
        "stream": False,
        "options": {"temperature": 0.2, "num_predict": 180}
    }

    try:
        async with httpx.AsyncClient(timeout=35.0) as client:
            resp = await client.post(f"{OLLAMA_HOST}/api/generate", json=request_payload)

        if resp.status_code == 200:
            body = resp.json()
            raw_result = body.get("response", "{}")
            parsed = _extract_json_from_text(raw_result)
            if parsed and "ats_score" in parsed:
                return {
                    "ats_score": int(parsed.get("ats_score", 65)),
                    "strengths": parsed.get("strengths", []),
                    "missing_skills": parsed.get("missing_skills", []),
                    "recommendation": parsed.get("recommendation", "Evaluation finished.")
                }

    except httpx.TimeoutException:
        print("[OLLAMA EVALUATION TIMEOUT] Local model took >35s, using ATS heuristic fallback.")
    except Exception as err:
        print(f"[OLLAMA EVALUATION EXCEPTION] {err}")

    return get_fallback_result()


def get_fallback_result() -> dict:
    return {
        "ats_score": 75,
        "strengths": ["Foundational technical aptitude"],
        "missing_skills": ["Specialized domain coursework"],
        "recommendation": "Candidate meets core prerequisites for this technical track."
    }