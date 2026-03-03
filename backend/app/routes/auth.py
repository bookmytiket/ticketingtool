from typing import Optional

import bcrypt
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..auth_utils import create_access_token, get_current_user
from ..db import get_database

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserInfo(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    mfaEnabled: bool = False
    status: Optional[str] = None
    organization: Optional[dict] = None


class LoginResponse(BaseModel):
    token: str
    mfaRequired: bool = False
    user: UserInfo


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    users = db["users"]
    orgs = db["organizations"]

    user = await users.find_one({"email": payload.email.lower()})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    if user.get("status", "active") != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is inactive"
        )

    stored_password = user.get("password")
    if stored_password:
        if not bcrypt.checkpw(
            payload.password.encode("utf-8"), stored_password.encode("utf-8")
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
            )

    # For now, we do not implement MFA flow in FastAPI backend; always return full token
    org = None
    if user.get("organization"):
        org_doc = await orgs.find_one({"_id": ObjectId(str(user["organization"]))})
        if org_doc:
            org = {"_id": str(org_doc["_id"]), "name": org_doc.get("name"), "domain": org_doc.get("domain")}

    token = create_access_token(str(user["_id"]))

    return {
        "token": token,
        "mfaRequired": False,
        "user": {
            "id": str(user["_id"]),
            "name": user.get("name", ""),
            "email": user["email"],
            "role": user.get("role", "user"),
            "mfaEnabled": bool(user.get("mfaEnabled", False)),
            "status": user.get("status", "active"),
            "organization": org,
        },
    }


@router.get("/me", response_model=UserInfo)
async def get_me(current_user=Depends(get_current_user)):
    org = current_user.get("organization")
    org_data = None
    if isinstance(org, dict):
        org_data = org
    elif org is not None:
        org_data = {"_id": str(org)}

    return {
        "id": str(current_user["_id"]),
        "name": current_user.get("name", ""),
        "email": current_user["email"],
        "role": current_user.get("role", "user"),
        "mfaEnabled": bool(current_user.get("mfaEnabled", False)),
        "status": current_user.get("status", "active"),
        "organization": org_data,
    }


