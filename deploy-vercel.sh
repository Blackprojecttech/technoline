#!/bin/bash

echo "🚀 Деплой TechnoLine Store через Vercel"

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Проверка наличия Vercel CLI
check_vercel() {
    if ! command -v vercel &> /dev/null; then
        error "Vercel CLI не установлен"
        log "Установите Vercel CLI: npm install -g vercel"
        exit 1
    fi
    log "Vercel CLI найден ✓"
}

# Деплой Backend
deploy_backend() {
    log "Деплой Backend..."
    cd backend
    
    # Создаем vercel.json если его нет
    if [ ! -f "vercel.json" ]; then
        cat > vercel.json << 'EOF'
{
  "version": 2,
  "builds": [
    {
      "src": "dist/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/index.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
EOF
    fi
    
    # Собираем backend
    npm run build
    
    # Деплой
    vercel --prod --yes
    
    cd ..
}

# Деплой Frontend
deploy_frontend() {
    log "Деплой Frontend..."
    cd frontend
    
    # Деплой
    vercel --prod --yes
    
    cd ..
}

# Деплой Admin
deploy_admin() {
    log "Деплой Admin..."
    cd admin
    
    # Собираем admin
    npm run build
    
    # Деплой
    vercel --prod --yes
    
    cd ..
}

# Основная функция
main() {
    log "Начинаем деплой через Vercel..."
    
    check_vercel
    
    # Проверяем, что мы в правильной директории
    if [ ! -f "package.json" ]; then
        error "Не найден package.json. Убедитесь, что вы в корневой папке проекта."
        exit 1
    fi
    
    # Деплой всех частей
    deploy_backend
    deploy_frontend
    deploy_admin
    
    log "✅ Деплой завершен!"
    log ""
    log "📋 Следующие шаги:"
    log "1. Настройте переменные окружения в Vercel Dashboard"
    log "2. Подключите MongoDB Atlas"
    log "3. Создайте первого администратора"
    log ""
    log "🔗 Vercel Dashboard: https://vercel.com/dashboard"
}

# Запуск скрипта
main "$@" 