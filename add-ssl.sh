#!/bin/bash

# Скрипт добавления SSL сертификатов для TechnoHub Store
# Использование: ./add-ssl.sh

set -e

# Конфигурация VPS
VPS_IP="62.60.178.146"
VPS_USER="root"
VPS_PASS="YOUR_VPS_PASSWORD_HERE"
DOMAIN="technohubstore.net"
PROJECT_DIR="/var/www/technohub"

echo "🔒 Добавление SSL сертификатов для TechnoHub Store"
echo "VPS IP: $VPS_IP"
echo "Домен: $DOMAIN"
echo ""

# Функция для выполнения команд на VPS
run_on_vps() {
    echo "🔧 Выполняем на VPS: $1"
    sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "$1"
}

# Функция для копирования файлов на VPS
copy_to_vps() {
    echo "📁 Копируем: $1 -> $2"
    sshpass -p "$VPS_PASS" rsync -avz --progress -e "ssh -o StrictHostKeyChecking=no" "$1" $VPS_USER@$VPS_IP:"$2"
}

echo "1. Получение SSL сертификатов от Let's Encrypt..."
run_on_vps "certbot --nginx -d $DOMAIN -d www.$DOMAIN -d admin.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN"

echo "2. Обновление nginx конфигурации с SSL..."
copy_to_vps "nginx.conf" "$PROJECT_DIR/"
run_on_vps "cp $PROJECT_DIR/nginx.conf /etc/nginx/sites-available/technohub"
run_on_vps "nginx -t"

echo "3. Перезапуск nginx..."
run_on_vps "systemctl restart nginx"

echo "4. Проверка статуса nginx..."
run_on_vps "systemctl status nginx --no-pager" || true

echo "5. Настройка автоматического обновления сертификатов..."
run_on_vps "systemctl status certbot.timer" || true
run_on_vps "systemctl enable certbot.timer" || true

echo ""
echo "✅ SSL сертификаты установлены!"
echo ""
echo "🌐 Ваши HTTPS адреса:"
echo "   Магазин:  https://$DOMAIN"
echo "   Админка:  https://admin.$DOMAIN"
echo "   API:      https://$DOMAIN/api/health"
echo "   Uploads:  https://$DOMAIN/uploads/"
echo ""
echo "📋 Проверить сертификаты:"
echo "   SSL Labs: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo "   Срок:     certbot certificates" 