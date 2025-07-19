#!/bin/bash

echo "🚀 Начинаем деплой на Vercel..."

# Проверяем, установлен ли Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI не установлен. Устанавливаем..."
    npm install -g vercel
fi

# Проверяем авторизацию в Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 Авторизуемся в Vercel..."
    vercel login
fi

echo "📦 Подготавливаем проект..."

# Создаем .env файлы для production
echo "NEXT_PUBLIC_API_URL=https://your-backend-url.vercel.app/api" > frontend/.env.production
echo "NEXT_PUBLIC_API_URL=https://your-backend-url.vercel.app/api" > admin/.env.production

# Деплоим backend
echo "🔧 Деплоим backend..."
cd backend
vercel --prod --yes
BACKEND_URL=$(vercel ls | grep backend | tail -1 | awk '{print $2}')
cd ..

# Деплоим frontend
echo "🌐 Деплоим frontend..."
cd frontend
# Обновляем API URL с реальным URL backend
echo "NEXT_PUBLIC_API_URL=$BACKEND_URL/api" > .env.production
vercel --prod --yes
FRONTEND_URL=$(vercel ls | grep frontend | tail -1 | awk '{print $2}')
cd ..

# Деплоим admin
echo "⚙️ Деплоим admin panel..."
cd admin
# Обновляем API URL с реальным URL backend
echo "VITE_API_URL=$BACKEND_URL/api" > .env.production
npm run build
vercel --prod --yes
cd ..

echo "✅ Деплой завершен!"
echo "🔗 Backend: $BACKEND_URL"
echo "🌐 Frontend: $FRONTEND_URL"
echo "⚙️ Admin: https://your-admin-url.vercel.app"

echo ""
echo "📝 Не забудьте настроить переменные окружения в Vercel Dashboard:"
echo "- MONGODB_URI"
echo "- JWT_SECRET"
echo "- CDEK_CLIENT_ID"
echo "- CDEK_CLIENT_SECRET" 