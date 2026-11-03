import os
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, FileResponse

router = APIRouter()

STATIC_DOWNLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "static" / "downloads"
EXE_FILE_PATH = STATIC_DOWNLOADS_DIR / "AIAssignmentSetup.exe"


@router.get("/download/app")
async def download_assignment_app():
    """
    Downloads the official AI Coding Assessment Desktop Application installer (.exe).
    """
    if not EXE_FILE_PATH.exists():
        raise HTTPException(status_code=404, detail="AI Assignment desktop application setup is currently being prepared.")

    return FileResponse(
        path=str(EXE_FILE_PATH),
        filename="AIAssignmentSetup.exe",
        media_type="application/vnd.microsoft.portable-executable",
        headers={"Content-Disposition": 'attachment; filename="AIAssignmentSetup.exe"'}
    )


@router.get("/app/launch/{assignment_token}", response_class=HTMLResponse)
async def launch_assessment_window(assignment_token: str):
    """
    Renders the AI coding assignment directly in the browser window.
    No Microsoft Word or raw text config files are opened.
    """
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Assessment Portal</title>
        <style>
            * {{ box-sizing: border-box; margin: 0; padding: 0; }}
            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; height: 100vh; overflow: hidden; }}
            .container {{ display: flex; height: 100vh; flex-direction: column; }}
            header {{ padding: 14px 24px; background: #1e293b; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; }}
            .title {{ font-size: 18px; font-weight: 600; color: #38bdf8; }}
            .workspace {{ display: flex; flex: 1; height: calc(100vh - 60px); }}
            .panel-left {{ width: 45%; border-right: 1px solid #334155; padding: 20px; overflow-y: auto; background: #0f172a; }}
            .panel-right {{ width: 55%; display: flex; flex-direction: column; background: #1e293b; }}
            .editor-area {{ flex: 1; display: flex; flex-direction: column; padding: 12px; }}
            textarea {{ width: 100%; height: 100%; background: #090d16; color: #e2e8f0; font-family: monospace; font-size: 14px; padding: 14px; border: 1px solid #334155; border-radius: 6px; resize: none; }}
            .actions {{ padding: 12px 16px; background: #1e293b; border-top: 1px solid #334155; display: flex; justify-content: flex-end; gap: 10px; }}
            .btn {{ padding: 8px 18px; border-radius: 6px; border: none; font-weight: 600; cursor: pointer; }}
            .btn-run {{ background: #0284c7; color: white; }}
            .btn-submit {{ background: #16a34a; color: white; }}
            .console {{ height: 180px; background: #090d16; border-top: 1px solid #334155; padding: 12px; font-family: monospace; font-size: 13px; overflow-y: auto; }}
            .auth-modal {{ position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 100; }}
            .auth-box {{ background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 28px; width: 380px; text-align: center; }}
            .auth-box input {{ width: 100%; padding: 10px; margin: 10px 0; background: #0f172a; border: 1px solid #334155; color: white; border-radius: 6px; }}
            .badge {{ display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; background: #0369a1; color: #e0f2fe; margin-bottom: 12px; }}
        </style>
    </head>
    <body>
        <div id="authModal" class="auth-modal">
            <div class="auth-box">
                <h3 style="color:#38bdf8; margin-bottom: 8px;">Candidate Verification</h3>
                <p style="font-size: 13px; color: #94a3b8; margin-bottom: 16px;">Enter your invitation email & Exam Code to start.</p>
                <input id="usernameInput" type="email" placeholder="Your Registered Email" required />
                <input id="uniqueCodeInput" type="text" placeholder="Unique Exam Code" required />
                <button class="btn btn-run" style="width: 100%; margin-top: 8px;" onclick="unlockAssessment()">Begin Assignment</button>
                <p id="authError" style="color: #f87171; font-size: 13px; margin-top: 10px; display: none;"></p>
            </div>
        </div>

        <div class="container">
            <header>
                <div class="title" id="courseTitle">AI Coding Assessment</div>
                <div id="candidateDisplay" style="color: #94a3b8; font-size: 14px;"></div>
            </header>
            <div class="workspace">
                <div class="panel-left">
                    <span class="badge" id="diffBadge">Loading...</span>
                    <h2 id="qTitle" style="margin-bottom: 14px; font-size: 20px;">Fetching Question...</h2>
                    <div id="qStatement" style="font-size: 14px; line-height: 1.6; color: #cbd5e1;"></div>
                </div>
                <div class="panel-right">
                    <div class="editor-area">
                        <textarea id="codeEditor" spellcheck="false" placeholder="# Write your solution here..."></textarea>
                    </div>
                    <div class="console" id="consoleOutput">> Output logs and test results will appear here.</div>
                    <div class="actions">
                        <button class="btn btn-run" onclick="runTests()">Run Tests</button>
                        <button class="btn btn-submit" onclick="submitCode()">Submit Assignment</button>
                    </div>
                </div>
            </div>
        </div>

        <script>
            const token = "{assignment_token}";
            let currentQuestion = null;
            let currentUsername = "";
            let currentCode = "";

            async function unlockAssessment() {{
                currentUsername = document.getElementById("usernameInput").value.trim();
                currentCode = document.getElementById("uniqueCodeInput").value.trim();
                const errElem = document.getElementById("authError");

                try {{
                    const res = await fetch(`/${{token}}?username=${{encodeURIComponent(currentUsername)}}&unique_code=${{encodeURIComponent(currentCode)}}&from_app=true`);
                    const data = await res.json();
                    
                    if (!res.ok || data.locked) {{
                        errElem.innerText = data.lock_message || data.detail || "Authentication failed.";
                        errElem.style.display = "block";
                        return;
                    }}

                    document.getElementById("authModal").style.display = "none";
                    document.getElementById("courseTitle").innerText = data.course_title;
                    document.getElementById("candidateDisplay").innerText = `${{data.candidate_name}} (${{data.candidate_email}})`;
                    
                    if (data.questions && data.questions.length > 0) {{
                        currentQuestion = data.questions[0];
                        document.getElementById("qTitle").innerText = currentQuestion.title;
                        document.getElementById("diffBadge").innerText = currentQuestion.difficulty;
                        document.getElementById("qStatement").innerText = currentQuestion.problem_statement;
                        document.getElementById("codeEditor").value = currentQuestion.starter_code || "def solution(data):\\n    pass\\n";
                    }}
                }} catch (e) {{
                    errElem.innerText = "Error loading assignment. Please check server status.";
                    errElem.style.display = "block";
                }}
            }}

            async function runTests() {{
                if (!currentQuestion) return;
                const consoleElem = document.getElementById("consoleOutput");
                consoleElem.innerText = "> Running test cases against sandbox...";

                const payload = {{
                    question_id: currentQuestion.id,
                    code: document.getElementById("codeEditor").value,
                    language: "python"
                }};

                const res = await fetch(`/${{token}}/run-tests`, {{
                    method: "POST",
                    headers: {{ "Content-Type": "application/json" }},
                    body: JSON.stringify(payload)
                }});
                const data = await res.json();
                consoleElem.innerText = `> Passed: ${{data.passed_tests}} / ${{data.total_tests}}\\n` + 
                    (data.compile_error ? `Error: ${{data.compile_error}}\\n` : "") +
                    (data.stdout ? `Stdout: ${{data.stdout}}` : "");
            }}

            async function submitCode() {{
                if (!currentQuestion) return;
                const consoleElem = document.getElementById("consoleOutput");
                consoleElem.innerText = "> Submitting and triggering AI review...";

                const payload = {{
                    submissions: [{{
                        question_id: currentQuestion.id,
                        code: document.getElementById("codeEditor").value,
                        language: "python"
                    }}]
                }};

                const res = await fetch(`/${{token}}/submit`, {{
                    method: "POST",
                    headers: {{ "Content-Type": "application/json" }},
                    body: JSON.stringify(payload)
                }});
                const data = await res.json();
                consoleElem.innerText = `> Final Score: ${{data.score}}%\\n> Review: ${{data.ai_review ? data.ai_review.technical_feedback : "Evaluation completed."}}`;
            }}
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)
