from fastapi import APIRouter, UploadFile, Form, HTTPException, BackgroundTasks, Query
from fastapi.responses import FileResponse
from ..config import AUDIO_DIR, TEXT_DIR
from ..models import Transcript
from ..database import SessionLocal
from ..whisper_service import transcribe
from pathlib import Path
from datetime import datetime
from typing import List, Dict
from pydantic import BaseModel
import uuid
import tempfile
import logging
from difflib import SequenceMatcher

router = APIRouter()
logger = logging.getLogger(__name__)


def process_transcription_background(file_id: str, temp_path: Path, model: str, language: str = None, speaker_recognition: bool = False):
    """Фоновая обработка транскрипции (выполняется в отдельном потоке)"""
    db = SessionLocal()
    try:
        transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
        if not transcript:
            return
        
        transcript.status = "processing"
        transcript.progress = 30.0
        lang_msg = f" ({language})" if language else " (авто)"
        speaker_msg = " с распознаванием говорящих" if speaker_recognition else ""
        transcript.status_message = f"Распознавание речи{lang_msg}{speaker_msg}..."
        db.commit()
        
        # Транскрибируем
        # TODO: Реализовать поддержку speaker_recognition в transcribe
        text = transcribe(str(temp_path), model, language)
        
        # Сохраняем результат
        text_path = TEXT_DIR / f"{file_id}.txt"
        text_path.write_text(text, encoding="utf-8")
        
        # Обновляем статус
        transcript.status = "completed"
        transcript.progress = 100.0
        transcript.status_message = "Готово"
        transcript.completed_at = datetime.utcnow()
        db.commit()
        logger.info(f"Transcription completed: {file_id}")
        
    except Exception as e:
        logger.error(f"Transcription failed for {file_id}: {e}")
        try:
            transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
            if transcript:
                transcript.status = "failed"
                transcript.error_message = str(e)
                transcript.status_message = "Ошибка"
                db.commit()
        except:
            pass
    finally:
        # Удаляем временный файл
        if temp_path and temp_path.exists():
            try:
                temp_path.unlink()
            except:
                pass
        db.close()


def similarity(a: str, b: str) -> float:
    """Вычисляет схожесть двух строк (0.0 - 1.0)"""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


@router.get("/upload/check-duplicate")
async def check_duplicate(filename: str = Query(..., description="Имя файла для проверки")):
    """Проверяет наличие файлов с похожим именем"""
    db = SessionLocal()
    try:
        # Получаем все транскрипции
        all_transcripts = db.query(Transcript).all()
        
        # Ищем похожие имена (порог схожести 0.7 = 70%)
        similar_files = []
        threshold = 0.7
        
        for transcript in all_transcripts:
            if transcript.filename:
                similarity_score = similarity(filename, transcript.filename)
                if similarity_score >= threshold:
                    similar_files.append({
                        "file_id": transcript.file_id,
                        "filename": transcript.filename,
                        "similarity": round(similarity_score, 2),
                        "status": transcript.status,
                        "created_at": transcript.created_at.isoformat() if transcript.created_at else None
                    })
        
        # Сортируем по схожести (от большей к меньшей)
        similar_files.sort(key=lambda x: x["similarity"], reverse=True)
        
        return {
            "has_duplicates": len(similar_files) > 0,
            "similar_files": similar_files[:5]  # Возвращаем максимум 5 самых похожих
        }
    finally:
        db.close()


@router.post("/upload")
async def upload(file: UploadFile, model: str = Form("base"), language: str = Form("auto"), speaker_recognition: str = Form("false"), background_tasks: BackgroundTasks = None):
    uid = str(uuid.uuid4())
    audio_path = AUDIO_DIR / f"{uid}_{file.filename}"
    db = SessionLocal()

    try:
        # Сохраняем файл
        content = await file.read()
        audio_path.write_bytes(content)

        # Создаём запись в БД
        transcript = Transcript(
            file_id=uid,
            filename=file.filename,
            model=model,
            language=language if language != 'auto' else None,
            status="pending",
            progress=10.0,
            status_message="Загрузка файла...",
            created_at=datetime.utcnow()
        )
        db.add(transcript)
        db.commit()
        db.refresh(transcript)

        # Копируем во временный файл с ASCII именем
        ext = audio_path.suffix.lower()
        temp_path = Path(tempfile.gettempdir()) / f"wf_{uuid.uuid4().hex}{ext}"
        temp_path.write_bytes(content)
        
        # Запускаем обработку в фоне
        lang_param = language if language != 'auto' else None
        speaker_recognition_bool = speaker_recognition.lower() in ('true', '1', 'yes', 'on')
        if background_tasks:
            background_tasks.add_task(process_transcription_background, uid, temp_path, model, lang_param, speaker_recognition_bool)
        else:
            # Fallback: запускаем в том же потоке (если background_tasks не доступен)
            import threading
            thread = threading.Thread(
                target=process_transcription_background,
                args=(uid, temp_path, model, lang_param, speaker_recognition_bool)
            )
            thread.start()

        return {
            "status": "pending",
            "file_id": uid,
            "filename": file.filename,
            "model": model,
            "language": language,
            "message": "Файл загружен, обработка начата"
        }
    except Exception as e:
        db.rollback()
        if audio_path.exists():
            audio_path.unlink()
        raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")
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

class UpdateTranscriptRequest(BaseModel):
    transcript: str

@router.put("/transcript/{file_id}")
async def update_transcript(file_id: str, request: UpdateTranscriptRequest):
    """Обновить текст транскрипции"""
    db = SessionLocal()
    try:
        transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
        if not transcript:
            raise HTTPException(status_code=404, detail="Транскрипция не найдена")
        
        if transcript.status != "completed":
            raise HTTPException(status_code=400, detail="Можно редактировать только завершённые транскрипции")
        
        # Сохраняем обновлённый текст
        text_path = TEXT_DIR / f"{file_id}.txt"
        try:
            text_path.write_text(request.transcript, encoding="utf-8")
        except Exception as e:
            logger.error(f"Error writing transcript file {file_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Ошибка сохранения файла: {str(e)}")
        
        return {
            "file_id": file_id,
            "message": "Транскрипция обновлена"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating transcript {file_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка обновления: {str(e)}")
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

@router.get("/audio/{file_id}")
async def get_audio_file(file_id: str):
    """Получить аудиофайл для воспроизведения"""
    db = SessionLocal()
    try:
        transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
        if not transcript:
            raise HTTPException(status_code=404, detail="Транскрипция не найдена")
        
        # Ищем аудиофайл
        audio_files = list(AUDIO_DIR.glob(f"{file_id}_*"))
        if not audio_files:
            logger.warning(f"Audio file not found for file_id: {file_id}, searched in: {AUDIO_DIR}")
            raise HTTPException(status_code=404, detail="Аудиофайл не найден")
        
        audio_path = audio_files[0]
        
        # Проверяем, что файл существует
        if not audio_path.exists():
            logger.error(f"Audio file path exists but file not found: {audio_path}")
            raise HTTPException(status_code=404, detail="Аудиофайл не найден")
        
        # Определяем MIME тип
        mime_types = {
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.ogg': 'audio/ogg',
            '.m4a': 'audio/mp4',
            '.flac': 'audio/flac',
            '.webm': 'audio/webm'
        }
        
        mime_type = mime_types.get(audio_path.suffix.lower(), 'audio/mpeg')
        
        logger.info(f"Serving audio file: {audio_path}, mime_type: {mime_type}")
        
        return FileResponse(
            path=str(audio_path),
            media_type=mime_type,
            filename=audio_path.name,
            headers={
                "Accept-Ranges": "bytes",
                "Content-Length": str(audio_path.stat().st_size)
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting audio file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Ошибка получения аудиофайла: {str(e)}")
    finally:
        db.close()


@router.post("/retry/{file_id}")
async def retry_transcript(file_id: str, background_tasks: BackgroundTasks = None):
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
        
        audio_path = audio_files[0]
        
        # Сбрасываем статус на pending
        transcript.status = "pending"
        transcript.progress = 10.0
        transcript.error_message = None
        transcript.completed_at = None
        transcript.status_message = "Подготовка..."
        model = transcript.model
        db.commit()
        
        # Копируем файл во временную директорию
        ext = audio_path.suffix.lower()
        temp_path = Path(tempfile.gettempdir()) / f"wf_{uuid.uuid4().hex}{ext}"
        temp_path.write_bytes(audio_path.read_bytes())
        
        # Запускаем обработку в фоне
        if background_tasks:
            background_tasks.add_task(process_transcription_background, file_id, temp_path, model)
        else:
            import threading
            thread = threading.Thread(
                target=process_transcription_background,
                args=(file_id, temp_path, model)
            )
            thread.start()
        
        return {
            "status": "pending",
            "file_id": file_id,
            "message": "Обработка перезапущена"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        error_msg = str(e).encode('ascii', 'replace').decode('ascii')
        raise HTTPException(status_code=500, detail=f"Error: {error_msg}")
    finally:
        db.close()

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
        
        audio_path = audio_files[0]
        
        # Сбрасываем статус на pending
        transcript.status = "pending"
        transcript.progress = 10.0
        transcript.error_message = None
        transcript.completed_at = None
        transcript.status_message = "Подготовка..."
        model = transcript.model
        db.commit()
        
        # Копируем файл во временную директорию
        ext = audio_path.suffix.lower()
        temp_path = Path(tempfile.gettempdir()) / f"wf_{uuid.uuid4().hex}{ext}"
        temp_path.write_bytes(audio_path.read_bytes())
        
        # Запускаем обработку в фоне
        if background_tasks:
            background_tasks.add_task(process_transcription_background, file_id, temp_path, model)
        else:
            import threading
            thread = threading.Thread(
                target=process_transcription_background,
                args=(file_id, temp_path, model)
            )
            thread.start()
        
        return {
            "status": "pending",
            "file_id": file_id,
            "message": "Обработка перезапущена"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        error_msg = str(e).encode('ascii', 'replace').decode('ascii')
        raise HTTPException(status_code=500, detail=f"Error: {error_msg}")
    finally:
        db.close()
