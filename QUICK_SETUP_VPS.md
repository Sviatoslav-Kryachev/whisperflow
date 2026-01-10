# ⚡ Быстрая настройка VPS (PostgreSQL уже установлен)

## ✅ Что уже готово:
- ✅ VPS подключен по SSH
- ✅ PostgreSQL установлен нативно на VPS
- ✅ База данных `whisperflow_db` и пользователь `whisperflow_user` созданы
- ✅ Проект синхронизирован с GitHub в `/opt/whisperflow`

---

## 🚀 Быстрые шаги (10-15 минут)

### ШАГ 1: Подтянуть изменения с GitHub (если нужно)

**На VPS:**
```bash
cd /opt/whisperflow
git pull origin main  # или master, в зависимости от вашей ветки
```

---

### ШАГ 2: Настроить .env файл

**На VPS:**
```bash
cd /opt/whisperflow

# Создать .env из примера (если еще не создан)
cp env.example .env
nano .env
```

**Обязательно изменить в .env:**
```env
# Database Configuration - внешний PostgreSQL на VPS
DATABASE_URL=postgresql://whisperflow_user:ВАШ_РЕАЛЬНЫЙ_ПАРОЛЬ@localhost:5432/whisperflow_db

# PostgreSQL Password (не нужен для внешнего PostgreSQL, но оставим для совместимости)
POSTGRES_PASSWORD=ВАШ_РЕАЛЬНЫЙ_ПАРОЛЬ

# Secret Key - СГЕНЕРИРОВАТЬ НОВЫЙ!
# python3 -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=ВАШ_СГЕНЕРИРОВАННЫЙ_SECRET_KEY

PORT=8000
ENVIRONMENT=production
```

**Сгенерировать SECRET_KEY:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Важно:** 
- ✅ Замените `ВАШ_РЕАЛЬНЫЙ_ПАРОЛЬ` на пароль, который вы использовали при создании пользователя `whisperflow_user`
- ✅ Замените `whisperflow_db` на реальное имя вашей базы данных (если отличается)
- ✅ Сгенерируйте новый SECRET_KEY

---

### ШАГ 3: Установить Docker и Docker Compose

**На VPS:**
```bash
# Проверить, установлен ли Docker
docker --version

# Если не установлен, установить:
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Установить Docker Compose Plugin
apt install docker-compose-plugin -y

# Проверить версии
docker --version
docker compose version
```

---

### ШАГ 4: Настроить PostgreSQL для доступа из Docker

**На VPS:**
```bash
# Так как используем network_mode: host, PostgreSQL должен слушать localhost
# Проверить конфигурацию PostgreSQL
sudo nano /etc/postgresql/15/main/postgresql.conf

# Найти и проверить:
# listen_addresses = 'localhost'  # Должно быть localhost или '*'
# port = 5432

# Перезапустить PostgreSQL (если меняли конфигурацию)
sudo systemctl restart postgresql

# Проверить, что PostgreSQL работает
sudo systemctl status postgresql
```

**Проверить подключение:**
```bash
# Попробовать подключиться к базе
psql -U whisperflow_user -d whisperflow_db -h localhost

# Если успешно, выйти:
\q
```

---

### ШАГ 5: Запустить приложение через Docker Compose

**На VPS:**
```bash
cd /opt/whisperflow

# Проверить docker-compose.yml (он уже настроен для внешнего PostgreSQL)
cat docker-compose.yml | head -20

# Собрать и запустить контейнер
docker compose up -d --build

# Проверить статус
docker compose ps

# Посмотреть логи
docker compose logs -f app
```

**Ожидаемый результат:**
- ✅ Контейнер `app` должен быть в статусе `Up`
- ✅ В логах должно быть: "Using PostgreSQL database from DATABASE_URL"
- ✅ Приложение должно отвечать на http://localhost:8000

**Проверить работу:**
```bash
# Проверить health endpoint
curl http://localhost:8000/health

# Или
curl http://localhost:8000/
```

---

### ШАГ 6: Импортировать данные с Railway (если нужно)

**Если есть backup файл:**

```bash
# На локальном компьютере: загрузить backup на VPS
scp backups/whisperflow_backup_*.sql root@YOUR_IP:/tmp/backup.sql

# На VPS: импортировать в PostgreSQL
psql -U whisperflow_user -d whisperflow_db -f /tmp/backup.sql

# Или через sudo postgres:
sudo -u postgres psql whisperflow_db < /tmp/backup.sql
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

### ШАГ 7: Настроить Nginx

**На VPS:**
```bash
# Установить Nginx (если еще не установлен)
apt install nginx -y

# Создать конфигурацию
sudo nano /etc/nginx/sites-available/whisperflow
```

**Содержимое файла:**
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
    
    access_log /var/log/nginx/whisperflow_access.log;
    error_log /var/log/nginx/whisperflow_error.log;
}
```

**Активировать конфигурацию:**
```bash
# Создать символическую ссылку
sudo ln -s /etc/nginx/sites-available/whisperflow /etc/nginx/sites-enabled/

# Удалить дефолтную конфигурацию (опционально)
sudo rm /etc/nginx/sites-enabled/default

# Проверить конфигурацию
sudo nginx -t

# Перезагрузить Nginx
sudo systemctl reload nginx

# Проверить статус
sudo systemctl status nginx
```

---

### ШАГ 8: Настроить DNS для домена

**В панели управления доменом (где вы покупали app-toolbox.space):**

1. Зайти в настройки DNS
2. Добавить A-запись:
   - **Имя**: `@` (или оставить пустым для корневого домена)
   - **Тип**: `A`
   - **Значение**: `YOUR_VPS_IP` (IP вашего VPS)
   - **TTL**: `3600`

3. Добавить A-запись для www:
   - **Имя**: `www`
   - **Тип**: `A`
   - **Значение**: `YOUR_VPS_IP`
   - **TTL**: `3600`

**Проверить DNS (после распространения, может занять 5-60 минут):**
```bash
# На локальном компьютере или на VPS
nslookup app-toolbox.space
# Должен вернуть IP вашего VPS
```

**Проверить работу домена:**
```bash
curl http://app-toolbox.space
# Или в браузере: http://app-toolbox.space
```

---

### ШАГ 9: Получить SSL сертификат (HTTPS)

**На VPS:**
```bash
# Установить Certbot
apt install certbot python3-certbot-nginx -y

# Получить SSL сертификат
sudo certbot --nginx -d app-toolbox.space -d www.app-toolbox.space

# Certbot спросит:
# - Email адрес: введите ваш email
# - Согласие с условиями: Y
# - Подписка на новости: N (опционально)
# - Редирект HTTP на HTTPS: 2 (Redirect)
```

**Проверить HTTPS:**
```bash
curl https://app-toolbox.space
# Или в браузере: https://app-toolbox.space
```

**Проверить автообновление сертификата:**
```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

---

## ✅ Проверка работоспособности

```bash
# Проверить контейнеры
docker compose ps

# Проверить логи приложения
docker compose logs app --tail=50

# Проверить использование ресурсов
docker stats

# Проверить базу данных
psql -U whisperflow_user -d whisperflow_db -c "\dt"

# Проверить работу через браузер
# https://app-toolbox.space
# https://app-toolbox.space/login
```

---

## 🔧 Полезные команды

```bash
# Перезапустить приложение
cd /opt/whisperflow
docker compose restart

# Остановить приложение
docker compose down

# Запустить приложение
docker compose up -d

# Обновить проект (если изменили код)
git pull origin main
docker compose up -d --build

# Посмотреть логи
docker compose logs -f app

# Подключиться к контейнеру
docker compose exec app bash

# Проверить подключение к PostgreSQL
psql -U whisperflow_user -d whisperflow_db -h localhost
```

---

## 🆘 Решение проблем

### Проблема: Контейнер не запускается

```bash
# Проверить логи
docker compose logs app

# Проверить .env файл
cat .env | grep DATABASE_URL

# Проверить подключение к PostgreSQL
psql -U whisperflow_user -d whisperflow_db -h localhost
```

### Проблема: Ошибка подключения к PostgreSQL

```bash
# Проверить, что PostgreSQL слушает
sudo netstat -tlnp | grep 5432

# Проверить конфигурацию PostgreSQL
sudo cat /etc/postgresql/15/main/postgresql.conf | grep listen_addresses

# Проверить доступ пользователя
sudo -u postgres psql -c "\du"

# Проверить пароль пользователя
psql -U whisperflow_user -d whisperflow_db -h localhost
```

### Проблема: Nginx не работает

```bash
# Проверить конфигурацию
sudo nginx -t

# Проверить статус
sudo systemctl status nginx

# Проверить логи
sudo tail -f /var/log/nginx/whisperflow_error.log
```

### Проблема: SSL не работает

```bash
# Проверить сертификаты
sudo certbot certificates

# Обновить сертификат
sudo certbot renew

# Проверить конфигурацию Nginx
sudo nginx -t
```

---

## 📝 Чеклист

- [ ] Изменения подтянуты с GitHub (`git pull`)
- [ ] .env файл создан и настроен
- [ ] Docker и Docker Compose установлены
- [ ] PostgreSQL настроен и доступен
- [ ] Приложение запущено: `docker compose up -d --build`
- [ ] Данные импортированы (если нужно)
- [ ] Nginx настроен и работает
- [ ] DNS записи настроены для домена
- [ ] Домен работает через HTTP
- [ ] SSL сертификат получен
- [ ] HTTPS работает
- [ ] Приложение доступно по https://app-toolbox.space

---

**Готово! После выполнения всех шагов WhisperFlow будет работать на https://app-toolbox.space** 🚀
