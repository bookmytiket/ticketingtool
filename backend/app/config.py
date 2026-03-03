from functools import lru_cache
import os
from pydantic import BaseModel


class Settings(BaseModel):
    mongodb_uri: str = os.getenv(
        "MONGODB_URI",
        "mongodb://mongoadmin:mongopassword@mongodb:27017/ticketing_tool?authSource=admin",
    )
    database_name: str = os.getenv("MONGODB_DB", "ticketing_tool")
    port: int = int(os.getenv("PORT", "5000"))


@lru_cache
def get_settings() -> Settings:
    return Settings()


