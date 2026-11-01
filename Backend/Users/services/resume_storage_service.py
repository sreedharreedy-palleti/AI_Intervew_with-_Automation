import os
from pathlib import Path
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import HTTPException
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorDatabase


async def service_store_resume(
    user_id: str,
    course_id: str,
    candidate_name: str,
    candidate_email: str,
    filename: str,
    file_bytes: bytes,
    content_type: str,
    extracted_text: str,
    db: AsyncIOMotorDatabase,
) -> dict:
    """
    Stores resume file bytes directly in MongoDB collection `resumes`.
    Does NOT write any files to the local project filesystem.
    """
    now_utc = datetime.now(timezone.utc)
    resume_doc = {
        "user_id": str(user_id),
        "course_id": str(course_id),
        "candidate_name": candidate_name,
        "candidate_email": candidate_email,
        "filename": filename,
        "content_type": content_type or "application/pdf",
        "file_data": file_bytes,
        "file_size": len(file_bytes),
        "extracted_text": extracted_text,
        "uploaded_at": now_utc,
    }

    result = await db["resumes"].insert_one(resume_doc)
    resume_id = str(result.inserted_id)

    return {
        "resume_id": resume_id,
        "resume_path": f"/api/v1/user/resume/{resume_id}",
    }


async def service_get_resume_file(identifier: str, db: AsyncIOMotorDatabase) -> Response:
    """
    Fetches the resume file from MongoDB by ObjectId or filename,
    and returns it as a direct streaming HTTP Response.
    """
    doc = None
    if ObjectId.is_valid(identifier):
        doc = await db["resumes"].find_one({"_id": ObjectId(identifier)})

    if not doc:
        # Fallback search by filename or legacy_filename
        doc = await db["resumes"].find_one(
            {"$or": [{"filename": identifier}, {"legacy_filename": identifier}]}
        )

    if not doc:
        raise HTTPException(status_code=404, detail="Resume not found in database.")

    file_bytes = doc.get("file_data")
    if not file_bytes:
        raise HTTPException(status_code=404, detail="Resume file content is empty.")

    content_type = doc.get("content_type", "application/pdf")
    filename = doc.get("filename", "resume.pdf")

    # Use inline Content-Disposition so modern browsers open the PDF directly
    headers = {
        "Content-Disposition": f'inline; filename="{filename}"',
        "Content-Length": str(len(file_bytes)),
    }
    return Response(content=file_bytes, media_type=content_type, headers=headers)


async def migrate_disk_resumes_to_mongo(db: AsyncIOMotorDatabase):
    """
    Scans the legacy `uploads/resumes` directory if present,
    migrates any remaining files to MongoDB `resumes` collection,
    and removes the local disk files to keep the codebase clean.
    """
    if db is None:
        return

    uploads_dir = Path("uploads/resumes")
    if not uploads_dir.exists():
        return

    try:
        for file_path in uploads_dir.glob("*.*"):
            if not file_path.is_file():
                continue

            filename = file_path.name
            # Check if already migrated
            existing = await db["resumes"].find_one(
                {"$or": [{"filename": filename}, {"legacy_filename": filename}]}
            )
            if not existing:
                with open(file_path, "rb") as f:
                    file_bytes = f.read()

                ext = file_path.suffix.lower()
                content_type = "application/pdf" if ext == ".pdf" else "application/octet-stream"

                doc = {
                    "filename": filename,
                    "legacy_filename": filename,
                    "content_type": content_type,
                    "file_data": file_bytes,
                    "file_size": len(file_bytes),
                    "uploaded_at": datetime.now(timezone.utc),
                    "migrated_from_disk": True,
                }
                await db["resumes"].insert_one(doc)
                print(f"[RESUME MIGRATION] Migrated {filename} to MongoDB resumes collection.")

            # Remove disk file
            try:
                file_path.unlink(missing_ok=True)
            except Exception:
                pass

        # Clean up empty directory
        try:
            uploads_dir.rmdir()
            Path("uploads").rmdir()
        except Exception:
            pass
    except Exception as exc:
        print(f"[RESUME MIGRATION NOTICE] {exc}")

