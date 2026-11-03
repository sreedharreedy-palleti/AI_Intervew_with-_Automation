@echo off
title AI Interview - Backend API Server
echo ========================================================
echo   Starting AI Interview Backend (FastAPI on Port 8000)
echo ========================================================
cd /d "%~dp0Backend"
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause

