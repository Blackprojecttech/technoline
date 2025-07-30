#!/bin/bash

# Функция очистки
cleanup() {
    echo "🛑 Останавливаем все процессы..."
    pkill -f "node"
    pkill -f "npm"
    pkill -f "nodemon"
    echo "✅ Все процессы остановлены"
    exit 0
}

# Перехватываем SIGINT и SIGTERM
trap cleanup SIGINT SIGTERM

echo "🛑 Останавливаем все процессы..."
pkill -f "node"
pkill -f "npm"
pkill -f "nodemon"

echo "🔄 Освобождаем порты..."
for port in 5002 3100 3200; do
    pid=$(lsof -t -i:$port)
    if [ ! -z "$pid" ]; then
        echo "Killing process on port $port (PID: $pid)"
        kill -9 $pid
    fi
done

# Определяем IP адрес
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
else
    # Linux
    IP=$(hostname -I | awk '{print $1}')
fi

echo "🚀 Запуск сервисов..."

echo "📡 Запуск backend..."
cd backend
PORT=5002 HOST=0.0.0.0 npm run dev &

# Ждем запуска бэкенда
echo "⏳ Ожидание запуска API..."
until curl -s http://localhost:5002/api/health > /dev/null; do
    sleep 1
done
echo "✅ API запущен"

# Проверяем режим туннеля
if [ "$1" == "--tunnel" ]; then
    API_URL="https://technoline-api.loca.lt/api"
    echo "🌐 Запуск в режиме туннеля, API URL: $API_URL"
else
    API_URL="http://${IP}:5002/api"
    echo "🌐 Запуск в локальном режиме, API URL: $API_URL"
fi

echo "🌐 Запуск frontend..."
cd ../frontend
NEXT_PUBLIC_API_URL=$API_URL npm run dev -- --port 3100 --hostname 0.0.0.0 &

echo "⚙️ Запуск admin..."
cd ../admin
VITE_API_URL=$API_URL npm run dev -- --port 3200 --host &

echo
echo "✅ Все сервисы запущены!"
echo "📝 URLs:"
echo "API:      $API_URL"
echo "Frontend: http://${IP}:3100"
echo "Admin:    http://${IP}:3200"
echo
echo "❌ Для остановки всех процессов нажмите Ctrl+C"

# Ждем завершения всех процессов
wait 