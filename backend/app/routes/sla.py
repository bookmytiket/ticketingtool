from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..db import get_database

router = APIRouter()


@router.get("/")
async def list_sla_policies(
    organization: str | None = Query(default=None),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Minimal SLA policies list for the SLA Policies page.
    Mirrors /api/admin/sla GET shape from the Node backend.
    """
    collection = db["slapolicies"]
    query: dict = {}
    if organization:
        query["$or"] = [{"organization": organization}, {"organization": None}]
    else:
        query["organization"] = None

    cursor = collection.find(query).sort([("priority", 1), ("organization", 1)])
    policies = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        policies.append(doc)
    return policies


