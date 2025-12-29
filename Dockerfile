FROM python:3.12-slim

# Установка системных зависимостей для FFmpeg и av
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libavformat-dev \
    libavcodec-dev \
    libavdevice-dev \
    libavutil-dev \
    libavfilter-dev \
    libswscale-dev \
    libswresample-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Установка рабочей директории
WORKDIR /app

# Копирование requirements.txt
COPY requirements.txt .

# Установка Python зависимостей
RUN pip install --no-cache-dir -r requirements.txt

# Копирование всего проекта
COPY . .

# Создание необходимых директорий
RUN mkdir -p backend/storage/audio backend/storage/transcripts

# Установка переменных окружения
ENV KMP_DUPLICATE_LIB_OK=TRUE
ENV PYTHONPATH=/app/backend

# Открытие порта (Railway использует переменную PORT)
EXPOSE 8000

# Запуск приложения
# Railway автоматически установит переменную PORT через окружение
# Используем exec form для лучшей обработки сигналов
CMD ["sh", "-c", "python -m uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]

