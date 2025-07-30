#!/bin/bash

# Проверяем, запущены ли сервисы
echo "🔍 Проверка запущенных сервисов..."

if ! curl -s "http://localhost:5002/health" > /dev/null; then
    echo "❌ Сервисы не запущены! Сначала запустите ./start-all.sh"
    exit 1
fi

# Останавливаем существующие туннели и процессы
echo "🛑 Останавливаем существующие процессы..."
pkill -f "lt --port" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# Проверяем установлен ли localtunnel
if ! command -v lt &> /dev/null; then
    echo "📦 Устанавливаем localtunnel..."
    npm install -g localtunnel
fi

# Получаем пароль туннеля
echo "🔑 Получаем пароль туннеля..."
TUNNEL_PASSWORD=$(curl -s https://loca.lt/mytunnelpassword)
echo "✅ Пароль туннеля: $TUNNEL_PASSWORD"
echo "⚠️ Сохраните этот пароль, он понадобится для доступа к туннелям"
echo ""

echo "🌍 Создаем туннели..."

# Запускаем туннели в фоновом режиме с фиксированными поддоменами
echo "📡 API (5002)..."
lt --port 5002 --subdomain technoline-api --local-host localhost &
LT_API_PID=$!
sleep 2

echo "🌐 Frontend (3100)..."
lt --port 3100 --subdomain technoline-store --local-host localhost &
LT_FRONTEND_PID=$!
sleep 2

# Перезапускаем админку с туннельными настройками
echo "⚙️ Перезапуск админки с туннельными настройками..."
cd admin
VITE_TUNNEL=true VITE_API_URL="https://technoline-api.loca.lt" npm run dev -- --host &
ADMIN_PID=$!
cd ..
sleep 2

echo "⚙️ Создаем туннель для админки..."
lt --port 3200 --subdomain technoline-admin --local-host localhost &
LT_ADMIN_PID=$!
sleep 2

# Проверяем, что туннели запустились
sleep 3
if ! ps -p $LT_API_PID > /dev/null; then
    echo "❌ Туннель API не запустился"
    exit 1
fi

if ! ps -p $LT_FRONTEND_PID > /dev/null; then
    echo "❌ Туннель Frontend не запустился"
    exit 1
fi

if ! ps -p $LT_ADMIN_PID > /dev/null; then
    echo "❌ Туннель Admin не запустился"
    exit 1
fi

if ! ps -p $ADMIN_PID > /dev/null; then
    echo "❌ Админка не запустилась"
    exit 1
fi

echo ""
echo "✅ Все сервисы и туннели запущены!"
echo "📝 URLs:"
echo "API:      https://technoline-api.loca.lt"
echo "Frontend: https://technoline-store.loca.lt"
echo "Admin:    https://technoline-admin.loca.lt"
echo ""
echo "🔑 Пароль для доступа: $TUNNEL_PASSWORD"
echo ""
echo "⚠️ Важно:"
echo "1. Используйте этот пароль при запросе доступа к туннелю"
echo "2. Для остановки всех процессов используйте: pkill -f 'lt --port' && pkill -f 'vite'"
echo "3. Если нужно перезапустить:"
echo "   - Остановите все процессы"
echo "   - Запустите скрипт заново"
echo ""
echo "❌ Для остановки всех процессов нажмите Ctrl+C"

# Функция для корректного завершения всех процессов
cleanup() {
    echo "🛑 Останавливаем все процессы..."
    pkill -f "lt --port"
    pkill -f "vite"
    echo "✅ Все процессы остановлены"
    exit 0
}

# Перехватываем сигналы для корректного завершения
trap cleanup SIGINT SIGTERM

# Ждем завершения всех процессов
wait 