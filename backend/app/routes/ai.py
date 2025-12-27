"""
AI Routes - API endpoints для AI-фич
Резюме, ключевые слова, sentiment analysis, классификация, перевод
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
from ..database import SessionLocal
from ..models import Transcript, TranscriptAI
from ..ai_service import (
    get_transcript_text,
    generate_summary,
    extract_keywords,
    analyze_sentiment,
    classify_text,
    translate_text,
    get_supported_languages
)
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])


class SummaryRequest(BaseModel):
    max_length: Optional[int] = 150
    min_length: Optional[int] = 30


class KeywordsRequest(BaseModel):
    num_keywords: Optional[int] = 10


class TranslateRequest(BaseModel):
    target_language: str = "en"
    source_language: Optional[str] = None


class ClassifyRequest(BaseModel):
    categories: Optional[List[str]] = None


class TranslateSegmentRequest(BaseModel):
    text: str
    target_language: str = "ru"


@router.post("/summary/{file_id}")
async def generate_transcript_summary(
    file_id: str,
    request: Optional[SummaryRequest] = None
):
    """
    Генерирует резюме транскрипции
    
    Args:
        file_id: ID транскрипции
        request: Параметры (max_length, min_length)
    """
    db = SessionLocal()
    try:
        transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
        if not transcript:
            raise HTTPException(status_code=404, detail="Транскрипция не найдена")
        
        if transcript.status != "completed":
            raise HTTPException(status_code=400, detail="Транскрипция ещё не завершена")
        
        # Получаем текст
        text = get_transcript_text(file_id)
        if not text:
            raise HTTPException(status_code=404, detail="Текст транскрипции не найден")
        
        # Параметры
        max_length = request.max_length if request else 150
        min_length = request.min_length if request else 30
        
        # Генерируем резюме (может занять время при первой загрузке модели)
        # Используем asyncio для неблокирующего выполнения в отдельном потоке
        import asyncio
        import concurrent.futures
        
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as executor:
            summary = await loop.run_in_executor(
                executor,
                lambda: generate_summary(text, max_length=max_length, min_length=min_length)
            )
        
        if not summary:
            raise HTTPException(status_code=500, detail="Не удалось создать резюме")
        
        # Сохраняем в БД
        ai_data = db.query(TranscriptAI).filter(TranscriptAI.file_id == file_id).first()
        if not ai_data:
            ai_data = TranscriptAI(
                transcript_id=transcript.id,
                file_id=file_id,
                summary=summary,
                summary_created_at=datetime.utcnow()
            )
            db.add(ai_data)
        else:
            ai_data.summary = summary
            ai_data.summary_created_at = datetime.utcnow()
            ai_data.updated_at = datetime.utcnow()
        
        db.commit()
        
        return {
            "file_id": file_id,
            "summary": summary,
            "created_at": ai_data.summary_created_at.isoformat() if ai_data.summary_created_at else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error generating summary: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка создания резюме: {str(e)}")
    finally:
        db.close()


@router.post("/keywords/{file_id}")
async def extract_transcript_keywords(
    file_id: str,
    request: Optional[KeywordsRequest] = None
):
    """
    Извлекает ключевые слова из транскрипции
    
    Args:
        file_id: ID транскрипции
        request: Параметры (num_keywords)
    """
    db = SessionLocal()
    try:
        transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
        if not transcript:
            raise HTTPException(status_code=404, detail="Транскрипция не найдена")
        
        if transcript.status != "completed":
            raise HTTPException(status_code=400, detail="Транскрипция ещё не завершена")
        
        # Получаем текст
        text = get_transcript_text(file_id)
        if not text:
            raise HTTPException(status_code=404, detail="Текст транскрипции не найден")
        
        # Параметры
        num_keywords = request.num_keywords if request else 10
        
        # Извлекаем ключевые слова
        keywords = extract_keywords(text, num_keywords=num_keywords)
        
        # Сохраняем в БД
        ai_data = db.query(TranscriptAI).filter(TranscriptAI.file_id == file_id).first()
        if not ai_data:
            ai_data = TranscriptAI(
                transcript_id=transcript.id,
                file_id=file_id,
                keywords=json.dumps(keywords, ensure_ascii=False),
                keywords_created_at=datetime.utcnow()
            )
            db.add(ai_data)
        else:
            ai_data.keywords = json.dumps(keywords, ensure_ascii=False)
            ai_data.keywords_created_at = datetime.utcnow()
            ai_data.updated_at = datetime.utcnow()
        
        db.commit()
        
        return {
            "file_id": file_id,
            "keywords": keywords,
            "count": len(keywords),
            "created_at": ai_data.keywords_created_at.isoformat() if ai_data.keywords_created_at else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error extracting keywords: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка извлечения ключевых слов: {str(e)}")
    finally:
        db.close()


@router.post("/sentiment/{file_id}")
async def analyze_transcript_sentiment(file_id: str):
    """
    Анализирует тональность транскрипции
    
    Args:
        file_id: ID транскрипции
    """
    db = SessionLocal()
    try:
        transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
        if not transcript:
            raise HTTPException(status_code=404, detail="Транскрипция не найдена")
        
        if transcript.status != "completed":
            raise HTTPException(status_code=400, detail="Транскрипция ещё не завершена")
        
        # Получаем текст
        text = get_transcript_text(file_id)
        if not text:
            raise HTTPException(status_code=404, detail="Текст транскрипции не найден")
        
        # Анализируем sentiment
        sentiment_result = analyze_sentiment(text)
        
        # Сохраняем в БД
        ai_data = db.query(TranscriptAI).filter(TranscriptAI.file_id == file_id).first()
        if not ai_data:
            ai_data = TranscriptAI(
                transcript_id=transcript.id,
                file_id=file_id,
                sentiment=json.dumps(sentiment_result, ensure_ascii=False),
                sentiment_created_at=datetime.utcnow()
            )
            db.add(ai_data)
        else:
            ai_data.sentiment = json.dumps(sentiment_result, ensure_ascii=False)
            ai_data.sentiment_created_at = datetime.utcnow()
            ai_data.updated_at = datetime.utcnow()
        
        db.commit()
        
        return {
            "file_id": file_id,
            "sentiment": sentiment_result,
            "created_at": ai_data.sentiment_created_at.isoformat() if ai_data.sentiment_created_at else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error analyzing sentiment: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка анализа тональности: {str(e)}")
    finally:
        db.close()


@router.post("/classify/{file_id}")
async def classify_transcript(
    file_id: str,
    request: Optional[ClassifyRequest] = None
):
    """
    Классифицирует транскрипцию по категориям
    
    Args:
        file_id: ID транскрипции
        request: Параметры (categories - список категорий)
    """
    db = SessionLocal()
    try:
        transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
        if not transcript:
            raise HTTPException(status_code=404, detail="Транскрипция не найдена")
        
        if transcript.status != "completed":
            raise HTTPException(status_code=400, detail="Транскрипция ещё не завершена")
        
        # Получаем текст
        text = get_transcript_text(file_id)
        if not text:
            raise HTTPException(status_code=404, detail="Текст транскрипции не найден")
        
        # Параметры
        categories = request.categories if request else None
        
        # Классифицируем
        classification_result = classify_text(text, categories=categories)
        
        # Сохраняем в БД
        ai_data = db.query(TranscriptAI).filter(TranscriptAI.file_id == file_id).first()
        if not ai_data:
            ai_data = TranscriptAI(
                transcript_id=transcript.id,
                file_id=file_id,
                category=classification_result["category"],
                category_confidence=classification_result["confidence"],
                category_created_at=datetime.utcnow()
            )
            db.add(ai_data)
        else:
            ai_data.category = classification_result["category"]
            ai_data.category_confidence = classification_result["confidence"]
            ai_data.category_created_at = datetime.utcnow()
            ai_data.updated_at = datetime.utcnow()
        
        db.commit()
        
        return {
            "file_id": file_id,
            "category": classification_result["category"],
            "confidence": classification_result["confidence"],
            "created_at": ai_data.category_created_at.isoformat() if ai_data.category_created_at else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error classifying transcript: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка классификации: {str(e)}")
    finally:
        db.close()


@router.post("/translate/{file_id}")
async def translate_transcript(
    file_id: str,
    request: TranslateRequest
):
    """
    Переводит транскрипцию на другой язык
    
    Args:
        file_id: ID транскрипции
        request: Параметры (target_language, source_language)
    """
    db = SessionLocal()
    try:
        transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
        if not transcript:
            raise HTTPException(status_code=404, detail="Транскрипция не найдена")
        
        if transcript.status != "completed":
            raise HTTPException(status_code=400, detail="Транскрипция ещё не завершена")
        
        # Получаем текст
        text = get_transcript_text(file_id)
        if not text:
            raise HTTPException(status_code=404, detail="Текст транскрипции не найден")
        
        # Переводим
        translated_text = translate_text(
            text,
            target_language=request.target_language,
            source_language=request.source_language
        )
        
        if not translated_text:
            raise HTTPException(status_code=500, detail="Не удалось выполнить перевод")
        
        # Сохраняем в БД (храним все переводы в JSON)
        ai_data = db.query(TranscriptAI).filter(TranscriptAI.file_id == file_id).first()
        
        translations = {}
        if ai_data and ai_data.translations:
            try:
                translations = json.loads(ai_data.translations)
            except:
                translations = {}
        
        translations[request.target_language] = {
            "text": translated_text,
            "created_at": datetime.utcnow().isoformat()
        }
        
        if not ai_data:
            ai_data = TranscriptAI(
                transcript_id=transcript.id,
                file_id=file_id,
                translations=json.dumps(translations, ensure_ascii=False)
            )
            db.add(ai_data)
        else:
            ai_data.translations = json.dumps(translations, ensure_ascii=False)
            ai_data.updated_at = datetime.utcnow()
        
        db.commit()
        
        return {
            "file_id": file_id,
            "target_language": request.target_language,
            "translated_text": translated_text,
            "created_at": datetime.utcnow().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error translating transcript: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка перевода: {str(e)}")
    finally:
        db.close()


@router.get("/data/{file_id}")
async def get_ai_data(file_id: str):
    """
    Получить все AI-данные для транскрипции
    
    Args:
        file_id: ID транскрипции
    """
    db = SessionLocal()
    try:
        transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
        if not transcript:
            raise HTTPException(status_code=404, detail="Транскрипция не найдена")
        
        ai_data = db.query(TranscriptAI).filter(TranscriptAI.file_id == file_id).first()
        
        if not ai_data:
            return {
                "file_id": file_id,
                "summary": None,
                "keywords": None,
                "sentiment": None,
                "category": None,
                "translations": None
            }
        
        # Парсим JSON поля
        keywords = None
        if ai_data.keywords:
            try:
                keywords = json.loads(ai_data.keywords)
            except:
                pass
        
        sentiment = None
        if ai_data.sentiment:
            try:
                sentiment = json.loads(ai_data.sentiment)
            except:
                pass
        
        translations = None
        if ai_data.translations:
            try:
                translations = json.loads(ai_data.translations)
            except:
                pass
        
        return {
            "file_id": file_id,
            "summary": ai_data.summary,
            "summary_created_at": ai_data.summary_created_at.isoformat() if ai_data.summary_created_at else None,
            "keywords": keywords,
            "keywords_created_at": ai_data.keywords_created_at.isoformat() if ai_data.keywords_created_at else None,
            "sentiment": sentiment,
            "sentiment_created_at": ai_data.sentiment_created_at.isoformat() if ai_data.sentiment_created_at else None,
            "category": ai_data.category,
            "category_confidence": ai_data.category_confidence,
            "category_created_at": ai_data.category_created_at.isoformat() if ai_data.category_created_at else None,
            "translations": translations,
            "created_at": ai_data.created_at.isoformat() if ai_data.created_at else None,
            "updated_at": ai_data.updated_at.isoformat() if ai_data.updated_at else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting AI data: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка получения данных: {str(e)}")
    finally:
        db.close()


@router.get("/languages")
async def get_languages():
    """
    Получить список поддерживаемых языков для перевода
    """
    languages = get_supported_languages()
    return {
        "languages": languages,
        "count": len(languages)
    }


@router.post("/translate-segment")
async def translate_segment(request: TranslateSegmentRequest):
    """
    Перевести отдельный сегмент текста (для построчного перевода)
    
    Body:
    {
        "text": "текст для перевода",
        "target_language": "ru"
    }
    """
    try:
        if not request.text or not request.text.strip():
            raise HTTPException(status_code=400, detail="Текст не указан")
        
        # Проверяем доступность googletrans
        from ..ai_service import GOOGLETRANS_AVAILABLE
        if not GOOGLETRANS_AVAILABLE:
            logger.warning("googletrans не установлен")
            raise HTTPException(
                status_code=503, 
                detail="Перевод недоступен: googletrans не установлен. Установите: pip install googletrans==4.0.0rc1"
            )
        
        # Выполняем перевод в отдельном потоке, чтобы не блокировать
        import asyncio
        import concurrent.futures
        
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as executor:
            translated = await loop.run_in_executor(
                executor,
                lambda: translate_text(request.text, target_language=request.target_language)
            )
        
        if not translated:
            logger.error(f"Translation returned None for text: {request.text[:50]}...")
            raise HTTPException(
                status_code=500, 
                detail="Не удалось выполнить перевод. Возможно, превышен лимит запросов к Google Translate или проблема с сетью."
            )
        
        return {
            "translated_text": translated,
            "original_text": request.text,
            "target_language": request.target_language
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error translating segment: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Ошибка перевода: {str(e)}")


@router.post("/analyze-all/{file_id}")
async def analyze_all(file_id: str):
    """
    Выполнить все AI-анализы для транскрипции (резюме, ключевые слова, sentiment, классификация)
    
    Args:
        file_id: ID транскрипции
    """
    db = SessionLocal()
    try:
        transcript = db.query(Transcript).filter(Transcript.file_id == file_id).first()
        if not transcript:
            raise HTTPException(status_code=404, detail="Транскрипция не найдена")
        
        if transcript.status != "completed":
            raise HTTPException(status_code=400, detail="Транскрипция ещё не завершена")
        
        # Получаем текст
        text = get_transcript_text(file_id)
        if not text:
            raise HTTPException(status_code=404, detail="Текст транскрипции не найден")
        
        # Выполняем все анализы
        summary = generate_summary(text)
        keywords = extract_keywords(text)
        sentiment = analyze_sentiment(text)
        classification = classify_text(text)
        
        # Сохраняем в БД
        ai_data = db.query(TranscriptAI).filter(TranscriptAI.file_id == file_id).first()
        now = datetime.utcnow()
        
        if not ai_data:
            ai_data = TranscriptAI(
                transcript_id=transcript.id,
                file_id=file_id,
                summary=summary,
                summary_created_at=now,
                keywords=json.dumps(keywords, ensure_ascii=False),
                keywords_created_at=now,
                sentiment=json.dumps(sentiment, ensure_ascii=False),
                sentiment_created_at=now,
                category=classification["category"],
                category_confidence=classification["confidence"],
                category_created_at=now
            )
            db.add(ai_data)
        else:
            ai_data.summary = summary
            ai_data.summary_created_at = now
            ai_data.keywords = json.dumps(keywords, ensure_ascii=False)
            ai_data.keywords_created_at = now
            ai_data.sentiment = json.dumps(sentiment, ensure_ascii=False)
            ai_data.sentiment_created_at = now
            ai_data.category = classification["category"]
            ai_data.category_confidence = classification["confidence"]
            ai_data.category_created_at = now
            ai_data.updated_at = now
        
        db.commit()
        
        return {
            "file_id": file_id,
            "summary": summary,
            "keywords": keywords,
            "sentiment": sentiment,
            "category": classification["category"],
            "category_confidence": classification["confidence"],
            "message": "Все анализы выполнены успешно"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error in analyze-all: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка выполнения анализов: {str(e)}")
    finally:
        db.close()
