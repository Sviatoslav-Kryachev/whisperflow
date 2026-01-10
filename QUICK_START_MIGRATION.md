# ⚡ Быстрый старт миграции на VPS

## 📋 Что нужно перед началом

- ✅ VPS куплен (6GB RAM, 2 CPU, 50GB SSD)
- ✅ Домен куплен: **app-toolbox.space**
- ✅ Доступ к Railway PostgreSQL
- ✅ SSH доступ к VPS (IP адрес, пароль или SSH ключ)

---

## 🚀 Быстрая миграция (8 шагов)

### ШАГ 1: Экспорт данных с Railway

**На локальном компьютере:**

```bash
cd D:\python-projects\whisperflow

# Установить зависимости (если нужно)
pip install psycopg2-binary

# Экспортировать данные
python scripts/export_railway_data.py
```

**Получить DATABASE_URL:**
- Railway Dashboard → PostgreSQL → Connect → Postgres Connection URL
- Или через Railway CLI: `railway variables`

**Результат:** Файл `backups/whisperflow_backup_YYYYMMDD_HHMMSS.sql`

---

### ШАГ 2: Подключиться к VPS и настроить

**Подключиться:**
```bash
ssh root@YOUR_IP
```

**Быстрая настройка (автоматический скрипт):**
```bash
# Загрузить скрипт на сервер
# Или скопировать содержимое scripts/setup_vps.sh

# Выполнить настройку
bash setup_vps.sh
```

**Или вручную:**
```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
apt install docker-compose-plugin -y
ufw allow 22,80,443/tcp && ufw enable
```

---

### ШАГ 3: Загрузить проект на VPS

**Вариант A: Через Git (если репозиторий публичный/приватный):**
```bash
cd /opt
git clone YOUR_REPO_URL whisperflow
cd whisperflow
```

**Вариант B: Через SCP (с локального компьютера):**
```bash
# На локальном компьютере (PowerShell или WSL)
cd D:\python-projects\whisperflow
scp -r . root@YOUR_IP:/opt/whisperflow
```

**На сервере:**
```bash
cd /opt/whisperflow
```

---

### ШАГ 4: Настроить .env файл

```bash
cp env.example .env
nano .env
```

**Обязательно изменить:**
```env
# Сгенерировать SECRET_KEY:
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Сгенерировать пароль:
python3 -c "import secrets; print(secrets.token_urlsafe(24))"

# В .env указать:
DATABASE_URL=postgresql://whisperflow_user:ВАШ_ПАРОЛЬ@db:5432/whisperflow
POSTGRES_PASSWORD=ВАШ_ПАРОЛЬ
SECRET_KEY=ВАШ_SECRET_KEY
ENVIRONMENT=production
```

---

### ШАГ 5: Запустить Docker Compose

```bash
cd /opt/whisperflow
docker compose up -d --build

# Проверить статус
docker compose ps

# Посмотреть логи
docker compose logs -f
```

**Ожидаемый результат:**
- ✅ `db` контейнер: `healthy`
- ✅ `app` контейнер: `running`

---

### ШАГ 6: Импортировать данные

**Загрузить backup на сервер:**
```bash
# На локальном компьютере
scp backups/whisperflow_backup_*.sql root@YOUR_IP:/tmp/backup.sql
```

**Импортировать на сервере:**
```bash
cd /opt/whisperflow
docker compose exec -T db psql -U whisperflow_user -d whisperflow < /tmp/backup.sql

# Проверить данные
docker compose exec db psql -U whisperflow_user -d whisperflow -c "SELECT COUNT(*) FROM users;"
```

---

### ШАГ 7: Настроить Nginx и домен

**Установить Nginx:**
```bash
apt install nginx -y
```

**Настроить DNS (в панели управления доменом):**
- A запись: `@` → `YOUR_IP`
- A запись: `www` → `YOUR_IP`

**Создать конфигурацию Nginx:**
```bash
nano /etc/nginx/sites-available/whisperflow
```

**Вставить:**
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

**Проверить:** http://app-toolbox.space

---

### ШАГ 8: Получить SSL сертификат (HTTPS)

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d app-toolbox.space -d www.app-toolbox.space
```

**Результат:** https://app-toolbox.space работает!

---

## ✅ Проверка работоспособности

```bash
# Проверить контейнеры
docker compose ps

# Проверить логи
docker compose logs app

# Проверить базу данных
docker compose exec db psql -U whisperflow_user -d whisperflow -c "\dt"

# Проверить HTTP
curl http://localhost:8000/health

# Проверить через домен
curl https://app-toolbox.space
```

**В браузере:**
- ✅ https://app-toolbox.space - главная страница
- ✅ https://app-toolbox.space/login - вход
- ✅ Загрузить тестовый аудио файл
- ✅ Проверить транскрипцию

---

## 🔧 Полезные команды

```bash
# Перезапустить приложение
docker compose restart

# Обновить проект (если используете git)
cd /opt/whisperflow
git pull
docker compose up -d --build

# Посмотреть логи
docker compose logs -f app

# Подключиться к PostgreSQL
docker compose exec db psql -U whisperflow_user -d whisperflow

# Проверить использование ресурсов
docker stats
free -h
df -h
```

---

## 🆘 Решение проблем

**Контейнер не запускается:**
```bash
docker compose logs app
docker compose logs db
docker compose restart
```

**База данных не работает:**
```bash
docker compose ps db
docker compose logs db
docker compose restart db
```

**Nginx не работает:**
```bash
nginx -t
systemctl status nginx
tail -f /var/log/nginx/whisperflow_error.log
```

**SSL не работает:**
```bash
certbot certificates
certbot renew
nginx -t
```

---

## 📚 Дополнительная документация

- **Полная инструкция**: `STEP_BY_STEP_MIGRATION.md`
- **Требования к памяти**: `VPS_MEMORY_REQUIREMENTS.md`
- **Настройка VPS**: `scripts/setup_vps.sh`

---

## 🎉 Готово!

После выполнения всех шагов:
- ✅ WhisperFlow работает на https://app-toolbox.space
- ✅ Все данные из Railway импортированы
- ✅ PostgreSQL работает в Docker
- ✅ HTTPS настроен через Let's Encrypt

**Можно отключать Railway после тестирования!**
