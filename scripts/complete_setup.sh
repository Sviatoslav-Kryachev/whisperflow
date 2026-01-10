#!/bin/bash
#
# Полная автоматическая настройка VPS для WhisperFlow
# Использование: bash scripts/complete_setup.sh
#

set -e  # Остановить при ошибке

echo "=================================="
echo "🚀 Полная настройка WhisperFlow на VPS"
echo "=================================="
echo ""

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/opt/whisperflow"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Проверить, что скрипт запущен от root или с sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}⚠️  Запускаю с sudo...${NC}"
    sudo bash "$0" "$@"
    exit $?
fi

# ШАГ 1: Обновление системы
echo -e "${BLUE}📦 ШАГ 1: Обновление системы...${NC}"
apt update
apt upgrade -y
echo -e "${GREEN}✅ Система обновлена${NC}"
echo ""

# ШАГ 2: Установка необходимых пакетов
echo -e "${BLUE}📦 ШАГ 2: Установка необходимых пакетов...${NC}"
apt install -y \
    curl \
    wget \
    git \
    nano \
    ufw \
    python3 \
    python3-pip \
    ca-certificates \
    gnupg \
    lsb-release
echo -e "${GREEN}✅ Пакеты установлены${NC}"
echo ""

# ШАГ 3: Установка Docker
echo -e "${BLUE}🐳 ШАГ 3: Установка Docker...${NC}"
if command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker уже установлен, пропускаем${NC}"
    docker --version
else
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo -e "${GREEN}✅ Docker установлен${NC}"
    docker --version
fi
echo ""

# ШАГ 4: Установка Docker Compose Plugin
echo -e "${BLUE}🐳 ШАГ 4: Установка Docker Compose Plugin...${NC}"
if docker compose version &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker Compose уже установлен, пропускаем${NC}"
    docker compose version
else
    apt install -y docker-compose-plugin
    echo -e "${GREEN}✅ Docker Compose установлен${NC}"
    docker compose version
fi
echo ""

# ШАГ 5: Настройка firewall
echo -e "${BLUE}🔥 ШАГ 5: Настройка firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw --force reset > /dev/null 2>&1 || true
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp comment 'SSH' > /dev/null 2>&1
    ufw allow 80/tcp comment 'HTTP' > /dev/null 2>&1
    ufw allow 443/tcp comment 'HTTPS' > /dev/null 2>&1
    ufw --force enable > /dev/null 2>&1
    echo -e "${GREEN}✅ Firewall настроен${NC}"
    ufw status
else
    apt install -y ufw
    ufw allow 22,80,443/tcp
    ufw --force enable
    echo -e "${GREEN}✅ Firewall настроен${NC}"
fi
echo ""

# ШАГ 6: Установка PostgreSQL (если еще не установлен)
echo -e "${BLUE}🗄️  ШАГ 6: Проверка PostgreSQL...${NC}"
if command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL уже установлен${NC}"
    psql --version
else
    echo "Установка PostgreSQL..."
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    echo -e "${GREEN}✅ PostgreSQL установлен и запущен${NC}"
    psql --version
fi
echo ""

# ШАГ 7: Настройка PostgreSQL
echo -e "${BLUE}🗄️  ШАГ 7: Настройка PostgreSQL...${NC}"
if [ -f "${PROJECT_DIR}/scripts/setup_postgres.sh" ]; then
    echo "Запуск скрипта настройки PostgreSQL..."
    cd "${PROJECT_DIR}"
    bash scripts/setup_postgres.sh
else
    echo -e "${YELLOW}⚠️  Скрипт setup_postgres.sh не найден, пропускаем${NC}"
    echo "Запустите вручную: bash scripts/setup_postgres.sh"
fi
echo ""

# ШАГ 8: Проверка проекта
echo -e "${BLUE}📁 ШАГ 8: Проверка проекта...${NC}"
if [ -d "${PROJECT_DIR}" ]; then
    echo -e "${GREEN}✅ Директория проекта существует: ${PROJECT_DIR}${NC}"
    cd "${PROJECT_DIR}"
    
    # Проверить git
    if [ -d ".git" ]; then
        echo "Подтягивание последних изменений с GitHub..."
        git pull origin main || git pull origin master || true
        echo -e "${GREEN}✅ Проект обновлен${NC}"
    fi
    
    # Проверить docker-compose.yml
    if [ -f "docker-compose.yml" ]; then
        echo -e "${GREEN}✅ docker-compose.yml найден${NC}"
    else
        echo -e "${RED}❌ docker-compose.yml не найден!${NC}"
        exit 1
    fi
    
    # Проверить .env
    if [ -f ".env" ]; then
        echo -e "${GREEN}✅ Файл .env существует${NC}"
        echo "Проверка DATABASE_URL..."
        if grep -q "DATABASE_URL=" .env; then
            echo -e "${GREEN}✅ DATABASE_URL настроен${NC}"
        else
            echo -e "${YELLOW}⚠️  DATABASE_URL не найден в .env${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Файл .env не найден, будет создан${NC}"
        if [ -f "env.example" ]; then
            cp env.example .env
            echo -e "${GREEN}✅ .env создан из env.example${NC}"
            echo -e "${YELLOW}⚠️  Не забудьте настроить .env файл!${NC}"
        fi
    fi
else
    echo -e "${RED}❌ Директория проекта не найдена: ${PROJECT_DIR}${NC}"
    echo "Создайте проект или клонируйте с GitHub"
    exit 1
fi
echo ""

# ШАГ 9: Сборка и запуск Docker контейнеров
echo -e "${BLUE}🐳 ШАГ 9: Сборка и запуск Docker контейнеров...${NC}"
cd "${PROJECT_DIR}"

echo "Сборка Docker образов..."
docker compose build

echo "Запуск контейнеров..."
docker compose up -d

echo "Ожидание запуска контейнеров (10 секунд)..."
sleep 10

echo -e "${GREEN}✅ Контейнеры запущены${NC}"
docker compose ps
echo ""

# ШАГ 10: Проверка работы приложения
echo -e "${BLUE}✅ ШАГ 10: Проверка работы приложения...${NC}"
sleep 5

if docker compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Контейнеры работают${NC}"
    
    # Проверить health endpoint
    echo "Проверка health endpoint..."
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Приложение отвечает на /health${NC}"
    else
        echo -e "${YELLOW}⚠️  Приложение не отвечает на /health (может быть еще запускается)${NC}"
        echo "Проверьте логи: docker compose logs app"
    fi
    
    # Показать логи (последние 20 строк)
    echo ""
    echo "Последние логи приложения:"
    docker compose logs app --tail=20
else
    echo -e "${RED}❌ Контейнеры не запущены!${NC}"
    echo "Проверьте логи: docker compose logs"
fi
echo ""

# Итоговая информация
echo "=================================="
echo "✅ Настройка завершена!"
echo "=================================="
echo ""
echo "📋 Полезные команды:"
echo "   Посмотреть логи: cd ${PROJECT_DIR} && docker compose logs -f app"
echo "   Перезапустить: cd ${PROJECT_DIR} && docker compose restart"
echo "   Остановить: cd ${PROJECT_DIR} && docker compose down"
echo "   Проверить статус: cd ${PROJECT_DIR} && docker compose ps"
echo ""
echo "📝 Следующие шаги:"
echo "   1. Проверить работу: curl http://localhost:8000/health"
echo "   2. Настроить Nginx (для домена app-toolbox.space)"
echo "   3. Получить SSL сертификат через Certbot"
echo ""
echo "🔧 Если что-то не работает:"
echo "   - Логи: docker compose logs app"
echo "   - Проверить .env: cat ${PROJECT_DIR}/.env"
echo "   - Проверить PostgreSQL: psql -U whisperflow_user -d whisperflow_db"
echo ""
