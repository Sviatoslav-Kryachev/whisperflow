# WhisperFlow

Приложение для транскрипции аудио с использованием OpenAI Whisper.

## Установка

1. Установите зависимости:
```bash
cd backend
pip install -r requirements.txt
```

## Запуск

### Вариант 1: Использование скрипта (Windows)
```bash
start.bat
```

### Вариант 2: Ручной запуск
```bash
cd backend
python -m uvicorn app.main:app --reload
```

### Вариант 3: С указанием хоста и порта
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

После запуска сервер будет доступен по адресу: http://127.0.0.1:8000

## Структура проекта

- `backend/` - FastAPI бэкенд
- `frontend/` - HTML/CSS/JS фронтенд
- `backend/storage/audio/` - загруженные аудиофайлы
- `backend/storage/transcripts/` - готовые транскрипции

## API Endpoints

- `GET /` - главная страница (login.html)
- `GET /dashboard.html` - панель управления
- `POST /upload` - загрузка аудиофайла
- `GET /status/{file_id}` - статус обработки
- `GET /transcript/{file_id}` - получить транскрипцию


