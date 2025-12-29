from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from pathlib import Path
import os
import logging

logger = logging.getLogger(__name__)

# Получаем DATABASE_URL из переменных окружения (Railway автоматически предоставляет это для PostgreSQL)
# Если переменной нет, используем SQLite для локальной разработки
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Railway PostgreSQL: DATABASE_URL имеет формат postgresql://user:pass@host:port/dbname
    # SQLAlchemy требует postgresql://, но некоторые провайдеры дают postgres://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    engine = create_engine(DATABASE_URL)
    logger.info("Using PostgreSQL database from DATABASE_URL")
else:
    # Локальная разработка: используем SQLite
    BASE_DIR = Path(__file__).resolve().parent.parent
    DB_PATH = BASE_DIR / "db.sqlite3"
    
    # Создаём директорию для БД, если её нет
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    # Используем абсолютный путь для базы данных
    engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
    logger.info(f"Using SQLite database at {DB_PATH}")

SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()
