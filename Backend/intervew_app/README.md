# AI Technical Interview Application Module (`intervew_app`)

Modular architecture for the AI Voice & Technical Interview system.

## Structure
- `app/`: Dedicated Windows desktop application client launcher and profile isolating scripts.
- `routes/`: Modular FastAPI endpoints for Admin, Precheck, Session, Evaluation, Report, and Proctoring.
- `schemas/`: Pydantic request and response schemas.
- `services/`: Gemini AI integration, question generation, answer evaluation, session persistence, and proctoring.
- `build_app.py`: Standalone PyInstaller build script for creating `AIInterviewSetup.exe`.

