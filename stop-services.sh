#!/bin/bash

# Скрипт остановки всех сервисов TechnoHub Store

echo "🛑 Остановка всех сервисов TechnoHub Store..."

# Функция остановки сервиса
stop_service() {
    local service=$1
    local pidfile="logs/$service.pid"
    
    if [ -f "$pidfile" ]; then
        local pid=$(cat $pidfile)
        if kill -0 $pid 2>/dev/null; then
            echo "🛑 Остановка $service (PID: $pid)..."
            kill $pid
            sleep 2
            
            # Принудительная остановка если не остановился
            if kill -0 $pid 2>/dev/null; then
                echo "⚡ Принудительная остановка $service..."
                kill -9 $pid
            fi
            
            echo "✅ $service остановлен"
        else
            echo "⚠️ $service уже не запущен"
        fi
        rm -f $pidfile
    else
        echo "⚠️ PID файл для $service не найден"
    fi
}

# Остановка всех сервисов
stop_service "backend"
stop_service "frontend" 
stop_service "admin"

# Остановка процессов по портам (на случай если PID файлы потерялись)
echo "🔍 Поиск и остановка процессов по портам..."

# Функция остановки по порту
kill_by_port() {
    local port=$1
    local name=$2
    
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo "🛑 Остановка $name на порту $port (PID: $pid)..."
        kill $pid
        sleep 1
        
        # Проверка что процесс остановился
        if lsof -ti:$port >/dev/null 2>&1; then
            echo "⚡ Принудительная остановка на порту $port..."
            kill -9 $(lsof -ti:$port) 2>/dev/null
        fi
        echo "✅ Порт $port освобожден"
    else
        echo "✅ Порт $port свободен"
    fi
}

kill_by_port 5002 "Backend"
kill_by_port 3100 "Frontend"
kill_by_port 3200 "Admin"

# Очистка логов (опционально)
read -p "🗑️ Очистить логи? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -f logs/*.log
    echo "✅ Логи очищены"
fi

echo ""
echo "✅ Все сервисы остановлены!"
echo "🚀 Для запуска используйте: ./start-with-proxy.sh" 