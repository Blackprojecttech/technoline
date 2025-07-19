#!/bin/bash

echo "🚀 Быстрый деплой TechnoLine Store на Vercel"
echo ""

# Проверяем, что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: package.json не найден. Убедитесь, что вы в корневой папке проекта."
    exit 1
fi

echo "📋 Шаги для деплоя:"
echo ""
echo "1. Создайте GitHub репозиторий:"
echo "   - Перейдите на https://github.com"
echo "   - Нажмите 'New repository'"
echo "   - Назовите: technoline-store"
echo "   - Сделайте публичным"
echo ""
echo "2. Загрузите код в GitHub:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/technoline-store.git"
echo "   git push -u origin main"
echo ""
echo "3. Деплой через Vercel Dashboard:"
echo "   - Перейдите на https://vercel.com"
echo "   - Нажмите 'New Project'"
echo "   - Подключите GitHub"
echo "   - Выберите репозиторий technoline-store"
echo ""
echo "4. Создайте 3 проекта в Vercel:"
echo "   - Backend (Root: backend)"
echo "   - Frontend (Root: frontend)" 
echo "   - Admin (Root: admin)"
echo ""
echo "5. Настройте переменные окружения (см. DEPLOY_VIA_GITHUB.md)"
echo ""
echo "✅ Готово! Ваша платформа будет доступна в интернете."
echo ""
echo "📖 Подробное руководство: DEPLOY_VIA_GITHUB.md" 