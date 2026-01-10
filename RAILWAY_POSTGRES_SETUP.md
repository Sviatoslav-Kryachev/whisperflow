# Настройка PostgreSQL на Railway для постоянного хранения данных

## Проблема

SQLite на Railway **НЕ сохраняет данные** между деплоями, так как база данных хранится в файловой системе Docker контейнера, которая пересоздаётся при каждом обновлении.

**PostgreSQL на Railway - это отдельный сервис с постоянным хранилищем, данные сохраняются.**

## Решение: Настройка PostgreSQL на Railway

### Шаг 1: Создать PostgreSQL базу данных на Railway

1. Откройте ваш проект на Railway: https://railway.app
2. Нажмите **"New"** → **"Database"** → **"Add PostgreSQL"**
3. Railway автоматически создаст PostgreSQL сервис и установит переменную окружения `DATABASE_URL`

### Шаг 2: Проверить переменную окружения

1. В Railway Dashboard откройте ваш проект
2. Перейдите в **Settings** → **Variables**
3. Убедитесь, что `DATABASE_URL` присутствует (Railway добавляет её автоматически при создании PostgreSQL)

### Шаг 3: Задеплоить изменения

После добавления PostgreSQL, Railway автоматически перезапустит приложение с новой базой данных.

```bash
git add backend/app/database.py backend/requirements.txt
git commit -m "Add PostgreSQL support for persistent data storage on Railway"
git push
```

### Шаг 4: Проверить работу

1. После деплоя зайдите на сайт и зарегистрируйтесь заново (старая база SQLite недоступна)
2. Проверьте логи Railway - должно быть сообщение: "Using PostgreSQL database from DATABASE_URL (persistent storage)"

## Важно!

- **Локальная разработка**: Код автоматически использует SQLite, если `DATABASE_URL` не установлена
- **Railway (production)**: Автоматически использует PostgreSQL, если `DATABASE_URL` установлена Railway
- **Данные сохраняются**: PostgreSQL на Railway хранит данные на постоянном хранилище, они не теряются при редеплое

## Восстановление данных (если они потеряны)

К сожалению, если данные уже потеряны из SQLite, их нельзя восстановить. Но после настройки PostgreSQL данные больше не будут теряться.




