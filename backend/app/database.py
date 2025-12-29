from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from pathlib import Path

# Определяем путь к базе данных
# В Docker контейнере рабочая директория /app, поэтому путь должен быть /app/backend/db.sqlite3
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "db.sqlite3"

# Создаём директорию для БД, если её нет
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# Используем абсолютный путь для базы данных
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()
