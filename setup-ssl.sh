#!/bin/bash

# Скрипт настройки SSL сертификатов для Techno-line.stor
# Использование: ./setup-ssl.sh [DOMAIN] [EMAIL]
# По умолчанию: technohubstore.net

set -e

if [ $# -lt 1 ]; then
    echo "Использование: $0 [DOMAIN] [EMAIL]"
    echo "Пример: $0 technohubstore.net admin@technohubstore.net"
    exit 1
fi

DOMAIN=${1:-technohubstore.net}
EMAIL=${2:-admin@technohubstore.net}

echo "🔒 Настройка SSL сертификатов для домена: $DOMAIN"

# Установка certbot
echo "📦 Установка certbot..."
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Получение сертификатов
echo "🔐 Получение SSL сертификатов..."
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN -d admin.$DOMAIN --email $EMAIL --agree-tos --non-interactive

# Настройка автоматического обновления
echo "🔄 Настройка автоматического обновления сертификатов..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Проверка статуса
echo "✅ Проверка статуса обновления сертификатов..."
sudo systemctl status certbot.timer --no-pager

echo "✅ SSL сертификаты настроены!"
echo ""
echo "🔒 Ваш сайт теперь доступен по HTTPS:"
echo "   https://$DOMAIN"
echo "   https://www.$DOMAIN"
echo "   https://admin.$DOMAIN"
echo ""
echo "📋 Сертификаты будут автоматически обновляться каждые 12 часов" 