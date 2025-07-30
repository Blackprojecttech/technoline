#!/bin/bash

# Автоматический запуск TechnoHub Store с поддержкой прокси
# Проверяет настройки и запускает все компоненты

set -e

echo "🚀 Запуск TechnoHub Store с поддержкой прокси"

# Проверка наличия .env файлов
if [ ! -f "backend/.env" ]; then
    echo "❌ Файл backend/.env не найден. Запустите ./setup-technohubstore.sh"
    exit 1
fi

# Проверка настроек прокси
PROXY_ENABLED=$(grep "PROXY_ENABLED=" backend/.env | cut -d'=' -f2 2>/dev/null || echo "false")
PROXY_HOST=$(grep "PROXY_HOST=" backend/.env | cut -d'=' -f2 2>/dev/null || echo "")

if [ "$PROXY_ENABLED" = "true" ]; then
    echo "🌐 Прокси включен: $PROXY_HOST"
    
    # Проверка доступности прокси-сервера
    echo "🔍 Проверка доступности прокси-сервера..."
    if ping -c 1 $PROXY_HOST >/dev/null 2>&1; then
        echo "✅ Прокси-сервер $PROXY_HOST доступен"
    else
        echo "⚠️ Прокси-сервер $PROXY_HOST недоступен, но продолжаем запуск..."
    fi
else
    echo "🔧 Прокси отключен, запуск в обычном режиме"
fi

# Функция для проверки порта
check_port() {
    local port=$1
    local name=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️ Порт $port ($name) уже занят"
        return 1
    else
        echo "✅ Порт $port ($name) свободен"
        return 0
    fi
}

# Принудительная остановка всех процессов перед запуском
echo "🛑 Принудительная остановка всех процессов..."

# Функция принудительной остановки по порту
force_kill_port() {
    local port=$1
    local name=$2
    
    local pids=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "🛑 Остановка $name на порту $port (PID: $pids)..."
        kill -9 $pids 2>/dev/null
        sleep 1
        echo "✅ Порт $port освобожден"
    else
        echo "✅ Порт $port уже свободен"
    fi
}

# Остановка по всем портам
force_kill_port 5002 "Backend"
force_kill_port 3100 "Frontend"
force_kill_port 3200 "Admin"

# Остановка по PID файлам (если есть)
for service in backend frontend admin; do
    if [ -f "logs/$service.pid" ]; then
        pid=$(cat logs/$service.pid)
        if kill -0 $pid 2>/dev/null; then
            echo "🛑 Остановка $service (PID: $pid)..."
            kill -9 $pid 2>/dev/null
        fi
        rm -f logs/$service.pid
    fi
done

echo "✅ Все процессы остановлены"

# Проверка портов
echo "🔍 Проверка портов..."
check_port 5002 "Backend API"
check_port 3100 "Frontend" 
check_port 3200 "Admin"

# Установка зависимостей (если нужно)
echo "📦 Проверка зависимостей..."
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Установка зависимостей бэкенда..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Установка зависимостей фронтенда..."
    cd frontend && npm install && cd ..
fi

if [ ! -d "admin/node_modules" ]; then
    echo "📦 Установка зависимостей админки..."
    cd admin && npm install && cd ..
fi

# Создание директорий для логов
mkdir -p logs

# Функция запуска с логированием
start_service() {
    local service=$1
    local port=$2
    local dir=$3
    local cmd=$4
    
    echo "🚀 Запуск $service на порту $port..."
    cd $dir
    nohup $cmd > ../logs/$service.log 2>&1 &
    local pid=$!
    echo $pid > ../logs/$service.pid
    cd ..
    
    # Проверка запуска
    sleep 3
    if kill -0 $pid 2>/dev/null; then
        echo "✅ $service запущен (PID: $pid)"
    else
        echo "❌ Ошибка запуска $service"
        cat logs/$service.log | tail -10
    fi
}

# Запуск бэкенда
start_service "backend" "5002" "backend" "npm run dev"

# Ожидание запуска бэкенда
echo "⏳ Ожидание запуска бэкенда..."
sleep 5

# Проверка API
if curl -s http://localhost:5002/api/health >/dev/null 2>&1; then
    echo "✅ Backend API отвечает"
else
    echo "⚠️ Backend API не отвечает, но продолжаем..."
fi

# Запуск фронтенда на порту 3100
start_service "frontend" "3100" "frontend" "npm run dev"

# Запуск админки на порту 3200
start_service "admin" "3200" "admin" "npm run dev"

# Настройка прокси-сервера (если включен)
if [ "$PROXY_ENABLED" = "true" ] && [ -n "$PROXY_HOST" ]; then
    echo "🌐 Настройка прокси-сервера..."
    
    # Проверка SSH доступа к прокси
    if ssh -o ConnectTimeout=5 -o BatchMode=yes root@$PROXY_HOST exit 2>/dev/null; then
        echo "📡 Копирование конфигурации на прокси-сервер..."
        scp setup-proxy.sh root@$PROXY_HOST:/tmp/ 2>/dev/null || echo "⚠️ Не удалось скопировать файл"
        
        echo "🔧 Настройка прокси-сервера..."
        ssh root@$PROXY_HOST "chmod +x /tmp/setup-proxy.sh && /tmp/setup-proxy.sh" 2>/dev/null || echo "⚠️ Не удалось настроить прокси"
    else
        echo "⚠️ Нет SSH доступа к прокси-серверу $PROXY_HOST"
        echo "💡 Настройте прокси вручную, запустив setup-proxy.sh на сервере"
    fi
fi

echo ""
echo "🎉 Запуск завершен!"
echo ""
echo "📊 Статус сервисов:"
echo "   Backend:  http://localhost:5002 (логи: logs/backend.log)"
echo "   Frontend: http://localhost:3100 (логи: logs/frontend.log)"
echo "   Admin:    http://localhost:3200 (логи: logs/admin.log)"
echo ""

if [ "$PROXY_ENABLED" = "true" ]; then
    echo "🌐 Публичные адреса (через прокси):"
    echo "   Магазин:  https://technohubstore.net"
    echo "   Админка:  https://admin.technohubstore.net"
    echo "   Почта:    https://mail.technohubstore.net"
    echo "   API:      https://technohubstore.net/api"
else
    echo "🔧 Локальные адреса:"
    echo "   Магазин:  http://localhost:3100"
    echo "   Админка:  http://localhost:3200"
    echo "   API:      http://localhost:5002/api"
fi

echo ""
echo "📋 Управление:"
echo "   Остановить все: ./stop-services.sh"
echo "   Просмотр логов: tail -f logs/backend.log"
echo "   Статус:        ./status-services.sh" 