from bson import ObjectId
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from Admin.schemas.item import ItemCreate, ItemUpdate

def serialize_doc(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name"),
        "description": doc.get("description", "")
    }

class ItemService:
    @staticmethod
    async def get_all(db: AsyncIOMotorDatabase) -> List[dict]:
        items = []
        async for doc in db["items"].find():
            items.append(serialize_doc(doc))
        return items

    @staticmethod
    async def get_by_id(db: AsyncIOMotorDatabase, item_id: str) -> dict | None:
        if not ObjectId.is_valid(item_id):
            return None
        doc = await db["items"].find_one({"_id": ObjectId(item_id)})
        return serialize_doc(doc) if doc else None

    @staticmethod
    async def create(db: AsyncIOMotorDatabase, item_data: ItemCreate) -> dict:
        result = await db["items"].insert_one(item_data.model_dump())
        doc = await db["items"].find_one({"_id": result.inserted_id})
        return serialize_doc(doc)

    @staticmethod
    async def update(db: AsyncIOMotorDatabase, item_id: str, update_data: ItemUpdate) -> dict | None:
        if not ObjectId.is_valid(item_id):
            return None
        fields = {k: v for k, v in update_data.model_dump().items() if v is not None}
        if not fields:
            return await ItemService.get_by_id(db, item_id)
        
        await db["items"].update_one({"_id": ObjectId(item_id)}, {"$set": fields})
        doc = await db["items"].find_one({"_id": ObjectId(item_id)})
        return serialize_doc(doc) if doc else None

    @staticmethod
    async def delete(db: AsyncIOMotorDatabase, item_id: str) -> bool:
        if not ObjectId.is_valid(item_id):
            return False
        result = await db["items"].delete_one({"_id": ObjectId(item_id)})
        return result.deleted_count > 0