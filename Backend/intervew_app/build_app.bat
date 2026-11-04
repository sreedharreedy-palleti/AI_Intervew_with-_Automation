@echo off
echo ========================================================
echo Building AI Technical Interview Windows Desktop Executable
echo ========================================================
python -m pip install pyinstaller
python build_app.py
echo ========================================================
echo Build Process Finished
echo ========================================================
pause

