"""
Фоновые задачи для обработки транскрипций
"""
from datetime import datetime
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import Transcript
from .whisper_service import transcribe
from .config import AUDIO_DIR, TEXT_DIR
from pathlib import Path
import logging
import tempfile
import uuid

logger = logging.getLogger(__name__)

async def process_transcript(file_id: str, audio_path: Path, model: str, filename: str):
    """
    Асинхронная обработка транскрипции
    """
    db: Session = SessionLocal()
    try:
        transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
        if not transcript:
            logger.error(f"Transcript {file_id} not found in database")
            return
        
        transcript.status = "processing"
        transcript.progress = 10.0
        db.commit()
        
        logger.info(f"Starting transcription for {file_id}")
        text = transcribe(str(audio_path), model)
        
        text_path = TEXT_DIR / f"{file_id}.txt"
        text_path.write_text(text, encoding="utf-8")
        
        transcript.status = "completed"
        transcript.progress = 100.0
        transcript.completed_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Transcription completed for {file_id}")
        
    except Exception as e:
        logger.error(f"Error processing transcript {file_id}: {str(e)}")
        try:
            transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
            if transcript:
                transcript.status = "failed"
                transcript.error_message = str(e)
                db.commit()
        except:
            pass
    finally:
        db.close()

def update_progress(db: Session, file_id: str, progress: float, message: str):
    """Обновить прогресс и сообщение статуса"""
    transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
    if transcript:
        transcript.progress = progress
        transcript.status_message = message
        db.commit()


def process_transcript_sync(file_id: str, audio_path, model: str, filename: str):
    """
    Синхронная обёртка для запуска в отдельном потоке
    """
    import threading
    from .whisper_service import transcribe_with_progress
    
    # ВАЖНО: Копируем файл во временную папку ДО запуска потока
    # Это решает проблему с Unicode путями в Windows потоках
    source = Path(audio_path)
    ext = source.suffix.lower()
    temp_path = Path(tempfile.gettempdir()) / f"wf_{uuid.uuid4().hex}{ext}"
    
    # Копируем файл (это работает с Unicode на Windows)
    temp_path.write_bytes(source.read_bytes())
    temp_path_str = str(temp_path)
    
    def run():
        db: Session = SessionLocal()
        try:
            transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
            if not transcript:
                return
            
            transcript.status = "processing"
            transcript.progress = 5.0
            transcript.status_message = "Подготовка к обработке..."
            db.commit()
            
            def progress_callback(progress: float, message: str):
                update_progress(db, file_id, progress, message)
            
            # Используем уже скопированный временный файл
            text = transcribe_with_progress(temp_path_str, model, progress_callback)
            
            update_progress(db, file_id, 95.0, "Сохранение результата...")
            text_path = TEXT_DIR / f"{file_id}.txt"
            text_path.write_text(text, encoding="utf-8")
            
            transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
            transcript.status = "completed"
            transcript.progress = 100.0
            transcript.status_message = "Готово"
            transcript.completed_at = datetime.utcnow()
            db.commit()
            
        except Exception as e:
            try:
                transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
                if transcript:
                    transcript.status = "failed"
                    error_msg = str(e).encode('ascii', 'replace').decode('ascii')
                    transcript.error_message = error_msg
                    transcript.status_message = "Ошибка обработки"
                    db.commit()
            except:
                pass
        finally:
            db.close()
            # Удаляем временный файл
            try:
                Path(temp_path_str).unlink(missing_ok=True)
            except:
                pass
    
    thread = threading.Thread(target=run, daemon=True)
    thread.start()
