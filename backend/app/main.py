from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from .routes import upload, auth, transcripts, folders, export
from .database import Base, engine, SessionLocal
from .config import AUDIO_DIR, TEXT_DIR
from . import models  # импортируем модели для создания таблиц
from .models import Transcript
import logging

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# преобразуем строки в Path
AUDIO_DIR = Path(AUDIO_DIR)
TEXT_DIR = Path(TEXT_DIR)

# создаём папки, если их нет
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
TEXT_DIR.mkdir(parents=True, exist_ok=True)

# Путь к фронтенду
FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend"

# создаём таблицы базы данных
Base.metadata.create_all(bind=engine)

app = FastAPI(title="WhisperFlow")


@app.on_event("startup")
async def reset_stuck_transcripts():
    """При старте сервера сбрасываем зависшие транскрипции"""
    db = SessionLocal()
    try:
        stuck = db.query(Transcript).filter(
            Transcript.status.in_(['pending', 'processing'])
        ).all()
        
        if stuck:
            logger.warning(f"Found {len(stuck)} stuck transcripts, resetting to failed...")
            for t in stuck:
                t.status = 'failed'
                t.error_message = 'Server was restarted. Click Retry to process again.'
                t.status_message = 'Interrupted - click Retry'
            db.commit()
            logger.info(f"Reset {len(stuck)} stuck transcripts")
        else:
            logger.info("No stuck transcripts found")
    except Exception as e:
        logger.error(f"Error resetting stuck transcripts: {e}")
    finally:
        db.close()


# CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # пока для теста, потом можно ограничить
    allow_methods=["*"],
    allow_headers=["*"],
)

# подключаем роуты
app.include_router(upload.router)
app.include_router(auth.router)
app.include_router(transcripts.router)
app.include_router(folders.router)
app.include_router(export.router)

# Раздаём статические файлы фронтенда (CSS, JS, компоненты)
if FRONTEND_DIR.exists():
    # Раздаём CSS, JS и компоненты
    css_dir = FRONTEND_DIR / "css"
    js_dir = FRONTEND_DIR / "js"
    components_dir = FRONTEND_DIR / "components"
    
    if css_dir.exists():
        app.mount("/css", StaticFiles(directory=str(css_dir)), name="css")
    if js_dir.exists():
        app.mount("/js", StaticFiles(directory=str(js_dir)), name="js")
    if components_dir.exists():
        app.mount("/components", StaticFiles(directory=str(components_dir)), name="components")
    
    # Эндпоинты для HTML страниц
    @app.get("/")
    async def root():
        from fastapi.responses import FileResponse
        login_file = FRONTEND_DIR / "login.html"
        if login_file.exists():
            return FileResponse(str(login_file))
        return {"status": "WhisperFlow backend is running"}
    
    @app.get("/login.html")
    async def login_page():
        from fastapi.responses import FileResponse
        return FileResponse(str(FRONTEND_DIR / "login.html"))
    
    @app.get("/dashboard.html")
    async def dashboard_page():
        from fastapi.responses import FileResponse
        return FileResponse(str(FRONTEND_DIR / "dashboard.html"))
else:
    # Если фронтенд не найден, возвращаем JSON
    @app.get("/")
    def root():
        return {"status": "WhisperFlow backend is running"}
