#!/bin/bash

# Скрипт исправления развертывания TechnoHub Store на VPS (без SSL)
# Использование: ./fix-vps-nossl.sh

set -e

# Конфигурация VPS
VPS_IP="62.60.178.146"
VPS_USER="root"
VPS_PASS="YOUR_VPS_PASSWORD_HERE"
DOMAIN="technohubstore.net"
PROJECT_DIR="/var/www/technohub"

echo "🔧 Исправление развертывания TechnoHub Store на VPS (без SSL)"
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

echo "1. Остановка сервисов..."
run_on_vps "systemctl stop technohub-backend || true"
run_on_vps "systemctl stop technohub-frontend || true"
run_on_vps "systemctl stop nginx || true"

echo "2. Обновление nginx конфигурации (без SSL)..."
copy_to_vps "nginx-temp.conf" "$PROJECT_DIR/nginx.conf"
run_on_vps "cp $PROJECT_DIR/nginx.conf /etc/nginx/sites-available/technohub"
run_on_vps "nginx -t"

echo "3. Обновление frontend конфигурации..."
copy_to_vps "frontend/next.config.js" "$PROJECT_DIR/frontend/"
copy_to_vps "frontend/env.production" "$PROJECT_DIR/frontend/.env.local"

echo "4. Пересборка frontend..."
run_on_vps "cd $PROJECT_DIR/frontend && npm run build"

echo "5. Создание systemd сервиса для frontend..."
run_on_vps "cat > /etc/systemd/system/technohub-frontend.service << 'EOF'
[Unit]
Description=TechnoHub Store Frontend (Next.js)
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$PROJECT_DIR/frontend
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF"

echo "6. Создание директории uploads если не существует..."
run_on_vps "mkdir -p $PROJECT_DIR/backend/uploads"
run_on_vps "chown -R www-data:www-data $PROJECT_DIR/backend/uploads"
run_on_vps "chmod -R 755 $PROJECT_DIR/backend/uploads"

echo "7. Запуск сервисов..."
run_on_vps "systemctl daemon-reload"
run_on_vps "systemctl start technohub-backend"
run_on_vps "systemctl enable technohub-backend"
run_on_vps "systemctl start technohub-frontend"
run_on_vps "systemctl enable technohub-frontend"
run_on_vps "systemctl start nginx"

echo "8. Проверка статуса сервисов..."
run_on_vps "systemctl status nginx --no-pager" || true
run_on_vps "systemctl status technohub-backend --no-pager" || true
run_on_vps "systemctl status technohub-frontend --no-pager" || true

echo "9. Проверка nginx конфигурации..."
run_on_vps "nginx -t"

echo ""
echo "✅ Исправление завершено!"
echo ""
echo "🌐 Проверьте работу (HTTP):"
echo "   Магазин:  http://$DOMAIN"
echo "   Админка:  http://admin.$DOMAIN"
echo "   API:      http://$DOMAIN/api/health"
echo "   Uploads:  http://$DOMAIN/uploads/"
echo ""
echo "📋 Проверить логи:"
echo "   Backend:   journalctl -u technohub-backend -f"
echo "   Frontend:  journalctl -u technohub-frontend -f"
echo "   Nginx:     tail -f /var/log/nginx/error.log"
echo ""
echo "⚠️  Чтобы добавить SSL, выполните: ./add-ssl.sh" 