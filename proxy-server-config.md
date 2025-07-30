# 🌐 Настройка прокси-сервера для technohubstore.net

## 📋 Данные прокси-сервера:
- **IP**: 195.209.188.108
- **Порт**: 62494
- **Пользователь**: y1ZCBicG
- **Пароль**: 1Qi3Jh6d

## 🔧 Конфигурация Nginx на прокси-сервере

### Файл: `/etc/nginx/sites-available/technohubstore`

```nginx
# Основной сайт technohubstore.net
server {
    listen 80;
    server_name technohubstore.net www.technohubstore.net;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name technohubstore.net www.technohubstore.net;

    # SSL сертификаты
    ssl_certificate /etc/letsencrypt/live/technohubstore.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/technohubstore.net/privkey.pem;
    
    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Проксирование на ваш реальный сервер
    location / {
        proxy_pass http://91.232.39.213:3000;  # Ваш фронтенд
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API проксирование
    location /api/ {
        proxy_pass http://91.232.39.213:5002/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Админка admin.technohubstore.net
server {
    listen 80;
    server_name admin.technohubstore.net;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.technohubstore.net;

    # SSL сертификаты
    ssl_certificate /etc/letsencrypt/live/technohubstore.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/technohubstore.net/privkey.pem;
    
    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Проксирование админки
    location / {
        proxy_pass http://91.232.39.213:3201;  # Ваша админка
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API для админки
    location /api/ {
        proxy_pass http://91.232.39.213:5002/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Почтовый сервер mail.technohubstore.net
server {
    listen 80;
    server_name mail.technohubstore.net;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mail.technohubstore.net;

    # SSL сертификаты
    ssl_certificate /etc/letsencrypt/live/technohubstore.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/technohubstore.net/privkey.pem;
    
    # Проксирование почтового веб-интерфейса
    location / {
        proxy_pass http://91.232.39.213:8080;  # Ваш почтовый веб-интерфейс
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🚀 Команды для настройки на прокси-сервере

```bash
# Подключение к прокси-серверу
ssh root@195.209.188.108

# Установка Nginx
apt update && apt install nginx certbot python3-certbot-nginx -y

# Создание конфигурации
nano /etc/nginx/sites-available/technohubstore

# Активация сайта
ln -s /etc/nginx/sites-available/technohubstore /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Проверка конфигурации
nginx -t

# Запуск Nginx
systemctl restart nginx
systemctl enable nginx

# Получение SSL сертификата
certbot --nginx -d technohubstore.net -d www.technohubstore.net -d admin.technohubstore.net -d mail.technohubstore.net --email admin@technohubstore.net --agree-tos --non-interactive

# Настройка автообновления SSL
systemctl enable certbot.timer
```

## 📧 Настройка почтовых портов

Для почтового сервера нужно проксировать TCP порты:

```bash
# Установка stream модуля для Nginx
# В /etc/nginx/nginx.conf добавить в конец:

stream {
    # SMTP (25)
    server {
        listen 25;
        proxy_pass 91.232.39.213:25;
    }
    
    # SMTP SSL (465)
    server {
        listen 465;
        proxy_pass 91.232.39.213:465;
    }
    
    # SMTP TLS (587)
    server {
        listen 587;
        proxy_pass 91.232.39.213:587;
    }
    
    # IMAP SSL (993)
    server {
        listen 993;
        proxy_pass 91.232.39.213:993;
    }
    
    # POP3 SSL (995)
    server {
        listen 995;
        proxy_pass 91.232.39.213:995;
    }
}
``` 