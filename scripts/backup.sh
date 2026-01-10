#!/bin/bash
# Скрипт для автоматичного бекапу WhisperFlow на VPS
# Використання: ./scripts/backup.sh

set -e  # Зупинитися при помилці

# Конфігурація
BACKUP_DIR="/opt/backups"
PROJECT_DIR="/opt/whisperflow"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7  # Зберігати бекапи 7 днів

# Створити директорію для бекапів
mkdir -p "$BACKUP_DIR"

echo "=========================================="
echo "📦 Створення бекапу WhisperFlow"
echo "Дата: $(date)"
echo "=========================================="

# 1. Бекап бази даних
echo "📊 Експорт бази даних..."
DB_BACKUP="$BACKUP_DIR/db_$DATE.sql"

cd "$PROJECT_DIR"
docker compose exec -T db pg_dump -U whisperflow_user whisperflow > "$DB_BACKUP"

if [ $? -eq 0 ]; then
    DB_SIZE=$(du -h "$DB_BACKUP" | cut -f1)
    echo "✅ База даних: $DB_BACKUP ($DB_SIZE)"
else
    echo "❌ Помилка експорту бази даних!"
    exit 1
fi

# 2. Бекап файлів (аудіо та транскрипції)
echo "📁 Експорт файлів..."
STORAGE_BACKUP="$BACKUP_DIR/storage_$DATE.tar.gz"

if [ -d "$PROJECT_DIR/backend/storage" ]; then
    tar -czf "$STORAGE_BACKUP" -C "$PROJECT_DIR/backend" storage/
    STORAGE_SIZE=$(du -h "$STORAGE_BACKUP" | cut -f1)
    echo "✅ Файли: $STORAGE_BACKUP ($STORAGE_SIZE)"
else
    echo "⚠️  Директорія storage не знайдена"
fi

# 3. Створити загальний архів
echo "📦 Створення загального архіву..."
FULL_BACKUP="$BACKUP_DIR/whisperflow_full_$DATE.tar.gz"
tar -czf "$FULL_BACKUP" -C "$BACKUP_DIR" "db_$DATE.sql" "storage_$DATE.tar.gz" 2>/dev/null || true
FULL_SIZE=$(du -h "$FULL_BACKUP" | cut -f1)
echo "✅ Повний бекап: $FULL_BACKUP ($FULL_SIZE)"

# 4. Видалити старі бекапи
echo "🧹 Видалення старих бекапів (старіші за $RETENTION_DAYS днів)..."
find "$BACKUP_DIR" -type f -name "*.sql" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
echo "✅ Очищення завершено"

# 5. Підсумок
echo ""
echo "=========================================="
echo "✅ Бекап завершено успішно!"
echo "=========================================="
echo "База даних: $DB_BACKUP"
echo "Файли: $STORAGE_BACKUP"
echo "Повний: $FULL_BACKUP"
echo ""
echo "Розмір бекапів:"
du -sh "$BACKUP_DIR"/*
echo ""
echo "Вільне місце:"
df -h "$BACKUP_DIR" | tail -1




