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

logger = logging.getLogger(__name__)

async def process_transcript(file_id: str, audio_path: Path, model: str, filename: str):
    """
    Асинхронная обработка транскрипции
    """
    db: Session = SessionLocal()
    try:
        # Обновляем статус на "processing"
        transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
        if not transcript:
            logger.error(f"Transcript {file_id} not found in database")
            return
        
        transcript.status = "processing"
        transcript.progress = 10.0
        db.commit()
        
        # Транскрибируем (это долгая операция, но мы её делаем синхронно)
        # В будущем можно использовать threading или multiprocessing
        logger.info(f"Starting transcription for {file_id}")
        text = transcribe(str(audio_path), model)
        
        # Сохраняем транскрипцию
        text_path = TEXT_DIR / f"{file_id}.txt"
        with open(text_path, "w", encoding="utf-8") as f:
            f.write(text)
        
        # Обновляем статус на "completed"
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

def process_transcript_sync(file_id: str, audio_path: Path, model: str, filename: str):
    """
    Синхронная обёртка для запуска в отдельном потоке
    """
    import threading
    
    def run():
        db: Session = SessionLocal()
        try:
            # Обновляем статус на "processing"
            transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
            if not transcript:
                logger.error(f"Transcript {file_id} not found in database")
                return
            
            transcript.status = "processing"
            transcript.progress = 10.0
            db.commit()
            
            # Транскрибируем
            logger.info(f"Starting transcription for {file_id}")
            text = transcribe(str(audio_path), model)
            
            # Сохраняем транскрипцию
            text_path = TEXT_DIR / f"{file_id}.txt"
            with open(text_path, "w", encoding="utf-8") as f:
                f.write(text)
            
            # Обновляем статус на "completed"
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
    
    thread = threading.Thread(target=run, daemon=True)
    thread.start()

