from fastapi import APIRouter, UploadFile, Form, HTTPException
from ..config import AUDIO_DIR, TEXT_DIR
from ..models import Transcript
from ..database import SessionLocal
from ..tasks import process_transcript_sync
from pathlib import Path
from datetime import datetime
import uuid

router = APIRouter()

@router.post("/upload")
async def upload(file: UploadFile, model: str = Form("base")):
    uid = str(uuid.uuid4())
    audio_path = AUDIO_DIR / f"{uid}_{file.filename}"
    db = SessionLocal()

    try:
        # Сохраняем файл
        with open(audio_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # Создаём запись в БД со статусом "pending"
        transcript = Transcript(
            file_id=uid,
            filename=file.filename,
            model=model,
            status="pending",
            progress=0.0,
            created_at=datetime.utcnow()
        )
        db.add(transcript)
        db.commit()
        db.refresh(transcript)

        # Запускаем обработку в фоновом потоке
        process_transcript_sync(uid, audio_path, model, file.filename)

        return {
            "status": "pending",
            "file_id": uid,
            "filename": file.filename,
            "model": model,
            "message": "Файл загружен, обработка начата"
        }
    except Exception as e:
        db.rollback()
        # Удаляем файл при ошибке
        if audio_path.exists():
            audio_path.unlink()
        raise HTTPException(status_code=500, detail=f"Ошибка загрузки: {str(e)}")
    finally:
        db.close()

@router.get("/transcript/{file_id}")
async def get_transcript(file_id: str):
    db = SessionLocal()
    try:
        transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
        if not transcript:
            raise HTTPException(status_code=404, detail="Транскрипция не найдена")
        
        # Если транскрипция ещё обрабатывается
        if transcript.status != "completed":
            return {
                "file_id": file_id,
                "status": transcript.status,
                "progress": transcript.progress,
                "message": "Транскрипция ещё обрабатывается" if transcript.status == "processing" else "Ожидает обработки"
            }
        
        # Если транскрипция готова
        text_path = TEXT_DIR / f"{file_id}.txt"
        if not text_path.exists():
            raise HTTPException(status_code=404, detail="Файл транскрипции не найден")
        
        with open(text_path, "r", encoding="utf-8") as f:
            text = f.read()
        
        return {
            "file_id": file_id,
            "status": "completed",
            "transcript": text,
            "filename": transcript.filename,
            "model": transcript.model
        }
    finally:
        db.close()

@router.get("/status/{file_id}")
async def get_status(file_id: str):
    """Получить статус обработки файла"""
    db = SessionLocal()
    try:
        transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
        if not transcript:
            raise HTTPException(status_code=404, detail="Файл не найден")
        
        return {
            "file_id": file_id,
            "status": transcript.status,
            "progress": transcript.progress,
            "filename": transcript.filename,
            "model": transcript.model,
            "error_message": transcript.error_message,
            "created_at": transcript.created_at.isoformat() if transcript.created_at else None,
            "completed_at": transcript.completed_at.isoformat() if transcript.completed_at else None
        }
    finally:
        db.close()

@router.post("/retry/{file_id}")
async def retry_transcript(file_id: str):
    """Повторить обработку неудачной транскрипции"""
    db = SessionLocal()
    try:
        transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
        if not transcript:
            raise HTTPException(status_code=404, detail="Транскрипция не найдена")
        
        if transcript.status not in ["failed", "completed"]:
            raise HTTPException(status_code=400, detail="Транскрипция уже обрабатывается")
        
        # Ищем аудиофайл
        audio_files = list(AUDIO_DIR.glob(f"{file_id}_*"))
        if not audio_files:
            raise HTTPException(status_code=404, detail="Аудиофайл не найден")
        
        audio_path = audio_files[0]
        
        # Сбрасываем статус на pending
        transcript.status = "pending"
        transcript.progress = 0.0
        transcript.error_message = None
        transcript.completed_at = None
        db.commit()
        
        # Запускаем обработку заново
        process_transcript_sync(file_id, audio_path, transcript.model, transcript.filename)
        
        return {
            "status": "pending",
            "file_id": file_id,
            "message": "Обработка перезапущена"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка повтора: {str(e)}")
    finally:
        db.close()
