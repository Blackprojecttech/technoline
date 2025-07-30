#!/bin/bash

# Скрипт развертывания Techno-line.stor на production
# Использование: ./deploy.sh [DOMAIN]
# По умолчанию: technohubstore.net

set -e

# Установка домена по умолчанию
DOMAIN=${1:-technohubstore.net}
PROJECT_DIR="/var/www/techno-line"
NGINX_CONFIG="/etc/nginx/sites-available/techno-line"
NGINX_ENABLED="/etc/nginx/sites-enabled/techno-line"

echo "🚀 Начинаем развертывание для домена: $DOMAIN"

# Создание директории проекта
echo "📁 Создание директории проекта..."
sudo mkdir -p $PROJECT_DIR
sudo chown -R $USER:$USER $PROJECT_DIR

# Копирование файлов проекта
echo "📋 Копирование файлов проекта..."
cp -r . $PROJECT_DIR/

# Установка зависимостей и сборка фронтенда
echo "🔨 Сборка фронтенда..."
cd $PROJECT_DIR/frontend
npm install
npm run build

# Установка зависимостей и сборка админки
echo "🔨 Сборка админки..."
cd $PROJECT_DIR/admin
npm install
npm run build

# Установка зависимостей бэкенда
echo "🔨 Установка зависимостей бэкенда..."
cd $PROJECT_DIR/backend
npm install

# Создание конфигурации Nginx
echo "⚙️ Настройка Nginx..."
sudo cp $PROJECT_DIR/nginx.conf $NGINX_CONFIG
sudo sed -i "s/YOUR_DOMAIN.com/$DOMAIN/g" $NGINX_CONFIG

# Включение сайта в Nginx
sudo ln -sf $NGINX_CONFIG $NGINX_ENABLED

# Создание systemd службы для бэкенда
echo "🔧 Создание systemd службы..."
sudo tee /etc/systemd/system/techno-line-backend.service > /dev/null <<EOF
[Unit]
Description=Techno-line Backend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Сборка TypeScript для production
echo "🔨 Сборка бэкенда..."
cd $PROJECT_DIR/backend
npm run build

# Включение и запуск службы
echo "🚀 Запуск службы бэкенда..."
sudo systemctl daemon-reload
sudo systemctl enable techno-line-backend
sudo systemctl start techno-line-backend

# Проверка статуса службы
echo "✅ Проверка статуса службы..."
sudo systemctl status techno-line-backend --no-pager

# Перезагрузка Nginx
echo "🔄 Перезагрузка Nginx..."
sudo nginx -t && sudo systemctl reload nginx

# Настройка прокси-сервера (если включен)
if grep -q "PROXY_ENABLED=true" $PROJECT_DIR/backend/.env 2>/dev/null; then
    echo "🌐 Настройка прокси-сервера..."
    
    PROXY_HOST=$(grep "PROXY_HOST=" $PROJECT_DIR/backend/.env | cut -d'=' -f2)
    PROXY_USERNAME=$(grep "PROXY_USERNAME=" $PROJECT_DIR/backend/.env | cut -d'=' -f2)
    PROXY_PASSWORD=$(grep "PROXY_PASSWORD=" $PROJECT_DIR/backend/.env | cut -d'=' -f2)
    
    echo "📡 Копирование скрипта настройки прокси на $PROXY_HOST..."
    scp $PROJECT_DIR/setup-proxy.sh root@$PROXY_HOST:/tmp/
    
    echo "🚀 Запуск настройки прокси на удаленном сервере..."
    ssh root@$PROXY_HOST "chmod +x /tmp/setup-proxy.sh && /tmp/setup-proxy.sh"
    
    echo "✅ Прокси-сервер настроен!"
fi

echo "✅ Развертывание завершено!"
echo ""
echo "📝 Следующие шаги:"
echo "1. Настройте DNS записи для $DOMAIN:"
echo "   A @ 195.209.188.108"
echo "   A www 195.209.188.108" 
echo "   A admin 195.209.188.108"
echo "   A mail 195.209.188.108"
echo "2. Получите SSL сертификат (автоматически настроится на прокси)"
echo "3. Обновите переменные окружения в .env файлах"
echo ""
echo "🌐 Ваш сайт будет доступен по адресам:"
echo "   Основной сайт: https://$DOMAIN"
echo "   Админка: https://admin.$DOMAIN"
echo "   Почта: https://mail.$DOMAIN"
echo ""
echo "📊 Для мониторинга используйте:"
echo "   sudo systemctl status techno-line-backend"
echo "   sudo journalctl -u techno-line-backend -f" 