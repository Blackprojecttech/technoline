# 🚀 Деплой TechnoLine Store через Vercel

## 📋 Быстрый старт

### 1. Подготовка

Проект уже подготовлен к деплою:
- ✅ Зависимости установлены
- ✅ Сборка работает
- ✅ Git репозиторий настроен

### 2. Создание GitHub репозитория

1. **Создайте репозиторий на GitHub**:
   - Зайдите на https://github.com
   - Нажмите "New repository"
   - Назовите репозиторий `technoline-store`
   - Сделайте его публичным или приватным

2. **Загрузите код в GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/technoline-store.git
   git push -u origin main
   ```

### 3. Настройка MongoDB Atlas

1. **Создайте аккаунт на MongoDB Atlas**:
   - Зайдите на https://cloud.mongodb.com
   - Создайте бесплатный аккаунт

2. **Создайте кластер**:
   - Выберите "Free" план
   - Выберите регион (например, Europe)
   - Нажмите "Create"

3. **Создайте пользователя базы данных**:
   - В разделе "Database Access" создайте пользователя
   - Запомните логин и пароль

4. **Получите строку подключения**:
   - В разделе "Database" нажмите "Connect"
   - Выберите "Connect your application"
   - Скопируйте строку подключения

### 4. Деплой через Vercel

#### Вариант A: Автоматический деплой

```bash
# Запустите скрипт деплоя
./deploy-vercel.sh
```

#### Вариант B: Ручной деплой

1. **Деплой Backend**:
   ```bash
   cd backend
   vercel --prod
   ```

2. **Деплой Frontend**:
   ```bash
   cd frontend
   vercel --prod
   ```

3. **Деплой Admin**:
   ```bash
   cd admin
   npm run build
   vercel --prod
   ```

### 5. Настройка переменных окружения

После деплоя настройте переменные в Vercel Dashboard:

#### Backend переменные:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/technoline-store
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.vercel.app
ADMIN_URL=https://your-admin-domain.vercel.app
```

#### Frontend переменные:
```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.vercel.app/api
NEXT_PUBLIC_YANDEX_API_KEY=your_yandex_api_key
NEXT_PUBLIC_CDEK_WIDGET_DEBUG=false
```

#### Admin переменные:
```env
VITE_API_URL=https://your-backend-domain.vercel.app/api
```

### 6. Создание первого администратора

После деплоя создайте первого администратора:

```bash
curl -X POST https://your-backend-domain.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }'
```

## 🔧 Устранение проблем

### Проблема: "Account not found"
- Убедитесь, что backend запущен
- Проверьте подключение к MongoDB
- Создайте первого пользователя

### Проблема: "Port already in use"
```bash
# Остановите процесс на порту 5000
lsof -ti:5000 | xargs kill -9
```

### Проблема: "Build failed"
- Проверьте логи в Vercel Dashboard
- Убедитесь, что все зависимости установлены
- Проверьте переменные окружения

## 📊 Мониторинг

### Проверка статуса:
- **Backend**: https://your-backend-domain.vercel.app/api/health
- **Frontend**: https://your-frontend-domain.vercel.app
- **Admin**: https://your-admin-domain.vercel.app

### Логи:
- Vercel Dashboard → Project → Functions → View Function Logs

## 🎯 Результат

После успешного деплоя у вас будет:
- **Frontend**: https://your-project.vercel.app
- **Admin**: https://your-admin.vercel.app
- **Backend**: https://your-backend.vercel.app

## 🚀 Готово!

Ваша платформа TechnoLine Store будет доступна в интернете! 