import os
import sqlite3
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

try:
    from backend.app.core.config import settings
except ImportError:
    from app.core.config import settings

db_url = settings.DATABASE_URL.strip() if settings.DATABASE_URL else ""

if db_url:
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    
    if "sqlite" in db_url:
        os.makedirs(os.path.dirname(settings.DB_PATH), exist_ok=True)
        engine = create_engine(db_url, connect_args={"check_same_thread": False})
    else:
        # PostgreSQL / Supabase configuration
        engine = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
        )
else:
    os.makedirs(os.path.dirname(settings.DB_PATH), exist_ok=True)
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{settings.DB_PATH}"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db_connection(db_path: str = None) -> sqlite3.Connection:
    """
    Creates and returns a SQLite database connection with Row factory enabled (for legacy raw SQLite access).
    """
    target_path = db_path or settings.DB_PATH
    conn = sqlite3.connect(target_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def check_db_health() -> bool:
    """
    Executes a test query to verify database connectivity against configured engine.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1;"))
        return True
    except Exception:
        return False


def init_db(target_engine=None):
    """
    Initialize all database tables.
    """
    use_engine = target_engine or engine
    from backend.app.db.models import Base as ModelsBase
    ModelsBase.metadata.create_all(bind=use_engine)

