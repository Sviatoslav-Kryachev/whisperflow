# Настройка постоянной базы данных на Railway

## Проблема
SQLite база данных теряется при каждом пересоздании контейнера на Railway, так как файл находится внутри контейнера.

## Решение: PostgreSQL на Railway

### 1. Создайте PostgreSQL Database на Railway

1. Зайдите в ваш проект на Railway
2. Нажмите **"New"** → **"Database"** → **"Add PostgreSQL"**
3. Railway автоматически создаст базу данных и установит переменную окружения `DATABASE_URL`

### 2. Переменные окружения

Railway автоматически установит переменную `DATABASE_URL` в формате:
```
postgresql://user:password@hostname:port/database
```

**Ничего дополнительно настраивать не нужно** - код автоматически обнаружит эту переменную и использует PostgreSQL вместо SQLite.

### 3. Миграция данных (если нужно перенести старые данные)

Если у вас уже есть данные в SQLite, можно перенести их:

```python
# migrate_to_postgres.py (временный скрипт)
import sqlite3
import psycopg2
import os
from urllib.parse import urlparse

# Подключение к SQLite
sqlite_conn = sqlite3.connect('backend/db.sqlite3')
sqlite_cur = sqlite_conn.cursor()

# Подключение к PostgreSQL
database_url = os.getenv('DATABASE_URL')
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

pg_conn = psycopg2.connect(database_url)
pg_cur = pg_conn.cursor()

# Копирование данных (пример для таблицы users)
sqlite_cur.execute("SELECT * FROM users")
users = sqlite_cur.fetchall()

for user in users:
    pg_cur.execute("INSERT INTO users (id, email, password) VALUES (%s, %s, %s) ON CONFLICT (id) DO NOTHING", user)

pg_conn.commit()
sqlite_conn.close()
pg_conn.close()
```

### 4. Проверка

После создания PostgreSQL базы данных на Railway:

1. Задеплойте изменения (код уже обновлен)
2. Railway автоматически использует PostgreSQL из переменной `DATABASE_URL`
3. Данные будут сохраняться между перезапусками контейнера

### 5. Локальная разработка

Для локальной разработки код будет продолжать использовать SQLite, если `DATABASE_URL` не установлен.

## Альтернатива: Volume для SQLite (не рекомендуется)

Если вы хотите использовать SQLite с постоянным хранилищем:

1. В Railway создайте **Volume**
2. Настройте монтирование volume в Dockerfile
3. Измените путь к БД на путь внутри volume

**Но PostgreSQL - более надежное решение для продакшна!**

