# 🚀 Інструкція по розгортанню на VPS (український хостинг)

## Передумови

- VPS сервер з Ubuntu 20.04+ або Debian 11+
- Root доступ або sudo права
- Домен (опціонально, для HTTPS)
- Мінімум 2GB RAM, 20GB диску

---

## Крок 1: Підготовка сервера

### Підключення до сервера
```bash
ssh root@your-server-ip
```

### Оновлення системи
```bash
apt update && apt upgrade -y
```

### Встановлення Docker
```bash
# Встановити Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Додати користувача до групи docker (якщо не root)
usermod -aG docker $USER

# Встановити Docker Compose
apt install docker-compose-plugin -y

# Перевірити встановлення
docker --version
docker compose version
```

---

## Крок 2: Налаштування бази даних (опціонально)

Якщо хочете використовувати зовнішню PostgreSQL замість контейнера:

```bash
# Встановити PostgreSQL
apt install postgresql postgresql-contrib -y

# Створити базу даних
sudo -u postgres psql
CREATE DATABASE whisperflow;
CREATE USER whisperflow_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE whisperflow TO whisperflow_user;
\q
```

Якщо використовуєте PostgreSQL з docker-compose.yml - цей крок не потрібен.

---

## Крок 3: Налаштування Nginx (reverse proxy)

### Встановлення Nginx
```bash
apt install nginx -y
```

### Створення конфігурації
```bash
nano /etc/nginx/sites-available/whisperflow
```

Вставте наступну конфігурацію:
```nginx
server {
    listen 80;
    server_name your-domain.com.ua;  # або ваш IP

    # Максимальний розмір завантаження (для великих аудіо файлів)
    client_max_body_size 500M;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Таймаути для довгих запитів (транскрипція)
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }
}
```

### Активувати конфігурацію
```bash
ln -s /etc/nginx/sites-available/whisperflow /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # видалити дефолтну конфігурацію
nginx -t  # перевірити конфігурацію
systemctl reload nginx
```

---

## Крок 4: Налаштування SSL (HTTPS)

### Встановлення Certbot
```bash
apt install certbot python3-certbot-nginx -y
```

### Отримання SSL сертифікату
```bash
# Якщо у вас є домен
certbot --nginx -d your-domain.com.ua

# Certbot автоматично:
# - Отримає сертифікат
# - Налаштує Nginx для HTTPS
# - Налаштує автоматичне оновлення
```

### Автоматичне оновлення сертифікату
Certbot автоматично налаштовує cron для оновлення. Перевірити можна:
```bash
certbot renew --dry-run
```

---

## Крок 5: Розгортання проекту

### Клонування репозиторію
```bash
cd /opt  # або інша директорія
git clone https://github.com/your-username/whisperflow.git
cd whisperflow
```

### Створення .env файлу
```bash
nano .env
```

Додайте:
```env
DATABASE_URL=postgresql://whisperflow_user:your_secure_password@db:5432/whisperflow
SECRET_KEY=your-random-secret-key-here-min-32-chars
POSTGRES_PASSWORD=your_secure_password
```

**Важливо:** Змініть паролі на безпечні!

### Запуск через Docker Compose
```bash
docker compose up -d --build
```

### Перевірка статусу
```bash
docker compose ps
docker compose logs -f app
```

---

## Крок 6: Налаштування firewall

```bash
# Встановити UFW (якщо не встановлено)
apt install ufw -y

# Дозволити SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Увімкнути firewall
ufw enable

# Перевірити статус
ufw status
```

---

## Крок 7: Налаштування автоматичних бекапів

### Створення скрипта бекапу
```bash
nano /opt/backup-whisperflow.sh
```

Вміст скрипта:
```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Створити директорію для бекапів
mkdir -p $BACKUP_DIR

# Бекап бази даних
docker compose exec -T db pg_dump -U whisperflow_user whisperflow > $BACKUP_DIR/db_$DATE.sql

# Бекап файлів
tar -czf $BACKUP_DIR/storage_$DATE.tar.gz -C /opt/whisperflow/backend storage/

# Видалити бекапи старіші за 7 днів
find $BACKUP_DIR -type f -mtime +7 -delete
```

### Зробити скрипт виконуваним
```bash
chmod +x /opt/backup-whisperflow.sh
```

### Додати в cron (щоденний бекап о 3:00)
```bash
crontab -e
```

Додати рядок:
```
0 3 * * * /opt/backup-whisperflow.sh
```

---

## Крок 8: Моніторинг та логування

### Перегляд логів
```bash
# Логи додатку
docker compose logs -f app

# Логи бази даних
docker compose logs -f db

# Всі логи
docker compose logs -f
```

### Перевірка ресурсів
```bash
# Використання ресурсів контейнерами
docker stats

# Використання диску
df -h

# Використання пам'яті
free -h
```

---

## Корисні команди

### Перезапуск сервісів
```bash
docker compose restart
docker compose restart app
```

### Оновлення проекту
```bash
cd /opt/whisperflow
git pull
docker compose up -d --build
```

### Зупинка сервісів
```bash
docker compose down
```

### Видалення всього (увага!)
```bash
docker compose down -v  # видалить також volumes (база даних!)
```

---

## Вирішення проблем

### Проблема: Контейнер не запускається
```bash
# Перевірити логи
docker compose logs app

# Перевірити конфігурацію
docker compose config
```

### Проблема: База даних не підключається
```bash
# Перевірити статус контейнера БД
docker compose ps db

# Перевірити логи БД
docker compose logs db

# Перевірити підключення
docker compose exec db psql -U whisperflow_user -d whisperflow
```

### Проблема: Nginx не працює
```bash
# Перевірити конфігурацію
nginx -t

# Перезапустити Nginx
systemctl restart nginx

# Перевірити статус
systemctl status nginx
```

### Проблема: SSL сертифікат не працює
```bash
# Перевірити сертифікат
certbot certificates

# Оновити сертифікат вручну
certbot renew
```

---

## Безпека

1. **Регулярно оновлюйте систему:**
```bash
apt update && apt upgrade -y
```

2. **Використовуйте сильні паролі** для всіх сервісів

3. **Налаштуйте SSH ключі** замість паролів:
```bash
# На локальній машині
ssh-keygen -t rsa -b 4096
ssh-copy-id root@your-server-ip
```

4. **Вимкніть root логін через пароль** (після налаштування SSH ключів):
```bash
nano /etc/ssh/sshd_config
# Змінити: PermitRootLogin prohibit-password
systemctl restart sshd
```

5. **Регулярні бекапи** - налаштуйте автоматичні бекапи (див. Крок 7)

---

## Підтримка

Якщо виникли проблеми:
1. Перевірте логи: `docker compose logs`
2. Перевірте статус сервісів: `docker compose ps`
3. Перевірте ресурси: `docker stats`
4. Зверніться до техпідтримки провайдера хостингу

---

## Наступні кроки

- [ ] Налаштувати моніторинг (Prometheus/Grafana)
- [ ] Налаштувати автоматичні оновлення
- [ ] Налаштувати CDN для статичних файлів (опціонально)
- [ ] Налаштувати email нотифікації для помилок




