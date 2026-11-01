@echo off
title AI Interview - Backend API
echo Starting Backend API server on http://localhost:8000...
cd /d "%~dp0Backend"
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
