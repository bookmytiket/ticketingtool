from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..db import get_database

router = APIRouter()


@router.get("/")
async def list_categories(db: AsyncIOMotorDatabase = Depends(get_database)):
    """
    List active categories (global + org-specific).
    For now we ignore auth/org filtering and just return all.
    """
    cursor = db["categories"].find({"status": "active"}).sort("name", 1)
    categories = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        categories.append(doc)
    return categories


@router.get("/all")
async def list_all_categories(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Admin categories page uses this endpoint."""
    cursor = db["categories"].find().sort("name", 1)
    categories = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        categories.append(doc)
    return categories


