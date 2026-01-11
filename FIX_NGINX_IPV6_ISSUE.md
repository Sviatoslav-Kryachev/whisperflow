# 🔧 Исправление проблемы с IPv6 в Nginx

## ❌ Проблема в логах:
```
connect() failed (111: Unknown error) while connecting to upstream, 
upstream: "http://[::1]:8000/"
```

Nginx пытается подключиться через IPv6 (`[::1]`), но приложение слушает только IPv4.

## ✅ Решение:

**На VPS выполните:**

```bash
# Обновить конфигурацию Nginx для использования IPv4
cat > /etc/nginx/sites-available/whisperflow << 'EOF'
server {
    listen 80;
    server_name app-toolbox.space www.app-toolbox.space;
    client_max_body_size 500M;

    location / {
        proxy_pass http://127.0.0.1:8000;  # Используем IPv4 вместо localhost
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

# Проверить конфигурацию
nginx -t

# Перезагрузить Nginx
systemctl reload nginx

# Проверить логи (должно быть без ошибок)
tail -20 /var/log/nginx/whisperflow_error.log
```

---

## ✅ Проверка работы:

```bash
# Проверить работу через IP
curl http://173.242.53.230

# Проверить работу через домен (после обновления DNS)
curl http://app-toolbox.space

# Проверить логи (должно быть без ошибок IPv6)
tail -20 /var/log/nginx/whisperflow_error.log
```

---

## 📝 Примечание:

- Приложение уже работает! ✅
- Ошибка в логах не критична, но лучше исправить
- После исправления ошибки IPv6 исчезнут из логов
- Можно получить SSL сертификат даже с этой ошибкой (она не блокирует работу)

---

## 🎉 Текущий статус:

**Приложение работает и доступно!**
- ✅ http://173.242.53.230 - работает
- ✅ http://app-toolbox.space - будет работать после обновления DNS (5-60 минут)
- ⚠️ Небольшая ошибка IPv6 в логах (не критично, можно исправить)
