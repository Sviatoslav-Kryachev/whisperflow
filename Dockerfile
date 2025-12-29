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

# Установка переменной окружения для OpenMP
ENV KMP_DUPLICATE_LIB_OK=TRUE

# Открытие порта
EXPOSE $PORT

# Запуск приложения
CMD PYTHONPATH=backend uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT --workers 1

