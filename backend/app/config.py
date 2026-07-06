import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import List

# .env lives at the project root, one level up from backend/
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_ENV_PATH = _PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    MONGO_URI: str = os.environ.get("MONGO_URI", "mongodb://localhost:27017/medflow")
    SECRET_KEY: str = os.environ.get("SECRET_KEY")
    ADMIN_CREATION_SECRET: str = os.environ.get("ADMIN_CREATION_SECRET")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS_STR: str = "http://localhost:3000,http://localhost:5173,http://localhost:5174,http://127.0.0.1:3000,http://host.docker.internal:3000"

    @property
    def CORS_ORIGINS(self) -> List[str]:
        return [x.strip() for x in self.CORS_ORIGINS_STR.split(",")]

    class Config:
        env_file = str(_ENV_PATH)
        case_sensitive = False
        extra = "ignore"


settings = Settings()