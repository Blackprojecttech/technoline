#!/bin/bash

# Скрипт проверки статуса всех сервисов TechnoHub Store

echo "📊 Статус сервисов TechnoHub Store"
echo "=================================="

# Функция проверки статуса сервиса
check_service_status() {
    local service=$1
    local port=$2
    local pidfile="logs/$service.pid"
    
    echo -n "🔍 $service: "
    
    # Проверка PID файла
    if [ -f "$pidfile" ]; then
        local pid=$(cat $pidfile)
        if kill -0 $pid 2>/dev/null; then
            echo -n "✅ Запущен (PID: $pid) "
        else
            echo -n "❌ PID файл есть, но процесс не найден "
            rm -f $pidfile
        fi
    else
        echo -n "⚠️ PID файл не найден "
    fi
    
    # Проверка порта
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        local port_pid=$(lsof -ti:$port)
        echo -n "🌐 Порт $port занят (PID: $port_pid) "
        
        # Проверка HTTP ответа
        if [ "$port" = "5002" ]; then
            if curl -s http://localhost:$port/api/health >/dev/null 2>&1; then
                echo "✅ API отвечает"
            else
                echo "⚠️ API не отвечает"
            fi
        elif [ "$port" = "3100" ] || [ "$port" = "3200" ]; then
            if curl -s http://localhost:$port >/dev/null 2>&1; then
                echo "✅ HTTP отвечает"
            else
                echo "⚠️ HTTP не отвечает"
            fi
        fi
    else
        echo "❌ Порт $port свободен"
    fi
}

# Проверка всех сервисов
check_service_status "Backend" "5002"
check_service_status "Frontend" "3100"
check_service_status "Admin" "3200"

echo ""
echo "🌐 Прокси настройки:"

# Проверка настроек прокси
if [ -f "backend/.env" ]; then
    PROXY_ENABLED=$(grep "PROXY_ENABLED=" backend/.env | cut -d'=' -f2 2>/dev/null || echo "false")
    PROXY_HOST=$(grep "PROXY_HOST=" backend/.env | cut -d'=' -f2 2>/dev/null || echo "")
    
    if [ "$PROXY_ENABLED" = "true" ]; then
        echo "✅ Прокси включен: $PROXY_HOST"
        
        # Проверка доступности прокси
        if ping -c 1 $PROXY_HOST >/dev/null 2>&1; then
            echo "✅ Прокси-сервер доступен"
            
            # Проверка публичных адресов
            echo ""
            echo "🌍 Проверка публичных адресов:"
            
            check_url() {
                local url=$1
                local name=$2
                echo -n "🔗 $name: "
                if curl -s -o /dev/null -w "%{http_code}" --max-time 10 $url | grep -q "200\|301\|302"; then
                    echo "✅ Доступен"
                else
                    echo "❌ Недоступен"
                fi
            }
            
            check_url "https://technohubstore.net" "Основной сайт"
            check_url "https://admin.technohubstore.net" "Админка"
            check_url "https://technohubstore.net/api/health" "API"
            
        else
            echo "❌ Прокси-сервер недоступен"
        fi
    else
        echo "⚠️ Прокси отключен"
    fi
else
    echo "❌ Файл backend/.env не найден"
fi

echo ""
echo "📈 Использование ресурсов:"

# Проверка использования CPU и памяти
if command -v ps >/dev/null 2>&1; then
    echo "💾 Память и CPU:"
    for port in 5002 3100 3200; do
        pid=$(lsof -ti:$port 2>/dev/null)
        if [ -n "$pid" ]; then
            stats=$(ps -p $pid -o pid,pcpu,pmem,comm --no-headers 2>/dev/null)
            if [ -n "$stats" ]; then
                echo "   Порт $port: $stats"
            fi
        fi
    done
fi

echo ""
echo "📋 Логи (последние 3 строки):"
for service in backend frontend admin; do
    if [ -f "logs/$service.log" ]; then
        echo "📄 $service.log:"
        tail -3 "logs/$service.log" | sed 's/^/   /'
        echo ""
    fi
done

echo "🔧 Управление:"
echo "   Запуск:    ./start-with-proxy.sh"
echo "   Остановка: ./stop-services.sh"
echo "   Логи:      tail -f logs/backend.log" 