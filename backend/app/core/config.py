import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file if available
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(BASE_DIR, ".env"))
load_dotenv(os.path.join(os.path.dirname(BASE_DIR), ".env"))

class Settings:
    PROJECT_NAME: str = "Disaster Evacuation Route Optimizer API"
    VERSION: str = "0.1.0"
    API_PREFIX: str = "/api"
    
    BASE_DIR: str = BASE_DIR
    DB_PATH: str = os.path.join(BASE_DIR, "evacuation_data.db")
    
    # DATABASE_URL read strictly from environment variable
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # Host & Port for cloud platforms
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    
    # Dynamic CORS Configuration from environment variable
    @property
    def CORS_ORIGINS(self) -> list:
        raw_cors = os.getenv("CORS_ORIGINS")
        if raw_cors:
            if raw_cors.startswith("[") and raw_cors.endswith("]"):
                try:
                    return json.loads(raw_cors)
                except json.JSONDecodeError:
                    pass
            return [origin.strip() for origin in raw_cors.split(",") if origin.strip()]
        return [
            "https://disaster-evacuation-route-optimizer.vercel.app",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:4173",
            "http://127.0.0.1:4173",
            "http://localhost:3000",
        ]

settings = Settings()

