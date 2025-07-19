# 🚀 Деплой через GitHub и Vercel Dashboard

## Шаг 1: Создание GitHub репозитория

1. Перейдите на https://github.com
2. Нажмите "New repository"
3. Назовите репозиторий `technoline-store`
4. Сделайте его публичным
5. НЕ инициализируйте с README

## Шаг 2: Загрузка кода в GitHub

```bash
# Добавьте remote origin (замените YOUR_USERNAME на ваше имя пользователя)
git remote add origin https://github.com/YOUR_USERNAME/technoline-store.git

# Загрузите код
git push -u origin main
```

## Шаг 3: Деплой через Vercel Dashboard

1. Перейдите на https://vercel.com
2. Нажмите "New Project"
3. Подключите ваш GitHub аккаунт
4. Выберите репозиторий `technoline-store`

## Шаг 4: Настройка проекта в Vercel

### Для Backend:
1. Создайте новый проект в Vercel
2. Выберите репозиторий
3. В настройках проекта:
   - **Framework Preset**: Node.js
   - **Root Directory**: `backend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Переменные окружения для Backend:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/technoline
JWT_SECRET=your-super-secret-jwt-key
CDEK_CLIENT_ID=your-cdek-client-id
CDEK_CLIENT_SECRET=your-cdek-client-secret
NODE_ENV=production
```

### Для Frontend:
1. Создайте еще один проект в Vercel
2. Выберите тот же репозиторий
3. В настройках:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### Переменные окружения для Frontend:
```
NEXT_PUBLIC_API_URL=https://your-backend-url.vercel.app/api
NEXT_PUBLIC_YANDEX_API_KEY=your_yandex_api_key
NEXT_PUBLIC_CDEK_WIDGET_DEBUG=false
```

### Для Admin Panel:
1. Создайте третий проект в Vercel
2. Выберите тот же репозиторий
3. В настройках:
   - **Framework Preset**: Vite
   - **Root Directory**: `admin`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Переменные окружения для Admin:
```
VITE_API_URL=https://your-backend-url.vercel.app/api
```

## Шаг 5: Получение URL

После деплоя вы получите:
- **Backend**: `https://your-backend.vercel.app`
- **Frontend**: `https://your-frontend.vercel.app`
- **Admin**: `https://your-admin.vercel.app`

## Шаг 6: Создание первого пользователя

После деплоя создайте первого администратора:

```bash
curl -X POST https://your-backend.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }'
```

## Полезные ссылки

- **Vercel Dashboard**: https://vercel.com/dashboard
- **GitHub**: https://github.com
- **MongoDB Atlas**: https://cloud.mongodb.com

## Troubleshooting

### Проблема: Build failed
- Проверьте логи в Vercel Dashboard
- Убедитесь, что все зависимости указаны в package.json
- Проверьте переменные окружения

### Проблема: CORS errors
- Убедитесь, что в backend настроен CORS для всех доменов Vercel
- Проверьте, что API_URL правильно настроен

### Проблема: MongoDB connection failed
- Проверьте строку подключения MongoDB
- Убедитесь, что MongoDB Atlas настроен для доступа с любых IP 