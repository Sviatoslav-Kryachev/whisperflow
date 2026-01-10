# 🚀 Команды для выполнения ПРЯМО СЕЙЧАС на VPS

## 📍 Текущее состояние:
- Вы находитесь в `psql` под пользователем `postgres`
- PostgreSQL 14 установлен и работает
- Нужно создать базу данных и пользователя

---

## ⚡ ШАГ 1: Создать базу данных и пользователя (В PSQL)

**Скопируйте и выполните в psql (где вы сейчас):**

```sql
-- 1. Создать базу данных
CREATE DATABASE whisperflow_db;

-- 2. Создать пользователя (ЗАМЕНИТЕ ПАРОЛЬ на свой!)
CREATE USER whisperflow_user WITH PASSWORD 'MySecurePassword123!';

-- 3. Выдать права на базу данных
GRANT ALL PRIVILEGES ON DATABASE whisperflow_db TO whisperflow_user;

-- 4. Перейти в базу данных
\c whisperflow_db

-- 5. Выдать права на схему public
GRANT ALL ON SCHEMA public TO whisperflow_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO whisperflow_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO whisperflow_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO whisperflow_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO whisperflow_user;

-- 6. Проверить, что все создано
\du  -- Показать пользователей
\l   -- Показать базы данных

-- 7. Выйти из psql
\q
```

**⚠️ ВАЖНО:** Замените `'MySecurePassword123!'` на свой безопасный пароль!

**Сгенерировать безопасный пароль (в другом терминале или после выхода из psql):**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(24))"
```

---

## ⚡ ШАГ 2: Проверить подключение

**После выхода из psql (`\q`), выполните:**

```bash
# Попробовать подключиться от имени нового пользователя
psql -U whisperflow_user -d whisperflow_db

# Введите пароль, который вы указали при создании пользователя
# Если подключение успешно:
\dt  # Показать таблицы (пока их нет)
\q   # Выйти
```

---

## ⚡ ШАГ 3: Создать .env файл

**На VPS:**
```bash
cd /opt/whisperflow

# Создать .env из примера
cp env.example .env

# Отредактировать .env
nano .env
```

**В .env файле изменить:**

```env
# Database Configuration - внешний PostgreSQL на VPS
# ИСПОЛЬЗУЙТЕ ВАШИ РЕАЛЬНЫЕ ДАННЫЕ:
DATABASE_URL=postgresql://whisperflow_user:ВАШ_РЕАЛЬНЫЙ_ПАРОЛЬ@localhost:5432/whisperflow_db

# PostgreSQL Password (для совместимости)
POSTGRES_PASSWORD=ВАШ_РЕАЛЬНЫЙ_ПАРОЛЬ

# Secret Key - СГЕНЕРИРОВАТЬ НОВЫЙ!
# Выполните: python3 -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=ВАШ_СГЕНЕРИРОВАННЫЙ_SECRET_KEY_МИНИМУМ_32_СИМВОЛА

# Port
PORT=8000

# Environment
ENVIRONMENT=production
```

**Сгенерировать SECRET_KEY:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Сохранить:** `Ctrl+O`, `Enter`, `Ctrl+X`

---

## ⚡ ШАГ 4: Установить Docker и Docker Compose

**На VPS:**
```bash
# Проверить, установлен ли Docker
docker --version

# Если не установлен, установить:
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Установить Docker Compose Plugin
apt update
apt install docker-compose-plugin -y

# Проверить версии
docker --version
docker compose version
```

---

## ⚡ ШАГ 5: Обновить docker-compose.yml (если нужно)

**На VPS:**
```bash
cd /opt/whisperflow

# Подтянуть последние изменения с GitHub (включая обновленный docker-compose.yml)
git pull origin main

# Проверить docker-compose.yml
cat docker-compose.yml | head -20

# Должно быть: network_mode: host и DATABASE_URL с whisperflow_db
```

---

## ⚡ ШАГ 6: Запустить приложение

**На VPS:**
```bash
cd /opt/whisperflow

# Собрать и запустить контейнер
docker compose up -d --build

# Проверить статус
docker compose ps

# Посмотреть логи (первые 50 строк)
docker compose logs app --tail=50

# Посмотреть логи в реальном времени
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

# Или проверить главную страницу
curl http://localhost:8000/
```

---

## ✅ Проверка работоспособности

```bash
# Проверить контейнеры
docker compose ps

# Проверить логи
docker compose logs app --tail=50

# Проверить подключение к PostgreSQL из контейнера
docker compose exec app python3 -c "import os; print(os.getenv('DATABASE_URL'))"

# Проверить использование ресурсов
docker stats
```

---

## 🔧 Если что-то не работает:

### Проблема: Не могу подключиться к PostgreSQL

```bash
# Проверить, что PostgreSQL слушает
sudo netstat -tlnp | grep 5432

# Проверить конфигурацию PostgreSQL
sudo cat /etc/postgresql/14/main/postgresql.conf | grep listen_addresses

# Проверить pg_hba.conf
sudo cat /etc/postgresql/14/main/pg_hba.conf | grep -v "^#"

# Перезапустить PostgreSQL
sudo systemctl restart postgresql
sudo systemctl status postgresql
```

### Проблема: Контейнер не запускается

```bash
# Посмотреть логи ошибок
docker compose logs app

# Проверить .env файл
cat .env | grep DATABASE_URL

# Проверить синтаксис docker-compose.yml
docker compose config
```

### Проблема: Ошибка подключения к базе данных

```bash
# Проверить, что база данных существует
sudo -u postgres psql -c "\l" | grep whisperflow_db

# Проверить пользователя
sudo -u postgres psql -c "\du" | grep whisperflow_user

# Попробовать подключиться вручную
psql -U whisperflow_user -d whisperflow_db -h localhost
```

---

## 📝 Чеклист:

- [ ] База данных `whisperflow_db` создана
- [ ] Пользователь `whisperflow_user` создан с паролем
- [ ] Права выданы пользователю на базу данных
- [ ] Подключение к базе данных работает: `psql -U whisperflow_user -d whisperflow_db`
- [ ] `.env` файл создан и настроен
- [ ] SECRET_KEY сгенерирован
- [ ] Docker и Docker Compose установлены
- [ ] `docker-compose.yml` обновлен (подтянут с GitHub)
- [ ] Приложение запущено: `docker compose up -d --build`
- [ ] Контейнер работает: `docker compose ps`
- [ ] Приложение отвечает: `curl http://localhost:8000/health`

---

**Начните с ШАГА 1 (команды в psql)!** 🚀
