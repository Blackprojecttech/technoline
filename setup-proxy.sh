#!/bin/bash

# Скрипт настройки прокси-сервера для technohubstore.net
# Запускать на прокси-сервере 195.209.188.108

set -e

echo "🚀 Настройка прокси-сервера для technohubstore.net"
echo "Прокси IP: 195.209.188.108"
echo "Реальный сервер: 91.232.39.213"

# Обновление системы
echo "📦 Обновление системы..."
apt update && apt upgrade -y

# Установка Nginx и Certbot
echo "📦 Установка Nginx и Certbot..."
apt install -y nginx certbot python3-certbot-nginx

# Создание конфигурации Nginx
echo "⚙️ Создание конфигурации Nginx..."
cat > /etc/nginx/sites-available/technohubstore << 'EOF'
# Основной сайт technohubstore.net
server {
    listen 80;
    server_name technohubstore.net www.technohubstore.net;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name technohubstore.net www.technohubstore.net;

    # SSL сертификаты (будут настроены certbot)
    ssl_certificate /etc/letsencrypt/live/technohubstore.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/technohubstore.net/privkey.pem;
    
    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Проксирование фронтенда
    location / {
        proxy_pass http://91.232.39.213:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
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

    ssl_certificate /etc/letsencrypt/live/technohubstore.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/technohubstore.net/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Проксирование админки
    location / {
        proxy_pass http://91.232.39.213:3201;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

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

    ssl_certificate /etc/letsencrypt/live/technohubstore.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/technohubstore.net/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://91.232.39.213:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Активация сайта
echo "🔗 Активация сайта..."
ln -sf /etc/nginx/sites-available/technohubstore /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Проверка конфигурации
echo "✅ Проверка конфигурации Nginx..."
nginx -t

# Запуск Nginx
echo "🚀 Запуск Nginx..."
systemctl restart nginx
systemctl enable nginx

# Настройка firewall
echo "🛡️ Настройка firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 25/tcp
ufw allow 465/tcp
ufw allow 587/tcp
ufw allow 993/tcp
ufw allow 995/tcp
ufw --force enable

# Получение SSL сертификата
echo "🔒 Получение SSL сертификата..."
certbot --nginx \
    -d technohubstore.net \
    -d www.technohubstore.net \
    -d admin.technohubstore.net \
    -d mail.technohubstore.net \
    --email admin@technohubstore.net \
    --agree-tos \
    --non-interactive

# Настройка автообновления SSL
echo "🔄 Настройка автообновления SSL..."
systemctl enable certbot.timer
systemctl start certbot.timer

# Настройка проксирования почтовых портов
echo "📧 Настройка проксирования почтовых портов..."
cat >> /etc/nginx/nginx.conf << 'EOF'

# Проксирование TCP портов для почты
stream {
    server {
        listen 25;
        proxy_pass 91.232.39.213:25;
        proxy_timeout 1s;
        proxy_responses 1;
    }
    
    server {
        listen 465;
        proxy_pass 91.232.39.213:465;
        proxy_timeout 1s;
        proxy_responses 1;
    }
    
    server {
        listen 587;
        proxy_pass 91.232.39.213:587;
        proxy_timeout 1s;
        proxy_responses 1;
    }
    
    server {
        listen 993;
        proxy_pass 91.232.39.213:993;
        proxy_timeout 1s;
        proxy_responses 1;
    }
    
    server {
        listen 995;
        proxy_pass 91.232.39.213:995;
        proxy_timeout 1s;
        proxy_responses 1;
    }
}
EOF

# Перезапуск Nginx с новой конфигурацией
echo "🔄 Перезапуск Nginx..."
nginx -t && systemctl restart nginx

echo ""
echo "✅ Прокси-сервер настроен!"
echo ""
echo "🌐 Ваши сайты теперь доступны:"
echo "   https://technohubstore.net"
echo "   https://www.technohubstore.net"
echo "   https://admin.technohubstore.net"
echo "   https://mail.technohubstore.net"
echo ""
echo "📋 Следующие шаги:"
echo "1. Настройте DNS записи в панели домена:"
echo "   A @ 195.209.188.108"
echo "   A www 195.209.188.108"
echo "   A admin 195.209.188.108"
echo "   A mail 195.209.188.108"
echo ""
echo "2. Запустите ваши приложения на сервере 91.232.39.213:"
echo "   - Frontend на порту 3000"
echo "   - Backend на порту 5002"
echo "   - Admin на порту 3201"
echo "   - Mail на порту 8080" 