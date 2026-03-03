from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..db import get_database

router = APIRouter()


@router.get("/")
async def list_departments(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Basic list endpoint so Departments page can load."""
    cursor = db["departments"].find().sort("name", 1)
    departments = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        departments.append(doc)
    return departments


