# ⚡ Швидкий старт міграції на Ukraine.com.ua

## 🎯 Короткий план (30 хвилин)

### 1. Експорт з Railway (5 хв)
```bash
# Отримати DATABASE_URL з Railway Dashboard
export DATABASE_URL="postgresql://..."
python scripts/export_railway_data.py
```

### 2. Замовити VPS (10 хв)
- Відкрити https://www.ukraine.com.ua/ru
- Замовити VPS (**мінімум 4GB RAM** - 2GB буде недостатньо!)
- Отримати IP та доступ
- ⚠️ Див. `VPS_MEMORY_REQUIREMENTS.md` для деталей

### 3. Налаштувати VPS (10 хв)
```bash
ssh root@your-server-ip
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
apt install docker-compose-plugin -y
```

### 4. Розгорнути проект (5 хв)
```bash
cd /opt
git clone https://github.com/your-username/whisperflow.git
cd whisperflow
cp env.example .env
nano .env  # налаштувати паролі
docker compose up -d --build
```

### 5. Імпортувати дані (5 хв)
```bash
scp backups/backup.sql root@server:/tmp/
docker compose exec -T db psql -U whisperflow_user -d whisperflow < /tmp/backup.sql
```

### 6. Налаштувати HTTPS (10 хв)
```bash
apt install nginx certbot python3-certbot-nginx -y
# Створити конфігурацію Nginx (див. MIGRATION_UKRAINE_COM_UA.md)
certbot --nginx -d your-domain.com.ua
```

---

## 📚 Детальні інструкції

- **Повний план:** `MIGRATION_UKRAINE_COM_UA.md`
- **Чеклист:** `MIGRATION_CHECKLIST.md`
- **Скрипти:** `scripts/README.md`

---

## ✅ Готово!

Після виконання всіх кроків ваш сайт працюватиме на ukraine.com.ua!

