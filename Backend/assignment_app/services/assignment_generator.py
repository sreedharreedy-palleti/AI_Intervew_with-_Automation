import os
import re
import json
import uuid
import time
import random
from pathlib import Path
from typing import Dict, Any, List, Optional
import httpx
from fastapi import HTTPException
from dotenv import load_dotenv

# Ensure .env is resolved regardless of the working directory
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


def _get_api_key() -> str:
    key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""
    return key.strip().strip('"').strip("'")


def _extract_json_from_text(raw_text: str) -> Optional[Dict[str, Any]]:
    if not raw_text:
        return None

    cleaned = raw_text.strip()

    # 1. Look for markdown code fences
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


def _validate_and_format_questions(questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not questions or not isinstance(questions, list):
        return []

    formatted = []
    for idx, q in enumerate(questions[:2], start=1):
        q_id = f"q{idx}"
        func_name = str(q.get("function_name") or "solution").strip()

        pub_tests = q.get("public_test_cases", [])
        if not pub_tests or not isinstance(pub_tests, list):
            pub_tests = [
                {"input": [1, 2, 3], "expected_output": 6, "explanation": "Basic verification."},
                {"input": [0], "expected_output": 0, "explanation": "Single item check."}
            ]

        hidden_tests = q.get("hidden_test_cases", [])
        if not hidden_tests or not isinstance(hidden_tests, list):
            hidden_tests = [
                {"input": [], "expected_output": 0, "hidden_state_reason": "Empty input array."},
                {"input": [-1, -2], "expected_output": -3, "hidden_state_reason": "Negative values."}
            ]

        formatted.append({
            "id": q_id,
            "title": str(q.get("title", f"Challenge {idx}")),
            "difficulty": str(q.get("difficulty", "Easy" if idx == 1 else "Medium")),
            "category": str(q.get("category", "Algorithms")),
            "problem_statement": str(q.get("problem_statement", "")),
            "constraints": list(q.get("constraints", ["1 <= len(data) <= 10^5"])),
            "function_name": func_name,
            "starter_code": str(q.get("starter_code", f"def {func_name}(data):\n    # Write your solution here\n    pass\n")),
            "public_test_cases": pub_tests,
            "hidden_test_cases": hidden_tests
        })
    return formatted


async def _call_gemini_api(prompt: str, system_instruction: str) -> Optional[List[Dict[str, Any]]]:
    key = _get_api_key()
    if not key:
        print("[GEMINI ERROR] GEMINI_API_KEY is empty or not found in .env")
        return None

    # Supported current API models (prioritizing active Gemini 2.5 Flash endpoints)
    models = [
        "gemini-2.5-flash",
        "gemini-flash-latest",
        "gemini-2.5-flash-lite",
        "gemini-2.5-pro",
        "gemini-2.0-flash",
        "gemini-1.5-flash"
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
            "temperature": 0.7,
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
                        if parsed and "questions" in parsed and len(parsed["questions"]) >= 2:
                            return _validate_and_format_questions(parsed["questions"])
                        else:
                            print(f"[GEMINI PARSE RETRY] Model {model} response could not be parsed as valid questions JSON.")
                else:
                    print(f"[GEMINI API ERROR {model}] HTTP {resp.status_code}: {resp.text}")
            except Exception as exc:
                print(f"[GEMINI EXCEPTION {model}] {exc}")

    return None


async def generate_coding_assignment(
    candidate_name: str,
    resume_text: str,
    course_title: str,
    course_description: str,
    user_id: Optional[str] = None,
    assignment_token: Optional[str] = None,
) -> List[Dict[str, Any]]:
    clean_resume = resume_text.strip() if resume_text else "General technical software development background."
    seed_token = f"{user_id or uuid.uuid4().hex[:6]}-{int(time.time())}"

    domain_topics = [
        "Dynamic Arrays, Two-Pointers, and Windowing",
        "Hash Mapping, Deduplication, and Frequency Tables",
        "String Token Parsing, Delimiters, and Stack Queues",
        "Interval Bounds, Sorting, and State Caching",
        "Recursion, Memoized Optimization, and Path Checks"
    ]
    focus_topic = random.choice(domain_topics)

    system_instruction = (
        "You are an AI Technical Interview Architect. "
        "Generate 2 original, personalized programming assessment problems for the candidate based on the course syllabus. "
        "Return STRICT valid JSON only."
    )

    prompt = f"""
Candidate: {candidate_name}
Target Syllabus Track: {course_title}
Job/Course Overview: {course_description}
Resume Summary: {clean_resume[:1800]}
Entropy Seed: {seed_token}
Algorithmic Focus: {focus_topic}

Generate EXACTLY 2 distinct coding challenges:
- Question 1: Practical Easy-Medium task based on track topics.
- Question 2: Algorithmic Medium task testing computational edge cases.

Return JSON in this exact structure:
{{
  "questions": [
    {{
      "id": "q1",
      "title": "Problem Title 1",
      "difficulty": "Easy",
      "category": "Domain Topic",
      "problem_statement": "Full description of task.",
      "constraints": ["1 <= len(data) <= 1000"],
      "function_name": "solution",
      "starter_code": "def solution(data):\\n    pass\\n",
      "public_test_cases": [
        {{"input": [1, 2], "expected_output": 3, "explanation": "Basic verification."}},
        {{"input": [0], "expected_output": 0, "explanation": "Boundary."}}
      ],
      "hidden_test_cases": [
        {{"input": [], "expected_output": 0, "hidden_state_reason": "Empty state."}},
        {{"input": [-1], "expected_output": -1, "hidden_state_reason": "Negative value."}}
      ]
    }},
    {{
      "id": "q2",
      "title": "Problem Title 2",
      "difficulty": "Medium",
      "category": "Domain Topic",
      "problem_statement": "Full description of task.",
      "constraints": ["1 <= len(data) <= 10^5"],
      "function_name": "solution",
      "starter_code": "def solution(data):\\n    pass\\n",
      "public_test_cases": [
        {{"input": [4, 5], "expected_output": 9, "explanation": "Sample execution."}},
        {{"input": [1], "expected_output": 1, "explanation": "Base case."}}
      ],
      "hidden_test_cases": [
        {{"input": [0, 0], "expected_output": 0, "hidden_state_reason": "Zero edge case."}},
        {{"input": [-5, 5], "expected_output": 0, "hidden_state_reason": "Cancellation."}}
      ]
    }}
  ]
}}
"""

    # Primary Attempt
    questions = await _call_gemini_api(prompt, system_instruction)
    if questions:
        print(f"[AI GENERATION] Successfully generated coding challenge via Gemini for {candidate_name}.")
        return questions

    # Second Attempt (Immediate retry)
    print(f"[AI GENERATION] Retrying Gemini API call for {candidate_name}...")
    questions = await _call_gemini_api(prompt, system_instruction)
    if questions:
        return questions

    # Resilient Fallback: Ensure candidate is never locked out due to network timeouts or quota exhaustion
    print(f"[AI GENERATION FALLBACK] Providing curated course challenges for track '{course_title}' to candidate {candidate_name}.")
    return [
        {
            "id": "q1",
            "title": f"Data Token Scope Validator ({course_title[:24]})",
            "difficulty": "Easy",
            "category": "Data Parsing & Stack",
            "problem_statement": "Given a string `data` containing delimiters '()', '[]', and '{}', return True if the brackets are balanced and closed in the correct order, otherwise return False.",
            "constraints": ["1 <= len(data) <= 10^4", "data contains only brackets '()[]{}'"],
            "function_name": "solution",
            "starter_code": "def solution(data):\n    # Write your solution here\n    pass\n",
            "public_test_cases": [
                {"input": "()[]{}", "expected_output": True, "explanation": "All bracket pairs are balanced."},
                {"input": "(]", "expected_output": False, "explanation": "Mismatched bracket pair."}
            ],
            "hidden_test_cases": [
                {"input": "", "expected_output": True, "hidden_state_reason": "Empty string is balanced."},
                {"input": "([{}])", "expected_output": True, "hidden_state_reason": "Properly nested structure."},
                {"input": "((((", "expected_output": False, "hidden_state_reason": "Unclosed openers."}
            ]
        },
        {
            "id": "q2",
            "title": f"Target State Index Pair Resolver ({course_title[:24]})",
            "difficulty": "Medium",
            "category": "Optimization & Search",
            "problem_statement": "Given a list `data` formatted as `[nums_list, target_int]`, find the 0-indexed positions of two numbers in `nums_list` that add up to `target_int`. Return the two indices sorted in ascending order `[idx1, idx2]`. If no pair exists, return `[]`.",
            "constraints": ["2 <= len(nums_list) <= 10^5", "Exact match index pair or empty list"],
            "function_name": "solution",
            "starter_code": "def solution(data):\n    # data is [nums_list, target_int]\n    # Write your solution here\n    pass\n",
            "public_test_cases": [
                {"input": [[2, 7, 11, 15], 9], "expected_output": [0, 1], "explanation": "2 + 7 = 9 at indices 0 and 1."},
                {"input": [[3, 2, 4], 6], "expected_output": [1, 2], "explanation": "2 + 4 = 6 at indices 1 and 2."}
            ],
            "hidden_test_cases": [
                {"input": [[3, 3], 6], "expected_output": [0, 1], "hidden_state_reason": "Duplicate values summing to target."},
                {"input": [[1, 2, 3], 10], "expected_output": [], "hidden_state_reason": "No pair sums to target."}
            ]
        }
    ]


async def generate_ai_submission_review(
    course_title: str,
    candidate_name: str,
    detailed_results: List[Dict[str, Any]]
) -> Dict[str, Any]:
    total_passed = sum(r.get("passed_tests", 0) for r in detailed_results)
    total_tests = sum(r.get("total_tests", 0) for r in detailed_results)
    pass_pct = round((total_passed / total_tests * 100) if total_tests > 0 else 0, 1)
    is_selected = pass_pct >= 50.0

    system_instruction = "You are a Senior Technical Reviewer. Return strictly valid JSON."
    prompt = f"""
Candidate: {candidate_name}
Target Course Track: {course_title}
Assessment Score: {pass_pct}% ({total_passed}/{total_tests} test cases passed)
Interview Cutoff: 50%

CRITICAL SELECTION POLICY:
- If Assessment Score is >= 50%, the candidate IS SELECTED for the next AI Interview process.
- If Assessment Score is < 50%, the candidate is NOT SELECTED.

Per-Question Execution Results:
{json.dumps(detailed_results, indent=2)}

Provide a concise technical code review. Return this exact JSON format:
{{
  "verdict": "{"Selected for Next AI Interview Round" if is_selected else "Not Selected - Score Below 50%"}",
  "selected_for_interview": {str(is_selected).lower()},
  "technical_feedback": "Summary of algorithm implementation, code readability, and interview readiness.",
  "strengths": ["Item 1", "Item 2"],
  "areas_for_growth": ["Item 1", "Item 2"]
}}
"""

    key = _get_api_key()
    if key:
        models = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-1.5-flash"]
        for model in models:
            try:
                async with httpx.AsyncClient(timeout=25.0) as client:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
                    resp = await client.post(url, json={
                        "contents": [{"parts": [{"text": f"{system_instruction}\n\n{prompt}"}]}],
                        "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"}
                    })
                    if resp.status_code == 200:
                        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                        parsed = _extract_json_from_text(text)
                        if parsed and "verdict" in parsed:
                            parsed["selected_for_interview"] = is_selected
                            return parsed
            except Exception as e:
                print(f"[AI REVIEW EXCEPTION {model}]: {e}")

    verdict = "Selected for Next AI Interview Round" if is_selected else "Not Selected - Score Below 50%"
    feedback = (
        f"Congratulations! Candidate completed {total_passed} of {total_tests} test cases ({pass_pct}%), exceeding the 50% threshold. Candidate is selected to advance to the next AI Interview process."
        if is_selected
        else f"Candidate completed {total_passed} of {total_tests} test cases ({pass_pct}%). A minimum score of 50% is required to advance to the next AI Interview process."
    )
    return {
        "verdict": verdict,
        "selected_for_interview": is_selected,
        "technical_feedback": feedback,
        "strengths": ["Test execution structure", "Functional accuracy"],
        "areas_for_growth": ["Boundary value handling", "Algorithmic complexity"]
    }


generate_coding_assignment_with_ai = generate_coding_assignment
generate_coding_assignment_with_ollama = generate_coding_assignment