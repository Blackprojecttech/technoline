#!/bin/bash

# Скрипт для загрузки изображений товаров на VPS
# Использование: ./upload-images.sh [путь_к_папке_с_изображениями]

set -e

# Конфигурация VPS (из deploy-vps.sh)
VPS_IP="62.60.178.146"
VPS_USER="root"
VPS_PASS="YOUR_VPS_PASSWORD_HERE"
PROJECT_DIR="/var/www/technohub"
UPLOADS_DIR="$PROJECT_DIR/backend/uploads"

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

echo "🖼️  Загрузка изображений товаров на VPS"
echo "VPS IP: $VPS_IP"
echo ""

# Определяем папку с изображениями
IMAGES_DIR="${1:-./product-images}"

if [ ! -d "$IMAGES_DIR" ]; then
    echo "❌ Папка с изображениями не найдена: $IMAGES_DIR"
    echo ""
    echo "📋 Использование:"
    echo "   ./upload-images.sh [путь_к_папке_с_изображениями]"
    echo ""
    echo "🔍 Поддерживаемые форматы: .jpg, .jpeg, .png, .webp"
    echo ""
    echo "📁 Примеры:"
    echo "   ./upload-images.sh ./images"
    echo "   ./upload-images.sh ~/Downloads/product-photos"
    echo ""
    exit 1
fi

echo "📁 Папка с изображениями: $IMAGES_DIR"

# Проверяем наличие изображений
IMAGE_COUNT=$(find "$IMAGES_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.webp" \) | wc -l)

if [ $IMAGE_COUNT -eq 0 ]; then
    echo "❌ В папке $IMAGES_DIR не найдено изображений (.jpg, .jpeg, .png, .webp)"
    exit 1
fi

echo "🔢 Найдено изображений: $IMAGE_COUNT"
echo ""

# Проверка подключения к VPS
echo "🔍 Проверка подключения к VPS..."
if ping -c 1 $VPS_IP >/dev/null 2>&1; then
    echo "✅ VPS доступен"
else
    echo "❌ VPS недоступен"
    exit 1
fi

# Создаем директорию uploads на VPS если не существует
echo "📁 Проверка и создание директории uploads..."
run_on_vps "mkdir -p $UPLOADS_DIR"
run_on_vps "chown -R www-data:www-data $UPLOADS_DIR"
run_on_vps "chmod -R 755 $UPLOADS_DIR"

# Копируем изображения на VPS
echo "🚀 Загрузка изображений на VPS..."
echo "   Локально:  $IMAGES_DIR"
echo "   На VPS:    $UPLOADS_DIR"
echo ""

# Копируем все изображения
copy_to_vps "$IMAGES_DIR/" "$UPLOADS_DIR/"

# Устанавливаем правильные права доступа
echo "🔒 Установка прав доступа..."
run_on_vps "chown -R www-data:www-data $UPLOADS_DIR"
run_on_vps "chmod -R 755 $UPLOADS_DIR"

# Проверяем результат
echo "✅ Проверка загруженных изображений..."
run_on_vps "ls -la $UPLOADS_DIR | head -10"

UPLOADED_COUNT=$(run_on_vps "find $UPLOADS_DIR -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' \) | wc -l")

echo ""
echo "🎉 Загрузка завершена!"
echo "📊 Статистика:"
echo "   Локально найдено:  $IMAGE_COUNT изображений"
echo "   На VPS загружено:  $UPLOADED_COUNT изображений"
echo ""
echo "🌐 Изображения доступны по адресу:"
echo "   https://technohubstore.net/uploads/"
echo ""
echo "💡 Совет: Обновите товары в админке, указав правильные пути к изображениям" 