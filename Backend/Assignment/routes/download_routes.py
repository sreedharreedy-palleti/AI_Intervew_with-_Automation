from fastapi import APIRouter, Depends, Query, Response
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database

from Assignment.services import (
    service_get_or_create_assignment,
    service_download_assignment_document,
    generate_desktop_exam_py,
    generate_desktop_exam_html,
    generate_windows_launcher_bat,
)

router = APIRouter()


@router.get("/{assignment_token}/download")
async def download_assignment_document(
    assignment_token: str,
    format: str = Query("html", description="Download format: html (interactive app), python, or text"),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Downloads the AI Coding Assignment Application containing problem statements,
    starter code, constraints, expected outputs, hidden outcomes, and interactive test runner.
    Default format is standalone interactive app (.html) so it never opens as a plain Word document.
    """
    fmt = format.lower().strip()
    if fmt == "text":
        doc_info = await service_download_assignment_document(
            assignment_token=assignment_token,
            db=db,
        )
        return Response(
            content=doc_info["content"],
            media_type="text/plain; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{doc_info["filename"]}"'
            },
        )

    # Deliver runnable interactive AI Exam Application by default
    try:
        assign_doc = await service_get_or_create_assignment(
            assignment_token=assignment_token,
            db=db,
            from_app=True,
        )
    except Exception:
        assign_doc = {
            "course_title": "AI Technical Assessment",
            "candidate_name": "Candidate",
            "unique_code": "EXAM-CLIENT",
            "assignment_token": assignment_token,
            "duration_minutes": 60,
            "questions": [],
        }

    if fmt in ("python", "py"):
        content = generate_desktop_exam_py(assign_doc)
        filename = "AI-Exam-Application.py"
        media_type = "text/x-python"
    elif fmt in ("bat", "launcher"):
        content = generate_windows_launcher_bat()
        filename = "AI-Exam-Launcher.bat"
        media_type = "text/plain"
    else:
        content = generate_desktop_exam_html(assign_doc)
        filename = "AI-Exam-Application.html"
        media_type = "text/html"

    return Response(
        content=content,
        media_type=f"{media_type}; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )


@router.get("/{assignment_token}/download-app")
async def download_client_application(
    assignment_token: str,
    format: str = Query("html", description="App format: html, python, or bat"),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Downloads a runnable AI Exam Application preloaded with the candidate's coding questions,
    expected outputs, hidden outcomes, code editor, and live sandbox evaluation.
    """
    try:
        assign_doc = await service_get_or_create_assignment(
            assignment_token=assignment_token,
            db=db,
            from_app=True,
        )
    except Exception:
        assign_doc = {
            "course_title": "AI Technical Assessment",
            "candidate_name": "Candidate",
            "unique_code": "EXAM-CLIENT",
            "assignment_token": assignment_token,
            "duration_minutes": 60,
            "questions": [],
        }

    fmt = format.lower().strip()
    if fmt in ("python", "py"):
        content = generate_desktop_exam_py(assign_doc)
        filename = "AI-Exam-Application.py"
        media_type = "text/x-python"
    elif fmt in ("bat", "launcher"):
        content = generate_windows_launcher_bat()
        filename = "AI-Exam-Launcher.bat"
        media_type = "text/plain"
    else:
        content = generate_desktop_exam_html(assign_doc)
        filename = "AI-Exam-Application.html"
        media_type = "text/html"

    return Response(
        content=content,
        media_type=f"{media_type}; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )
