# Conversation Language Trainer - Документация

## Описание

Языковой тренажёр для изучения иностранных языков через диалог с AI. Поддерживает немецкий и английский языки, уровни A1-B2.

## Установка

### 1. Установите зависимости

```bash
cd backend
pip install -r requirements.txt
```

**Новые зависимости:**
- `openai` - для AI-диалога (опционально, можно использовать без него)
- `language-tool-python` - для грамматической проверки

### 2. Настройте переменные окружения

Создайте файл `.env` или установите переменные:

```bash
export OPENAI_API_KEY="your-api-key-here"  # Опционально, для AI-диалога
```

**Примечание:** Если `OPENAI_API_KEY` не установлен, система будет использовать fallback логику (только грамматическая проверка).

### 3. Выполните миграцию БД

```bash
python migrate_db.py
```

Это создаст таблицы:
- `conversations` - диалоги
- `conversation_messages` - сообщения в диалогах

## Использование

### Backend API

#### Начать диалог
```
POST /conversation/start
Body: {
    "language": "de",  // "de" или "en"
    "level": "B1",     // "A1", "A2", "B1", "B2"
    "topic": "restaurant"  // опционально
}
```

#### Отправить сообщение
```
POST /conversation/message
Body: {
    "conversation_id": 1,
    "text": "Ich möchte Kaffee trinken",
    "audio_url": null  // опционально
}
```

#### Получить историю
```
GET /conversation/history/{conversation_id}
```

#### Получить список диалогов
```
GET /conversation/list?limit=20&offset=0
```

#### Получить статистику
```
GET /conversation/stats/{conversation_id}
```

#### Получить темы
```
GET /conversation/topics/{language}
```

### Frontend

Откройте `frontend/conversation.html` в браузере.

**Функции:**
- Выбор языка и уровня
- Голосовой ввод (Web Speech API)
- Текстовый ввод
- Автоматическая коррекция ошибок
- История диалогов
- Статистика

## Архитектура

### Backend

- `backend/app/models.py` - модели БД (Conversation, ConversationMessage)
- `backend/app/conversation_service.py` - сервис для AI-диалога и коррекции
- `backend/app/routes/conversation.py` - API endpoints

### Frontend

- `frontend/conversation.html` - основная страница
- `frontend/js/conversation.js` - логика чата
- `frontend/js/speech-recognition.js` - распознавание речи
- `frontend/css/conversation.css` - стили

## Особенности

### Real-time STT
Использует Web Speech API браузера для мгновенного распознавания речи.

### AI-диалог
- OpenAI GPT-4o-mini (если API key установлен)
- Fallback на простую логику без AI

### Грамматическая проверка
- LanguageTool для базовой проверки
- AI для контекстных исправлений

### Уровни сложности
- **A1-A2**: Минимум исправлений, простые объяснения
- **B1-B2**: Детальные объяснения, стиль и нюансы

## Troubleshooting

### Голосовой ввод не работает
- Проверьте разрешения микрофона в браузере
- Убедитесь, что используете HTTPS или localhost
- Web Speech API поддерживается в Chrome, Edge, Safari

### AI-диалог не работает
- Проверьте `OPENAI_API_KEY`
- Если ключ не установлен, система использует fallback

### Грамматическая проверка не работает
- Установите `language-tool-python`: `pip install language-tool-python`
- При первом использовании LanguageTool загрузит языковые данные

## Будущие улучшения

- TTS (голосовой ответ бота)
- Экспорт диалогов
- Анализ произношения
- Тематические диалоги
- Статистика прогресса


## Описание

Языковой тренажёр для изучения иностранных языков через диалог с AI. Поддерживает немецкий и английский языки, уровни A1-B2.

## Установка

### 1. Установите зависимости

```bash
cd backend
pip install -r requirements.txt
```

**Новые зависимости:**
- `openai` - для AI-диалога (опционально, можно использовать без него)
- `language-tool-python` - для грамматической проверки

### 2. Настройте переменные окружения

Создайте файл `.env` или установите переменные:

```bash
export OPENAI_API_KEY="your-api-key-here"  # Опционально, для AI-диалога
```

**Примечание:** Если `OPENAI_API_KEY` не установлен, система будет использовать fallback логику (только грамматическая проверка).

### 3. Выполните миграцию БД

```bash
python migrate_db.py
```

Это создаст таблицы:
- `conversations` - диалоги
- `conversation_messages` - сообщения в диалогах

## Использование

### Backend API

#### Начать диалог
```
POST /conversation/start
Body: {
    "language": "de",  // "de" или "en"
    "level": "B1",     // "A1", "A2", "B1", "B2"
    "topic": "restaurant"  // опционально
}
```

#### Отправить сообщение
```
POST /conversation/message
Body: {
    "conversation_id": 1,
    "text": "Ich möchte Kaffee trinken",
    "audio_url": null  // опционально
}
```

#### Получить историю
```
GET /conversation/history/{conversation_id}
```

#### Получить список диалогов
```
GET /conversation/list?limit=20&offset=0
```

#### Получить статистику
```
GET /conversation/stats/{conversation_id}
```

#### Получить темы
```
GET /conversation/topics/{language}
```

### Frontend

Откройте `frontend/conversation.html` в браузере.

**Функции:**
- Выбор языка и уровня
- Голосовой ввод (Web Speech API)
- Текстовый ввод
- Автоматическая коррекция ошибок
- История диалогов
- Статистика

## Архитектура

### Backend

- `backend/app/models.py` - модели БД (Conversation, ConversationMessage)
- `backend/app/conversation_service.py` - сервис для AI-диалога и коррекции
- `backend/app/routes/conversation.py` - API endpoints

### Frontend

- `frontend/conversation.html` - основная страница
- `frontend/js/conversation.js` - логика чата
- `frontend/js/speech-recognition.js` - распознавание речи
- `frontend/css/conversation.css` - стили

## Особенности

### Real-time STT
Использует Web Speech API браузера для мгновенного распознавания речи.

### AI-диалог
- OpenAI GPT-4o-mini (если API key установлен)
- Fallback на простую логику без AI

### Грамматическая проверка
- LanguageTool для базовой проверки
- AI для контекстных исправлений

### Уровни сложности
- **A1-A2**: Минимум исправлений, простые объяснения
- **B1-B2**: Детальные объяснения, стиль и нюансы

## Troubleshooting

### Голосовой ввод не работает
- Проверьте разрешения микрофона в браузере
- Убедитесь, что используете HTTPS или localhost
- Web Speech API поддерживается в Chrome, Edge, Safari

### AI-диалог не работает
- Проверьте `OPENAI_API_KEY`
- Если ключ не установлен, система использует fallback

### Грамматическая проверка не работает
- Установите `language-tool-python`: `pip install language-tool-python`
- При первом использовании LanguageTool загрузит языковые данные

## Будущие улучшения

- TTS (голосовой ответ бота)
- Экспорт диалогов
- Анализ произношения
- Тематические диалоги
- Статистика прогресса









