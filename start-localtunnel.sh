#!/bin/bash

# Функция очистки
cleanup() {
    echo "🛑 Останавливаем все процессы..."
    pkill -f "lt --port"
    pkill -f "serve"
    pkill -f "next dev"
    echo "✅ Все процессы остановлены"
    exit 0
}

# Перехватываем SIGINT и SIGTERM
trap cleanup SIGINT SIGTERM

echo "🔑 Получаем пароль туннеля..."
TUNNEL_PASSWORD=$(curl -s https://loca.lt/mytunnelpassword)
echo "✅ Пароль для доступа к туннелям: $TUNNEL_PASSWORD"
echo "⚠️ Сохраните этот пароль, он понадобится при входе"
echo

echo "🔍 Проверка запущенных сервисов..."
if ! curl -s http://localhost:5002/api/health > /dev/null; then
    echo "❌ API сервер не запущен! Запустите сначала ./start-all.sh"
    exit 1
fi

echo "🛑 Останавливаем существующие процессы..."
pkill -f "lt --port"
pkill -f "serve"
pkill -f "next dev"

# Создаем туннель для API
echo "🌍 Создаем туннель для API..."
lt --port 5002 --subdomain technoline-api --local-host localhost > /dev/null 2>&1 &

# Ждем, пока API туннель станет доступен
echo "⏳ Ждем, пока API туннель станет доступен..."
for i in {1..30}; do
    if curl -s https://technoline-api.loca.lt/api/health > /dev/null; then
        echo "✅ API туннель готов"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Не удалось дождаться API туннеля"
        cleanup
        exit 1
    fi
    sleep 1
done

# Запускаем frontend
echo "🚀 Запуск frontend..."
cd frontend
NEXT_PUBLIC_API_URL="https://technoline-api.loca.lt/api" npm run dev -- -p 3100 &
FRONTEND_PID=$!

# Проверяем, что frontend запустился
echo "⏳ Ждем, пока frontend станет доступен..."
for i in {1..30}; do
    if curl -s http://localhost:3100 > /dev/null; then
        echo "✅ Frontend запущен на порту 3100"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Не удалось запустить frontend"
        cleanup
        exit 1
    fi
    sleep 1
done

# Создаем туннель для frontend
echo "🌍 Создаем туннель для frontend..."
lt --port 3100 --subdomain technoline --local-host localhost > /dev/null 2>&1 &
cd ..

echo "⚙️ Сборка админки..."
cd admin
rm -rf dist
VITE_API_URL="https://technoline-api.loca.lt/api" npm run build

echo "🚀 Запуск админки..."
# Запускаем статический сервер с поддержкой SPA
serve dist --single --listen 3200 --cors --no-clipboard &
SERVE_PID=$!

# Проверяем, что сервер запустился
sleep 2
if ! curl -s http://localhost:3200 > /dev/null; then
    echo "❌ Не удалось запустить статический сервер"
    exit 1
fi
echo "✅ Статический сервер запущен на порту 3200"

echo "⚙️ Создаем туннель для админки..."
cd ..

# Создаем туннель для админки
lt --port 3200 --subdomain technoline-admin --local-host localhost > /dev/null 2>&1 &

# Ждем немного, чтобы туннель успел запуститься
sleep 3

echo
echo "✅ Туннели запущены!"
echo "📝 URLs:"
echo "Frontend: https://technoline.loca.lt"
echo "API:      https://technoline-api.loca.lt/api"
echo "Admin:    https://technoline-admin.loca.lt"
echo
echo "🔑 Пароль для доступа: $TUNNEL_PASSWORD"
echo
echo "⚠️ Важно:"
echo "1. Используйте указанный выше пароль при запросе доступа"
echo "2. Если туннели не работают, попробуйте:"
echo "   - Остановить все процессы: pkill -f 'lt --port' && pkill -f 'serve' && pkill -f 'next dev'"
echo "   - Запустить скрипт заново"
echo
echo "❌ Для остановки всех процессов нажмите Ctrl+C"

# Ждем завершения всех процессов
wait 