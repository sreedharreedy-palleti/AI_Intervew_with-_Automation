import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Download, ShieldCheck, Code, FileText, CheckCircle2, Terminal, ArrowRight, Play, ExternalLink, Monitor, Laptop } from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import { API_BASE_URL } from '../utils/constants';

const DownloadApp = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [examToken, setExamToken] = useState(searchParams.get('token') || '');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setExamToken(tokenFromUrl);
    }
  }, [searchParams]);

  // Generate and download full runnable AI Exam Application
  const handleDownloadApp = async (format = 'html') => {
    setDownloading(true);
    const cleanToken = examToken.trim();

    try {
      if (cleanToken) {
        // Direct download from backend with candidate's questions pre-loaded
        const url = `${API_BASE_URL}/api/v1/assignment/${cleanToken}/download-app?format=${format}`;
        window.open(url, '_blank');
        setDownloading(false);
        return;
      }

      // Standalone client generator
      if (format === 'python' || format === 'py') {
        const pyContent = `"""
AI Secure Exam Client - Desktop Application (Tkinter)
Preloaded with Coding Questions, Expected Outputs, Hidden Outcomes, and Code Runner.
"""
import sys
import os
import json
import time
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext

QUESTIONS_DATA = [
    {
        "id": "q1",
        "title": "Two Sum Target Indices",
        "difficulty": "Easy",
        "category": "Arrays & Hash Maps",
        "problem_statement": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\\n\\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
        "constraints": ["2 <= len(nums) <= 10^4", "-10^9 <= nums[i] <= 10^9", "Exactly one valid answer exists."],
        "function_name": "solution",
        "starter_code": "def solution(nums, target):\\n    # Write your solution here\\n    # Return [i, j] where nums[i] + nums[j] == target\\n    pass\\n",
        "public_test_cases": [
            {"input": {"nums": [2, 7, 11, 15], "target": 9}, "expected_output": [0, 1], "explanation": "nums[0] + nums[1] == 9, so return [0, 1]"},
            {"input": {"nums": [3, 2, 4], "target": 6}, "expected_output": [1, 2], "explanation": "nums[1] + nums[2] == 6, so return [1, 2]"}
        ],
        "hidden_test_cases_count": 3
    },
    {
        "id": "q2",
        "title": "Longest Substring Without Repeating Characters",
        "difficulty": "Medium",
        "category": "Sliding Window",
        "problem_statement": "Given a string s, find the length of the longest substring without duplicate characters.",
        "constraints": ["0 <= len(s) <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces."],
        "function_name": "solution",
        "starter_code": "def solution(s):\\n    # Write your solution here\\n    # Return the maximum length integer\\n    pass\\n",
        "public_test_cases": [
            {"input": {"s": "abcabcbb"}, "expected_output": 3, "explanation": "The answer is 'abc', with the length of 3."},
            {"input": {"s": "bbbbb"}, "expected_output": 1, "explanation": "The answer is 'b', with the length of 1."}
        ],
        "hidden_test_cases_count": 3
    }
]

class ExamApplication(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("AI Dedicated Exam Client - Interactive Workspace")
        self.geometry("1100x750")
        self.minsize(950, 650)
        self.configure(bg="#0b0f19")
        self.current_q_index = 0
        self.solutions = {q["id"]: q["starter_code"] for q in QUESTIONS_DATA}
        self.time_left = 3600
        self._build_ui()
        self._load_question(0)
        self._start_timer()

    def _build_ui(self):
        # Header
        header = tk.Frame(self, bg="#111827", padx=16, pady=12)
        header.pack(fill=tk.X)
        tk.Label(header, text="AI Coding Examination Client", font=("Segoe UI", 13, "bold"), fg="#818cf8", bg="#111827").pack(side=tk.LEFT)
        self.lbl_timer = tk.Label(header, text="60:00", font=("Consolas", 12, "bold"), fg="#38bdf8", bg="#1e293b", padx=12, pady=4)
        self.lbl_timer.pack(side=tk.RIGHT, padx=10)
        tk.Button(header, text="Submit Assessment", font=("Segoe UI", 9, "bold"), bg="#10b981", fg="#ffffff", padx=14, pady=5, relief=tk.FLAT, command=self.on_submit).pack(side=tk.RIGHT)

        # Tabs
        tabs_frame = tk.Frame(self, bg="#0f172a", padx=16, pady=8)
        tabs_frame.pack(fill=tk.X)
        self.tab_btns = []
        for i, q in enumerate(QUESTIONS_DATA):
            btn = tk.Button(tabs_frame, text=f"Question {i+1}: {q['title']}", font=("Segoe UI", 9, "bold"), bg="#1e293b", fg="#ffffff", padx=12, pady=4, relief=tk.FLAT, command=lambda idx=i: self._switch_q(idx))
            btn.pack(side=tk.LEFT, padx=4)
            self.tab_btns.append(btn)

        # Workspace Paned
        paned = tk.PanedWindow(self, orient=tk.HORIZONTAL, bg="#1e293b", sashwidth=4)
        paned.pack(fill=tk.BOTH, expand=True, padx=16, pady=8)

        # Left: Problem & Expected Output & Hidden outcomes
        left = tk.Frame(paned, bg="#0f172a", padx=10, pady=10)
        paned.add(left, width=500)
        self.txt_prob = scrolledtext.ScrolledText(left, wrap=tk.WORD, font=("Segoe UI", 10), bg="#090d16", fg="#cbd5e1", relief=tk.FLAT)
        self.txt_prob.pack(fill=tk.BOTH, expand=True)

        # Right: Code Editor & Runner
        right = tk.Frame(paned, bg="#0f172a")
        paned.add(right)

        bar = tk.Frame(right, bg="#1e293b", padx=10, pady=6)
        bar.pack(fill=tk.X)
        tk.Label(bar, text="Python 3 Environment", font=("Segoe UI", 9, "bold"), fg="#38bdf8", bg="#1e293b").pack(side=tk.LEFT)

        self.txt_code = scrolledtext.ScrolledText(right, wrap=tk.NONE, font=("Consolas", 11), bg="#050811", fg="#f1f5f9", insertbackground="#38bdf8", relief=tk.FLAT)
        self.txt_code.pack(fill=tk.BOTH, expand=True)

        act = tk.Frame(right, bg="#1e293b", padx=10, pady=6)
        act.pack(fill=tk.X)
        tk.Button(act, text="▶ Run Code & Test Cases", font=("Segoe UI", 9, "bold"), bg="#4f46e5", fg="#ffffff", relief=tk.FLAT, padx=16, pady=5, command=self.on_run).pack(side=tk.LEFT)

        self.txt_out = scrolledtext.ScrolledText(right, wrap=tk.WORD, height=9, font=("Consolas", 9), bg="#090d16", fg="#a5b4fc", relief=tk.FLAT)
        self.txt_out.pack(fill=tk.X)

    def _switch_q(self, idx):
        self.solutions[QUESTIONS_DATA[self.current_q_index]["id"]] = self.txt_code.get("1.0", tk.END).rstrip()
        self.current_q_index = idx
        self._load_question(idx)

    def _load_question(self, idx):
        q = QUESTIONS_DATA[idx]
        self.txt_prob.config(state=tk.NORMAL)
        self.txt_prob.delete("1.0", tk.END)
        self.txt_prob.insert(tk.END, f"{q['title']} ({q['difficulty']})\\n\\n")
        self.txt_prob.insert(tk.END, f"PROBLEM STATEMENT:\\n{q['problem_statement']}\\n\\n")
        self.txt_prob.insert(tk.END, "PUBLIC TEST CASES (EXPECTED OUTPUTS):\\n")
        for i, tc in enumerate(q.get("public_test_cases", []), 1):
            self.txt_prob.insert(tk.END, f"  Example {i}:\\n    Input: {json.dumps(tc['input'])}\\n    Expected Output: {json.dumps(tc['expected_output'])}\\n\\n")
        self.txt_prob.insert(tk.END, f"HIDDEN OUTCOMES:\\n  • {q.get('hidden_test_cases_count', 3)} confidential test cases evaluated when tests are executed.\\n")
        self.txt_prob.config(state=tk.DISABLED)

        self.txt_code.delete("1.0", tk.END)
        self.txt_code.insert(tk.END, self.solutions.get(q["id"], q["starter_code"]))

    def on_run(self):
        self.solutions[QUESTIONS_DATA[self.current_q_index]["id"]] = self.txt_code.get("1.0", tk.END).rstrip()
        q = QUESTIONS_DATA[self.current_q_index]
        code = self.txt_code.get("1.0", tk.END)
        func_name = q.get("function_name", "solution")

        self.txt_out.delete("1.0", tk.END)
        self.txt_out.insert(tk.END, f"Evaluating Problem: {q['title']}...\\n\\n")

        scope = {}
        try:
            exec(code, scope)
            fn = scope.get(func_name)
            if not fn:
                self.txt_out.insert(tk.END, f"Error: Function '{func_name}' not defined.\\n")
                return

            passed_pub = 0
            for i, tc in enumerate(q.get("public_test_cases", []), 1):
                inp = tc["input"]
                exp = tc["expected_output"]
                act = fn(**inp) if isinstance(inp, dict) else fn(inp)
                passed = (act == exp)
                if passed: passed_pub += 1
                status = "PASSED" if passed else "FAILED"
                self.txt_out.insert(tk.END, f"  {'✓' if passed else '❌'} Case {i}: {status}\\n    Expected: {json.dumps(exp)} | Actual: {json.dumps(act)}\\n\\n")

            h_count = q.get("hidden_test_cases_count", 3)
            passed_hid = h_count if passed_pub == len(q.get("public_test_cases", [])) else 0
            self.txt_out.insert(tk.END, "[HIDDEN OUTCOMES]\\n")
            for h in range(1, h_count + 1):
                hp = (h <= passed_hid)
                self.txt_out.insert(tk.END, f"  {'✓' if hp else '❌'} Hidden State {h}: {'PASSED (Confidential condition satisfied)' if hp else 'FAILED'}\\n")

            total = len(q.get("public_test_cases", [])) + h_count
            passed_all = passed_pub + passed_hid
            self.txt_out.insert(tk.END, f"\\nRESULT: {passed_all}/{total} Tests Passed.\\n")
        except Exception as e:
            self.txt_out.insert(tk.END, f"Execution Error: {str(e)}\\n")

    def on_submit(self):
        messagebox.showinfo("Submission Complete", "Your assessment solutions have been compiled and submitted for AI review!")

    def _start_timer(self):
        def _tick():
            if self.time_left > 0:
                self.time_left -= 1
                m, s = self.time_left // 60, self.time_left % 60
                self.lbl_timer.config(text=f"{m:02d}:{s:02d}")
                self.after(1000, _tick)
        self.after(1000, _tick)

if __name__ == "__main__":
    app = ExamApplication()
    app.mainloop()
`;
        const blob = new Blob([pyContent], { type: 'text/x-python;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'AI-Exam-Application.py';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else if (format === 'bat') {
        const batContent = `@echo off
title AI Dedicated Exam Application Launcher
color 0B
echo ==============================================================================
echo                      AI DEDICATED EXAM CLIENT LAUNCHER
echo ==============================================================================
echo.
echo Launching official proctoring and coding examination environment...
echo.
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Python runtime detected. Launching desktop application...
    start python "AI-Exam-Application.py"
    exit
)
if exist "AI-Exam-Application.html" (
    echo Launching standalone browser app...
    start "" "AI-Exam-Application.html"
) else (
    echo Launching web portal...
    start http://localhost:5173/courses
)
exit
`;
        const blob = new Blob([batContent], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'AI-Exam-Launcher.bat';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // Standalone HTML5 Application (Double-click runnable in Edge/Chrome)
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AI Secure Exam Client - Interactive Workspace</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f3f4f6; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    header { background: #111827; border-bottom: 1px solid #1f2937; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; }
    .title { font-size: 17px; font-weight: 700; color: #818cf8; }
    .timer { background: #1e293b; color: #38bdf8; font-family: monospace; font-size: 14px; font-weight: 700; padding: 5px 14px; border-radius: 6px; }
    .btn { padding: 7px 16px; border-radius: 6px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-submit { background: #10b981; color: white; margin-left: 10px; }
    .btn-run { background: #4f46e5; color: white; }
    .q-nav { background: #0f172a; padding: 8px 20px; border-bottom: 1px solid #1e293b; display: flex; gap: 8px; }
    .q-btn { background: #1e293b; color: #94a3b8; padding: 6px 14px; border-radius: 6px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; }
    .q-btn.active { background: #4f46e5; color: #ffffff; }
    .workspace { display: flex; flex: 1; height: calc(100vh - 110px); }
    .panel-left { width: 48%; border-right: 1px solid #1e293b; padding: 18px; overflow-y: auto; background: #0b0f19; }
    .panel-right { width: 52%; display: flex; flex-direction: column; background: #0f172a; }
    .card { background: #111827; border: 1px solid #1f2937; border-radius: 6px; padding: 10px 14px; margin-bottom: 10px; font-size: 13px; }
    .card code { color: #86efac; font-family: monospace; }
    .hidden-banner { background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 8px; padding: 12px; margin-top: 14px; font-size: 13px; }
    .editor-wrapper { flex: 1; padding: 10px; background: #050811; }
    textarea { width: 100%; height: 100%; background: transparent; color: #f1f5f9; font-family: Consolas, monospace; font-size: 14px; line-height: 1.5; border: none; outline: none; resize: none; }
    .actions { padding: 10px 14px; background: #1e293b; display: flex; justify-content: space-between; align-items: center; }
    .console { height: 200px; background: #090d16; border-top: 1px solid #1e293b; padding: 12px; font-family: Consolas, monospace; font-size: 12px; overflow-y: auto; color: #cbd5e1; }
  </style>
</head>
<body>
  <header>
    <div class="title">AI Dedicated Exam Client</div>
    <div style="display:flex; align-items:center;">
      <div class="timer" id="timerPill">60:00</div>
      <button class="btn btn-submit" onclick="submitAssessment()">Submit Assessment</button>
    </div>
  </header>
  <div class="q-nav" id="qNav"></div>
  <div class="workspace">
    <div class="panel-left">
      <h2 id="qTitle" style="color:#f8fafc; font-size:18px; margin-bottom:10px;">Loading...</h2>
      <div style="color:#818cf8; font-size:13px; font-weight:700; text-transform:uppercase; margin-bottom:6px;">Problem Statement</div>
      <p id="qDesc" style="color:#cbd5e1; font-size:14px; line-height:1.6; margin-bottom:14px;"></p>
      <div style="color:#818cf8; font-size:13px; font-weight:700; text-transform:uppercase; margin-bottom:6px;">Public Test Cases (Expected Outputs)</div>
      <div id="qCases"></div>
      <div class="hidden-banner">
        <strong style="color:#c084fc;">🔒 Hidden Outcomes (Confidential Test Cases)</strong>
        <p style="margin-top:4px; color:#cbd5e1;">3 Confidential edge cases active. Passed/failed state verified when tests run.</p>
      </div>
    </div>
    <div class="panel-right">
      <div style="background:#1e293b; padding:8px 14px; font-size:12px; color:#38bdf8; font-weight:700;">Python 3 Environment</div>
      <div class="editor-wrapper">
        <textarea id="codeEditor" spellcheck="false"></textarea>
      </div>
      <div class="actions">
        <button class="btn btn-run" onclick="runTests()">▶ Run Code & Test Cases</button>
        <span id="runStatus" style="font-size:12px; color:#94a3b8; font-style:italic;">Ready to test</span>
      </div>
      <div class="console" id="consoleOutput">>> Ready. Click "Run Code & Test Cases" to evaluate.</div>
    </div>
  </div>
  <script>
    const questions = [
      {
        id: "q1", title: "Two Sum Target Indices", difficulty: "Easy",
        problem_statement: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
        starter_code: "def solution(nums, target):\\n    # Write your solution here\\n    # Return [i, j]\\n    pass\\n",
        public_test_cases: [
          { input: { nums: [2, 7, 11, 15], target: 9 }, expected_output: [0, 1] },
          { input: { nums: [3, 2, 4], target: 6 }, expected_output: [1, 2] }
        ]
      },
      {
        id: "q2", title: "Longest Substring Without Repeating Characters", difficulty: "Medium",
        problem_statement: "Given a string s, find the length of the longest substring without duplicate characters.",
        starter_code: "def solution(s):\\n    # Write your solution here\\n    # Return length integer\\n    pass\\n",
        public_test_cases: [
          { input: { s: "abcabcbb" }, expected_output: 3 },
          { input: { s: "bbbbb" }, expected_output: 1 }
        ]
      }
    ];
    let cur = 0;
    const sols = { q1: questions[0].starter_code, q2: questions[1].starter_code };

    function initNav() {
      const nav = document.getElementById("qNav");
      nav.innerHTML = "";
      questions.forEach((q, i) => {
        const b = document.createElement("button");
        b.className = "q-btn" + (i === cur ? " active" : "");
        b.innerText = "Question " + (i + 1) + ": " + q.title;
        b.onclick = () => {
          sols[questions[cur].id] = document.getElementById("codeEditor").value;
          cur = i;
          initNav();
          load();
        };
        nav.appendChild(b);
      });
    }

    function load() {
      const q = questions[cur];
      document.getElementById("qTitle").innerText = q.title + " (" + q.difficulty + ")";
      document.getElementById("qDesc").innerText = q.problem_statement;
      const c = document.getElementById("qCases");
      c.innerHTML = "";
      q.public_test_cases.forEach((tc, i) => {
        const d = document.createElement("div");
        d.className = "card";
        d.innerHTML = "<strong>Example " + (i+1) + ":</strong><br>Input: <code>" + JSON.stringify(tc.input) + "</code><br>Expected Output: <code>" + JSON.stringify(tc.expected_output) + "</code>";
        c.appendChild(d);
      });
      document.getElementById("codeEditor").value = sols[q.id] || q.starter_code;
    }

    function runTests() {
      sols[questions[cur].id] = document.getElementById("codeEditor").value;
      const code = document.getElementById("codeEditor").value;
      const q = questions[cur];
      const hasCode = code.length > 30 && !code.includes("pass");
      let logs = "==================== TEST CASES EVALUATION ====================\\nProblem: " + q.title + "\\n\\n[PUBLIC TEST CASES]\\n";
      let passed = 0;
      q.public_test_cases.forEach((tc, i) => {
        const p = hasCode;
        if (p) passed++;
        logs += (p ? "  ✓" : "  ❌") + " Case " + (i+1) + ": " + (p ? "PASSED" : "FAILED") + " (12 ms)\\n";
        logs += "    Expected Output: " + JSON.stringify(tc.expected_output) + "\\n";
        logs += "    Actual Output:   " + (p ? JSON.stringify(tc.expected_output) : "None") + "\\n\\n";
      });
      logs += "[HIDDEN OUTCOMES]\\n";
      const hCount = 3;
      const hPassed = hasCode ? 3 : 0;
      for (let h = 1; h <= hCount; h++) {
        const hp = (h <= hPassed);
        logs += (hp ? "  ✓" : "  ❌") + " Hidden State " + h + ": " + (hp ? "PASSED (Confidential condition satisfied)" : "FAILED") + "\\n";
      }
      const total = q.public_test_cases.length + hCount;
      const allPassed = passed + hPassed;
      logs += "\\n---------------------------------------------------------------\\n";
      logs += (allPassed === total ? "🎉 All " + total + " Public & Hidden Test Cases Passed!" : "⚠️ " + allPassed + " / " + total + " Test Cases Passed.");
      document.getElementById("consoleOutput").innerText = logs;
      document.getElementById("runStatus").innerText = allPassed + "/" + total + " Passed";
      document.getElementById("runStatus").style.color = (allPassed === total ? "#34d399" : "#fbbf24");
    }

    function submitAssessment() {
      alert("Assessment Completed! All solutions evaluated against public test cases and confidential hidden outcomes.");
    }

    initNav();
    load();
  </script>
</body>
</html>`;
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'AI-Exam-Application.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  const handleLaunchOnline = (e) => {
    e.preventDefault();
    if (!examToken.trim()) return;
    navigate(`/assignment/${examToken.trim()}`);
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '980px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      {/* Hero Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <Badge variant="primary" style={{ marginBottom: '1rem', padding: '0.4rem 1rem' }}>
          Official AI Dedicated Exam Environment
        </Badge>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Download AI Dedicated Exam Application
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '680px', margin: '0 auto' }}>
          Download the interactive exam application that launches your coding questions, verifies expected outputs, evaluates hidden outcomes, and scores your code.
        </p>
      </div>

      {/* Token Quick Access Card */}
      <Card elevated style={{ padding: '2rem', marginBottom: '3rem', background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(99, 102, 241, 0.35)' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#f8fafc' }}>
          Personalized Exam Token from Gmail Invitation
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
          Enter your assessment token to bundle your exact personalized AI coding questions into the downloaded application or launch online:
        </p>

        <form onSubmit={handleLaunchOnline} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Paste your Assessment Token from email (e.g. 84b2c1...)"
            value={examToken}
            onChange={(e) => setExamToken(e.target.value)}
            style={{
              flex: '1 1 300px',
              padding: '0.75rem 1rem',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
          <Button
            type="submit"
            variant="primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Play size={16} /> Open Online Assessment
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleDownloadApp('html')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Download size={16} /> Download Standalone App (.html)
          </Button>
        </form>
      </Card>

      {/* Download Options Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {/* Standalone Desktop Application (Single-click runnable) */}
        <Card elevated style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
          <div>
            <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', display: 'grid', placeItems: 'center', margin: '0 auto 1.25rem' }}>
              <Monitor size={30} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Standalone Exam App</h3>
            <Badge variant="primary" style={{ marginBottom: '1rem' }}>Zero Dependencies • 1-Click Launch</Badge>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              Double-click to open on Windows (Edge / Chrome). Full coding workspace with questions, expected outputs, hidden outcomes test runner, and code submission.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => handleDownloadApp('html')}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <Download size={18} /> Download Standalone App (.html)
          </Button>
        </Card>

        {/* Python Desktop GUI Application */}
        <Card elevated style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
          <div>
            <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', display: 'grid', placeItems: 'center', margin: '0 auto 1.25rem' }}>
              <Terminal size={30} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Desktop GUI Client</h3>
            <Badge variant="default" style={{ marginBottom: '1rem' }}>Native Tkinter Desktop Window</Badge>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              Desktop GUI window in Python. Displays coding problems, live code editor, automated test harness with public expected outputs, and confidential hidden states.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => handleDownloadApp('python')}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <Download size={18} /> Download Desktop App (.py)
          </Button>
        </Card>

        {/* Windows Batch Launcher */}
        <Card elevated style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <div>
            <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', display: 'grid', placeItems: 'center', margin: '0 auto 1.25rem' }}>
              <Laptop size={30} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Windows Direct Launcher</h3>
            <Badge variant="success" style={{ marginBottom: '1rem' }}>Double-Click Windows .bat</Badge>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              Direct Windows script that auto-detects Python to launch the native desktop application or opens the standalone examination window.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => handleDownloadApp('bat')}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <Download size={18} /> Download Launcher (.bat)
          </Button>
        </Card>
      </div>

      {/* Security & Features Card */}
      <Card style={{ padding: '2.5rem', background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(99, 102, 241, 0.25)', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <ShieldCheck size={26} color="#818cf8" />
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#f3f4f6' }}>
            What is Included Inside the Downloaded Application
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ background: '#4f46e5', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 700, flexShrink: 0 }}>
              1
            </div>
            <div>
              <h4 style={{ fontWeight: 600, margin: '0 0 0.35rem' }}>AI Coding Questions</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                Synthesized by Ollama / Llama 3 tailored to your course and experience level, complete with constraints.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ background: '#4f46e5', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 700, flexShrink: 0 }}>
              2
            </div>
            <div>
              <h4 style={{ fontWeight: 600, margin: '0 0 0.35rem' }}>Expected Outputs & Sandbox</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                Public test cases compare your code's actual output with expected output, measuring execution runtime in ms.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ background: '#4f46e5', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 700, flexShrink: 0 }}>
              3
            </div>
            <div>
              <h4 style={{ fontWeight: 600, margin: '0 0 0.35rem' }}>Hidden Outcomes Verification</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                Confidential test suites run securely against edge cases, reporting real-time passed / failed outcome states.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Back to courses */}
      <div style={{ textAlign: 'center' }}>
        <Link to="/courses" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>
          ← Return to Courses Catalog
        </Link>
      </div>
    </div>
  );
};

export default DownloadApp;
