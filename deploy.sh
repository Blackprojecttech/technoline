#!/bin/bash

echo "🚀 Начинаем деплой TechnoLine Store..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Проверка наличия необходимых инструментов
check_requirements() {
    log "Проверяем требования..."
    
    if ! command -v node &> /dev/null; then
        error "Node.js не установлен"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        error "npm не установлен"
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        error "Git не установлен"
        exit 1
    fi
    
    log "Все требования выполнены ✓"
}

# Установка зависимостей
install_dependencies() {
    log "Устанавливаем зависимости..."
    
    # Установка зависимостей для всех частей
    npm run install:all
    
    if [ $? -eq 0 ]; then
        log "Зависимости установлены ✓"
    else
        error "Ошибка при установке зависимостей"
        exit 1
    fi
}

# Сборка проекта
build_project() {
    log "Собираем проект..."
    
    npm run build
    
    if [ $? -eq 0 ]; then
        log "Проект собран ✓"
    else
        error "Ошибка при сборке проекта"
        exit 1
    fi
}

# Создание файлов окружения
setup_environment() {
    log "Настраиваем переменные окружения..."
    
    # Backend
    if [ ! -f "backend/.env" ]; then
        cp backend/env.example backend/.env
        warning "Создан файл backend/.env - настройте переменные окружения"
    fi
    
    # Frontend
    if [ ! -f "frontend/.env.local" ]; then
        cp frontend/env.example frontend/.env.local
        warning "Создан файл frontend/.env.local - настройте переменные окружения"
    fi
    
    # Admin
    if [ ! -f "admin/.env" ]; then
        cp admin/env.example admin/.env
        warning "Создан файл admin/.env - настройте переменные окружения"
    fi
    
    log "Файлы окружения созданы ✓"
}

# Проверка статуса Git
check_git_status() {
    log "Проверяем статус Git..."
    
    if [ -d ".git" ]; then
        log "Git репозиторий найден ✓"
        
        # Проверяем, есть ли изменения
        if [ -n "$(git status --porcelain)" ]; then
            warning "Есть несохраненные изменения в Git"
            read -p "Хотите зафиксировать изменения? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                git add .
                git commit -m "Auto commit before deployment"
                log "Изменения зафиксированы ✓"
            fi
        fi
    else
        error "Git репозиторий не найден"
        exit 1
    fi
}

# Основная функция
main() {
    log "Начинаем процесс деплоя TechnoLine Store..."
    
    check_requirements
    install_dependencies
    setup_environment
    build_project
    check_git_status
    
    log "✅ Деплой завершен успешно!"
    log ""
    log "📋 Следующие шаги:"
    log "1. Настройте переменные окружения в файлах .env"
    log "2. Создайте репозиторий на GitHub"
    log "3. Загрузите код в репозиторий:"
    log "   git remote add origin https://github.com/your-username/technoline-store.git"
    log "   git push -u origin main"
    log "4. Настройте деплой на Vercel/Railway/Render"
    log ""
    log "📖 Подробные инструкции в файле DEPLOY_INSTRUCTIONS.md"
}

# Запуск скрипта
main "$@" 