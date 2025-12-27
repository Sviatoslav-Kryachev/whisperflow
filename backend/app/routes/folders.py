from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..database import SessionLocal
from ..models import Folder, Transcript
from datetime import datetime

router = APIRouter(prefix="/folders", tags=["folders"])

class FolderCreate(BaseModel):
    name: str

class FolderRename(BaseModel):
    name: str

@router.get("/list")
async def list_folders():
    """Получить список всех папок"""
    db = SessionLocal()
    try:
        folders = db.query(Folder).order_by(Folder.name).all()
        return {
            "folders": [
                {
                    "id": f.id,
                    "name": f.name,
                    "created_at": f.created_at.isoformat() if f.created_at else None,
                    "count": db.query(Transcript).filter(Transcript.folder_id == f.id).count()
                }
                for f in folders
            ]
        }
    finally:
        db.close()

@router.post("/create")
async def create_folder(request: FolderCreate):
    """Создать новую папку"""
    db = SessionLocal()
    try:
        name = request.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Название папки не может быть пустым")
        
        # Проверяем, нет ли уже такой папки
        existing = db.query(Folder).filter(Folder.name == name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Папка с таким названием уже существует")
        
        folder = Folder(name=name, created_at=datetime.utcnow())
        db.add(folder)
        db.commit()
        db.refresh(folder)
        
        return {
            "id": folder.id,
            "name": folder.name,
            "message": "Папка создана"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка создания папки: {str(e)}")
    finally:
        db.close()

@router.post("/rename/{folder_id}")
async def rename_folder(folder_id: int, request: FolderRename):
    """Переименовать папку"""
    db = SessionLocal()
    try:
        folder = db.query(Folder).filter(Folder.id == folder_id).first()
        if not folder:
            raise HTTPException(status_code=404, detail="Папка не найдена")
        
        name = request.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Название не может быть пустым")
        
        # Проверяем, нет ли уже такой папки
        existing = db.query(Folder).filter(Folder.name == name, Folder.id != folder_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Папка с таким названием уже существует")
        
        folder.name = name
        db.commit()
        
        return {"id": folder_id, "name": name, "message": "Папка переименована"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка переименования: {str(e)}")
    finally:
        db.close()

@router.delete("/delete/{folder_id}")
async def delete_folder(folder_id: int):
    """Удалить папку (файлы остаются без папки)"""
    db = SessionLocal()
    try:
        folder = db.query(Folder).filter(Folder.id == folder_id).first()
        if not folder:
            raise HTTPException(status_code=404, detail="Папка не найдена")
        
        # Убираем папку у всех транскрипций
        db.query(Transcript).filter(Transcript.folder_id == folder_id).update({"folder_id": None})
        
        db.delete(folder)
        db.commit()
        
        return {"message": "Папка удалена"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка удаления: {str(e)}")
    finally:
        db.close()








