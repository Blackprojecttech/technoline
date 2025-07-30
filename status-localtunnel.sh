#!/bin/bash

echo "📊 Статус Localtunnel туннелей"
echo ""

# Проверяем процессы localtunnel
echo "🔍 Проверка процессов localtunnel..."
if pgrep -f "lt --port" > /dev/null; then
    echo "✅ Процессы localtunnel запущены:"
    ps aux | grep "lt --port" | grep -v grep
else
    echo "❌ Процессы localtunnel не найдены"
fi

echo ""

# Проверяем доступность туннелей
echo "🌐 Проверка доступности туннелей..."

# Frontend
echo -n "📱 Frontend (technoline.loca.lt): "
if curl -s https://technoline.loca.lt > /dev/null 2>&1; then
    echo "✅ Доступен"
else
    echo "❌ Недоступен"
fi

# Admin Panel
echo -n "🔧 Admin Panel (technoline-admin.loca.lt): "
if curl -s https://technoline-admin.loca.lt > /dev/null 2>&1; then
    echo "✅ Доступен"
else
    echo "❌ Недоступен"
fi

# Backend API
echo -n "🔌 Backend API (technoline-api.loca.lt): "
if curl -s https://technoline-api.loca.lt/health > /dev/null 2>&1; then
    echo "✅ Доступен"
else
    echo "❌ Недоступен"
fi

echo ""
echo "🔑 Пароль от туннелей:"
curl -s https://loca.lt/mytunnelpassword
echo ""
echo ""
echo "💡 Для запуска туннелей выполните: ./start-localtunnel.sh"
echo "💡 Для остановки туннелей выполните: ./stop-localtunnel.sh" 