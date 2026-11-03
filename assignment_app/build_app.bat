@echo off
echo ========================================================
echo   Building AI Assignment Desktop App (AIAssignmentSetup.exe)
echo ========================================================

cd /d "%~dp0"
py build_app.py

if %ERRORLEVEL% equ 0 (
    echo.
    echo [SUCCESS] AIAssignmentSetup.exe created in dist/ and copied to Backend/static/downloads/
) else (
    echo.
    echo [ERROR] Build failed. Please ensure pyinstaller is installed.
)
pause
