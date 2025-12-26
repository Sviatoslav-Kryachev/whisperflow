from fastapi import APIRouter, UploadFile, Form, HTTPException
from ..config import AUDIO_DIR, TEXT_DIR
from ..models import Transcript
from ..database import SessionLocal
from ..whisper_service import transcribe
from pathlib import Path
from datetime import datetime
import uuid
import tempfile

router = APIRouter()

@router.post("/upload")
async def upload(file: UploadFile, model: str = Form("base")):
    uid = str(uuid.uuid4())
    audio_path = AUDIO_DIR / f"{uid}_{file.filename}"
    db = SessionLocal()
    temp_path = None

    try:
        # Сохраняем файл
        content = await file.read()
        audio_path.write_bytes(content)

        # Создаём запись в БД
        transcript = Transcript(
            file_id=uid,
            filename=file.filename,
            model=model,
            status="processing",
            progress=10.0,
            status_message="Распознавание речи...",
            created_at=datetime.utcnow()
        )
        db.add(transcript)
        db.commit()
        db.refresh(transcript)

        # Копируем во временный файл с ASCII именем
        ext = audio_path.suffix.lower()
        temp_path = Path(tempfile.gettempdir()) / f"wf_{uuid.uuid4().hex}{ext}"
        temp_path.write_bytes(content)
        
        # Транскрибируем СИНХРОННО
        text = transcribe(str(temp_path), model)
        
        # Сохраняем результат
        text_path = TEXT_DIR / f"{uid}.txt"
        text_path.write_text(text, encoding="utf-8")
        
        # Обновляем статус
        transcript.status = "completed"
        transcript.progress = 100.0
        transcript.status_message = "Готово"
        transcript.completed_at = datetime.utcnow()
        db.commit()

        return {
            "status": "completed",
            "file_id": uid,
            "filename": file.filename,
            "model": model,
            "message": "Транскрипция завершена"
        }
    except Exception as e:
        db.rollback()
        if audio_path.exists():
            audio_path.unlink()
        # Обновляем статус на failed если запись существует
        try:
            transcript = db.query(Transcript).filter(Transcript.file_id == uid).first()
            if transcript:
                transcript.status = "failed"
                transcript.error_message = str(e)
                db.commit()
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")
    finally:
        if temp_path and temp_path.exists():
            temp_path.unlink(missing_ok=True)
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
            "status_message": transcript.status_message,
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
        
        # Разрешаем повтор для любого статуса кроме "processing"
        if transcript.status == "processing":
            raise HTTPException(status_code=400, detail="Транскрипция уже обрабатывается")
        
        # Ищем аудиофайл
        audio_files = list(AUDIO_DIR.glob(f"{file_id}_*"))
        if not audio_files:
            raise HTTPException(status_code=404, detail="Аудиофайл не найден")
        
        audio_path = str(audio_files[0])  # Конвертируем Path в строку
        
        # Сбрасываем статус на pending
        transcript.status = "pending"
        transcript.progress = 0.0
        transcript.error_message = None
        transcript.completed_at = None
        transcript.status_message = None
        db.commit()
        
        # Запускаем обработку СИНХРОННО (без потоков - решает проблему Windows)
        from ..whisper_service import transcribe
        from ..config import TEXT_DIR
        from pathlib import Path
        import tempfile
        import uuid
        
        # Копируем файл
        source = Path(audio_path)
        ext = source.suffix.lower()
        temp_path = Path(tempfile.gettempdir()) / f"wf_{uuid.uuid4().hex}{ext}"
        temp_path.write_bytes(source.read_bytes())
        
        try:
            transcript.status = "processing"
            transcript.progress = 10.0
            transcript.status_message = "Распознавание..."
            db.commit()
            
            text = transcribe(str(temp_path), transcript.model)
            
            # Сохраняем
            text_path = TEXT_DIR / f"{file_id}.txt"
            text_path.write_text(text, encoding="utf-8")
            
            transcript.status = "completed"
            transcript.progress = 100.0
            transcript.status_message = "Готово"
            transcript.completed_at = datetime.utcnow()
            db.commit()
        finally:
            temp_path.unlink(missing_ok=True)
        
        return {
            "status": "pending",
            "file_id": file_id,
            "message": "Обработка перезапущена"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        # Безопасное сообщение об ошибке
        error_msg = str(e).encode('ascii', 'replace').decode('ascii')
        raise HTTPException(status_code=500, detail=f"Error: {error_msg}")
    finally:
        db.close()
