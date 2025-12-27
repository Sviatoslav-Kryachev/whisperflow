from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Text
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)
    password = Column(String)

class Folder(Base):
    __tablename__ = "folders"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    user_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Transcript(Base):
    __tablename__ = "transcripts"
    id = Column(Integer, primary_key=True)
    file_id = Column(String, unique=True)  # UUID файла
    user_id = Column(Integer)
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True)
    filename = Column(String)
    model = Column(String)
    language = Column(String, nullable=True)  # Язык аудио (None = автоопределение)
    status = Column(String, default="pending")  # pending, processing, completed, failed
    progress = Column(Float, default=0.0)  # 0.0 - 100.0
    status_message = Column(String, nullable=True)  # Текущий этап обработки
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(String, nullable=True)

class TranscriptAI(Base):
    __tablename__ = "transcript_ai"
    id = Column(Integer, primary_key=True)
    transcript_id = Column(Integer, ForeignKey("transcripts.id"), nullable=False)
    file_id = Column(String, nullable=False)  # Для быстрого поиска
    
    # Резюме
    summary = Column(Text, nullable=True)
    summary_created_at = Column(DateTime, nullable=True)
    
    # Ключевые слова (JSON строка: ["слово1", "слово2"])
    keywords = Column(Text, nullable=True)
    keywords_created_at = Column(DateTime, nullable=True)
    
    # Sentiment analysis (JSON: {"sentiment": "positive/negative/neutral", "score": 0.85})
    sentiment = Column(Text, nullable=True)
    sentiment_created_at = Column(DateTime, nullable=True)
    
    # Классификация/категория
    category = Column(String, nullable=True)
    category_confidence = Column(Float, nullable=True)
    category_created_at = Column(DateTime, nullable=True)
    
    # Перевод (JSON: {"target_language": "en", "translated_text": "..."})
    translations = Column(Text, nullable=True)  # JSON объект с переводами на разные языки
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Conversation(Base):
    """Диалог для языкового тренажёра"""
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=True)  # Пока nullable, потом можно добавить ForeignKey
    language = Column(String, nullable=False)  # "de", "en", etc.
    level = Column(String, nullable=False)  # "A1", "A2", "B1", "B2"
    topic = Column(String, nullable=True)  # Тема диалога (опционально)
    total_messages = Column(Integer, default=0)  # Количество сообщений
    total_corrections = Column(Integer, default=0)  # Количество исправлений
    duration_seconds = Column(Integer, default=0)  # Длительность диалога в секундах
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ConversationMessage(Base):
    """Сообщение в диалоге"""
    __tablename__ = "conversation_messages"
    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    role = Column(String, nullable=False)  # "user" или "bot"
    content = Column(Text, nullable=False)  # Текст сообщения
    original_text = Column(Text, nullable=True)  # Оригинальный текст пользователя (если была коррекция)
    is_corrected = Column(Integer, default=0)  # 0 или 1 - было ли исправление
    correction_data = Column(Text, nullable=True)  # JSON с данными коррекции
    audio_url = Column(String, nullable=True)  # URL аудио (если есть)
    created_at = Column(DateTime, default=datetime.utcnow)
