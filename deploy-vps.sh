#!/bin/bash

# Скрипт развертывания TechnoHub Store на VPS
# VPS: 62.60.178.146, Ubuntu 24.04, 4GB RAM, 2 CPU
# Использование: ./deploy-vps.sh

set -e

# Конфигурация VPS
VPS_IP="62.60.178.146"
VPS_USER="root"
VPS_PASS="YOUR_VPS_PASSWORD_HERE"
DOMAIN="technohubstore.net"
PROJECT_DIR="/var/www/technohub"

# Общее количество этапов для расчета процентов
TOTAL_STEPS=14
CURRENT_STEP=0

# Функция для отображения прогресса
show_progress() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    PERCENT=$((CURRENT_STEP * 100 / TOTAL_STEPS))
    echo ""
    echo "🔄 [$PERCENT%] Этап $CURRENT_STEP/$TOTAL_STEPS: $1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

echo "🚀 Развертывание TechnoHub Store на VPS"
echo "VPS IP: $VPS_IP"
echo "Домен: $DOMAIN"
echo ""

# Проверка подключения к VPS
echo "🔍 Проверка подключения к VPS..."
if ping -c 1 $VPS_IP >/dev/null 2>&1; then
    echo "✅ VPS доступен"
else
    echo "❌ VPS недоступен"
    exit 1
fi

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

# Установка sshpass если не установлен
if ! command -v sshpass >/dev/null 2>&1; then
    echo "📦 Установка sshpass..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install sshpass
    else
        sudo apt-get update && sudo apt-get install -y sshpass
    fi
fi

# 1. Обновление системы на VPS
show_progress "Обновление системы на VPS"
run_on_vps "apt update && apt upgrade -y"

# 2. Установка необходимых пакетов (без mongodb, будет через Docker)
show_progress "Установка пакетов на VPS"
run_on_vps "apt install -y nginx nodejs npm certbot python3-certbot-nginx git curl docker.io"

# 3. Установка Node.js 20+ (для Ubuntu 24.04)
show_progress "Установка Node.js 20+"
run_on_vps "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
run_on_vps "apt install -y nodejs"

# 4. Создание директории проекта
show_progress "Создание директории проекта"
run_on_vps "mkdir -p $PROJECT_DIR"
run_on_vps "chown -R www-data:www-data $PROJECT_DIR"

# 5. Копирование файлов проекта (исключая node_modules и uploads)
show_progress "Копирование файлов на VPS"
echo "📁 Копируем Backend (исключая node_modules)..."
rsync -avz --progress --exclude 'node_modules' --exclude 'uploads' -e "sshpass -p $VPS_PASS ssh -o StrictHostKeyChecking=no" backend/ $VPS_USER@$VPS_IP:$PROJECT_DIR/backend/

echo "📁 Копируем Frontend (исключая node_modules)..."
rsync -avz --progress --exclude 'node_modules' --exclude '.next' -e "sshpass -p $VPS_PASS ssh -o StrictHostKeyChecking=no" frontend/ $VPS_USER@$VPS_IP:$PROJECT_DIR/frontend/

echo "📁 Копируем Admin (исключая node_modules)..."
rsync -avz --progress --exclude 'node_modules' --exclude 'dist' -e "sshpass -p $VPS_PASS ssh -o StrictHostKeyChecking=no" admin/ $VPS_USER@$VPS_IP:$PROJECT_DIR/admin/

echo "📁 Копируем конфигурацию Nginx..."
copy_to_vps "nginx.conf" "$PROJECT_DIR/"

# 6. Установка зависимостей
show_progress "Установка зависимостей"
run_on_vps "cd $PROJECT_DIR/backend && npm install"
run_on_vps "cd $PROJECT_DIR/frontend && npm install && npm run build"
run_on_vps "cd $PROJECT_DIR/admin && npm install && npm run build"

# 7. Настройка environment файлов
show_progress "Настройка конфигурации"
run_on_vps "cd $PROJECT_DIR/backend && cp env.production .env"
run_on_vps "cd $PROJECT_DIR/frontend && cp env.production .env.local"
run_on_vps "cd $PROJECT_DIR/admin && cp env.production .env"

# 8. Настройка MongoDB (через Docker)
show_progress "Настройка MongoDB через Docker"
run_on_vps "docker run --name mongodb -p 27017:27017 -d mongo:7.0"
run_on_vps "docker ps -a" # Verify container is running
echo "MongoDB запущен в Docker контейнере"

# 9. Настройка Nginx
show_progress "Настройка Nginx"
run_on_vps "cp $PROJECT_DIR/nginx.conf /etc/nginx/sites-available/technohub"
run_on_vps "ln -sf /etc/nginx/sites-available/technohub /etc/nginx/sites-enabled/"
run_on_vps "rm -f /etc/nginx/sites-enabled/default"
run_on_vps "nginx -t"
run_on_vps "systemctl restart nginx"

# 10. Создание systemd сервиса для backend
show_progress "Создание systemd сервиса для backend"
run_on_vps "cat > /etc/systemd/system/technohub-backend.service << 'EOF'
[Unit]
Description=TechnoHub Store Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$PROJECT_DIR/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF"

# 11. Создание systemd сервиса для frontend
show_progress "Создание systemd сервиса для frontend"
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

# 12. Запуск backend сервиса
show_progress "Запуск backend сервиса"
run_on_vps "systemctl daemon-reload"
run_on_vps "systemctl start technohub-backend"
run_on_vps "systemctl enable technohub-backend"

# 13. Запуск frontend сервиса
show_progress "Запуск frontend сервиса"
run_on_vps "systemctl start technohub-frontend"
run_on_vps "systemctl enable technohub-frontend"

# 14. Получение SSL сертификатов
show_progress "Получение SSL сертификатов"
run_on_vps "certbot --nginx -d $DOMAIN -d www.$DOMAIN -d admin.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN"

# Проверка статуса
echo ""
echo "📊 Проверка статуса сервисов..."
run_on_vps "systemctl status nginx --no-pager"
run_on_vps "systemctl status technohub-backend --no-pager"
run_on_vps "systemctl status technohub-frontend --no-pager"
run_on_vps "docker ps -a | grep mongodb" # Check Docker container status

echo ""
echo "🎉 Развертывание завершено! (100%)"
echo ""
echo "🌐 Ваши адреса:"
echo "   Магазин:  https://$DOMAIN"
echo "   Админка:  https://admin.$DOMAIN"
echo "   API:      https://$DOMAIN/api"
echo ""
echo "📋 Управление на VPS:"
echo "   SSH:      ssh $VPS_USER@$VPS_IP"
echo "   Логи:     journalctl -u technohub-backend -f"
echo "   Рестарт:  systemctl restart technohub-backend"
echo ""
echo "✅ Платформа развернута и готова к работе!" 