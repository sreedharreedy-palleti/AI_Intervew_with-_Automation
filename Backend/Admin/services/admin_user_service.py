from datetime import datetime, timezone
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.services.security_service import hash_password
from Admin.schemas.admin_user_schemas import AdminUserCreate, AdminUserUpdate


# 1. READ: List all registered candidates & users
async def service_get_all_users(db: AsyncIOMotorDatabase) -> list:
    users_cursor = db["users"].find().sort("_id", -1)
    users_list = []
    
    async for user_doc in users_cursor:
        user_id_str = str(user_doc["_id"])
        
        # Count how many courses this candidate is enrolled in
        enrolled_count = await db["courses"].count_documents({
            "enrolled_students.user_id": user_id_str
        })
        
        users_list.append({
            "id": user_id_str,
            "name": user_doc.get("name", ""),
            "email": user_doc.get("email", ""),
            "role": user_doc.get("role", "user"),
            "is_verified": user_doc.get("is_verified", False),
            "enrolled_courses_count": enrolled_count,
        })
    return users_list


# 2. READ: Single user profile with their enrolled courses list
async def service_get_user_with_enrolled_courses(user_id: str, db: AsyncIOMotorDatabase) -> dict:
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format.")

    user_doc = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found.")

    # Find all courses where this user is enrolled
    courses_cursor = db["courses"].find({"enrolled_students.user_id": user_id})
    enrolled_courses = []

    async for course in courses_cursor:
        # Extract enrollment timestamp for this user
        enroll_entry = next(
            (s for s in course.get("enrolled_students", []) if s.get("user_id") == user_id),
            {}
        )
        enrolled_courses.append({
            "course_id": str(course["_id"]),
            "title": course.get("title", ""),
            "instructor": course.get("instructor", ""),
            "level": course.get("level", "Beginner"),
            "duration_weeks": course.get("duration_weeks", 0),
            "enrolled_at": enroll_entry.get("enrolled_at", datetime.now(timezone.utc)),
        })

    return {
        "id": str(user_doc["_id"]),
        "name": user_doc.get("name", ""),
        "email": user_doc.get("email", ""),
        "role": user_doc.get("role", "user"),
        "is_verified": user_doc.get("is_verified", False),
        "total_enrolled_courses": len(enrolled_courses),
        "enrolled_courses": enrolled_courses,
    }


# 3. CREATE: Admin manual user creation
async def service_create_user_by_admin(payload: AdminUserCreate, db: AsyncIOMotorDatabase) -> dict:
    existing = await db["users"].find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists.")

    user_dict = {
        "name": payload.name,
        "email": payload.email,
        "password": hash_password(payload.password),
        "role": payload.role if payload.role in ["user", "admin"] else "user",
        "is_verified": payload.is_verified,
        "created_at": datetime.now(timezone.utc),
    }

    result = await db["users"].insert_one(user_dict)
    return {
        "id": str(result.inserted_id),
        "name": user_dict["name"],
        "email": user_dict["email"],
        "role": user_dict["role"],
        "is_verified": user_dict["is_verified"],
        "enrolled_courses_count": 0,
    }


# 4. UPDATE: Update candidate data
async def service_update_user_by_admin(user_id: str, payload: AdminUserUpdate, db: AsyncIOMotorDatabase) -> dict:
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format.")

    existing_user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found.")

    update_fields = {}
    if payload.name is not None:
        update_fields["name"] = payload.name
    if payload.email is not None:
        email_collision = await db["users"].find_one({
            "email": payload.email,
            "_id": {"$ne": ObjectId(user_id)}
        })
        if email_collision:
            raise HTTPException(status_code=400, detail="Email is already used by another account.")
        update_fields["email"] = payload.email
    if payload.role is not None:
        update_fields["role"] = payload.role
    if payload.is_verified is not None:
        update_fields["is_verified"] = payload.is_verified
    if payload.password is not None:
        update_fields["password"] = hash_password(payload.password)

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields provided for update.")

    await db["users"].update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})

    # If name or email changed, update existing course roster entries as well
    if "name" in update_fields or "email" in update_fields:
        course_set = {}
        if "name" in update_fields:
            course_set["enrolled_students.$.name"] = update_fields["name"]
        if "email" in update_fields:
            course_set["enrolled_students.$.email"] = update_fields["email"]

        await db["courses"].update_many(
            {"enrolled_students.user_id": user_id},
            {"$set": course_set}
        )

    return {"message": "User updated successfully."}


# 5. DELETE: Delete user and unenroll from all course rosters
async def service_delete_user_by_admin(user_id: str, db: AsyncIOMotorDatabase) -> dict:
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format.")

    res = await db["users"].delete_one({"_id": ObjectId(user_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found.")

    # Remove this user from all course rosters
    await db["courses"].update_many(
        {"enrolled_students.user_id": user_id},
        {"$pull": {"enrolled_students": {"user_id": user_id}}}
    )

    # Cascade clean up assignments, interviews, and resume entries
    await db["assignments"].delete_many({"user_id": user_id})
    await db["interviews"].delete_many({"user_id": user_id})
    await db["resumes"].delete_many({"user_id": user_id})

    return {"message": "User deleted and unenrolled from all courses and assessments successfully."}