import asyncio
from database import connect_to_mongo, close_mongo_connection, get_database
from auth.services.security_service import hash_password

async def seed_admin():
    await connect_to_mongo()
    db = get_database()

    admin_email = "admin@example.com"
    admin_password = "YourAdminPassword123!"

    # Check if admin already exists
    existing = await db["users"].find_one({"email": admin_email})
    if existing:
        print(f"[!] Admin {admin_email} already exists. Updating password...")
        await db["users"].update_one(
            {"email": admin_email},
            {"$set": {"password": hash_password(admin_password), "role": "admin", "is_verified": True}}
        )
    else:
        admin_doc = {
            "name": "System Administrator",
            "email": admin_email,
            "password": hash_password(admin_password),
            "role": "admin",
            "is_verified": True,
        }
        await db["users"].insert_one(admin_doc)
        print(f"[+] Admin account created successfully for: {admin_email}")

    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(seed_admin())