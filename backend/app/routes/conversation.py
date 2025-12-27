"""
API Routes для языкового тренажёра (Conversation)
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
import logging

from ..database import SessionLocal
from ..models import Conversation, ConversationMessage
from ..conversation_service import (
    check_grammar,
    analyze_with_ai,
    generate_bot_greeting,
    get_conversation_topics
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/conversation", tags=["conversation"])


# Pydantic модели для запросов
class StartConversationRequest(BaseModel):
    language: str  # "de", "en"
    level: str  # "A1", "A2", "B1", "B2"
    topic: Optional[str] = None


class SendMessageRequest(BaseModel):
    conversation_id: int
    text: str
    audio_url: Optional[str] = None


class ProcessAudioRequest(BaseModel):
    conversation_id: int
    text: str  # Распознанный текст из STT
    audio_url: Optional[str] = None


# Endpoints
@router.post("/start")
async def start_conversation(request: StartConversationRequest):
    """Начать новый диалог"""
    db = SessionLocal()
    try:
        # Создаём новый диалог
        conversation = Conversation(
            user_id=None,  # Пока без авторизации
            language=request.language,
            level=request.level,
            topic=request.topic
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        
        # Генерируем приветствие бота
        greeting = generate_bot_greeting(request.language, request.level, request.topic)
        
        # Сохраняем приветствие как первое сообщение бота
        bot_message = ConversationMessage(
            conversation_id=conversation.id,
            role="bot",
            content=greeting,
            is_corrected=0
        )
        db.add(bot_message)
        db.commit()
        
        return {
            "conversation_id": conversation.id,
            "language": conversation.language,
            "level": conversation.level,
            "topic": conversation.topic,
            "greeting": greeting,
            "created_at": conversation.created_at.isoformat()
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error starting conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка создания диалога: {str(e)}")
    finally:
        db.close()


@router.post("/message")
async def send_message(request: SendMessageRequest):
    """Отправить сообщение в диалог"""
    db = SessionLocal()
    try:
        # Проверяем существование диалога
        conversation = db.query(Conversation).filter(
            Conversation.id == request.conversation_id
        ).first()
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Диалог не найден")
        
        # Сохраняем сообщение пользователя
        user_message = ConversationMessage(
            conversation_id=request.conversation_id,
            role="user",
            content=request.text,
            original_text=request.text,
            audio_url=request.audio_url
        )
        db.add(user_message)
        db.flush()
        
        # Получаем историю диалога для контекста
        history_messages = db.query(ConversationMessage).filter(
            ConversationMessage.conversation_id == request.conversation_id
        ).order_by(ConversationMessage.created_at).all()
        
        history = [
            {
                "role": msg.role,
                "content": msg.content
            }
            for msg in history_messages
        ]
        
        # Проверяем грамматику
        grammar_result = check_grammar(request.text, conversation.language)
        
        # Анализируем с помощью AI
        ai_result = analyze_with_ai(
            user_text=request.text,
            conversation_history=history,
            language=conversation.language,
            level=conversation.level,
            grammar_check=grammar_result
        )
        
        # Обновляем сообщение пользователя, если была коррекция
        if not ai_result["is_correct"]:
            user_message.is_corrected = 1
            user_message.correction_data = str(ai_result.get("correction_data", {}))
            conversation.total_corrections += 1
        
        # Сохраняем ответ бота
        bot_message = ConversationMessage(
            conversation_id=request.conversation_id,
            role="bot",
            content=ai_result["bot_response"],
            correction_data=str({
                "is_correct": ai_result["is_correct"],
                "corrected_text": ai_result["corrected_text"],
                "explanation": ai_result["explanation"]
            })
        )
        db.add(bot_message)
        
        # Обновляем статистику диалога
        conversation.total_messages += 2  # Сообщение пользователя + ответ бота
        conversation.updated_at = datetime.utcnow()
        
        db.commit()
        
        return {
            "user_message": {
                "id": user_message.id,
                "text": request.text,
                "is_corrected": bool(user_message.is_corrected),
                "corrected_text": ai_result["corrected_text"] if not ai_result["is_correct"] else None
            },
            "bot_message": {
                "id": bot_message.id,
                "text": ai_result["bot_response"],
                "is_correct": ai_result["is_correct"],
                "explanation": ai_result["explanation"]
            },
            "correction": {
                "has_errors": not ai_result["is_correct"],
                "corrected_text": ai_result["corrected_text"],
                "explanation": ai_result["explanation"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error sending message: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка обработки сообщения: {str(e)}")
    finally:
        db.close()


@router.get("/history/{conversation_id}")
async def get_conversation_history(conversation_id: int):
    """Получить историю диалога"""
    db = SessionLocal()
    try:
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Диалог не найден")
        
        messages = db.query(ConversationMessage).filter(
            ConversationMessage.conversation_id == conversation_id
        ).order_by(ConversationMessage.created_at).all()
        
        return {
            "conversation": {
                "id": conversation.id,
                "language": conversation.language,
                "level": conversation.level,
                "topic": conversation.topic,
                "total_messages": conversation.total_messages,
                "total_corrections": conversation.total_corrections,
                "created_at": conversation.created_at.isoformat()
            },
            "messages": [
                {
                    "id": msg.id,
                    "role": msg.role,
                    "content": msg.content,
                    "original_text": msg.original_text,
                    "is_corrected": bool(msg.is_corrected),
                    "correction_data": msg.correction_data,
                    "created_at": msg.created_at.isoformat()
                }
                for msg in messages
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting history: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка получения истории: {str(e)}")
    finally:
        db.close()


@router.get("/list")
async def list_conversations(limit: int = 20, offset: int = 0):
    """Получить список диалогов"""
    db = SessionLocal()
    try:
        conversations = db.query(Conversation).order_by(
            Conversation.created_at.desc()
        ).offset(offset).limit(limit).all()
        
        total = db.query(Conversation).count()
        
        return {
            "total": total,
            "conversations": [
                {
                    "id": conv.id,
                    "language": conv.language,
                    "level": conv.level,
                    "topic": conv.topic,
                    "total_messages": conv.total_messages,
                    "total_corrections": conv.total_corrections,
                    "duration_seconds": conv.duration_seconds,
                    "created_at": conv.created_at.isoformat()
                }
                for conv in conversations
            ]
        }
    except Exception as e:
        logger.error(f"Error listing conversations: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка получения списка: {str(e)}")
    finally:
        db.close()


@router.get("/topics/{language}")
async def get_topics(language: str):
    """Получить список тем для диалога"""
    try:
        topics = get_conversation_topics(language)
        return {"topics": topics}
    except Exception as e:
        logger.error(f"Error getting topics: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка получения тем: {str(e)}")


@router.get("/stats/{conversation_id}")
async def get_conversation_stats(conversation_id: int):
    """Получить статистику диалога"""
    db = SessionLocal()
    try:
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Диалог не найден")
        
        messages = db.query(ConversationMessage).filter(
            ConversationMessage.conversation_id == conversation_id,
            ConversationMessage.role == "user"
        ).all()
        
        total_words = sum(len(msg.content.split()) for msg in messages)
        corrected_messages = sum(1 for msg in messages if msg.is_corrected)
        
        return {
            "conversation_id": conversation_id,
            "total_messages": conversation.total_messages,
            "user_messages": len(messages),
            "bot_messages": conversation.total_messages - len(messages),
            "total_corrections": conversation.total_corrections,
            "correction_rate": round(corrected_messages / len(messages) * 100, 1) if messages else 0,
            "total_words": total_words,
            "duration_seconds": conversation.duration_seconds,
            "created_at": conversation.created_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка получения статистики: {str(e)}")
    finally:
        db.close()


@router.delete("/{conversation_id}")
async def delete_conversation(conversation_id: int):
    """Удалить диалог"""
    db = SessionLocal()
    try:
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Диалог не найден")
        
        # Удаляем все сообщения
        db.query(ConversationMessage).filter(
            ConversationMessage.conversation_id == conversation_id
        ).delete()
        
        # Удаляем диалог
        db.delete(conversation)
        db.commit()
        
        return {"message": "Диалог удалён", "conversation_id": conversation_id}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка удаления диалога: {str(e)}")
    finally:
        db.close()



