# 🚀 Инструкции по деплою TechnoLine Store

## 📋 Варианты деплоя

### Вариант 1: Vercel + MongoDB Atlas (Рекомендуется)

#### 1. Подготовка MongoDB Atlas
1. Зайдите на https://cloud.mongodb.com
2. Создайте новый кластер (бесплатный)
3. Создайте пользователя базы данных
4. Получите строку подключения

#### 2. Деплой Backend на Vercel
```bash
cd backend
vercel --prod
```
- Выберите "Continue with GitHub"
- Создайте новый проект
- Добавьте переменные окружения в Vercel Dashboard:
  - `MONGODB_URI` (строка подключения MongoDB Atlas)
  - `JWT_SECRET` (случайная строка)
  - `NODE_ENV=production`

#### 3. Деплой Frontend на Vercel
```bash
cd frontend
vercel --prod
```
- Добавьте переменную окружения:
  - `NEXT_PUBLIC_API_URL` (URL вашего backend)

#### 4. Деплой Admin на Vercel
```bash
cd admin
npm run build
vercel --prod
```
- Добавьте переменную окружения:
  - `VITE_API_URL` (URL вашего backend)

### Вариант 2: Railway (Альтернатива)

#### 1. Деплой Backend на Railway
```bash
cd backend
railway login
railway init
railway up
```

#### 2. Настройка переменных окружения в Railway Dashboard
- `MONGODB_URI`
- `JWT_SECRET`
- `NODE_ENV=production`

### Вариант 3: Render.com

#### 1. Подключите GitHub репозиторий к Render
#### 2. Создайте Web Service для backend
#### 3. Настройте переменные окружения

## 🔧 Необходимые переменные окружения

### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/technoline-store
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.vercel.app
ADMIN_URL=https://your-admin-domain.vercel.app
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.vercel.app/api
NEXT_PUBLIC_YANDEX_API_KEY=your_yandex_api_key
NEXT_PUBLIC_CDEK_WIDGET_DEBUG=false
```

### Admin (.env)
```env
VITE_API_URL=https://your-backend-domain.vercel.app/api
```

## 📝 Пошаговый план деплоя

### Шаг 1: Подготовка GitHub репозитория
1. Создайте репозиторий на GitHub
2. Загрузите код в репозиторий:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/technoline-store.git
git push -u origin main
```

### Шаг 2: Настройка MongoDB Atlas
1. Создайте кластер MongoDB Atlas
2. Создайте пользователя базы данных
3. Получите строку подключения

### Шаг 3: Деплой Backend
1. Перейдите в папку backend
2. Выполните `vercel --prod`
3. Настройте переменные окружения в Vercel Dashboard

### Шаг 4: Деплой Frontend
1. Перейдите в папку frontend
2. Выполните `vercel --prod`
3. Настройте переменную `NEXT_PUBLIC_API_URL`

### Шаг 5: Деплой Admin
1. Перейдите в папку admin
2. Выполните `npm run build`
3. Выполните `vercel --prod`
4. Настройте переменную `VITE_API_URL`

## 🎯 Результат

После деплоя у вас будет:
- **Frontend**: https://your-project.vercel.app
- **Admin**: https://your-admin.vercel.app
- **Backend**: https://your-backend.vercel.app

## 🔍 Проверка деплоя

1. Проверьте, что все сервисы запущены
2. Проверьте подключение к базе данных
3. Создайте первого администратора через API
4. Проверьте работу всех функций

## 🆘 Устранение проблем

### Проблемы с MongoDB
- Проверьте строку подключения
- Убедитесь, что IP адрес добавлен в whitelist

### Проблемы с CORS
- Проверьте настройки FRONTEND_URL и ADMIN_URL в backend

### Проблемы с переменными окружения
- Убедитесь, что все переменные настроены в Vercel Dashboard
- Проверьте правильность URL

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи в Vercel Dashboard
2. Убедитесь, что все зависимости установлены
3. Проверьте конфигурацию TypeScript
4. Убедитесь, что все порты настроены правильно 