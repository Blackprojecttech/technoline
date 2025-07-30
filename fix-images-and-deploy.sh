#!/bin/bash

# Скрипт для исправления проблем с изображениями и обновления VPS
# Использование: ./fix-images-and-deploy.sh

set -e

# Конфигурация VPS
VPS_IP="62.60.178.146"
VPS_USER="root"
VPS_PASS="W#^V6ePa"
PROJECT_DIR="/var/www/technohub"

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

echo "🔧 Исправление проблем с изображениями и обновление VPS"
echo ""

# 1. Создаем placeholder.jpg если не существует
echo "1. Создание placeholder.jpg..."
if [ ! -f "frontend/public/placeholder.jpg" ]; then
    echo "📥 Скачиваем placeholder изображение..."
    curl -s "https://picsum.photos/300/300?grayscale" -o frontend/public/placeholder.jpg
fi

# 2. Обновляем файл contact page
echo "2. Копируем обновленные файлы на VPS..."
copy_to_vps "frontend/app/contact/page.tsx" "$PROJECT_DIR/frontend/app/contact/"
copy_to_vps "frontend/public/placeholder.jpg" "$PROJECT_DIR/frontend/public/"

# 3. Пересобираем frontend
echo "3. Пересборка frontend на VPS..."
run_on_vps "cd $PROJECT_DIR/frontend && npm run build"

# 4. Перезапускаем frontend сервис
echo "4. Перезапуск frontend сервиса..."
run_on_vps "systemctl restart technohub-frontend"

# 5. Проверяем статус
echo "5. Проверка статуса сервисов..."
run_on_vps "systemctl status technohub-frontend --no-pager" || true

echo ""
echo "🎉 Исправления применены!"
echo ""
echo "🌐 Проверьте сайт:"
echo "   https://technohubstore.net"
echo "   https://technohubstore.net/contact (должно перенаправить на /contacts)"
echo ""
echo "📁 Если нужно загрузить изображения товаров:"
echo "   ./upload-images.sh [путь_к_папке_с_изображениями]" 