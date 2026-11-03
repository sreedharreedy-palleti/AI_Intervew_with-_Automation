@echo off
title AI Assignment Desktop Client Builder
echo ========================================================
echo   Building AI Assignment Desktop Client Executable (.exe)
echo ========================================================
cd /d "%~dp0"
py build_app.py
if %ERRORLEVEL% NEQ 0 (
    python build_app.py
)
echo.
echo [DONE] Executable ready in dist\AIAssignmentSetup.exe and Backend\static\downloads\
pause
