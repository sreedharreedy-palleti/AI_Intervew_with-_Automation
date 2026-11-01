@echo off
title AI Interview - Development Launcher
echo ========================================================
echo   STARTING BACKEND & FRONTEND SEPARATELY FOR DEV
echo ========================================================
echo.
echo Launching Backend (FastAPI on http://localhost:8000)...
start "AI Interview Backend (:8000)" cmd /k "cd /d %~dp0Backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 2 /nobreak >nul

echo Launching Frontend (React/Vite on http://localhost:5173)...
start "AI Interview Frontend (:5173)" cmd /k "cd /d %~dp0Frontend && npm run dev"

echo.
echo [SUCCESS] Both services started in separate windows!
echo   * Frontend UI:   http://localhost:5173
echo   * Backend API:   http://localhost:8000
echo   * Swagger Docs:  http://localhost:8000/docs
echo.
pause

