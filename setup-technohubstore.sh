#!/bin/bash

# Быстрая настройка TechnoHub Store для домена technohubstore.net
# Этот скрипт копирует все production конфигурации в рабочие файлы

set -e

echo "🚀 Настройка TechnoHub Store для домена technohubstore.net"

# Копирование конфигураций бэкенда
echo "📁 Настройка бэкенда..."
cp backend/env.production backend/.env
echo "✅ Backend .env создан"

# Копирование конфигураций фронтенда  
echo "📁 Настройка фронтенда..."
cp frontend/env.production frontend/.env.local
echo "✅ Frontend .env.local создан"

# Копирование конфигураций админки
echo "📁 Настройка админки..."
cp admin/env.production admin/.env
echo "✅ Admin .env создан"

echo ""
echo "✅ Все конфигурации настроены для домена technohubstore.net!"
echo ""
echo "📝 Следующие шаги:"
echo "1. Отредактируйте файлы .env и заполните реальные значения:"
echo "   - backend/.env (JWT секреты, MongoDB, email, API ключи)"
echo "   - frontend/.env.local (Google Maps, аналитика)" 
echo "   - admin/.env (при необходимости)"
echo ""
echo "2. Для локальной разработки:"
echo "   ./start-with-proxy.sh  # Запуск с поддержкой прокси"
echo "   ./status-services.sh   # Проверка статуса"
echo "   ./stop-services.sh     # Остановка всех сервисов"
echo ""
echo "3. Для развертывания на сервере:"
echo "   ./deploy.sh technohubstore.net"
echo ""
echo "4. Настройте DNS записи в панели домена:"
echo "   A @ 195.209.188.108"
echo "   A www 195.209.188.108"
echo "   A admin 195.209.188.108"
echo "   A mail 195.209.188.108"
echo ""
echo "🌐 Ваш сайт будет доступен по адресам:"
echo "   Локально:  http://localhost:3000 (разработка)"
echo "   Публично:  https://technohubstore.net (через прокси)"
echo "   Админка:   https://admin.technohubstore.net" 