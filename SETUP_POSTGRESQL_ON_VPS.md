# 🗄️ Настройка PostgreSQL на VPS (шаги прямо сейчас)

## ✅ Текущее состояние:
- ✅ PostgreSQL 14 установлен и работает
- ✅ Вы находитесь в `psql` под пользователем `postgres`
- ✅ Git синхронизирован с GitHub

---

## 🎯 ШАГИ для выполнения ПРЯМО СЕЙЧАС в psql:

### 1. Создать базу данных `whisperflow_db`

**В psql (где вы сейчас):**
```sql
-- Создать базу данных
CREATE DATABASE whisperflow_db;

-- Проверить, что база создана
\l
```

### 2. Создать пользователя `whisperflow_user` с паролем

**В psql:**
```sql
-- Создать пользователя с паролем
CREATE USER whisperflow_user WITH PASSWORD 'ВАШ_БЕЗОПАСНЫЙ_ПАРОЛЬ';

-- Замените ВАШ_БЕЗОПАСНЫЙ_ПАРОЛЬ на реальный пароль!
-- Например: CREATE USER whisperflow_user WITH PASSWORD 'MySecurePass123!';
```

**Сгенерировать безопасный пароль (на VPS в другом терминале):**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(24))"
```

### 3. Выдать права пользователю на базу данных

**В psql:**
```sql
-- Выдать все права на базу данных
GRANT ALL PRIVILEGES ON DATABASE whisperflow_db TO whisperflow_user;

-- Перейти в базу данных
\c whisperflow_db

-- Выдать права на схему public (для создания таблиц)
GRANT ALL ON SCHEMA public TO whisperflow_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO whisperflow_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO whisperflow_user;

-- Установить права по умолчанию для будущих объектов
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO whisperflow_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO whisperflow_user;

-- Проверить пользователей
\du

-- Выйти из psql
\q
```

---

## ✅ Проверить подключение:

**В терминале VPS (после выхода из psql):**
```bash
# Попробовать подключиться от имени нового пользователя
psql -U whisperflow_user -d whisperflow_db

# Если спросит пароль, введите пароль, который вы установили
# Если подключение успешно, выполните:
\dt  # Показать таблицы (пока их нет)
\q   # Выйти
```

**Если не может подключиться, проверьте конфигурацию PostgreSQL:**
```bash
# Проверить конфигурацию pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Убедитесь, что есть строка для локального доступа:
# local   all             all                                     peer
# host    all             all             127.0.0.1/32            scram-sha-256
# host    all             all             ::1/128                 scram-sha-256

# Если изменили, перезапустить PostgreSQL:
sudo systemctl restart postgresql
```

---

## 📝 Полный пример команд в psql:

```sql
-- Войти в psql (если еще не в нем)
sudo -u postgres psql

-- Выполнить все команды:
CREATE DATABASE whisperflow_db;
CREATE USER whisperflow_user WITH PASSWORD 'MySecurePass123!';
GRANT ALL PRIVILEGES ON DATABASE whisperflow_db TO whisperflow_user;
\c whisperflow_db
GRANT ALL ON SCHEMA public TO whisperflow_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO whisperflow_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO whisperflow_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO whisperflow_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO whisperflow_user;
\du
\l
\q
```

---

## 🔐 Важно: Сохраните пароль!

После создания пользователя, **обязательно сохраните пароль**, он понадобится для `.env` файла!

Пример:
- **База данных**: `whisperflow_db`
- **Пользователь**: `whisperflow_user`
- **Пароль**: `MySecurePass123!` (ваш реальный пароль)

---

## ⏭️ Следующие шаги:

После создания базы данных и пользователя:

1. Создать `.env` файл с DATABASE_URL
2. Установить Docker
3. Запустить приложение

**Продолжить?** Выполните команды выше в psql, затем сообщите, когда будете готовы к следующим шагам!
