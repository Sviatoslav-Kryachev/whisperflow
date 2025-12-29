FROM python:3.12-slim

# Установка системных зависимостей для FFmpeg
# Используем --no-install-recommends для уменьшения размера
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libavformat-dev \
    libavcodec-dev \
    libavdevice-dev \
    libavutil-dev \
    libavfilter-dev \
    libswscale-dev \
    libswresample-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /app

# Копирование requirements.txt
COPY requirements.txt .

# Установка Python зависимостей
# Используем CPU-only версию torch для уменьшения размера
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt && \
    pip cache purge && \
    find /usr/local/lib/python3.12 -type d -name __pycache__ -exec rm -r {} + 2>/dev/null || true && \
    find /usr/local/lib/python3.12 -type f -name "*.pyc" -delete

# Копирование проекта
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Создание необходимых директорий
RUN mkdir -p backend/storage/audio backend/storage/transcripts

# Копирование скрипта запуска
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Установка переменных окружения
ENV KMP_DUPLICATE_LIB_OK=TRUE
ENV PYTHONPATH=/app/backend
ENV PORT=8000

# Открытие порта
EXPOSE 8000

# Запуск приложения
CMD ["/app/start.sh"]
