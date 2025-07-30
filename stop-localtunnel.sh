#!/bin/bash

echo "🛑 Остановка всех Localtunnel туннелей..."
echo ""

# Останавливаем процессы localtunnel
echo "📡 Остановка процессов localtunnel..."
pkill -f "lt --port" 2>/dev/null || true

# Удаляем PID файлы
echo "🗑️ Удаление PID файлов..."
rm -f .lt-*.pid 2>/dev/null || true

echo ""
echo "✅ Все туннели остановлены!"
echo ""
echo "💡 Для запуска туннелей выполните: ./start-localtunnel.sh" 