import os
import re
import json
import httpx
from typing import Dict, Any, List, Optional
from fastapi import HTTPException

# AI Model Configurations
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
OLLAMA_HOST = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")


def _extract_json_from_text(raw_text: str) -> Optional[Dict[str, Any]]:
    """
    Extracts a JSON object from raw LLM text, handling markdown blocks and conversational preambles.
    """
    if not raw_text:
        return None

    cleaned = raw_text.strip()

    # Try 1: Markdown ```json code block
    json_block_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
    if json_block_match:
        try:
            return json.loads(json_block_match.group(1).strip())
        except Exception:
            pass

    # Try 2: Finding outermost { ... }
    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        try:
            return json.loads(cleaned[first_brace:last_brace + 1])
        except Exception:
            pass

    # Try 3: Direct parse
    try:
        return json.loads(cleaned)
    except Exception:
        return None


def _validate_and_format_questions(questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Validates that the AI-generated questions contain all required fields and test cases.
    """
    formatted = []
    for idx, q in enumerate(questions[:2], start=1):
        q_id = f"q{idx}"
        formatted.append({
            "id": q_id,
            "title": str(q.get("title", f"Coding Challenge {idx}")),
            "difficulty": str(q.get("difficulty", "Easy" if idx == 1 else "Medium")),
            "category": str(q.get("category", "Problem Solving")),
            "problem_statement": str(q.get("problem_statement", "")),
            "constraints": list(q.get("constraints", ["1 <= len(input) <= 10^4"])),
            "function_name": "solution",
            "starter_code": str(q.get("starter_code", "def solution(data):\n    # Write your solution here\n    pass\n")),
            "public_test_cases": list(q.get("public_test_cases", [])),
            "hidden_test_cases": list(q.get("hidden_test_cases", []))
        })
    return formatted


async def _call_gemini(prompt: str, system_instruction: str) -> Optional[List[Dict[str, Any]]]:
    """Generates assignment questions using Google Gemini API."""
    key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not key:
        return None

    models = ["gemini-2.0-flash", "gemini-1.5-flash"]
    async with httpx.AsyncClient(timeout=45.0) as client:
        for model in models:
            url = f"[https://generativelanguage.googleapis.com/v1beta/models/](https://generativelanguage.googleapis.com/v1beta/models/){model}:generateContent?key={key}"
            payload = {
                "contents": [{"parts": [{"text": f"{system_instruction}\n\n{prompt}"}]}],
                "generationConfig": {"temperature": 0.3, "responseMimeType": "application/json"}
            }
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
            except Exception as e:
                print(f"[GEMINI GEN ERROR {model}]: {e}")
    return None


async def _call_groq(prompt: str, system_instruction: str) -> Optional[List[Dict[str, Any]]]:
    """Generates assignment questions using Groq API."""
    key = os.getenv("GROQ_API_KEY")
    if not key:
        return None

    url = "[https://api.groq.com/openai/v1/chat/completions](https://api.groq.com/openai/v1/chat/completions)"
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "response_format": {"type": "json_object"}
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                parsed = _extract_json_from_text(content)
                if parsed and "questions" in parsed and len(parsed["questions"]) >= 2:
                    return _validate_and_format_questions(parsed["questions"])
    except Exception as e:
        print(f"[GROQ GEN ERROR]: {e}")
    return None


async def _call_ollama(prompt: str, system_instruction: str) -> Optional[List[Dict[str, Any]]]:
    """Generates assignment questions using local Ollama with a reasonable timeout."""
    url = f"{OLLAMA_HOST}/api/generate"
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "system": system_instruction,
        "stream": False,
        "options": {
            "temperature": 0.3,
            "num_predict": 1000
        }
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                body = resp.json()
                raw_response = body.get("response", "")
                parsed = _extract_json_from_text(raw_response)
                if parsed and "questions" in parsed and len(parsed["questions"]) >= 2:
                    return _validate_and_format_questions(parsed["questions"])
    except Exception as e:
        print(f"[OLLAMA GEN NOTICE]: {e}")
    return None


def _generate_course_tailored_fallback_questions(
    course_title: str,
    candidate_name: str,
    resume_text: str
) -> List[Dict[str, Any]]:
    """
    Generates high-quality, course-tailored coding challenges immediately
    when cloud/local LLMs are slow, unavailable, or timing out.
    """
    title_lower = (course_title or "").lower()

    # 1. Machine Learning & Data Systems Track
    if "machine learning" in title_lower or "ml" in title_lower or "data" in title_lower:
        return [
            {
                "id": "q1",
                "title": "ML Pipeline: Outlier Threshold Filter",
                "difficulty": "Easy",
                "category": "Data Processing & Machine Learning",
                "problem_statement": (
                    f"Welcome {candidate_name}. You are implementing a feature preprocessing stage for an ML pipeline. "
                    "Given a list of numerical metric readings 'data' and a numeric cutoff 'threshold', "
                    "return a new list containing only readings strictly greater than or equal to 'threshold', "
                    "preserving their original order."
                ),
                "constraints": [
                    "0 <= len(data) <= 10^5",
                    "-10^6 <= data[i], threshold <= 10^6"
                ],
                "function_name": "solution",
                "starter_code": (
                    "def solution(data, threshold):\n"
                    "    # Write your solution here\n"
                    "    # Return list of values >= threshold\n"
                    "    pass\n"
                ),
                "public_test_cases": [
                    {
                        "input": [[12, 45, 67, 23, 89, 5], 40],
                        "expected_output": [45, 67, 89],
                        "explanation": "45, 67, and 89 are greater than or equal to 40."
                    },
                    {
                        "input": [[10, 20, 30], 25],
                        "expected_output": [30],
                        "explanation": "Only 30 is greater than or equal to 25."
                    }
                ],
                "hidden_test_cases": [
                    {
                        "input": [[], 10],
                        "expected_output": [],
                        "hidden_state_reason": "Empty input array edge case."
                    },
                    {
                        "input": [[5, -2, 0, 8, -10], 0],
                        "expected_output": [5, 0, 8],
                        "hidden_state_reason": "Negative values and zero boundary condition."
                    }
                ]
            },
            {
                "id": "q2",
                "title": "FastAPI High-Throughput Window Counter",
                "difficulty": "Medium",
                "category": "FastAPI & Algorithms",
                "problem_statement": (
                    "You are building a sliding window rate limiter / batching controller for high-throughput FastAPI inference endpoints. "
                    "Given a list of ascending request arrival timestamps (in seconds) 'timestamps' and an integer time window 'window_seconds', "
                    "compute the maximum number of requests that arrived within any time window of length 'window_seconds' (inclusive: t2 - t1 <= window_seconds)."
                ),
                "constraints": [
                    "0 <= len(timestamps) <= 10^5",
                    "timestamps is strictly sorted in ascending order",
                    "1 <= window_seconds <= 10^6"
                ],
                "function_name": "solution",
                "starter_code": (
                    "def solution(timestamps, window_seconds):\n"
                    "    # Write your solution here\n"
                    "    # Return the maximum request count in any window\n"
                    "    pass\n"
                ),
                "public_test_cases": [
                    {
                        "input": [[1, 2, 3, 4, 10, 20], 3],
                        "expected_output": 4,
                        "explanation": "Within window [1, 4], timestamps 1, 2, 3, 4 total 4 requests."
                    },
                    {
                        "input": [[1, 10, 20, 30], 5],
                        "expected_output": 1,
                        "explanation": "No two requests occur within 5 seconds of each other."
                    }
                ],
                "hidden_test_cases": [
                    {
                        "input": [[], 5],
                        "expected_output": 0,
                        "hidden_state_reason": "Empty input list returns 0."
                    },
                    {
                        "input": [[1, 2, 3, 4, 5], 10],
                        "expected_output": 5,
                        "hidden_state_reason": "All requests fit inside the window."
                    }
                ]
            }
        ]

    # 2. React / Frontend / Full-Stack Track
    elif "react" in title_lower or "frontend" in title_lower or "full-stack" in title_lower or "web" in title_lower:
        return [
            {
                "id": "q1",
                "title": "API Route Token Scope Validator",
                "difficulty": "Easy",
                "category": "FastAPI & Security",
                "problem_statement": (
                    f"Welcome {candidate_name}. When parsing structured authorization scopes in FastAPI and React headers, "
                    "nested delimiters '()', '[]', and '{}' must be validly balanced and ordered. "
                    "Given a string 'token', return True if the bracket characters are correctly balanced, and False otherwise."
                ),
                "constraints": [
                    "0 <= len(token) <= 10^5",
                    "token consists of parentheses, brackets, curly braces, and alphanumeric characters"
                ],
                "function_name": "solution",
                "starter_code": (
                    "def solution(token):\n"
                    "    # Write your solution here\n"
                    "    # Return boolean True or False\n"
                    "    pass\n"
                ),
                "public_test_cases": [
                    {
                        "input": "{[()]}",
                        "expected_output": True,
                        "explanation": "All brackets open and close in matching pairs and correct order."
                    },
                    {
                        "input": "{[(])}",
                        "expected_output": False,
                        "explanation": "Closing bracket ']' doesn't match preceding '('."
                    }
                ],
                "hidden_test_cases": [
                    {
                        "input": "",
                        "expected_output": True,
                        "hidden_state_reason": "Empty string is trivially balanced."
                    },
                    {
                        "input": "(((((",
                        "expected_output": False,
                        "hidden_state_reason": "Unclosed opening brackets."
                    }
                ]
            },
            {
                "id": "q2",
                "title": "Target State Index Pair Resolver",
                "difficulty": "Medium",
                "category": "Data Structures & State Management",
                "problem_statement": (
                    "In state optimization, you need to match two components whose combined workload equals a target capacity. "
                    "Given a list of integers 'nums' and an integer 'target', return the 0-based indices [i, j] (i < j) "
                    "of the two distinct elements such that nums[i] + nums[j] == target. "
                    "If no valid pair exists, return []."
                ),
                "constraints": [
                    "2 <= len(nums) <= 10^5",
                    "-10^9 <= nums[i], target <= 10^9"
                ],
                "function_name": "solution",
                "starter_code": (
                    "def solution(nums, target):\n"
                    "    # Write your solution here\n"
                    "    # Return [i, j] or []\n"
                    "    pass\n"
                ),
                "public_test_cases": [
                    {
                        "input": [[2, 7, 11, 15], 9],
                        "expected_output": [0, 1],
                        "explanation": "nums[0] + nums[1] = 2 + 7 = 9."
                    },
                    {
                        "input": [[3, 2, 4], 6],
                        "expected_output": [1, 2],
                        "explanation": "nums[1] + nums[2] = 2 + 4 = 6."
                    }
                ],
                "hidden_test_cases": [
                    {
                        "input": [[3, 3], 6],
                        "expected_output": [0, 1],
                        "hidden_state_reason": "Duplicate identical numbers forming the target sum."
                    },
                    {
                        "input": [[1, 2, 3], 10],
                        "expected_output": [],
                        "hidden_state_reason": "No valid pair exists edge case."
                    }
                ]
            }
        ]

    # 3. Default General Programming Track
    else:
        return [
            {
                "id": "q1",
                "title": "Element Frequency Counter",
                "difficulty": "Easy",
                "category": "Algorithms",
                "problem_statement": (
                    f"Welcome {candidate_name}. Given a list of items 'data', return a dictionary where keys are the unique items "
                    "and values are their corresponding frequency count."
                ),
                "constraints": ["0 <= len(data) <= 10^5"],
                "function_name": "solution",
                "starter_code": "def solution(data):\n    # Write your solution here\n    pass\n",
                "public_test_cases": [
                    {"input": ["a", "b", "a", "c", "b", "a"], "expected_output": {"a": 3, "b": 2, "c": 1}, "explanation": "'a' appears 3 times, 'b' twice, 'c' once."},
                    {"input": [1, 2, 2, 3], "expected_output": {1: 1, 2: 2, 3: 1}, "explanation": "2 appears twice."}
                ],
                "hidden_test_cases": [
                    {"input": [], "expected_output": {}, "hidden_state_reason": "Empty list produces empty dict."},
                    {"input": ["x"], "expected_output": {"x": 1}, "hidden_state_reason": "Single item edge case."}
                ]
            },
            {
                "id": "q2",
                "title": "Subarray Maximum Sum",
                "difficulty": "Medium",
                "category": "Dynamic Programming",
                "problem_statement": "Given an integer array 'nums', find the contiguous subarray with the largest sum, and return its sum.",
                "constraints": ["1 <= len(nums) <= 10^5", "-10^4 <= nums[i] <= 10^4"],
                "function_name": "solution",
                "starter_code": "def solution(nums):\n    # Write your solution here\n    pass\n",
                "public_test_cases": [
                    {"input": [-2, 1, -3, 4, -1, 2, 1, -5, 4], "expected_output": 6, "explanation": "The subarray [4, -1, 2, 1] has the largest sum 6."},
                    {"input": [1], "expected_output": 1, "explanation": "Single positive element."}
                ],
                "hidden_test_cases": [
                    {"input": [5, 4, -1, 7, 8], "expected_output": 23, "hidden_state_reason": "All positive values."},
                    {"input": [-1, -2, -3], "expected_output": -1, "hidden_state_reason": "All negative values."}
                ]
            }
        ]


async def generate_coding_assignment_with_ollama(
    candidate_name: str,
    resume_text: str,
    course_title: str,
    course_description: str
) -> List[Dict[str, Any]]:
    """
    Generates coding assessment questions dynamically based on the candidate's
    resume and course syllabus using Cloud AI (Gemini/Groq), local Ollama,
    or instant high-quality domain fallback if models are slow or unavailable.
    """
    clean_resume = resume_text.strip() if resume_text else "General Software Development background."

    system_instruction = (
        "You are an AI Technical Interview Architect. "
        "Analyze the candidate's resume background and target course syllabus, and dynamically generate "
        "EXACTLY 2 coding interview questions tailored specifically to test the candidate's capabilities "
        "for this specific course track. "
        "Strictly return valid JSON only."
    )

    prompt = f"""
Candidate Name: {candidate_name}
Target Course Track: {course_title}
Course Overview: {course_description}

Candidate Resume Summary:
{clean_resume[:2000]}

Generate EXACTLY 2 coding interview questions tailored specifically to this candidate's resume and this course track:
- Question 1: Easy-to-Medium problem directly relevant to the technologies in the resume and course.
- Question 2: Medium problem evaluating algorithmic logic and optimization for this course track.

MANDATORY RULES:
1. `function_name` must be "solution".
2. `public_test_cases`: Exactly 2 test cases with inputs, expected_output, and explanation.
   - For multi-argument functions, format `input` as a list of arguments e.g. `[arg1, arg2]`.
   - For single-argument functions, format `input` as that single argument.
3. `hidden_test_cases`: Exactly 2 hidden edge-case test cases (empty, boundary, negative, duplicates). Include `hidden_state_reason`.
4. Output MUST be valid JSON matching this schema:
{{
  "questions": [
    {{
      "id": "q1",
      "title": "Descriptive Problem Title based on Resume & Course",
      "difficulty": "Easy",
      "category": "Topic Name",
      "problem_statement": "Detailed problem statement grounded in candidate's skills and course track.",
      "constraints": ["Constraint 1", "Constraint 2"],
      "function_name": "solution",
      "starter_code": "def solution(data):\\n    # Write your solution here\\n    pass\\n",
      "public_test_cases": [
        {{"input": ..., "expected_output": ..., "explanation": "..."}},
        {{"input": ..., "expected_output": ..., "explanation": "..."}}
      ],
      "hidden_test_cases": [
        {{"input": ..., "expected_output": ..., "hidden_state_reason": "..."}},
        {{"input": ..., "expected_output": ..., "hidden_state_reason": "..."}}
      ]
    }},
    {{
      "id": "q2",
      "title": "Descriptive Problem Title based on Resume & Course",
      "difficulty": "Medium",
      "category": "Topic Name",
      "problem_statement": "Detailed problem statement.",
      "constraints": ["Constraint 1"],
      "function_name": "solution",
      "starter_code": "def solution(data):\\n    # Write your solution here\\n    pass\\n",
      "public_test_cases": [
        {{"input": ..., "expected_output": ..., "explanation": "..."}},
        {{"input": ..., "expected_output": ..., "explanation": "..."}}
      ],
      "hidden_test_cases": [
        {{"input": ..., "expected_output": ..., "hidden_state_reason": "..."}},
        {{"input": ..., "expected_output": ..., "hidden_state_reason": "..."}}
      ]
    }}
  ]
}}
"""

    # 1. Try Google Gemini (Fast cloud AI)
    gemini_res = await _call_gemini(prompt, system_instruction)
    if gemini_res:
        print("[AI QUESTION GEN] Successfully generated personalized questions using Google Gemini.")
        return gemini_res

    # 2. Try Groq (Fast cloud Llama 3)
    groq_res = await _call_groq(prompt, system_instruction)
    if groq_res:
        print("[AI QUESTION GEN] Successfully generated personalized questions using Groq.")
        return groq_res

    # 3. Try Local Ollama (with fast 8s timeout)
    ollama_res = await _call_ollama(prompt, system_instruction)
    if ollama_res:
        print("[AI QUESTION GEN] Successfully generated personalized questions using local Ollama.")
        return ollama_res

    # 4. Instant high-quality domain fallback
    print(f"[AI QUESTION GEN] Instant fallback generating curated challenges for: {course_title}")
    return _generate_course_tailored_fallback_questions(course_title, candidate_name, clean_resume)


generate_coding_assignment = generate_coding_assignment_with_ollama


async def generate_ai_submission_review(
    course_title: str,
    candidate_name: str,
    detailed_results: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Evaluates candidate's submitted solutions using AI to provide tailored technical feedback,
    strengths, and growth recommendations.
    """
    total_passed = sum(r.get("passed_tests", 0) for r in detailed_results)
    total_tests = sum(r.get("total_tests", 0) for r in detailed_results)
    pass_pct = round((total_passed / total_tests * 100) if total_tests > 0 else 0, 1)

    system_instruction = "You are a Senior Technical Reviewer. Return strictly valid JSON."
    prompt = f"""
Candidate: {candidate_name}
Target Course Track: {course_title}
Assessment Score: {pass_pct}% ({total_passed}/{total_tests} test cases passed)

Per-Question Execution Results:
{json.dumps(detailed_results, indent=2)}

Provide a concise technical code review for the candidate. Return this exact JSON format:
{{
  "verdict": "Strong Pass / Pass / Needs Improvement",
  "technical_feedback": "Summary of algorithm implementation and code readability.",
  "strengths": ["Item 1", "Item 2"],
  "areas_for_growth": ["Item 1", "Item 2"]
}}
"""

    # 1. Try Gemini
    key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if key:
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                url = f"[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=){key}"
                resp = await client.post(url, json={
                    "contents": [{"parts": [{"text": f"{system_instruction}\n\n{prompt}"}]}],
                    "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"}
                })
                if resp.status_code == 200:
                    text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = _extract_json_from_text(text)
                    if parsed and "verdict" in parsed:
                        return parsed
        except Exception:
            pass

    # 2. Try Groq
    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    "[https://api.groq.com/openai/v1/chat/completions](https://api.groq.com/openai/v1/chat/completions)",
                    headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": [{"role": "system", "content": system_instruction}, {"role": "user", "content": prompt}],
                        "response_format": {"type": "json_object"}
                    }
                )
                if resp.status_code == 200:
                    text = resp.json()["choices"][0]["message"]["content"]
                    parsed = _extract_json_from_text(text)
                    if parsed and "verdict" in parsed:
                        return parsed
        except Exception:
            pass

    # 3. Try Ollama
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                f"{OLLAMA_HOST}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "system": system_instruction,
                    "stream": False,
                    "options": {"temperature": 0.2, "num_predict": 400}
                }
            )
            if resp.status_code == 200:
                raw = resp.json().get("response", "{}")
                parsed = _extract_json_from_text(raw)
                if parsed and "verdict" in parsed:
                    return parsed
    except Exception:
        pass

    # Basic score-derived summary fallback
    verdict = "Strong Pass" if pass_pct >= 85 else ("Pass" if pass_pct >= 50 else "Needs Improvement")
    return {
        "verdict": verdict,
        "technical_feedback": (
            f"Candidate completed {total_passed} of {total_tests} test cases ({pass_pct}%) for {course_title}. "
            f"Solutions evaluated across both public and hidden edge case states."
        ),
        "strengths": [
            f"Problem comprehension for {course_title}",
            "Logic implementation against public test suites"
        ],
        "areas_for_growth": [
            "Hidden state edge cases & boundary handling",
            "Runtime complexity optimization"
        ]
    }