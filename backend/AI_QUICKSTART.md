# AI Features - Быстрый старт

## 1. Установка зависимостей

```bash
cd backend
pip install -r requirements.txt
```

**Минимальные зависимости (работают fallback-методы):**
- Базовые функции работают без дополнительных библиотек

**Для полной функциональности:**
```bash
pip install transformers torch sentencepiece protobuf
pip install googletrans==4.0.0rc1
```

## 2. Миграция базы данных

```bash
cd backend
python migrate_db.py
```

Или просто перезапустите сервер - таблицы создадутся автоматически.

## 3. Использование API

### Пример: Полный анализ транскрипции

```python
import requests

BASE_URL = "http://localhost:8000"
FILE_ID = "ваш-file-id"

# Выполнить все анализы сразу
response = requests.post(f"{BASE_URL}/ai/analyze-all/{FILE_ID}")
data = response.json()

print(f"Резюме: {data['summary']}")
print(f"Ключевые слова: {data['keywords']}")
print(f"Тональность: {data['sentiment']}")
print(f"Категория: {data['category']}")
```

### Пример: Отдельные функции

```python
# Только резюме
response = requests.post(
    f"{BASE_URL}/ai/summary/{FILE_ID}",
    json={"max_length": 200}
)

# Только ключевые слова
response = requests.post(
    f"{BASE_URL}/ai/keywords/{FILE_ID}",
    json={"num_keywords": 15}
)

# Только sentiment
response = requests.post(f"{BASE_URL}/ai/sentiment/{FILE_ID}")

# Перевод на английский
response = requests.post(
    f"{BASE_URL}/ai/translate/{FILE_ID}",
    json={"target_language": "en"}
)
```

## 4. Получение сохранённых данных

```python
# Получить все AI-данные для транскрипции
response = requests.get(f"{BASE_URL}/ai/data/{FILE_ID}")
ai_data = response.json()

print(ai_data['summary'])
print(ai_data['keywords'])
print(ai_data['sentiment'])
print(ai_data['category'])
print(ai_data['translations'])
```

## 5. JavaScript пример

```javascript
const BASE_URL = 'http://localhost:8000';
const FILE_ID = 'ваш-file-id';

// Выполнить все анализы
async function analyzeTranscript() {
  const response = await fetch(`${BASE_URL}/ai/analyze-all/${FILE_ID}`, {
    method: 'POST'
  });
  const data = await response.json();
  
  console.log('Summary:', data.summary);
  console.log('Keywords:', data.keywords);
  console.log('Sentiment:', data.sentiment);
  console.log('Category:', data.category);
}

// Генерация резюме
async function getSummary() {
  const response = await fetch(`${BASE_URL}/ai/summary/${FILE_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_length: 200 })
  });
  const data = await response.json();
  return data.summary;
}
```

## Доступные endpoints

- `POST /ai/summary/{file_id}` - Резюме
- `POST /ai/keywords/{file_id}` - Ключевые слова
- `POST /ai/sentiment/{file_id}` - Анализ тональности
- `POST /ai/classify/{file_id}` - Классификация
- `POST /ai/translate/{file_id}` - Перевод
- `POST /ai/analyze-all/{file_id}` - Все анализы сразу
- `GET /ai/data/{file_id}` - Получить все сохранённые данные
- `GET /ai/languages` - Список поддерживаемых языков

## Примечания

1. **Первая загрузка моделей** может занять время (загружаются из интернета)
2. **Модели кэшируются** - последующие запросы быстрее
3. **Fallback режимы** работают без transformers/googletrans, но с меньшей точностью
4. **Длинные тексты** автоматически обрезаются до 512 токенов

Подробная документация: см. `AI_FEATURES.md`




## 1. Установка зависимостей

```bash
cd backend
pip install -r requirements.txt
```

**Минимальные зависимости (работают fallback-методы):**
- Базовые функции работают без дополнительных библиотек

**Для полной функциональности:**
```bash
pip install transformers torch sentencepiece protobuf
pip install googletrans==4.0.0rc1
```

## 2. Миграция базы данных

```bash
cd backend
python migrate_db.py
```

Или просто перезапустите сервер - таблицы создадутся автоматически.

## 3. Использование API

### Пример: Полный анализ транскрипции

```python
import requests

BASE_URL = "http://localhost:8000"
FILE_ID = "ваш-file-id"

# Выполнить все анализы сразу
response = requests.post(f"{BASE_URL}/ai/analyze-all/{FILE_ID}")
data = response.json()

print(f"Резюме: {data['summary']}")
print(f"Ключевые слова: {data['keywords']}")
print(f"Тональность: {data['sentiment']}")
print(f"Категория: {data['category']}")
```

### Пример: Отдельные функции

```python
# Только резюме
response = requests.post(
    f"{BASE_URL}/ai/summary/{FILE_ID}",
    json={"max_length": 200}
)

# Только ключевые слова
response = requests.post(
    f"{BASE_URL}/ai/keywords/{FILE_ID}",
    json={"num_keywords": 15}
)

# Только sentiment
response = requests.post(f"{BASE_URL}/ai/sentiment/{FILE_ID}")

# Перевод на английский
response = requests.post(
    f"{BASE_URL}/ai/translate/{FILE_ID}",
    json={"target_language": "en"}
)
```

## 4. Получение сохранённых данных

```python
# Получить все AI-данные для транскрипции
response = requests.get(f"{BASE_URL}/ai/data/{FILE_ID}")
ai_data = response.json()

print(ai_data['summary'])
print(ai_data['keywords'])
print(ai_data['sentiment'])
print(ai_data['category'])
print(ai_data['translations'])
```

## 5. JavaScript пример

```javascript
const BASE_URL = 'http://localhost:8000';
const FILE_ID = 'ваш-file-id';

// Выполнить все анализы
async function analyzeTranscript() {
  const response = await fetch(`${BASE_URL}/ai/analyze-all/${FILE_ID}`, {
    method: 'POST'
  });
  const data = await response.json();
  
  console.log('Summary:', data.summary);
  console.log('Keywords:', data.keywords);
  console.log('Sentiment:', data.sentiment);
  console.log('Category:', data.category);
}

// Генерация резюме
async function getSummary() {
  const response = await fetch(`${BASE_URL}/ai/summary/${FILE_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_length: 200 })
  });
  const data = await response.json();
  return data.summary;
}
```

## Доступные endpoints

- `POST /ai/summary/{file_id}` - Резюме
- `POST /ai/keywords/{file_id}` - Ключевые слова
- `POST /ai/sentiment/{file_id}` - Анализ тональности
- `POST /ai/classify/{file_id}` - Классификация
- `POST /ai/translate/{file_id}` - Перевод
- `POST /ai/analyze-all/{file_id}` - Все анализы сразу
- `GET /ai/data/{file_id}` - Получить все сохранённые данные
- `GET /ai/languages` - Список поддерживаемых языков

## Примечания

1. **Первая загрузка моделей** может занять время (загружаются из интернета)
2. **Модели кэшируются** - последующие запросы быстрее
3. **Fallback режимы** работают без transformers/googletrans, но с меньшей точностью
4. **Длинные тексты** автоматически обрезаются до 512 токенов

Подробная документация: см. `AI_FEATURES.md`











