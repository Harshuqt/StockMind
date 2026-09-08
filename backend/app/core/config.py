from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    CORS_ORIGINS: str = "http://localhost:5173"
    PROJECT_NAME: str = "StockMind"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://stockmind:stockmindpassword@localhost:5432/stockmind_db"
    
    # Auth
    SECRET_KEY: str = "super_secret_key_for_development_only_please_change"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    GEMINI_API_KEY: str | None = None
    
    class Config:
        env_file = ".env"

settings = Settings()
