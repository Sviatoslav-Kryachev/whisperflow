from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from ..config import TEXT_DIR, AUDIO_DIR
from ..database import SessionLocal
from ..models import Transcript, Folder
from pathlib import Path

router = APIRouter(prefix="/transcripts", tags=["transcripts"])

class RenameRequest(BaseModel):
    new_name: str

class MoveToFolderRequest(BaseModel):
    folder_id: Optional[int] = None

@router.get("/list")
async def list_transcripts(folder_id: Optional[int] = Query(None), recent: bool = Query(False)):
    """Получить список транскрипций из БД с фильтрацией"""
    db = SessionLocal()
    try:
        query = db.query(Transcript)
        
        if recent:
            # Последние файлы - все файлы за последние 7 дней или последние 20
            from datetime import datetime, timedelta
            week_ago = datetime.utcnow() - timedelta(days=7)
            query = query.filter(Transcript.created_at >= week_ago)
        elif folder_id is not None:
            # Фильтр по папке
            query = query.filter(Transcript.folder_id == folder_id)
        
        transcripts_db = query.order_by(Transcript.created_at.desc()).all()
        transcripts = []
        
        for t in transcripts_db:
            preview = ""
            size = 0
            
            # Если транскрипция завершена, читаем превью
            if t.status == "completed":
                text_path = TEXT_DIR / f"{t.file_id}.txt"
                if text_path.exists():
                    try:
                        with open(text_path, "r", encoding="utf-8") as f:
                            content = f.read()
                            preview = content[:100] + "..." if len(content) > 100 else content
                            size = len(content)
                    except:
                        pass
            
            transcripts.append({
                "id": t.file_id,
                "filename": t.filename or "unknown",
                "folder_id": t.folder_id,
                "status": t.status,
                "progress": t.progress,
                "status_message": t.status_message,
                "model": t.model,
                "preview": preview,
                "size": size,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "completed_at": t.completed_at.isoformat() if t.completed_at else None,
                "error_message": t.error_message
            })
        
        return {"transcripts": transcripts}
    finally:
        db.close()

@router.post("/rename/{file_id}")
async def rename_transcript(file_id: str, request: RenameRequest):
    """Переименовать транскрипцию"""
    db = SessionLocal()
    try:
        transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
        if not transcript:
            raise HTTPException(status_code=404, detail="Транскрипция не найдена")
        
        new_name = request.new_name.strip()
        if not new_name:
            raise HTTPException(status_code=400, detail="Имя не может быть пустым")
        
        transcript.filename = new_name
        db.commit()
        
        return {
            "file_id": file_id,
            "filename": new_name,
            "message": "Файл переименован"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка переименования: {str(e)}")
    finally:
        db.close()

@router.delete("/delete/{file_id}")
async def delete_transcript(file_id: str):
    """Удалить транскрипцию и связанные файлы"""
    db = SessionLocal()
    try:
        transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
        if not transcript:
            raise HTTPException(status_code=404, detail="Транскрипция не найдена")
        
        # Удаляем файл транскрипции (игнорируем ошибки)
        try:
            text_path = TEXT_DIR / f"{file_id}.txt"
            if text_path.exists():
                text_path.unlink()
        except:
            pass
        
        # Удаляем аудиофайл (игнорируем ошибки)
        try:
            audio_files = list(AUDIO_DIR.glob(f"{file_id}_*"))
            for audio_file in audio_files:
                audio_file.unlink()
        except:
            pass
        
        # Удаляем запись из БД
        db.delete(transcript)
        db.commit()
        
        return {
            "file_id": file_id,
            "message": "Транскрипция удалена"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка удаления: {str(e)}")
    finally:
        db.close()

@router.post("/move/{file_id}")
async def move_to_folder(file_id: str, request: MoveToFolderRequest):
    """Переместить транскрипцию в папку"""
    db = SessionLocal()
    try:
        transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
        if not transcript:
            raise HTTPException(status_code=404, detail="Транскрипция не найдена")
        
        # Проверяем существование папки, если указана
        if request.folder_id is not None:
            folder = db.query(Folder).filter(Folder.id == request.folder_id).first()
            if not folder:
                raise HTTPException(status_code=404, detail="Папка не найдена")
        
        transcript.folder_id = request.folder_id
        db.commit()
        
        return {
            "file_id": file_id,
            "folder_id": request.folder_id,
            "message": "Файл перемещён"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка перемещения: {str(e)}")
    finally:
        db.close()

