"""
AI Service для обработки транскрипций
Поддерживает: резюме, ключевые слова, sentiment analysis, классификацию, перевод
"""
import json
import logging
import threading
from typing import Optional, Dict, List
from pathlib import Path
from .config import TEXT_DIR

logger = logging.getLogger(__name__)

# Попытка импортировать библиотеки для AI
try:
    from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
    from transformers import AutoModelForSeq2SeqLM
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logger.warning("transformers не установлен. Некоторые AI-фичи будут недоступны.")

try:
    from googletrans import Translator
    GOOGLETRANS_AVAILABLE = True
except (ImportError, AttributeError) as e:
    GOOGLETRANS_AVAILABLE = False
    logger.warning(f"googletrans не установлен или несовместим. Перевод будет недоступен. Ошибка: {e}")

# Кэш для моделей (чтобы не загружать каждый раз)
_model_cache = {}
# Трекинг загрузки моделей (защита от параллельной загрузки)
_model_loading = {}


def get_transcript_text(file_id: str) -> Optional[str]:
    """Получить текст транскрипции по file_id"""
    text_path = TEXT_DIR / f"{file_id}.txt"
    if not text_path.exists():
        return None
    try:
        return text_path.read_text(encoding='utf-8')
    except Exception as e:
        logger.error(f"Error reading transcript {file_id}: {e}")
        return None


def _get_sentiment_model():
    """Получить модель для sentiment analysis (кэшированная, с защитой от параллельной загрузки)"""
    if not TRANSFORMERS_AVAILABLE:
        return None
    
    cache_key = "sentiment"
    
    # Если модель уже загружена, возвращаем её
    if cache_key in _model_cache:
        return _model_cache[cache_key]
    
    # Проверяем, не загружается ли модель сейчас
    if cache_key not in _model_loading:
        _model_loading[cache_key] = threading.Lock()
    
    # Если модель загружается в другом потоке, ждем
    if _model_loading[cache_key].locked():
        logger.info("Sentiment model is being loaded in another thread, waiting...")
        _model_loading[cache_key].acquire()
        _model_loading[cache_key].release()
        # После загрузки проверяем кэш снова
        if cache_key in _model_cache:
            return _model_cache[cache_key]
    
    # Загружаем модель
    with _model_loading[cache_key]:
        # Двойная проверка (double-check locking pattern)
        if cache_key in _model_cache:
            return _model_cache[cache_key]
        
        try:
            # Используем русскоязычную модель для sentiment analysis
            model_name = "cointegrated/rubert-tiny-sentiment-balanced"
            logger.info(f"Loading sentiment model: {model_name} (this may take a while on first use)...")
            _model_cache[cache_key] = pipeline(
                "sentiment-analysis",
                model=model_name,
                tokenizer=model_name
            )
            logger.info(f"Loaded sentiment model: {model_name}")
        except Exception as e:
            logger.error(f"Error loading sentiment model: {e}")
            return None
    
    return _model_cache.get(cache_key)


def _get_summarization_model():
    """Получить модель для суммаризации (кэшированная, с защитой от параллельной загрузки)"""
    if not TRANSFORMERS_AVAILABLE:
        return None
    
    cache_key = "summarization"
    
    # Если модель уже загружена, возвращаем её
    if cache_key in _model_cache:
        return _model_cache[cache_key]
    
    # Проверяем, не загружается ли модель сейчас
    if cache_key not in _model_loading:
        _model_loading[cache_key] = threading.Lock()
    
    # Если модель загружается в другом потоке, ждем
    if _model_loading[cache_key].locked():
        logger.info("Summarization model is being loaded in another thread, waiting...")
        _model_loading[cache_key].acquire()
        _model_loading[cache_key].release()
        # После загрузки проверяем кэш снова
        if cache_key in _model_cache:
            return _model_cache[cache_key]
    
    # Загружаем модель
    with _model_loading[cache_key]:
        # Двойная проверка (double-check locking pattern)
        if cache_key in _model_cache:
            return _model_cache[cache_key]
        
        try:
            # Используем русскоязычную модель для суммаризации
            model_name = "IlyaGusev/rut5_base_sum_gazeta"
            logger.info(f"Loading summarization model: {model_name} (this may take a while on first use)...")
            _model_cache[cache_key] = pipeline(
                "summarization",
                model=model_name,
                tokenizer=model_name
            )
            logger.info(f"Loaded summarization model: {model_name}")
        except ValueError as e:
            # Специальная обработка ошибки torch версии
            if "torch to at least v2.6" in str(e) or "CVE-2025-32434" in str(e):
                logger.warning(
                    f"Summarization model requires torch 2.6+ (current: {__import__('torch').__version__}). "
                    f"Summarization will use fallback method (first sentences). "
                    f"To enable full summarization, upgrade torch: pip install --upgrade torch>=2.6.0"
                )
            else:
                logger.warning(f"Could not load summarization model: {e}")
            return None
        except Exception as e:
            logger.warning(f"Could not load summarization model: {e}")
            return None
    
    return _model_cache.get(cache_key)


def generate_summary(text: str, max_length: int = 150, min_length: int = 30) -> Optional[str]:
    """
    Генерирует резюме транскрипции
    
    Args:
        text: Текст транскрипции
        max_length: Максимальная длина резюме
        min_length: Минимальная длина резюме
    
    Returns:
        Резюме текста или None при ошибке
    """
    if not text or len(text.strip()) < 50:
        return "Текст слишком короткий для создания резюме"
    
    if not TRANSFORMERS_AVAILABLE:
        # Простое резюме на основе первых предложений
        sentences = text.split('.')
        summary = '. '.join(sentences[:3]) + '.'
        return summary[:max_length]
    
    try:
        summarizer = _get_summarization_model()
        if not summarizer:
            # Fallback: первые предложения
            sentences = text.split('.')
            summary = '. '.join(sentences[:3]) + '.'
            return summary[:max_length]
        
        # Ограничиваем длину входного текста (модели имеют лимиты)
        max_input_length = 512
        if len(text) > max_input_length:
            text = text[:max_input_length]
        
        result = summarizer(text, max_length=max_length, min_length=min_length, do_sample=False)
        summary = result[0]['summary_text']
        return summary.strip()
    
    except Exception as e:
        logger.error(f"Error generating summary: {e}")
        # Fallback
        sentences = text.split('.')
        summary = '. '.join(sentences[:3]) + '.'
        return summary[:max_length]


def extract_keywords(text: str, num_keywords: int = 10) -> List[str]:
    """
    Извлекает ключевые слова из текста
    
    Args:
        text: Текст транскрипции
        num_keywords: Количество ключевых слов
    
    Returns:
        Список ключевых слов
    """
    if not text:
        return []
    
    try:
        # Простой метод: TF-IDF на основе частоты слов
        import re
        from collections import Counter
        
        # Удаляем знаки препинания, приводим к нижнему регистру
        words = re.findall(r'\b[а-яёa-z]{3,}\b', text.lower())
        
        # Стоп-слова (русские и английские)
        stop_words = {
            'это', 'как', 'так', 'что', 'для', 'или', 'был', 'была', 'было', 'были',
            'его', 'её', 'их', 'него', 'неё', 'них', 'который', 'которая', 'которое',
            'которые', 'которого', 'которой', 'которым', 'которыми', 'the', 'is', 'are',
            'was', 'were', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
            'with', 'by', 'from', 'as', 'an', 'a', 'that', 'this', 'these', 'those'
        }
        
        # Фильтруем стоп-слова
        filtered_words = [w for w in words if w not in stop_words]
        
        # Подсчитываем частоту
        word_freq = Counter(filtered_words)
        
        # Возвращаем топ-N слов
        keywords = [word for word, count in word_freq.most_common(num_keywords)]
        
        return keywords
    
    except Exception as e:
        logger.error(f"Error extracting keywords: {e}")
        return []


def analyze_sentiment(text: str) -> Dict[str, any]:
    """
    Анализирует тональность текста
    
    Args:
        text: Текст транскрипции
    
    Returns:
        Словарь с sentiment и score: {"sentiment": "positive/negative/neutral", "score": 0.85}
    """
    if not text:
        return {"sentiment": "neutral", "score": 0.5}
    
    if not TRANSFORMERS_AVAILABLE:
        # Простой эвристический анализ
        positive_words = ['хорошо', 'отлично', 'прекрасно', 'замечательно', 'спасибо', 'благодарю']
        negative_words = ['плохо', 'ужасно', 'проблема', 'ошибка', 'неправильно']
        
        text_lower = text.lower()
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        if positive_count > negative_count:
            return {"sentiment": "positive", "score": min(0.7, 0.5 + positive_count * 0.1)}
        elif negative_count > positive_count:
            return {"sentiment": "negative", "score": min(0.7, 0.5 + negative_count * 0.1)}
        else:
            return {"sentiment": "neutral", "score": 0.5}
    
    try:
        sentiment_model = _get_sentiment_model()
        if not sentiment_model:
            # Fallback
            return {"sentiment": "neutral", "score": 0.5}
        
        # Ограничиваем длину текста
        max_length = 512
        if len(text) > max_length:
            text = text[:max_length]
        
        result = sentiment_model(text)
        
        # Преобразуем результат модели в наш формат
        label = result[0]['label'].lower()
        score = result[0]['score']
        
        # Маппинг меток модели на наши
        if 'positive' in label or 'позитив' in label:
            sentiment = "positive"
        elif 'negative' in label or 'негатив' in label:
            sentiment = "negative"
        else:
            sentiment = "neutral"
        
        return {
            "sentiment": sentiment,
            "score": float(score)
        }
    
    except Exception as e:
        logger.error(f"Error analyzing sentiment: {e}")
        return {"sentiment": "neutral", "score": 0.5}


def classify_text(text: str, categories: Optional[List[str]] = None) -> Dict[str, any]:
    """
    Классифицирует текст по категориям
    
    Args:
        text: Текст транскрипции
        categories: Список возможных категорий (если None, используется предопределённый список)
    
    Returns:
        Словарь с category и confidence: {"category": "встреча", "confidence": 0.85}
    """
    if not text:
        return {"category": "другое", "confidence": 0.0}
    
    # Предопределённые категории
    if categories is None:
        categories = [
            "встреча", "интервью", "лекция", "подкаст", "звонок",
            "презентация", "конференция", "обучение", "медицинская консультация",
            "юридическая консультация", "другое"
        ]
    
    # Простая классификация на основе ключевых слов
    text_lower = text.lower()
    
    category_keywords = {
        "встреча": ["встреча", "совещание", "обсуждение", "план", "задача"],
        "интервью": ["интервью", "вопрос", "ответ", "расскажите"],
        "лекция": ["лекция", "урок", "обучение", "материал", "тема"],
        "подкаст": ["подкаст", "эпизод", "выпуск"],
        "звонок": ["звонок", "телефон", "разговор"],
        "презентация": ["презентация", "слайд", "демонстрация"],
        "конференция": ["конференция", "доклад", "выступление"],
        "обучение": ["обучение", "курс", "занятие", "урок"],
        "медицинская консультация": ["врач", "лечение", "диагноз", "симптом", "болезнь", "медицин"],
        "юридическая консультация": ["юрист", "договор", "право", "закон", "суд"]
    }
    
    # Подсчитываем совпадения для каждой категории
    category_scores = {}
    for category, keywords in category_keywords.items():
        if category in categories:
            matches = sum(1 for keyword in keywords if keyword in text_lower)
            category_scores[category] = matches
    
    # Находим категорию с максимальным количеством совпадений
    if category_scores and max(category_scores.values()) > 0:
        best_category = max(category_scores, key=category_scores.get)
        confidence = min(0.95, 0.3 + category_scores[best_category] * 0.15)
        return {
            "category": best_category,
            "confidence": confidence
        }
    
    return {
        "category": "другое",
        "confidence": 0.5
    }


def translate_text(text: str, target_language: str = "en", source_language: Optional[str] = None) -> Optional[str]:
    """
    Переводит текст на другой язык
    
    Args:
        text: Текст для перевода
        target_language: Целевой язык (код языка, например "en", "de", "fr")
        source_language: Исходный язык (если None, определяется автоматически)
    
    Returns:
        Переведённый текст или None при ошибке
    """
    if not text:
        return None
    
    if not GOOGLETRANS_AVAILABLE:
        logger.warning("googletrans не установлен. Перевод недоступен.")
        return None
    
    try:
        translator = Translator()
        
        # Ограничиваем длину текста (Google Translate имеет лимиты)
        max_length = 5000
        if len(text) > max_length:
            logger.warning(f"Text too long ({len(text)} chars), truncating to {max_length}")
            text = text[:max_length]
        
        # Переводим с повторными попытками при ошибках
        max_retries = 3
        for attempt in range(max_retries):
            try:
                result = translator.translate(
                    text,
                    dest=target_language,
                    src=source_language
                )
                
                if result and result.text:
                    return result.text
                else:
                    logger.warning(f"Translation returned empty result (attempt {attempt + 1}/{max_retries})")
                    if attempt < max_retries - 1:
                        import time
                        time.sleep(0.5 * (attempt + 1))  # Экспоненциальная задержка
                    continue
                    
            except Exception as e:
                logger.warning(f"Translation attempt {attempt + 1}/{max_retries} failed: {e}")
                if attempt < max_retries - 1:
                    import time
                    time.sleep(0.5 * (attempt + 1))  # Экспоненциальная задержка
                else:
                    raise
        
        return None
    
    except Exception as e:
        logger.error(f"Error translating text after {max_retries} attempts: {e}", exc_info=True)
        return None


def get_supported_languages() -> Dict[str, str]:
    """Возвращает список поддерживаемых языков для перевода"""
    if not GOOGLETRANS_AVAILABLE:
        return {}
    
    # Основные языки
    return {
        "en": "English",
        "de": "Deutsch",
        "fr": "Français",
        "es": "Español",
        "it": "Italiano",
        "pt": "Português",
        "ru": "Русский",
        "zh": "中文",
        "ja": "日本語",
        "ko": "한국어",
        "ar": "العربية",
        "tr": "Türkçe",
        "pl": "Polski",
        "nl": "Nederlands",
        "sv": "Svenska",
        "no": "Norsk",
        "da": "Dansk",
        "fi": "Suomi",
        "cs": "Čeština",
        "uk": "Українська"
    }
