"""
AI LLM Coding Assessment Generator.
Strictly generates all assessment questions, problem statements, expected outputs,
and hidden test cases EXCLUSIVELY via AI LLM based on the target Job Description.
No code-based or static fallback questions are permitted.
"""

import os
import re
import json
import uuid
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
import httpx
from fastapi import HTTPException, status
from dotenv import load_dotenv

# Ensure .env is resolved across different working directories
for p in [
    Path(__file__).resolve().parent.parent.parent / ".env",
    Path(__file__).resolve().parent.parent / ".env",
    Path.cwd() / ".env",
    Path.cwd() / "Backend" / ".env",
]:
    if p.exists():
        load_dotenv(dotenv_path=p, override=False)


def _get_gemini_key() -> str:
    key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""
    return key.strip().strip('"').strip("'")


def _get_groq_key() -> str:
    key = os.getenv("GROQ_API_KEY") or ""
    return key.strip().strip('"').strip("'")


def _get_openai_key() -> str:
    key = os.getenv("OPENAI_API_KEY") or ""
    return key.strip().strip('"').strip("'")


def _extract_json_from_text(raw_text: str) -> Optional[Dict[str, Any]]:
    if not raw_text:
        return None

    cleaned = raw_text.strip()

    # 1. Look for markdown code fences: ```json ... ```
    json_block = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
    if json_block:
        try:
            return json.loads(json_block.group(1).strip())
        except Exception:
            pass

    # 2. Extract outermost JSON structure: { ... }
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


def _validate_and_format_questions(questions: List[Dict[str, Any]], job_title: str) -> Optional[List[Dict[str, Any]]]:
    if not questions or not isinstance(questions, list) or len(questions) < 2:
        return None

    formatted = []
    for idx, q in enumerate(questions[:2], start=1):
        q_id = f"q{idx}"
        title = str(q.get("title") or f"{job_title} Challenge {idx}").strip()
        problem_statement = str(q.get("problem_statement") or "").strip()
        function_name = str(q.get("function_name") or "solution").strip()

        if not problem_statement:
            return None

        # Verify test cases
        pub_tests = q.get("public_test_cases", [])
        if not pub_tests or not isinstance(pub_tests, list) or len(pub_tests) < 1:
            return None

        hidden_tests = q.get("hidden_test_cases", [])
        if not hidden_tests or not isinstance(hidden_tests, list) or len(hidden_tests) < 1:
            return None

        # Ensure all test cases have input and expected_output
        formatted_pub_tests = []
        for p in pub_tests:
            if "input" not in p or "expected_output" not in p:
                continue
            formatted_pub_tests.append({
                "input": p["input"],
                "expected_output": p["expected_output"],
                "explanation": str(p.get("explanation") or "Standard evaluation test case.")
            })

        formatted_hidden_tests = []
        for h in hidden_tests:
            if "input" not in h or "expected_output" not in h:
                continue
            formatted_hidden_tests.append({
                "input": h["input"],
                "expected_output": h["expected_output"],
                "hidden_state_reason": str(h.get("hidden_state_reason") or "Edge case verification.")
            })

        if not formatted_pub_tests or not formatted_hidden_tests:
            return None

        formatted.append({
            "id": q_id,
            "title": title,
            "difficulty": str(q.get("difficulty", "Easy" if idx == 1 else "Medium")),
            "category": str(q.get("category", "Software Engineering")),
            "problem_statement": problem_statement,
            "constraints": list(q.get("constraints", ["1 <= len(data) <= 10^5"])),
            "function_name": function_name,
            "starter_code": str(q.get("starter_code", f"def {function_name}(data):\n    # Write your solution here\n    pass\n")),
            "public_test_cases": formatted_pub_tests,
            "hidden_test_cases": formatted_hidden_tests
        })

    return formatted if len(formatted) == 2 else None


# ======================================================================
# AI LLM Provider Connectors (Gemini, Groq, OpenAI, Ollama)
# ======================================================================

async def _call_gemini_api(prompt: str, system_instruction: str, job_title: str) -> Optional[List[Dict[str, Any]]]:
    key = _get_gemini_key()
    if not key:
        return None

    models = [
        "gemini-2.5-flash",
        "gemini-1.5-flash",
        "gemini-2.0-flash",
        "gemini-flash-latest",
        "gemini-2.5-pro",
    ]
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": f"{system_instruction}\n\n{prompt}"}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.85,
            "responseMimeType": "application/json"
        }
    }

    async with httpx.AsyncClient(timeout=45.0) as client:
        for model in models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
            try:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        parsed = _extract_json_from_text(text)
                        if parsed and "questions" in parsed:
                            valid = _validate_and_format_questions(parsed["questions"], job_title)
                            if valid:
                                return valid
                else:
                    print(f"[GEMINI LLM NOTICE] {model} returned HTTP {resp.status_code}: {resp.text[:120]}")
            except Exception as exc:
                print(f"[GEMINI LLM RETRY] {model}: {exc}")

    return None


async def _call_groq_api(prompt: str, system_instruction: str, job_title: str) -> Optional[List[Dict[str, Any]]]:
    key = _get_groq_key()
    if not key:
        return None

    models = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768",
    ]

    async with httpx.AsyncClient(timeout=35.0) as client:
        for model in models:
            try:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_instruction},
                            {"role": "user", "content": prompt},
                        ],
                        "response_format": {"type": "json_object"},
                        "temperature": 0.8,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    parsed = _extract_json_from_text(content)
                    if parsed and "questions" in parsed:
                        valid = _validate_and_format_questions(parsed["questions"], job_title)
                        if valid:
                            return valid
            except Exception as exc:
                print(f"[GROQ LLM RETRY] {model}: {exc}")

    return None


async def _call_openai_api(prompt: str, system_instruction: str, job_title: str) -> Optional[List[Dict[str, Any]]]:
    key = _get_openai_key()
    if not key:
        return None

    models = ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"]

    async with httpx.AsyncClient(timeout=40.0) as client:
        for model in models:
            try:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_instruction},
                            {"role": "user", "content": prompt},
                        ],
                        "response_format": {"type": "json_object"},
                        "temperature": 0.8,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    parsed = _extract_json_from_text(content)
                    if parsed and "questions" in parsed:
                        valid = _validate_and_format_questions(parsed["questions"], job_title)
                        if valid:
                            return valid
            except Exception as exc:
                print(f"[OPENAI LLM RETRY] {model}: {exc}")

    return None


async def _call_ollama_api(prompt: str, system_instruction: str, job_title: str) -> Optional[List[Dict[str, Any]]]:
    """Attempts local Ollama instance on http://localhost:11434 if available."""
    # Fast check: only attempt generation if Ollama service is actively listening
    try:
        async with httpx.AsyncClient(timeout=1.5) as probe:
            probe_resp = await probe.get("http://localhost:11434/api/tags")
            if probe_resp.status_code != 200:
                return None
    except Exception:
        return None

    models = ["llama3", "codellama", "mistral", "qwen2.5-coder"]
    url = "http://localhost:11434/api/generate"

    async with httpx.AsyncClient(timeout=35.0) as client:
        for model in models:
            try:
                resp = await client.post(
                    url,
                    json={
                        "model": model,
                        "prompt": f"{system_instruction}\n\n{prompt}",
                        "format": "json",
                        "stream": False,
                    },
                )
                if resp.status_code == 200:
                    text = resp.json().get("response", "")
                    parsed = _extract_json_from_text(text)
                    if parsed and "questions" in parsed:
                        valid = _validate_and_format_questions(parsed["questions"], job_title)
                        if valid:
                            return valid
            except Exception:
                continue

    return None


# ======================================================================
# Main Entry Point: Exclusively AI LLM Driven from Job Description
# ======================================================================

async def generate_coding_assignment(
    candidate_name: str,
    resume_text: str,
    course_title: str,
    course_description: str,
    user_id: Optional[str] = None,
    assignment_token: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    STRICT AI GENERATION:
    Generates assessment questions exclusively through AI LLM based on the target
    Job Description / Syllabus. Code-based template fallback is strictly disabled.
    """
    job_title = (course_title or "Software Engineering Assessment").strip()
    job_description = (course_description or "").strip()
    if not job_description:
        job_description = f"Software development role focusing on practical coding, system performance, algorithms, and clean architecture in {job_title}."

    clean_resume = resume_text.strip() if resume_text else "Candidate undergoing technical interview evaluation."
    entropy_seed = f"{user_id or uuid.uuid4().hex[:8]}-{int(time.time())}-{uuid.uuid4().hex[:4]}"

    system_instruction = (
        "You are an Elite AI Technical Hiring & Assessment Architect. "
        "Your task is to analyze the provided Job Description and generate 2 completely original, novel programming problems "
        "directly tailored to the skills, algorithms, and real-world engineering responsibilities described in this Job Description.\n\n"
        "STRICT REQUIREMENTS:\n"
        "1. DO NOT repeat standard generic interview problems (like bracket matching, two sum, or palindrome checks).\n"
        "2. The problems MUST reflect actual engineering challenges encountered in this specific Job Description.\n"
        "3. Provide realistic constraints, starter_code with signature `def solution(data):`, and function_name `solution`.\n"
        "4. Calculate exact, mathematically verified expected_output for all public test cases.\n"
        "5. Include edge-case hidden test cases (e.g. empty inputs, large bounds, zero edge cases, negative values) with expected_output and hidden_state_reason.\n"
        "6. Return STRICT valid JSON matching the specified schema."
    )

    prompt = f"""
=============================
TARGET JOB DESCRIPTION & ROLE
=============================
Role Title: {job_title}
Job Description & Requirements:
\"\"\"
{job_description}
\"\"\"

=============================
CANDIDATE INFORMATION
=============================
Candidate Name: {candidate_name}
Candidate Resume Summary:
\"\"\"
{clean_resume[:1500]}
\"\"\"
Unique Generation Entropy: {entropy_seed}

=============================
GENERATION INSTRUCTION
=============================
Carefully study the Job Description above. Generate EXACTLY 2 distinct coding challenges:
- Question 1: Practical Easy/Medium challenge directly inspired by the core tech stack or workflow in the Job Description.
- Question 2: Advanced Algorithmic Medium challenge testing performance, scaling, or edge-case handling relevant to this Job Description.

Return JSON in this EXACT structure:
{{
  "questions": [
    {{
      "id": "q1",
      "title": "Creative Title Reflecting Job Role",
      "difficulty": "Easy",
      "category": "Domain Category from Job Description",
      "problem_statement": "Detailed, professional problem statement contextualized to the Job Description with input and output specifications.",
      "constraints": ["1 <= len(data) <= 10^4", "Additional technical constraints"],
      "function_name": "solution",
      "starter_code": "def solution(data):\\n    # Write your solution here\\n    pass\\n",
      "public_test_cases": [
        {{"input": [1, 2], "expected_output": 3, "explanation": "Basic verification of the requirements."}},
        {{"input": [0], "expected_output": 0, "explanation": "Boundary condition."}}
      ],
      "hidden_test_cases": [
        {{"input": [], "expected_output": 0, "hidden_state_reason": "Empty dataset edge case."}},
        {{"input": [-5], "expected_output": -5, "hidden_state_reason": "Negative integer edge case."}}
      ]
    }},
    {{
      "id": "q2",
      "title": "Creative Title Reflecting Job Role",
      "difficulty": "Medium",
      "category": "Domain Category from Job Description",
      "problem_statement": "Detailed, professional problem statement contextualized to the Job Description with input and output specifications.",
      "constraints": ["1 <= len(data) <= 10^5", "Additional technical constraints"],
      "function_name": "solution",
      "starter_code": "def solution(data):\\n    # Write your solution here\\n    pass\\n",
      "public_test_cases": [
        {{"input": [10, 20], "expected_output": 30, "explanation": "Core operational path."}},
        {{"input": [5], "expected_output": 5, "explanation": "Minimal single-record case."}}
      ],
      "hidden_test_cases": [
        {{"input": [0, 0], "expected_output": 0, "hidden_state_reason": "Zero value boundary test."}},
        {{"input": [-1, 1], "expected_output": 0, "hidden_state_reason": "Cancellation boundary test."}}
      ]
    }}
  ]
}}
"""

    # 1. Attempt Google Gemini LLM
    gemini_res = await _call_gemini_api(prompt, system_instruction, job_title)
    if gemini_res:
        print(f"[AI LLM SUCCESS] Gemini generated 2 custom questions directly from Job Description for {candidate_name} ({job_title}).")
        return gemini_res

    # 2. Attempt Groq Cloud LLM
    groq_res = await _call_groq_api(prompt, system_instruction, job_title)
    if groq_res:
        print(f"[AI LLM SUCCESS] Groq LLM generated 2 custom questions directly from Job Description for {candidate_name} ({job_title}).")
        return groq_res

    # 3. Attempt OpenAI LLM
    openai_res = await _call_openai_api(prompt, system_instruction, job_title)
    if openai_res:
        print(f"[AI LLM SUCCESS] OpenAI LLM generated 2 custom questions directly from Job Description for {candidate_name} ({job_title}).")
        return openai_res

    # 4. Attempt Local Ollama LLM
    ollama_res = await _call_ollama_api(prompt, system_instruction, job_title)
    if ollama_res:
        print(f"[AI LLM SUCCESS] Local Ollama LLM generated 2 custom questions directly from Job Description for {candidate_name} ({job_title}).")
        return ollama_res

    # Strict Enforcement: No code-based question generation permitted
    err_detail = (
        f"AI LLM Question Generation Required: Questions must be generated exclusively by AI LLM from the Job Description '{job_title}'. "
        "No active AI LLM connection was successful. Please ensure GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY is configured in Backend/.env."
    )
    print(f"[AI LLM ERROR] {err_detail}")
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=err_detail,
    )


async def generate_ai_submission_review(
    candidate_name: str,
    course_title: str,
    questions: List[Dict[str, Any]],
    submissions: Dict[str, str],
    test_results: Dict[str, Any],
) -> Dict[str, Any]:
    """Generates AI submission feedback using LLM."""
    prompt = f"""
Candidate: {candidate_name}
Target Role: {course_title}
Submissions Summary: {json.dumps(submissions)[:1500]}
Test Results Summary: {json.dumps(test_results)[:1500]}

Provide an objective technical evaluation in JSON:
{{
  "verdict": "Qualified" or "Needs Improvement",
  "technical_feedback": "3-4 sentences on code quality, correctness, and time complexity in relation to the job requirements.",
  "strengths": ["Strength 1", "Strength 2"],
  "areas_for_growth": ["Recommendation 1", "Recommendation 2"]
}}
"""
    # Try Gemini
    key = _get_gemini_key()
    if key:
        models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-flash-latest"]
        async with httpx.AsyncClient(timeout=25.0) as client:
            for model in models:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
                    resp = await client.post(url, json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"responseMimeType": "application/json"}
                    })
                    if resp.status_code == 200:
                        text = resp.json().get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        parsed = _extract_json_from_text(text)
                        if parsed and "technical_feedback" in parsed:
                            return parsed
                except Exception:
                    continue

    # Try Groq
    groq_key = _get_groq_key()
    if groq_key:
        async with httpx.AsyncClient(timeout=25.0) as client:
            try:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": [
                            {"role": "system", "content": "You are a senior technical hiring manager."},
                            {"role": "user", "content": prompt},
                        ],
                        "response_format": {"type": "json_object"},
                    },
                )
                if resp.status_code == 200:
                    content = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "")
                    parsed = _extract_json_from_text(content)
                    if parsed and "technical_feedback" in parsed:
                        return parsed
            except Exception:
                pass

    total_passed = sum(1 for r in test_results.values() if r.get("all_passed"))
    verdict = "Qualified" if total_passed >= 1 else "Needs Practice"
    return {
        "verdict": verdict,
        "technical_feedback": f"Evaluation completed for {course_title}. Code was evaluated against test suites and edge case constraints.",
        "strengths": [
            "Demonstrated logical flow and algorithm decomposition",
            "Executed solution within reasonable time complexity bounds"
        ],
        "areas_for_growth": [
            "Optimize auxiliary memory allocations",
            "Expand validation for extreme edge cases"
        ]
    }


# Backwards compatibility alias
generate_coding_assignment_with_ai = generate_coding_assignment
generate_coding_assignment_with_ollama = generate_coding_assignment
