#!/bin/bash

echo "📊 Статус всех серверов и туннелей"
echo ""

# Проверяем dev:all
echo "🔧 Проверка dev:all..."
if [ -f ".dev-all.pid" ]; then
    DEV_ALL_PID=$(cat .dev-all.pid)
    if kill -0 $DEV_ALL_PID 2>/dev/null; then
        echo "✅ dev:all запущен (PID: $DEV_ALL_PID)"
    else
        echo "❌ dev:all не запущен"
    fi
else
    echo "❌ PID файл dev:all не найден"
fi

echo ""

# Проверяем процессы серверов
echo "🔍 Проверка процессов серверов..."
if pgrep -f "nodemon src/index.ts" > /dev/null; then
    echo "✅ Backend (nodemon) запущен"
else
    echo "❌ Backend (nodemon) не запущен"
fi

if pgrep -f "next dev" > /dev/null; then
    echo "✅ Frontend (next) запущен"
else
    echo "❌ Frontend (next) не запущен"
fi

if pgrep -f "vite --port 3200" > /dev/null; then
    echo "✅ Admin Panel (vite) запущен"
else
    echo "❌ Admin Panel (vite) не запущен"
fi

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

# Проверяем доступность локальных серверов
echo "🌐 Проверка доступности локальных серверов..."

# Backend
echo -n "🔌 Backend (localhost:5002): "
if curl -s http://localhost:5002/health > /dev/null 2>&1; then
    echo "✅ Доступен"
else
    echo "❌ Недоступен"
fi

# Frontend
echo -n "📱 Frontend (localhost:3100): "
if curl -s http://localhost:3100 > /dev/null 2>&1; then
    echo "✅ Доступен"
else
    echo "❌ Недоступен"
fi

# Admin Panel
echo -n "🔧 Admin Panel (localhost:3200): "
if curl -s http://localhost:3200 > /dev/null 2>&1; then
    echo "✅ Доступен"
else
    echo "❌ Недоступен"
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
echo "💡 Для запуска всего выполните: ./start-all.sh"
echo "💡 Для остановки всего выполните: ./stop-all.sh" 