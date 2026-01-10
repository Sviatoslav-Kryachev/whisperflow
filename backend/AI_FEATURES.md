# AI Features API Documentation

WhisperFlow теперь поддерживает AI-фичи для анализа транскрипций.

## Установка зависимостей

```bash
cd backend
pip install -r requirements.txt
```

**Важно:** Для полной функциональности требуется:
- `transformers` - для sentiment analysis и суммаризации (опционально, есть fallback)
- `googletrans` - для перевода (опционально)

## Миграция базы данных

Перед использованием выполните миграцию:

```bash
cd backend
python migrate_db.py
```

Это создаст таблицу `transcript_ai` для хранения AI-метаданных.

## API Endpoints

### 1. Генерация резюме

**POST** `/ai/summary/{file_id}`

Создаёт краткое резюме транскрипции.

**Параметры запроса (body):**
```json
{
  "max_length": 150,  // Максимальная длина резюме (опционально)
  "min_length": 30    // Минимальная длина резюме (опционально)
}
```

**Пример:**
```bash
curl -X POST "http://localhost:8000/ai/summary/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{"max_length": 200, "min_length": 50}'
```

**Ответ:**
```json
{
  "file_id": "123e4567-e89b-12d3-a456-426614174000",
  "summary": "Краткое резюме транскрипции...",
  "created_at": "2025-01-20T10:30:00"
}
```

---

### 2. Извлечение ключевых слов

**POST** `/ai/keywords/{file_id}`

Извлекает ключевые слова из транскрипции.

**Параметры запроса (body):**
```json
{
  "num_keywords": 10  // Количество ключевых слов (опционально)
}
```

**Пример:**
```bash
curl -X POST "http://localhost:8000/ai/keywords/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{"num_keywords": 15}'
```

**Ответ:**
```json
{
  "file_id": "123e4567-e89b-12d3-a456-426614174000",
  "keywords": ["встреча", "проект", "дедлайн", "команда", ...],
  "count": 15,
  "created_at": "2025-01-20T10:30:00"
}
```

---

### 3. Анализ тональности

**POST** `/ai/sentiment/{file_id}`

Анализирует тональность текста (positive/negative/neutral).

**Пример:**
```bash
curl -X POST "http://localhost:8000/ai/sentiment/123e4567-e89b-12d3-a456-426614174000"
```

**Ответ:**
```json
{
  "file_id": "123e4567-e89b-12d3-a456-426614174000",
  "sentiment": {
    "sentiment": "positive",
    "score": 0.85
  },
  "created_at": "2025-01-20T10:30:00"
}
```

---

### 4. Классификация

**POST** `/ai/classify/{file_id}`

Классифицирует транскрипцию по категориям.

**Параметры запроса (body):**
```json
{
  "categories": ["встреча", "интервью", "лекция"]  // Опционально, список категорий
}
```

**Пример:**
```bash
curl -X POST "http://localhost:8000/ai/classify/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{"categories": ["встреча", "интервью"]}'
```

**Ответ:**
```json
{
  "file_id": "123e4567-e89b-12d3-a456-426614174000",
  "category": "встреча",
  "confidence": 0.85,
  "created_at": "2025-01-20T10:30:00"
}
```

**Доступные категории по умолчанию:**
- встреча
- интервью
- лекция
- подкаст
- звонок
- презентация
- конференция
- обучение
- медицинская консультация
- юридическая консультация
- другое

---

### 5. Перевод

**POST** `/ai/translate/{file_id}`

Переводит транскрипцию на другой язык.

**Параметры запроса (body):**
```json
{
  "target_language": "en",        // Целевой язык (обязательно)
  "source_language": "ru"         // Исходный язык (опционально, определяется автоматически)
}
```

**Пример:**
```bash
curl -X POST "http://localhost:8000/ai/translate/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{"target_language": "en"}'
```

**Ответ:**
```json
{
  "file_id": "123e4567-e89b-12d3-a456-426614174000",
  "target_language": "en",
  "translated_text": "Translated text here...",
  "created_at": "2025-01-20T10:30:00"
}
```

**Поддерживаемые языки:**
- `en` - English
- `de` - Deutsch
- `fr` - Français
- `es` - Español
- `ru` - Русский
- `zh` - 中文
- `ja` - 日本語
- И другие (см. `/ai/languages`)

---

### 6. Получить все AI-данные

**GET** `/ai/data/{file_id}`

Получает все сохранённые AI-данные для транскрипции.

**Пример:**
```bash
curl "http://localhost:8000/ai/data/123e4567-e89b-12d3-a456-426614174000"
```

**Ответ:**
```json
{
  "file_id": "123e4567-e89b-12d3-a456-426614174000",
  "summary": "Резюме...",
  "summary_created_at": "2025-01-20T10:30:00",
  "keywords": ["слово1", "слово2", ...],
  "keywords_created_at": "2025-01-20T10:31:00",
  "sentiment": {"sentiment": "positive", "score": 0.85},
  "sentiment_created_at": "2025-01-20T10:32:00",
  "category": "встреча",
  "category_confidence": 0.85,
  "category_created_at": "2025-01-20T10:33:00",
  "translations": {
    "en": {
      "text": "Translated text...",
      "created_at": "2025-01-20T10:34:00"
    }
  },
  "created_at": "2025-01-20T10:30:00",
  "updated_at": "2025-01-20T10:34:00"
}
```

---

### 7. Выполнить все анализы

**POST** `/ai/analyze-all/{file_id}`

Выполняет все AI-анализы одновременно (резюме, ключевые слова, sentiment, классификация).

**Пример:**
```bash
curl -X POST "http://localhost:8000/ai/analyze-all/123e4567-e89b-12d3-a456-426614174000"
```

**Ответ:**
```json
{
  "file_id": "123e4567-e89b-12d3-a456-426614174000",
  "summary": "Резюме...",
  "keywords": ["слово1", "слово2", ...],
  "sentiment": {"sentiment": "positive", "score": 0.85},
  "category": "встреча",
  "category_confidence": 0.85,
  "message": "Все анализы выполнены успешно"
}
```

---

### 8. Список поддерживаемых языков

**GET** `/ai/languages`

Получает список всех поддерживаемых языков для перевода.

**Пример:**
```bash
curl "http://localhost:8000/ai/languages"
```

**Ответ:**
```json
{
  "languages": {
    "en": "English",
    "de": "Deutsch",
    "fr": "Français",
    ...
  },
  "count": 20
}
```

---

## Использование в коде

### Python пример

```python
import requests

BASE_URL = "http://localhost:8000"
FILE_ID = "123e4567-e89b-12d3-a456-426614174000"

# Генерация резюме
response = requests.post(
    f"{BASE_URL}/ai/summary/{FILE_ID}",
    json={"max_length": 200}
)
summary = response.json()["summary"]

# Извлечение ключевых слов
response = requests.post(
    f"{BASE_URL}/ai/keywords/{FILE_ID}",
    json={"num_keywords": 10}
)
keywords = response.json()["keywords"]

# Анализ тональности
response = requests.post(f"{BASE_URL}/ai/sentiment/{FILE_ID}")
sentiment = response.json()["sentiment"]

# Перевод
response = requests.post(
    f"{BASE_URL}/ai/translate/{FILE_ID}",
    json={"target_language": "en"}
)
translated = response.json()["translated_text"]
```

### JavaScript пример

```javascript
const BASE_URL = 'http://localhost:8000';
const FILE_ID = '123e4567-e89b-12d3-a456-426614174000';

// Генерация резюме
async function generateSummary() {
  const response = await fetch(`${BASE_URL}/ai/summary/${FILE_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_length: 200 })
  });
  const data = await response.json();
  console.log('Summary:', data.summary);
}

// Выполнить все анализы
async function analyzeAll() {
  const response = await fetch(`${BASE_URL}/ai/analyze-all/${FILE_ID}`, {
    method: 'POST'
  });
  const data = await response.json();
  console.log('All AI data:', data);
}
```

---

## Примечания

1. **Производительность:** 
   - Первый вызов может быть медленным (загрузка моделей)
   - Модели кэшируются в памяти для последующих запросов
   - Для продакшена рекомендуется использовать GPU

2. **Fallback режимы:**
   - Если `transformers` не установлен, используются простые эвристические методы
   - Если `googletrans` не установлен, перевод недоступен

3. **Ограничения:**
   - Модели имеют ограничения на длину входного текста (обычно 512 токенов)
   - Длинные транскрипции автоматически обрезаются

4. **Хранение данных:**
   - Все AI-данные сохраняются в БД
   - Переводы хранятся в JSON формате (можно несколько языков)
   - Данные можно получить через `/ai/data/{file_id}`

---

## Устранение проблем

**Ошибка: "transformers не установлен"**
```bash
pip install transformers torch sentencepiece protobuf
```

**Ошибка: "googletrans не установлен"**
```bash
pip install googletrans==4.0.0rc1
```

**Ошибка: "Модель не загружается"**
- Проверьте интернет-соединение (модели загружаются при первом использовании)
- Убедитесь, что достаточно места на диске
- Проверьте логи сервера для деталей




WhisperFlow теперь поддерживает AI-фичи для анализа транскрипций.

## Установка зависимостей

```bash
cd backend
pip install -r requirements.txt
```

**Важно:** Для полной функциональности требуется:
- `transformers` - для sentiment analysis и суммаризации (опционально, есть fallback)
- `googletrans` - для перевода (опционально)

## Миграция базы данных

Перед использованием выполните миграцию:

```bash
cd backend
python migrate_db.py
```

Это создаст таблицу `transcript_ai` для хранения AI-метаданных.

## API Endpoints

### 1. Генерация резюме

**POST** `/ai/summary/{file_id}`

Создаёт краткое резюме транскрипции.

**Параметры запроса (body):**
```json
{
  "max_length": 150,  // Максимальная длина резюме (опционально)
  "min_length": 30    // Минимальная длина резюме (опционально)
}
```

**Пример:**
```bash
curl -X POST "http://localhost:8000/ai/summary/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{"max_length": 200, "min_length": 50}'
```

**Ответ:**
```json
{
  "file_id": "123e4567-e89b-12d3-a456-426614174000",
  "summary": "Краткое резюме транскрипции...",
  "created_at": "2025-01-20T10:30:00"
}
```

---

### 2. Извлечение ключевых слов

**POST** `/ai/keywords/{file_id}`

Извлекает ключевые слова из транскрипции.

**Параметры запроса (body):**
```json
{
  "num_keywords": 10  // Количество ключевых слов (опционально)
}
```

**Пример:**
```bash
curl -X POST "http://localhost:8000/ai/keywords/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{"num_keywords": 15}'
```

**Ответ:**
```json
{
  "file_id": "123e4567-e89b-12d3-a456-426614174000",
  "keywords": ["встреча", "проект", "дедлайн", "команда", ...],
  "count": 15,
  "created_at": "2025-01-20T10:30:00"
}
```

---

### 3. Анализ тональности

**POST** `/ai/sentiment/{file_id}`

Анализирует тональность текста (positive/negative/neutral).

**Пример:**
```bash
curl -X POST "http://localhost:8000/ai/sentiment/123e4567-e89b-12d3-a456-426614174000"
```

**Ответ:**
```json
{
  "file_id": "123e4567-e89b-12d3-a456-426614174000",
  "sentiment": {
    "sentiment": "positive",
    "score": 0.85
  },
  "created_at": "2025-01-20T10:30:00"
}
```

---

### 4. Классификация

**POST** `/ai/classify/{file_id}`

Классифицирует транскрипцию по категориям.

**Параметры запроса (body):**
```json
{
  "categories": ["встреча", "интервью", "лекция"]  // Опционально, список категорий
}
```

**Пример:**
```bash
curl -X POST "http://localhost:8000/ai/classify/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{"categories": ["встреча", "интервью"]}'
```

**Ответ:**
```json
{
  "file_id": "123e4567-e89b-12d3-a456-426614174000",
  "category": "встреча",
  "confidence": 0.85,
  "created_at": "2025-01-20T10:30:00"
}
```

**Доступные категории по умолчанию:**
- встреча
- интервью
- лекция
- подкаст
- звонок
- презентация
- конференция
- обучение
- медицинская консультация
- юридическая консультация
- другое

---

### 5. Перевод

**POST** `/ai/translate/{file_id}`

Переводит транскрипцию на другой язык.

**Параметры запроса (body):**
```json
{
  "target_language": "en",        // Целевой язык (обязательно)
  "source_language": "ru"         // Исходный язык (опционально, определяется автоматически)
}
```

**Пример:**
```bash
curl -X POST "http://localhost:8000/ai/translate/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{"target_language": "en"}'
```

**Ответ:**
```json
{
  "file_id": "123e4567-e89b-12d3-a456-426614174000",
  "target_language": "en",
  "translated_text": "Translated text here...",
  "created_at": "2025-01-20T10:30:00"
}
```

**Поддерживаемые языки:**
- `en` - English
- `de` - Deutsch
- `fr` - Français
- `es` - Español
- `ru` - Русский
- `zh` - 中文
- `ja` - 日本語
- И другие (см. `/ai/languages`)

---

### 6. Получить все AI-данные

**GET** `/ai/data/{file_id}`

Получает все сохранённые AI-данные для транскрипции.

**Пример:**
```bash
curl "http://localhost:8000/ai/data/123e4567-e89b-12d3-a456-426614174000"
```

**Ответ:**
```json
{
  "file_id": "123e4567-e89b-12d3-a456-426614174000",
  "summary": "Резюме...",
  "summary_created_at": "2025-01-20T10:30:00",
  "keywords": ["слово1", "слово2", ...],
  "keywords_created_at": "2025-01-20T10:31:00",
  "sentiment": {"sentiment": "positive", "score": 0.85},
  "sentiment_created_at": "2025-01-20T10:32:00",
  "category": "встреча",
  "category_confidence": 0.85,
  "category_created_at": "2025-01-20T10:33:00",
  "translations": {
    "en": {
      "text": "Translated text...",
      "created_at": "2025-01-20T10:34:00"
    }
  },
  "created_at": "2025-01-20T10:30:00",
  "updated_at": "2025-01-20T10:34:00"
}
```

---

### 7. Выполнить все анализы

**POST** `/ai/analyze-all/{file_id}`

Выполняет все AI-анализы одновременно (резюме, ключевые слова, sentiment, классификация).

**Пример:**
```bash
curl -X POST "http://localhost:8000/ai/analyze-all/123e4567-e89b-12d3-a456-426614174000"
```

**Ответ:**
```json
{
  "file_id": "123e4567-e89b-12d3-a456-426614174000",
  "summary": "Резюме...",
  "keywords": ["слово1", "слово2", ...],
  "sentiment": {"sentiment": "positive", "score": 0.85},
  "category": "встреча",
  "category_confidence": 0.85,
  "message": "Все анализы выполнены успешно"
}
```

---

### 8. Список поддерживаемых языков

**GET** `/ai/languages`

Получает список всех поддерживаемых языков для перевода.

**Пример:**
```bash
curl "http://localhost:8000/ai/languages"
```

**Ответ:**
```json
{
  "languages": {
    "en": "English",
    "de": "Deutsch",
    "fr": "Français",
    ...
  },
  "count": 20
}
```

---

## Использование в коде

### Python пример

```python
import requests

BASE_URL = "http://localhost:8000"
FILE_ID = "123e4567-e89b-12d3-a456-426614174000"

# Генерация резюме
response = requests.post(
    f"{BASE_URL}/ai/summary/{FILE_ID}",
    json={"max_length": 200}
)
summary = response.json()["summary"]

# Извлечение ключевых слов
response = requests.post(
    f"{BASE_URL}/ai/keywords/{FILE_ID}",
    json={"num_keywords": 10}
)
keywords = response.json()["keywords"]

# Анализ тональности
response = requests.post(f"{BASE_URL}/ai/sentiment/{FILE_ID}")
sentiment = response.json()["sentiment"]

# Перевод
response = requests.post(
    f"{BASE_URL}/ai/translate/{FILE_ID}",
    json={"target_language": "en"}
)
translated = response.json()["translated_text"]
```

### JavaScript пример

```javascript
const BASE_URL = 'http://localhost:8000';
const FILE_ID = '123e4567-e89b-12d3-a456-426614174000';

// Генерация резюме
async function generateSummary() {
  const response = await fetch(`${BASE_URL}/ai/summary/${FILE_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_length: 200 })
  });
  const data = await response.json();
  console.log('Summary:', data.summary);
}

// Выполнить все анализы
async function analyzeAll() {
  const response = await fetch(`${BASE_URL}/ai/analyze-all/${FILE_ID}`, {
    method: 'POST'
  });
  const data = await response.json();
  console.log('All AI data:', data);
}
```

---

## Примечания

1. **Производительность:** 
   - Первый вызов может быть медленным (загрузка моделей)
   - Модели кэшируются в памяти для последующих запросов
   - Для продакшена рекомендуется использовать GPU

2. **Fallback режимы:**
   - Если `transformers` не установлен, используются простые эвристические методы
   - Если `googletrans` не установлен, перевод недоступен

3. **Ограничения:**
   - Модели имеют ограничения на длину входного текста (обычно 512 токенов)
   - Длинные транскрипции автоматически обрезаются

4. **Хранение данных:**
   - Все AI-данные сохраняются в БД
   - Переводы хранятся в JSON формате (можно несколько языков)
   - Данные можно получить через `/ai/data/{file_id}`

---

## Устранение проблем

**Ошибка: "transformers не установлен"**
```bash
pip install transformers torch sentencepiece protobuf
```

**Ошибка: "googletrans не установлен"**
```bash
pip install googletrans==4.0.0rc1
```

**Ошибка: "Модель не загружается"**
- Проверьте интернет-соединение (модели загружаются при первом использовании)
- Убедитесь, что достаточно места на диске
- Проверьте логи сервера для деталей











