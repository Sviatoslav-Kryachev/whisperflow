#!/bin/bash
#
# Скрипт для быстрой настройки VPS для WhisperFlow
# Использование: bash scripts/setup_vps.sh
#

set -e  # Остановить при ошибке

echo "=================================="
echo "🚀 Настройка VPS для WhisperFlow"
echo "=================================="
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для вывода ошибок
error() {
    echo -e "${RED}❌ Ошибка: $1${NC}" >&2
}

# Функция для вывода успеха
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Функция для вывода предупреждения
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Проверить, что скрипт запущен от root
if [ "$EUID" -ne 0 ]; then 
    error "Запустите скрипт от root: sudo bash scripts/setup_vps.sh"
    exit 1
fi

# ШАГ 1: Обновление системы
echo ""
echo "📦 ШАГ 1: Обновление системы..."
apt update
apt upgrade -y
success "Система обновлена"

# ШАГ 2: Установка необходимых пакетов
echo ""
echo "📦 ШАГ 2: Установка необходимых пакетов..."
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

success "Пакеты установлены"

# ШАГ 3: Установка Docker
echo ""
echo "🐳 ШАГ 3: Установка Docker..."

if command -v docker &> /dev/null; then
    warning "Docker уже установлен, пропускаем установку"
else
    # Установить Docker
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    success "Docker установлен"
fi

# Проверить версию Docker
docker --version

# ШАГ 4: Установка Docker Compose Plugin
echo ""
echo "🐳 ШАГ 4: Установка Docker Compose Plugin..."

if docker compose version &> /dev/null; then
    warning "Docker Compose уже установлен, пропускаем установку"
else
    apt install -y docker-compose-plugin
    success "Docker Compose установлен"
fi

# Проверить версию Docker Compose
docker compose version

# ШАГ 5: Настройка firewall
echo ""
echo "🔥 ШАГ 5: Настройка firewall..."

# Установить UFW если еще не установлен
if ! command -v ufw &> /dev/null; then
    apt install -y ufw
fi

# Настроить правила
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Разрешить SSH (важно!)
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Включить firewall
ufw --force enable

success "Firewall настроен"
warning "Проверьте правила: ufw status"

# ШАГ 6: Настройка Docker для автоматического запуска
echo ""
echo "🔧 ШАГ 6: Настройка Docker..."

systemctl enable docker
systemctl start docker

success "Docker настроен для автозапуска"

# ШАГ 7: Создание директории для проекта
echo ""
echo "📁 ШАГ 7: Создание директории для проекта..."

PROJECT_DIR="/opt/whisperflow"
mkdir -p $PROJECT_DIR

success "Директория создана: $PROJECT_DIR"

# ШАГ 8: Информация о следующих шагах
echo ""
echo "=================================="
echo "✅ Базовая настройка VPS завершена!"
echo "=================================="
echo ""
echo "📝 Следующие шаги:"
echo ""
echo "1. Клонировать или загрузить проект в $PROJECT_DIR"
echo "   cd $PROJECT_DIR"
echo "   git clone YOUR_REPO_URL ."
echo "   # или"
echo "   scp -r . root@SERVER_IP:$PROJECT_DIR"
echo ""
echo "2. Создать и настроить .env файл:"
echo "   cd $PROJECT_DIR"
echo "   cp env.example .env"
echo "   nano .env"
echo ""
echo "3. Запустить Docker Compose:"
echo "   cd $PROJECT_DIR"
echo "   docker compose up -d --build"
echo ""
echo "4. Установить Nginx (для домена):"
echo "   apt install nginx -y"
echo "   # Настроить конфигурацию (см. STEP_BY_STEP_MIGRATION.md)"
echo ""
echo "5. Установить Certbot (для HTTPS):"
echo "   apt install certbot python3-certbot-nginx -y"
echo "   certbot --nginx -d your-domain.com"
echo ""
echo "📚 Полная инструкция: см. STEP_BY_STEP_MIGRATION.md"
echo ""
echo "=================================="
