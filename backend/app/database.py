from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from pathlib import Path
import os
import logging

logger = logging.getLogger(__name__)

# Проверяем переменную окружения для PostgreSQL (Railway автоматически предоставляет DATABASE_URL)
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Railway PostgreSQL: DATABASE_URL имеет формат postgresql://user:pass@host:port/dbname
    # Некоторые провайдеры могут давать postgres://, но SQLAlchemy требует postgresql://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    engine = create_engine(DATABASE_URL)
    logger.info("Using PostgreSQL database from DATABASE_URL (persistent storage)")
else:
    # Локальная разработка: используем SQLite
    BASE_DIR = Path(__file__).resolve().parent.parent
    DB_PATH = BASE_DIR / "db.sqlite3"
    
    # Создаём директорию для БД, если её нет
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    # Используем абсолютный путь для базы данных
    engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
    logger.info(f"Using SQLite database at {DB_PATH} (local development only)")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Проверяем подключение к базе данных при импорте
def check_database_connection():
    """Проверяет подключение к базе данных и выводит информацию"""
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.fetchone()
        logger.info("✓ Database connection successful")
        
        # Выводим информацию о базе данных
        if DATABASE_URL:
            # PostgreSQL
            db_name = DATABASE_URL.split('/')[-1].split('?')[0]
            logger.info(f"✓ Connected to PostgreSQL database: {db_name}")
        else:
            logger.info(f"✓ Connected to SQLite database")
            
    except Exception as e:
        logger.error(f"✗ Database connection failed: {e}", exc_info=True)

# Проверяем подключение при импорте модуля
check_database_connection()
