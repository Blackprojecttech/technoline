# 🚀 Деплой TechnoLine Store с пользовательским доменом

## Вариант 1: Деплой на Vercel с доменом

### Шаг 1: Подготовка проекта
```bash
# Убедитесь, что код загружен в GitHub
git add .
git commit -m "Подготовка к деплою с доменом"
git push origin main
```

### Шаг 2: Деплой на Vercel

1. **Перейдите на https://vercel.com/dashboard**
2. **Нажмите "New Project"**
3. **Выберите репозиторий** `Blackprojecttech/technoline`

### Шаг 3: Настройка Backend проекта

**Framework Preset**: `Other`
**Root Directory**: `backend`
**Build Command**: `npm run build`
**Output Directory**: `dist`
**Install Command**: `npm install`

### Шаг 4: Настройка переменных окружения для Backend

В Vercel Dashboard для backend проекта добавьте:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/technoline
JWT_SECRET=your-super-secret-jwt-key-here
CDEK_CLIENT_ID=your-cdek-client-id
CDEK_CLIENT_SECRET=your-cdek-client-secret
NODE_ENV=production
```

### Шаг 5: Деплой Frontend

1. **Создайте второй проект в Vercel**
2. **Выберите тот же репозиторий**
3. **Framework Preset**: `Next.js`
4. **Root Directory**: `frontend`
5. **Build Command**: `npm run build`
6. **Output Directory**: `.next`

### Шаг 6: Настройка переменных окружения для Frontend

```
NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api
NEXT_PUBLIC_SITE_URL=https://your-frontend-domain.com
```

### Шаг 7: Подключение домена

1. **В Vercel Dashboard** перейдите в настройки проекта
2. **Выберите "Domains"**
3. **Добавьте ваш домен** (например: `store.yourdomain.com`)
4. **Настройте DNS записи**:
   - **A запись**: `store.yourdomain.com` → `76.76.19.33`
   - **CNAME запись**: `www.store.yourdomain.com` → `store.yourdomain.com`

## Вариант 2: Деплой на Railway с доменом

### Шаг 1: Подготовка
```bash
# Установите Railway CLI
npm install -g @railway/cli

# Авторизуйтесь
railway login
```

### Шаг 2: Деплой Backend
```bash
cd backend
railway init
railway up
```

### Шаг 3: Деплой Frontend
```bash
cd frontend
railway init
railway up
```

### Шаг 4: Подключение домена
1. **В Railway Dashboard** перейдите в настройки проекта
2. **Выберите "Custom Domains"**
3. **Добавьте ваш домен**
4. **Настройте DNS записи** согласно инструкциям Railway

## Вариант 3: Деплой на Render с доменом

### Шаг 1: Подготовка
1. **Перейдите на https://render.com**
2. **Создайте аккаунт** или войдите

### Шаг 2: Деплой Backend
1. **Нажмите "New +"**
2. **Выберите "Web Service"**
3. **Подключите GitHub репозиторий**
4. **Настройте**:
   - **Name**: `technoline-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### Шаг 3: Деплой Frontend
1. **Создайте второй Web Service**
2. **Настройте**:
   - **Name**: `technoline-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### Шаг 4: Подключение домена
1. **В Render Dashboard** перейдите в настройки сервиса
2. **Выберите "Custom Domains"**
3. **Добавьте ваш домен**
4. **Настройте DNS записи** согласно инструкциям Render

## Настройка DNS

### Для Vercel:
```
A     @     76.76.19.33
CNAME www   your-domain.vercel.app
```

### Для Railway:
```
A     @     [IP адрес из Railway]
CNAME www   your-app.railway.app
```

### Для Render:
```
A     @     [IP адрес из Render]
CNAME www   your-app.onrender.com
```

## Проверка деплоя

После деплоя проверьте:

1. **Backend API**: `https://your-backend-domain.com/api/health`
2. **Frontend**: `https://your-frontend-domain.com`
3. **Admin Panel**: `https://your-admin-domain.com`

## Устранение проблем

### Ошибка "Account not found"
- Создайте первого пользователя через API
- Проверьте подключение к базе данных

### CORS ошибки
- Убедитесь, что домены добавлены в CORS конфигурацию
- Проверьте переменные окружения

### Проблемы с доменом
- Подождите 24-48 часов для распространения DNS
- Проверьте SSL сертификат
- Убедитесь, что DNS записи настроены правильно 