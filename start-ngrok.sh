#!/bin/bash

# Проверяем, запущены ли сервисы
echo "🔍 Проверка запущенных сервисов..."

if ! curl -s "http://localhost:5002/health" > /dev/null; then
    echo "❌ Сервисы не запущены! Сначала запустите ./start-all.sh"
    exit 1
fi

# Останавливаем существующие туннели
echo "🛑 Останавливаем существующие туннели..."
pkill -f "ngrok" 2>/dev/null || true
sleep 2

# Проверяем установлен ли ngrok
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok не установлен. Установите его командой:"
    echo "brew install ngrok/ngrok/ngrok"
    exit 1
fi

echo "🌍 Создаем туннели..."

# Запускаем основной туннель для API
echo "📡 Запуск туннеля для API (5002)..."
ngrok http 5002 > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!

# Ждем запуска ngrok и получения URL
echo "⏳ Ожидание запуска туннеля..."
sleep 5

# Проверяем, запустился ли процесс
if ! ps -p $NGROK_PID > /dev/null; then
    echo "❌ Не удалось запустить ngrok"
    cat /tmp/ngrok.log
    exit 1
fi

# Получаем URL туннеля
API_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*"' | cut -d'"' -f4)

if [ -z "$API_URL" ]; then
    echo "❌ Не удалось получить URL туннеля"
    cat /tmp/ngrok.log
    exit 1
fi

# Перезапускаем админку с новым API URL
echo "⚙️ Перезапуск админки с новыми настройками..."
cd admin
VITE_API_URL="${API_URL}/api" npm run dev -- --host &
ADMIN_PID=$!
cd ..

echo ""
echo "✅ Туннель запущен!"
echo "📝 URLs:"
echo "API:      $API_URL/api"
echo "Frontend: http://localhost:3100"
echo "Admin:    http://localhost:3200"
echo ""
echo "⚠️ Важно:"
echo "1. API доступен через ngrok: $API_URL/api"
echo "2. Frontend и Admin доступны локально"
echo "3. Панель управления ngrok: http://localhost:4040"
echo "4. Для остановки всех процессов: pkill -f 'ngrok' && pkill -f 'vite'"
echo ""
echo "❌ Для остановки всех процессов нажмите Ctrl+C"

# Функция для корректного завершения всех процессов
cleanup() {
    echo "🛑 Останавливаем все процессы..."
    pkill -f "ngrok"
    pkill -f "vite"
    echo "✅ Все процессы остановлены"
    exit 0
}

# Перехватываем сигналы для корректного завершения
trap cleanup SIGINT SIGTERM

# Ждем завершения всех процессов
wait 