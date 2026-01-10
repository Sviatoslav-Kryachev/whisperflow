# ⚡ Швидкий старт на VPS

## Мінімальні вимоги
- Ubuntu 20.04+ або Debian 11+
- 2GB RAM, 20GB диску
- Root доступ

## Швидка установка (5 хвилин)

```bash
# 1. Оновити систему
apt update && apt upgrade -y

# 2. Встановити Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
apt install docker-compose-plugin -y

# 3. Клонувати проект
cd /opt
git clone https://github.com/your-username/whisperflow.git
cd whisperflow

# 4. Створити .env файл
cp env.example .env
nano .env  # змінити паролі!

# 5. Запустити
docker compose up -d --build

# 6. Перевірити
docker compose logs -f
```

## Налаштування HTTPS (якщо є домен)

```bash
# Встановити Nginx та Certbot
apt install nginx certbot python3-certbot-nginx -y

# Створити конфігурацію Nginx
cat > /etc/nginx/sites-available/whisperflow << 'EOF'
server {
    listen 80;
    server_name your-domain.com.ua;
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
EOF

# Активувати
ln -s /etc/nginx/sites-available/whisperflow /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Отримати SSL
certbot --nginx -d your-domain.com.ua
```

## Корисні команди

```bash
# Перезапуск
docker compose restart

# Оновлення
git pull && docker compose up -d --build

# Логи
docker compose logs -f app

# Зупинка
docker compose down
```

## Детальні інструкції

Дивіться [DEPLOY_VPS.md](DEPLOY_VPS.md) для повної інструкції.

## Провайдери

Дивіться [UKRAINIAN_HOSTING_PROVIDERS.md](UKRAINIAN_HOSTING_PROVIDERS.md) для списку українських провайдерів.




