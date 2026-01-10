# 🎯 Следующие шаги для миграции с внешним PostgreSQL

## ✅ Что уже сделано:
1. ✅ Подключен к VPS через SSH
2. ✅ PostgreSQL установлен нативно на VPS
3. ✅ Создана база `whisperflow_db` и пользователь `whisperflow_user`
4. ✅ Проект синхронизирован с GitHub

## ⚠️ Важно: Настроить доступ к PostgreSQL из Docker

Поскольку PostgreSQL установлен нативно на VPS, а приложение будет в Docker контейнере, нужно настроить доступ.

---

## ШАГ 1: Настроить PostgreSQL для приема подключений

### 1.1. Проверить конфигурацию PostgreSQL

**На VPS:**
```bash
# Проверить, где находится конфигурация PostgreSQL
sudo -u postgres psql -c "SHOW config_file;"

# Обычно это: /etc/postgresql/15/main/postgresql.conf
# И: /etc/postgresql/15/main/pg_hba.conf
```

### 1.2. Настроить pg_hba.conf для доступа из Docker

```bash
# Открыть файл pg_hba.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Добавить строки для доступа из Docker (в конец файла):
host    whisperflow_db    whisperflow_user    172.17.0.0/16    md5
host    whisperflow_db    whisperflow_user    127.0.0.1/32     md5
```

### 1.3. Настроить postgresql.conf для приема подключений

```bash
# Открыть файл postgresql.conf
sudo nano /etc/postgresql/15/main/postgresql.conf

# Найти и изменить:
listen_addresses = 'localhost'  # Изменить на: listen_addresses = '*'
# Или для безопасности: listen_addresses = 'localhost,127.0.0.1'

# Раскомментировать:
port = 5432
```

**Альтернатива (более безопасно):** Использовать только localhost и `network_mode: host` в Docker.

### 1.4. Перезапустить PostgreSQL

```bash
sudo systemctl restart postgresql
sudo systemctl status postgresql
```

---

## ШАГ 2: Проверить и обновить .env файл

**На VPS:**
```bash
cd /opt/whisperflow

# Проверить, существует ли .env
ls -la .env

# Если нет, создать из примера
cp env.example .env
nano .env
```

**Настроить .env для внешнего PostgreSQL:**
```env
# Database Configuration - внешний PostgreSQL на VPS
# Вариант 1: Через host.docker.internal (если поддерживается)
DATABASE_URL=postgresql://whisperflow_user:ВАШ_ПАРОЛЬ@host.docker.internal:5432/whisperflow_db

# Вариант 2: Через network_mode: host (рекомендуется для VPS)
# DATABASE_URL=postgresql://whisperflow_user:ВАШ_ПАРОЛЬ@localhost:5432/whisperflow_db

# PostgreSQL Password (не нужен, если PostgreSQL в Docker, но оставим для совместимости)
POSTGRES_PASSWORD=ВАШ_ПАРОЛЬ

# Secret Key для JWT токенов (минимум 32 символа)
# Сгенерировать: python3 -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=ВАШ_SECRET_KEY_МІНІМУМ_32_СИМВОЛИ

# Port
PORT=8000

# Environment
ENVIRONMENT=production
```

**Сгенерировать SECRET_KEY:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## ШАГ 3: Обновить docker-compose.yml для внешнего PostgreSQL

**Вариант A: Использовать network_mode: host (рекомендуется для VPS)**

Создать или обновить `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    network_mode: host  # Прямой доступ к localhost PostgreSQL
    environment:
      - DATABASE_URL=${DATABASE_URL:-postgresql://whisperflow_user:whisperflow_password@localhost:5432/whisperflow_db}
      - SECRET_KEY=${SECRET_KEY:-change-this-to-random-secret-key}
      - PORT=8000
    volumes:
      - ./backend/storage:/app/backend/storage
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

**Важно:** При `network_mode: host` порт 8000 будет напрямую доступен на хосте (без проброса портов).

**Вариант B: Использовать host.docker.internal (если поддерживается)**

Использовать файл `docker-compose.external-postgres.yml` (уже создан).

---

## ШАГ 4: Проверить Docker и Docker Compose

**На VPS:**
```bash
# Проверить Docker
docker --version
docker compose version

# Если Docker не установлен:
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install docker-compose-plugin -y
```

---

## ШАГ 5: Запустить приложение

**На VPS:**
```bash
cd /opt/whisperflow

# Подтянуть последние изменения с GitHub (если нужно)
git pull origin main  # или master

# Проверить .env файл
cat .env | grep DATABASE_URL

# Собрать и запустить контейнер
docker compose up -d --build

# Проверить статус
docker compose ps

# Посмотреть логи
docker compose logs -f app
```

---

## ШАГ 6: Импортировать данные с Railway (если нужно)

**Если есть backup файл с Railway:**

```bash
# Загрузить backup на VPS (с локального компьютера)
scp backups/whisperflow_backup_*.sql root@YOUR_IP:/tmp/backup.sql

# На VPS: Импортировать в PostgreSQL
sudo -u postgres psql whisperflow_db < /tmp/backup.sql

# Или от имени пользователя whisperflow_user:
psql -U whisperflow_user -d whisperflow_db -f /tmp/backup.sql
```

**Проверить импорт:**
```bash
psql -U whisperflow_user -d whisperflow_db

# В psql:
\dt  # Показать таблицы
SELECT COUNT(*) FROM users;  # Проверить пользователей
\q   # Выйти
```

---

## ШАГ 7: Настроить Nginx (если еще не настроен)

```bash
# Установить Nginx
apt install nginx -y

# Создать конфигурацию
sudo nano /etc/nginx/sites-available/whisperflow
```

**Содержимое:**
```nginx
server {
    listen 80;
    server_name app-toolbox.space www.app-toolbox.space;
    client_max_body_size 500M;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }
}
```

**Активировать:**
```bash
ln -s /etc/nginx/sites-available/whisperflow /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

---

## ШАГ 8: Настроить HTTPS (SSL)

```bash
# Установить Certbot
apt install certbot python3-certbot-nginx -y

# Получить SSL сертификат
certbot --nginx -d app-toolbox.space -d www.app-toolbox.space
```

---

## ✅ Чеклист

- [ ] PostgreSQL настроен для приема подключений из Docker
- [ ] .env файл создан и настроен
- [ ] docker-compose.yml обновлен для внешнего PostgreSQL
- [ ] Docker и Docker Compose установлены
- [ ] Приложение запущено: `docker compose up -d --build`
- [ ] Данные импортированы (если нужно)
- [ ] Nginx настроен и работает
- [ ] HTTPS настроен через Certbot
- [ ] Приложение доступно по https://app-toolbox.space

---

## 🔧 Решение проблем

### Проблема: Не могу подключиться к PostgreSQL из Docker

**Решение 1: Использовать network_mode: host**
```yaml
services:
  app:
    network_mode: host
```

**Решение 2: Настроить pg_hba.conf**
```bash
# Добавить в /etc/postgresql/15/main/pg_hba.conf
host    whisperflow_db    whisperflow_user    172.17.0.0/16    md5
```

### Проблема: Контейнер не запускается

```bash
# Проверить логи
docker compose logs app

# Проверить .env файл
cat .env

# Проверить подключение к PostgreSQL
psql -U whisperflow_user -d whisperflow_db -h localhost
```

### Проблема: База данных пустая

```bash
# Проверить таблицы
psql -U whisperflow_user -d whisperflow_db -c "\dt"

# Если таблиц нет, создать их через миграции или импорт
```

---

**Готово! После выполнения всех шагов WhisperFlow будет работать на https://app-toolbox.space** 🚀
