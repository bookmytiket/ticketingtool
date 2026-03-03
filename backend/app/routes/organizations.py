from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..db import get_database

router = APIRouter()


@router.get("/")
async def list_organizations(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Basic list endpoint so Organizations page can load."""
    orgs_cursor = db["organizations"].find().sort("createdAt", -1)
    organizations = []
    async for doc in orgs_cursor:
        doc["_id"] = str(doc["_id"])
        organizations.append(doc)
    return organizations


