#!/bin/bash
#
# Автоматический скрипт настройки PostgreSQL для WhisperFlow
# Использование: bash scripts/setup_postgres.sh
#

set -e  # Остановить при ошибке

echo "=================================="
echo "🗄️  Настройка PostgreSQL для WhisperFlow"
echo "=================================="
echo ""

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Параметры по умолчанию
DB_NAME="whisperflow_db"
DB_USER="whisperflow_user"
DB_PASSWORD=""

# Проверить, что скрипт запущен от root или с sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}⚠️  Запускаю с sudo...${NC}"
    sudo bash "$0" "$@"
    exit $?
fi

# Функция для генерации случайного пароля
generate_password() {
    python3 -c "import secrets; print(secrets.token_urlsafe(24))" 2>/dev/null || \
    openssl rand -base64 24 | tr -d "=+/" | cut -c1-24
}

# Функция для генерации SECRET_KEY
generate_secret_key() {
    python3 -c "import secrets; print(secrets.token_urlsafe(32))" 2>/dev/null || \
    openssl rand -base64 48 | tr -d "=+/" | cut -c1-48
}

# ШАГ 1: Генерация пароля
echo "🔐 ШАГ 1: Генерация безопасного пароля..."
DB_PASSWORD=$(generate_password)
echo -e "${GREEN}✅ Пароль сгенерирован${NC}"
echo ""
echo "⚠️  СОХРАНИТЕ ЭТОТ ПАРОЛЬ:"
echo -e "${YELLOW}Пароль базы данных: ${DB_PASSWORD}${NC}"
echo ""

# ШАГ 2: Создание базы данных
echo "📦 ШАГ 2: Создание базы данных ${DB_NAME}..."
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${YELLOW}⚠️  База данных ${DB_NAME} уже существует${NC}"
    read -p "Удалить и пересоздать? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${DB_NAME};"
        sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME};"
        echo -e "${GREEN}✅ База данных ${DB_NAME} пересоздана${NC}"
    else
        echo -e "${YELLOW}⚠️  Используем существующую базу данных${NC}"
    fi
else
    sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME};"
    echo -e "${GREEN}✅ База данных ${DB_NAME} создана${NC}"
fi

# ШАГ 3: Создание пользователя
echo ""
echo "👤 ШАГ 3: Создание пользователя ${DB_USER}..."
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
    echo -e "${YELLOW}⚠️  Пользователь ${DB_USER} уже существует${NC}"
    read -p "Пересоздать пользователя с новым паролем? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo -u postgres psql -c "DROP USER IF EXISTS ${DB_USER};"
        sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"
        echo -e "${GREEN}✅ Пользователь ${DB_USER} пересоздан${NC}"
    else
        echo -e "${YELLOW}⚠️  Используем существующего пользователя${NC}"
        echo "Пароль существующего пользователя не будет изменен"
        read -p "Введите текущий пароль пользователя ${DB_USER}: " DB_PASSWORD
    fi
else
    sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"
    echo -e "${GREEN}✅ Пользователь ${DB_USER} создан${NC}"
fi

# ШАГ 4: Выдача прав
echo ""
echo "🔑 ШАГ 4: Выдача прав на базу данных..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
sudo -u postgres psql -d ${DB_NAME} -c "GRANT ALL ON SCHEMA public TO ${DB_USER};"
sudo -u postgres psql -d ${DB_NAME} -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};"
sudo -u postgres psql -d ${DB_NAME} -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};"
sudo -u postgres psql -d ${DB_NAME} -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};"
sudo -u postgres psql -d ${DB_NAME} -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};"
echo -e "${GREEN}✅ Права выданы${NC}"

# ШАГ 5: Проверка подключения
echo ""
echo "✅ ШАГ 5: Проверка подключения..."
if PGPASSWORD="${DB_PASSWORD}" psql -U ${DB_USER} -d ${DB_NAME} -h localhost -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Подключение к базе данных работает!${NC}"
else
    echo -e "${YELLOW}⚠️  Автоматическая проверка не удалась, но это может быть нормально${NC}"
    echo "Попробуйте вручную: psql -U ${DB_USER} -d ${DB_NAME}"
fi

# ШАГ 6: Сохранение информации
echo ""
echo "💾 ШАГ 6: Сохранение информации..."
ENV_FILE="/opt/whisperflow/.env"
if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  Файл .env уже существует${NC}"
    read -p "Обновить DATABASE_URL и POSTGRES_PASSWORD? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Обновить DATABASE_URL
        if grep -q "DATABASE_URL=" "$ENV_FILE"; then
            sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}|" "$ENV_FILE"
        else
            echo "DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}" >> "$ENV_FILE"
        fi
        
        # Обновить POSTGRES_PASSWORD
        if grep -q "POSTGRES_PASSWORD=" "$ENV_FILE"; then
            sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${DB_PASSWORD}|" "$ENV_FILE"
        else
            echo "POSTGRES_PASSWORD=${DB_PASSWORD}" >> "$ENV_FILE"
        fi
        
        # Сгенерировать SECRET_KEY если его нет
        if ! grep -q "SECRET_KEY=" "$ENV_FILE" || grep -q "SECRET_KEY=change-this" "$ENV_FILE"; then
            SECRET_KEY=$(generate_secret_key)
            if grep -q "SECRET_KEY=" "$ENV_FILE"; then
                sed -i "s|SECRET_KEY=.*|SECRET_KEY=${SECRET_KEY}|" "$ENV_FILE"
            else
                echo "SECRET_KEY=${SECRET_KEY}" >> "$ENV_FILE"
            fi
            echo -e "${GREEN}✅ SECRET_KEY сгенерирован и сохранен${NC}"
        fi
        
        echo -e "${GREEN}✅ Файл .env обновлен${NC}"
    fi
else
    echo "Создание файла .env..."
    SECRET_KEY=$(generate_secret_key)
    cat > "$ENV_FILE" <<EOF
# Database Configuration
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}
POSTGRES_PASSWORD=${DB_PASSWORD}

# Secret Key для JWT токенов (сгенерирован автоматически)
SECRET_KEY=${SECRET_KEY}

# Port
PORT=8000

# Environment
ENVIRONMENT=production
EOF
    echo -e "${GREEN}✅ Файл .env создан${NC}"
fi

# Итоговая информация
echo ""
echo "=================================="
echo "✅ Настройка PostgreSQL завершена!"
echo "=================================="
echo ""
echo "📋 Созданная информация:"
echo "   База данных: ${DB_NAME}"
echo "   Пользователь: ${DB_USER}"
echo "   Пароль: ${DB_PASSWORD}"
echo "   Файл .env: ${ENV_FILE}"
echo ""
echo "⚠️  СОХРАНИТЕ ПАРОЛЬ в безопасном месте!"
echo ""
echo "📝 Следующие шаги:"
echo "   1. Проверить подключение: psql -U ${DB_USER} -d ${DB_NAME}"
echo "   2. Установить Docker (если еще не установлен)"
echo "   3. Запустить приложение: cd /opt/whisperflow && docker compose up -d --build"
echo ""
