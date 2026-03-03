from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from ..db import get_database

router = APIRouter()


def _convert_object_ids(obj):
    """Recursively convert ObjectId instances inside a document to strings."""
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, list):
        return [_convert_object_ids(item) for item in obj]
    if isinstance(obj, dict):
        return {key: _convert_object_ids(value) for key, value in obj.items()}
    return obj


@router.get("/")
async def list_users(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Basic list endpoint so Users page can load."""
    cursor = db["users"].find().sort("createdAt", -1)
    users = []
    async for doc in cursor:
        user = _convert_object_ids(doc)
        # Remove sensitive field
        user.pop("password", None)
        users.append(user)
    return users


@router.get("/mentions")
async def list_mentions(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Simplified mentions endpoint used by comments UI."""
    cursor = db["users"].find({"status": "active"}).sort("name", 1)
    users = []
    async for doc in cursor:
        users.append(
            {
                "_id": str(doc["_id"]),
                "name": doc.get("name", ""),
                "email": doc.get("email", ""),
            }
        )
    return users


