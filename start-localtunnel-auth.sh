#!/bin/bash

echo "🌐 Запуск Localtunnel туннелей с аутентификацией..."

# Остановка существующих туннелей
echo "🛑 Остановка существующих туннелей..."
pkill -f "lt --port" 2>/dev/null
rm -f .localtunnel-*.pid

# Функция для ожидания запуска сервера
wait_for_server() {
    local port=$1
    local server_name=$2
    echo "⏳ Ожидание запуска $server_name на порту $port..."
    
    for i in {1..30}; do
        if curl -s "http://localhost:$port" >/dev/null 2>&1; then
            echo "✅ $server_name готов на порту $port"
            return 0
        fi
        sleep 1
    done
    
    echo "❌ $server_name не запустился на порту $port"
    return 1
}

# Ожидание запуска серверов
wait_for_server 5002 "Backend"
wait_for_server 3100 "Frontend"
wait_for_server 3200 "Admin Panel"

# Запуск туннелей с аутентификацией
echo "📡 Запуск туннеля для Frontend (основной сайт)..."
echo "   Порт: 3100"
echo "   Поддомен: technoline"
echo "   URL: https://technoline.loca.lt"
lt --port 3100 --subdomain technoline --local-host localhost &
echo $! > .localtunnel-frontend.pid
echo "✅ Туннель для Frontend (основной сайт) запущен (PID: $(cat .localtunnel-frontend.pid))"

echo "📡 Запуск туннеля для Admin Panel (админ панель)..."
echo "   Порт: 3200"
echo "   Поддомен: technoline-admin"
echo "   URL: https://technoline-admin.loca.lt"
lt --port 3200 --subdomain technoline-admin --local-host localhost &
echo $! > .localtunnel-admin.pid
echo "✅ Туннель для Admin Panel (админ панель) запущен (PID: $(cat .localtunnel-admin.pid))"

echo "📡 Запуск туннеля для Backend API..."
echo "   Порт: 5002"
echo "   Поддомен: technoline-api"
echo "   URL: https://technoline-api.loca.lt"
lt --port 5002 --subdomain technoline-api --local-host localhost &
echo $! > .localtunnel-backend.pid
echo "✅ Туннель для Backend API запущен (PID: $(cat .localtunnel-backend.pid))"

# Ожидание запуска туннелей
echo "⏳ Ожидание запуска туннелей..."
sleep 5

# Проверка доступности туннелей
echo "🔍 Проверка доступности туннелей..."

echo "📱 Проверка Frontend..."
if curl -s "https://technoline.loca.lt" >/dev/null 2>&1; then
    echo "✅ Frontend доступен: https://technoline.loca.lt"
else
    echo "❌ Frontend недоступен"
fi

echo "🔧 Проверка Admin Panel..."
if curl -s "https://technoline-admin.loca.lt" >/dev/null 2>&1; then
    echo "✅ Admin Panel доступен: https://technoline-admin.loca.lt"
else
    echo "❌ Admin Panel недоступен"
fi

echo "🔌 Проверка Backend API..."
if curl -s "https://technoline-api.loca.lt/health" >/dev/null 2>&1; then
    echo "✅ Backend API доступен: https://technoline-api.loca.lt"
else
    echo "❌ Backend API недоступен"
fi

echo ""
echo "🎉 Все туннели запущены!"
echo "📱 Frontend: https://technoline.loca.lt"
echo "🔧 Admin Panel: https://technoline-admin.loca.lt"
echo "🔌 Backend API: https://technoline-api.loca.lt"
echo ""
echo "💡 Для остановки туннелей выполните: ./stop-localtunnel.sh"
echo "💡 Для просмотра статуса выполните: ./status-localtunnel.sh" 