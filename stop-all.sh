#!/bin/bash

echo "🛑 Остановка всех серверов и туннелей..."
echo ""

# Останавливаем dev:all
echo "🔧 Остановка dev:all..."
if [ -f ".dev-all.pid" ]; then
    DEV_ALL_PID=$(cat .dev-all.pid)
    if kill -0 $DEV_ALL_PID 2>/dev/null; then
        kill $DEV_ALL_PID
        echo "✅ dev:all остановлен (PID: $DEV_ALL_PID)"
    else
        echo "❌ dev:all уже остановлен"
    fi
    rm -f .dev-all.pid
else
    echo "❌ PID файл dev:all не найден"
fi

# Останавливаем процессы localtunnel
echo "📡 Остановка процессов localtunnel..."
pkill -f "lt --port" 2>/dev/null || true

# Удаляем PID файлы туннелей
echo "🗑️ Удаление PID файлов туннелей..."
rm -f .lt-*.pid 2>/dev/null || true

# Дополнительная очистка процессов
echo "🧹 Дополнительная очистка процессов..."
pkill -f "npm run dev:backend" 2>/dev/null || true
pkill -f "npm run dev:frontend" 2>/dev/null || true
pkill -f "npm run dev:admin" 2>/dev/null || true
pkill -f "nodemon src/index.ts" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "vite --port 3200" 2>/dev/null || true

echo ""
echo "✅ Все серверы и туннели остановлены!"
echo ""
echo "💡 Для запуска всего выполните: ./start-all.sh" 