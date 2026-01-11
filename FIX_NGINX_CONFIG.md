# 🔧 Исправление конфигурации Nginx

## ❌ Проблема:
- Файл `/etc/nginx/sites-available/whisperflow` пустой
- Nginx не слушает порт 80
- `curl http://173.242.53.230` возвращает Connection refused

## ✅ Решение:

**На VPS выполните:**

```bash
# 1. Создать правильную конфигурацию для WhisperFlow
cat > /etc/nginx/sites-available/whisperflow << 'EOF'
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
EOF

# 2. Проверить, что файл создан правильно
cat /etc/nginx/sites-available/whisperflow

# 3. Проверить, что символическая ссылка существует
ls -la /etc/nginx/sites-enabled/whisperflow

# 4. Если ссылки нет, создать ее
ln -sf /etc/nginx/sites-available/whisperflow /etc/nginx/sites-enabled/whisperflow

# 5. Проверить конфигурацию
nginx -t

# 6. Перезагрузить Nginx
systemctl reload nginx

# 7. Проверить статус Nginx
systemctl status nginx

# 8. Проверить, что Nginx слушает порт 80
netstat -tlnp | grep :80

# 9. Проверить работу через IP
curl http://173.242.53.230

# 10. Проверить, что приложение работает на localhost:8000
curl http://localhost:8000/
```

---

## ✅ Ожидаемый результат:

1. **cat /etc/nginx/sites-available/whisperflow** - должен показать конфигурацию
2. **nginx -t** - должен сказать "syntax is ok" и "test is successful"
3. **netstat -tlnp | grep :80** - должен показать, что Nginx слушает порт 80
4. **curl http://173.242.53.230** - должен вернуть HTML страницу входа
5. **curl http://localhost:8000/** - должен вернуть HTML страницу входа

---

## 🔧 Если что-то не работает:

### Проблема: curl http://localhost:8000/ не работает

```bash
# Проверить, что приложение работает
cd /opt/whisperflow
docker compose ps

# Если контейнер не работает, запустить
docker compose up -d

# Проверить логи
docker compose logs app --tail=50

# Проверить, что приложение отвечает
curl http://localhost:8000/health
curl http://localhost:8000/
```

### Проблема: Nginx не слушает порт 80

```bash
# Проверить конфигурацию
cat /etc/nginx/sites-available/whisperflow

# Проверить, что файл не пустой
wc -l /etc/nginx/sites-available/whisperflow

# Перезапустить Nginx
systemctl restart nginx

# Проверить статус
systemctl status nginx

# Проверить логи
tail -f /var/log/nginx/error.log
```

---

## 📝 После исправления:

Если все работает, можно получать SSL сертификат!
