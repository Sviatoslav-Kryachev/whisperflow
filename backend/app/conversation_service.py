"""
Conversation Service для языкового тренажёра
Обрабатывает диалоги, коррекцию ошибок, AI-ответы
"""
import json
import logging
import os
from typing import Optional, Dict, List, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)

# Попытка импортировать OpenAI
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("openai не установлен. Для AI-диалога установите: pip install openai")

# Попытка импортировать LanguageTool для грамматики
try:
    import language_tool_python
    LANGUAGETOOL_AVAILABLE = True
except ImportError:
    LANGUAGETOOL_AVAILABLE = False
    logger.warning("language_tool_python не установлен. Грамматическая проверка будет ограничена.")

# Глобальные переменные для кэширования
_language_tool = {}
_openai_client = None


def get_openai_client():
    """Получить клиент OpenAI (кэшированный)"""
    global _openai_client
    
    if not OPENAI_AVAILABLE:
        return None
    
    if _openai_client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            _openai_client = openai.OpenAI(api_key=api_key)
        else:
            logger.warning("OPENAI_API_KEY не установлен. AI-диалог будет недоступен.")
    
    return _openai_client


def get_language_tool(language: str = "de-DE"):
    """Получить LanguageTool для языка (кэшированный)"""
    global _language_tool
    
    if not LANGUAGETOOL_AVAILABLE:
        return None
    
    if language not in _language_tool:
        try:
            _language_tool[language] = language_tool_python.LanguageTool(language)
        except Exception as e:
            logger.error(f"Error loading LanguageTool for {language}: {e}")
            return None
    
    return _language_tool.get(language)


def check_grammar(text: str, language: str = "de") -> Dict:
    """
    Проверка грамматики с помощью LanguageTool
    
    Returns:
        {
            "has_errors": bool,
            "errors": List[Dict],
            "corrected_text": str
        }
    """
    if not LANGUAGETOOL_AVAILABLE:
        return {
            "has_errors": False,
            "errors": [],
            "corrected_text": text
        }
    
    # Маппинг языков для LanguageTool
    lang_map = {
        "de": "de-DE",
        "en": "en-US",
        "fr": "fr-FR",
        "es": "es-ES"
    }
    
    lang_code = lang_map.get(language, "de-DE")
    tool = get_language_tool(lang_code)
    
    if not tool:
        return {
            "has_errors": False,
            "errors": [],
            "corrected_text": text
        }
    
    try:
        matches = tool.check(text)
        
        if not matches:
            return {
                "has_errors": False,
                "errors": [],
                "corrected_text": text
            }
        
        # Формируем список ошибок
        errors = []
        for match in matches:
            errors.append({
                "message": match.message,
                "rule_id": match.ruleId,
                "replacements": match.replacements[:3] if match.replacements else [],
                "offset": match.offset,
                "length": match.errorLength
            })
        
        # Пытаемся исправить текст
        corrected_text = tool.correct(text)
        
        return {
            "has_errors": True,
            "errors": errors,
            "corrected_text": corrected_text
        }
    except Exception as e:
        logger.error(f"Error checking grammar: {e}")
        return {
            "has_errors": False,
            "errors": [],
            "corrected_text": text
        }


def analyze_with_ai(
    user_text: str,
    conversation_history: List[Dict],
    language: str,
    level: str,
    grammar_check: Dict
) -> Dict:
    """
    Анализ текста пользователя с помощью AI (OpenAI GPT)
    
    Args:
        user_text: Текст пользователя
        conversation_history: История диалога
        language: Язык обучения ("de", "en")
        level: Уровень ("A1", "A2", "B1", "B2")
        grammar_check: Результат грамматической проверки
    
    Returns:
        {
            "is_correct": bool,
            "corrected_text": str,
            "explanation": str,
            "bot_response": str,
            "correction_data": Dict
        }
    """
    client = get_openai_client()
    
    if not client:
        # Fallback: простая логика без AI
        if grammar_check.get("has_errors"):
            return {
                "is_correct": False,
                "corrected_text": grammar_check.get("corrected_text", user_text),
                "explanation": "Обнаружены грамматические ошибки. Проверьте текст.",
                "bot_response": "Попробуйте исправить ошибки и продолжить диалог.",
                "correction_data": grammar_check
            }
        else:
            return {
                "is_correct": True,
                "corrected_text": user_text,
                "explanation": "",
                "bot_response": "Отлично! Продолжайте.",
                "correction_data": {}
            }
    
    # Формируем системный промпт
    level_descriptions = {
        "A1": "начинающий уровень, простые фразы",
        "A2": "базовый уровень, повседневные темы",
        "B1": "средний уровень, более сложные конструкции",
        "B2": "продвинутый уровень, нюансы и стиль"
    }
    
    lang_names = {
        "de": "немецкий",
        "en": "английский",
        "fr": "французский",
        "es": "испанский"
    }
    
    system_prompt = f"""Ты - дружелюбный языковой тренер для изучения {lang_names.get(language, language)} языка.
Уровень ученика: {level} ({level_descriptions.get(level, "")}).

Твоя задача:
1. Проверить правильность фразы ученика
2. Если есть ошибки - предложить исправление
3. Дать краткое объяснение (на русском, простым языком)
4. Продолжить диалог естественным образом

Важно:
- На уровнях A1-A2 исправляй только критичные ошибки
- На уровнях B1-B2 можно указывать на стиль и нюансы
- Будь дружелюбным и поддерживающим
- Отвечай коротко (1-2 предложения)
- Используй emoji умеренно (✅, ❌, 💡)

Формат ответа (JSON):
{{
    "is_correct": true/false,
    "corrected_text": "исправленный текст или оригинал",
    "explanation": "краткое объяснение на русском",
    "bot_response": "твой ответ для продолжения диалога"
}}"""
    
    # Формируем историю для контекста
    messages = [{"role": "system", "content": system_prompt}]
    
    # Добавляем историю (последние 10 сообщений для контекста)
    for msg in conversation_history[-10:]:
        if msg["role"] == "user":
            messages.append({"role": "user", "content": msg["content"]})
        else:
            messages.append({"role": "assistant", "content": msg["content"]})
    
    # Добавляем текущее сообщение пользователя
    messages.append({"role": "user", "content": user_text})
    
    # Если есть грамматические ошибки, добавляем информацию
    if grammar_check.get("has_errors"):
        grammar_info = f"\n\n[Грамматическая проверка обнаружила ошибки: {len(grammar_check.get('errors', []))}]"
        messages[-1]["content"] += grammar_info
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Используем быструю и дешёвую модель
            messages=messages,
            temperature=0.7,
            max_tokens=300
        )
        
        # Пытаемся распарсить JSON ответ
        content = response.choices[0].message.content.strip()
        
        # Если ответ не в формате JSON, пытаемся извлечь JSON из текста
        try:
            if content.startswith('{') and content.endswith('}'):
                result = json.loads(content)
            else:
                # Пытаемся найти JSON в тексте
                import re
                json_match = re.search(r'\{[^}]+\}', content)
                if json_match:
                    result = json.loads(json_match.group())
                else:
                    # Если не JSON, создаём структуру из текста
                    result = {
                        "is_correct": True,
                        "corrected_text": user_text,
                        "explanation": "",
                        "bot_response": content
                    }
        except json.JSONDecodeError:
            # Если не удалось распарсить, используем текст как ответ бота
            result = {
                "is_correct": True,
                "corrected_text": user_text,
                "explanation": "",
                "bot_response": content
            }
        
        return {
            "is_correct": result.get("is_correct", True),
            "corrected_text": result.get("corrected_text", user_text),
            "explanation": result.get("explanation", ""),
            "bot_response": result.get("bot_response", "Продолжайте диалог."),
            "correction_data": {
                "grammar_check": grammar_check,
                "ai_analysis": result
            }
        }
    except Exception as e:
        logger.error(f"Error in AI analysis: {e}")
        # Fallback на простую логику
        if grammar_check.get("has_errors"):
            return {
                "is_correct": False,
                "corrected_text": grammar_check.get("corrected_text", user_text),
                "explanation": "Обнаружены грамматические ошибки.",
                "bot_response": "Попробуйте исправить и продолжить.",
                "correction_data": grammar_check
            }
        else:
            return {
                "is_correct": True,
                "corrected_text": user_text,
                "explanation": "",
                "bot_response": "Хорошо! Продолжайте.",
                "correction_data": {}
            }


def generate_bot_greeting(language: str, level: str, topic: Optional[str] = None) -> str:
    """Генерирует приветствие бота"""
    greetings = {
        "de": {
            "A1": "Hallo! Ich freue mich, mit Ihnen zu sprechen. Worüber möchten Sie reden?",
            "A2": "Guten Tag! Lassen Sie uns ein Gespräch führen. Was interessiert Sie?",
            "B1": "Hallo! Schön, Sie kennenzulernen. Womit kann ich Ihnen helfen?",
            "B2": "Guten Tag! Ich bin bereit für unser Gespräch. Worüber soll es gehen?"
        },
        "en": {
            "A1": "Hello! I'm happy to talk with you. What would you like to talk about?",
            "A2": "Hi there! Let's have a conversation. What interests you?",
            "B1": "Hello! Nice to meet you. How can I help you today?",
            "B2": "Good day! I'm ready for our conversation. What topic would you like to discuss?"
        }
    }
    
    if topic:
        topic_greetings = {
            "de": f"Lassen Sie uns über {topic} sprechen!",
            "en": f"Let's talk about {topic}!"
        }
        return topic_greetings.get(language, greetings.get(language, {}).get(level, "Hello!"))
    
    return greetings.get(language, {}).get(level, "Hello! Let's start our conversation.")


def get_conversation_topics(language: str) -> List[Dict]:
    """Получить список тем для диалога"""
    topics = {
        "de": [
            {"id": "greeting", "name": "Знакомство", "description": "Представьтесь и познакомьтесь"},
            {"id": "restaurant", "name": "В ресторане", "description": "Заказ еды, общение с официантом"},
            {"id": "shopping", "name": "Покупки", "description": "В магазине, вопросы о товарах"},
            {"id": "work", "name": "На работе", "description": "Рабочие ситуации, коллеги"},
            {"id": "travel", "name": "Путешествия", "description": "В аэропорту, в отеле, направления"},
            {"id": "daily", "name": "Повседневная жизнь", "description": "Быт, семья, хобби"}
        ],
        "en": [
            {"id": "greeting", "name": "Introduction", "description": "Introduce yourself and meet people"},
            {"id": "restaurant", "name": "At a Restaurant", "description": "Ordering food, talking to waiter"},
            {"id": "shopping", "name": "Shopping", "description": "At a store, asking about products"},
            {"id": "work", "name": "At Work", "description": "Work situations, colleagues"},
            {"id": "travel", "name": "Travel", "description": "At airport, hotel, directions"},
            {"id": "daily", "name": "Daily Life", "description": "Daily routine, family, hobbies"}
        ]
    }
    
    return topics.get(language, topics["de"])

