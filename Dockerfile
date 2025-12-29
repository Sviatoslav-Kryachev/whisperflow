# Multi-stage build для уменьшения размера образа
FROM python:3.12-slim as builder

# Установка системных зависимостей для сборки
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    libavformat-dev \
    libavcodec-dev \
    libavdevice-dev \
    libavutil-dev \
    libavfilter-dev \
    libswscale-dev \
    libswresample-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копирование requirements.txt
COPY requirements.txt .

# Установка Python зависимостей в виртуальное окружение
# Используем CPU-only версию torch для уменьшения размера (в 2-3 раза меньше)
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt && \
    pip cache purge && \
    find /opt/venv -type d -name __pycache__ -exec rm -r {} + 2>/dev/null || true && \
    find /opt/venv -type f -name "*.pyc" -delete && \
    find /opt/venv -type f -name "*.pyo" -delete

# Финальный образ
FROM python:3.12-slim

# Установка только runtime зависимостей для FFmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libavformat59 \
    libavcodec59 \
    libavdevice59 \
    libavutil57 \
    libavfilter8 \
    libswscale6 \
    libswresample4 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    && rm -rf /tmp/* /var/tmp/*

WORKDIR /app

# Копирование виртуального окружения из builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Копирование только необходимых файлов проекта
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Создание необходимых директорий
RUN mkdir -p backend/storage/audio backend/storage/transcripts

# Установка переменных окружения
ENV KMP_DUPLICATE_LIB_OK=TRUE
ENV PYTHONPATH=/app/backend

# Открытие порта
EXPOSE 8000

# Запуск приложения
CMD ["sh", "-c", "python -m uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
