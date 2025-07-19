#!/bin/bash

echo "🚀 Деплой TechnoLine Store с пользовательским доменом"
echo ""

# Проверяем, что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: package.json не найден. Убедитесь, что вы в корневой папке проекта."
    exit 1
fi

echo "📋 Выберите платформу для деплоя:"
echo "1. Vercel (рекомендуется)"
echo "2. Railway"
echo "3. Render"
echo ""

read -p "Введите номер (1-3): " choice

case $choice in
    1)
        echo "🎯 Выбран Vercel"
        echo ""
        echo "📝 Инструкции для деплоя на Vercel:"
        echo ""
        echo "1. Перейдите на https://vercel.com/dashboard"
        echo "2. Нажмите 'New Project'"
        echo "3. Выберите репозиторий: Blackprojecttech/technoline"
        echo ""
        echo "4. Для Backend проекта:"
        echo "   - Framework Preset: Other"
        echo "   - Root Directory: backend"
        echo "   - Build Command: npm run build"
        echo "   - Output Directory: dist"
        echo ""
        echo "5. Для Frontend проекта:"
        echo "   - Framework Preset: Next.js"
        echo "   - Root Directory: frontend"
        echo "   - Build Command: npm run build"
        echo "   - Output Directory: .next"
        echo ""
        echo "6. Настройте переменные окружения:"
        echo "   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/technoline"
        echo "   JWT_SECRET=your-super-secret-jwt-key"
        echo "   NEXT_PUBLIC_API_URL=https://your-backend-domain.vercel.app/api"
        echo ""
        echo "7. Подключите ваш домен в настройках проекта"
        ;;
    2)
        echo "🎯 Выбран Railway"
        echo ""
        echo "📝 Инструкции для деплоя на Railway:"
        echo ""
        echo "1. Установите Railway CLI:"
        echo "   npm install -g @railway/cli"
        echo ""
        echo "2. Авторизуйтесь:"
        echo "   railway login"
        echo ""
        echo "3. Деплой Backend:"
        echo "   cd backend"
        echo "   railway init"
        echo "   railway up"
        echo ""
        echo "4. Деплой Frontend:"
        echo "   cd frontend"
        echo "   railway init"
        echo "   railway up"
        echo ""
        echo "5. Подключите домен в Railway Dashboard"
        ;;
    3)
        echo "🎯 Выбран Render"
        echo ""
        echo "📝 Инструкции для деплоя на Render:"
        echo ""
        echo "1. Перейдите на https://render.com"
        echo "2. Создайте аккаунт или войдите"
        echo "3. Нажмите 'New +' → 'Web Service'"
        echo "4. Подключите GitHub репозиторий"
        echo ""
        echo "5. Для Backend:"
        echo "   - Name: technoline-backend"
        echo "   - Root Directory: backend"
        echo "   - Build Command: npm install && npm run build"
        echo "   - Start Command: npm start"
        echo ""
        echo "6. Для Frontend:"
        echo "   - Name: technoline-frontend"
        echo "   - Root Directory: frontend"
        echo "   - Build Command: npm install && npm run build"
        echo "   - Start Command: npm start"
        echo ""
        echo "7. Подключите домен в настройках сервиса"
        ;;
    *)
        echo "❌ Неверный выбор. Попробуйте снова."
        exit 1
        ;;
esac

echo ""
echo "🔗 После деплоя не забудьте:"
echo "1. Настроить DNS записи для вашего домена"
echo "2. Подождать 24-48 часов для распространения DNS"
echo "3. Проверить SSL сертификат"
echo "4. Создать первого пользователя через API"
echo ""
echo "📖 Подробные инструкции в файле DEPLOY_WITH_DOMAIN.md" 