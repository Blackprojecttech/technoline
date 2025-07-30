#!/bin/bash

echo "🌐 Настройка доступа к платформе в локальной сети"
echo ""

# Получаем IP-адрес машины в локальной сети
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ip route get 1 | awk '{print $7; exit}' 2>/dev/null || hostname -I | awk '{print $1}' 2>/dev/null)

if [ -z "$LOCAL_IP" ]; then
    echo "❌ Не удалось определить IP-адрес в локальной сети"
    echo "Попробуйте запустить: ifconfig | grep 'inet ' | grep -v '127.0.0.1'"
    exit 1
fi

echo "📍 Ваш IP-адрес в локальной сети: $LOCAL_IP"
echo ""

# Создаем временные env файлы для локальной сети
echo "⚙️ Настройка переменных окружения..."

# Backend env
cat > backend/.env.local-network << EOF
PORT=5002
MONGODB_URI=mongodb://localhost:27017/technoline-store
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
FRONTEND_URL=http://$LOCAL_IP:3100
ADMIN_URL=http://$LOCAL_IP:3200
EOF

# Frontend env
cat > frontend/.env.local-network << EOF
NEXT_PUBLIC_API_URL=http://$LOCAL_IP:5002/api
EOF

# Admin env  
cat > admin/.env.local-network << EOF
VITE_API_URL=http://$LOCAL_IP:5002/api
EOF

echo "✅ Переменные окружения настроены"
echo ""

# Функция для ожидания запуска сервера
wait_for_server() {
    local port=$1
    local service=$2
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Ожидание запуска $service на порту $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:$port" > /dev/null 2>&1; then
            echo "✅ $service запущен"
            return 0
        fi
        
        echo "   Попытка $attempt/$max_attempts..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service не запустился на порту $port"
    return 1
}

# Останавливаем существующие процессы
echo "🛑 Остановка существующих процессов..."
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

echo ""
echo "🚀 Запуск серверов для локальной сети..."
echo ""

# Запуск Backend
echo "🔧 Запуск Backend API..."
cd backend
cp .env.local-network .env
npm run dev &
BACKEND_PID=$!
cd ..

# Запуск Frontend
echo "🔧 Запуск Frontend..."
cd frontend  
cp .env.local-network .env.local
npm run dev -- --hostname 0.0.0.0 --port 3100 &
FRONTEND_PID=$!
cd ..

# Запуск Admin
echo "🔧 Запуск Admin панели..."
cd admin
cp .env.local-network .env
npm run dev -- --host 0.0.0.0 --port 3200 &
ADMIN_PID=$!
cd ..

echo ""
echo "⏳ Ожидание запуска всех сервисов..."
sleep 15

echo ""
echo "🌐 Доступ к платформе в локальной сети:"
echo ""
echo "┌─────────────────────────────────────────────────────────────┐"
echo "│                    АДРЕСА ДЛЯ ДОСТУПА                      │"
echo "├─────────────────────────────────────────────────────────────┤"
echo "│ 🛒 Интернет-магазин:  http://$LOCAL_IP:3100                │"
echo "│ ⚙️  Админ-панель:     http://$LOCAL_IP:3200                │"  
echo "│ 🔌 API Backend:       http://$LOCAL_IP:5002                │"
echo "├─────────────────────────────────────────────────────────────┤"
echo "│ Локальный доступ также работает:                            │"
echo "│ 🛒 Магазин:           http://localhost:3100                 │"
echo "│ ⚙️  Админка:          http://localhost:3200                 │"
echo "└─────────────────────────────────────────────────────────────┘"
echo ""
echo "📱 Пользователи в локальной сети могут открыть эти адреса"
echo "   с любого устройства (компьютер, планшет, телефон)"
echo ""
echo "🔥 Для остановки всех сервисов нажмите Ctrl+C"
echo ""

# Сохраняем PID процессов для остановки
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid  
echo $ADMIN_PID > .admin.pid

# Функция очистки при выходе
cleanup() {
    echo ""
    echo "🛑 Остановка сервисов..."
    
    if [ -f .backend.pid ]; then
        kill $(cat .backend.pid) 2>/dev/null || true
        rm -f .backend.pid
    fi
    
    if [ -f .frontend.pid ]; then
        kill $(cat .frontend.pid) 2>/dev/null || true
        rm -f .frontend.pid
    fi
    
    if [ -f .admin.pid ]; then
        kill $(cat .admin.pid) 2>/dev/null || true
        rm -f .admin.pid
    fi
    
    # Восстанавливаем оригинальные env файлы
    cd backend && [ -f env.example ] && cp env.example .env
    cd ../frontend && [ -f env.example ] && cp env.example .env.local  
    cd ../admin && [ -f env.example ] && cp env.example .env
    cd ..
    
    # Удаляем временные файлы
    rm -f backend/.env.local-network
    rm -f frontend/.env.local-network
    rm -f admin/.env.local-network
    
    echo "✅ Все сервисы остановлены"
    exit 0
}

# Перехватываем сигнал завершения
trap cleanup SIGINT SIGTERM

# Ждем бесконечно, пока пользователь не нажмет Ctrl+C
while true; do
    sleep 1
done 