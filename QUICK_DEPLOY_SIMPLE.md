# 🚀 Простой деплой TechnoLine Store

## 📋 Быстрый деплой (без сложных настроек)

### 1. Подготовка проекта

Проект уже подготовлен к деплою:
- ✅ Зависимости установлены
- ✅ Backend собран
- ✅ Admin собран
- ✅ Git репозиторий настроен

### 2. Варианты деплоя

#### Вариант A: Vercel (Рекомендуется)

1. **Создайте аккаунт на Vercel**: https://vercel.com
2. **Подключите GitHub репозиторий**:
   ```bash
   # Загрузите код в GitHub
   git remote add origin https://github.com/your-username/technoline-store.git
   git push -u origin main
   ```
3. **Деплой через Vercel Dashboard**:
   - Зайдите на https://vercel.com/dashboard
   - Нажмите "New Project"
   - Подключите ваш GitHub репозиторий
   - Настройте переменные окружения

#### Вариант B: Netlify

1. **Создайте аккаунт на Netlify**: https://netlify.com
2. **Подключите репозиторий**
3. **Настройте переменные окружения**

#### Вариант C: GitHub Pages (только Frontend)

1. **Создайте репозиторий на GitHub**
2. **Настройте GitHub Pages**
3. **Деплой только frontend части**

### 3. Необходимые переменные окружения

#### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/technoline-store
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.vercel.app
ADMIN_URL=https://your-admin-domain.vercel.app
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.vercel.app/api
NEXT_PUBLIC_YANDEX_API_KEY=your_yandex_api_key
NEXT_PUBLIC_CDEK_WIDGET_DEBUG=false
```

#### Admin (.env)
```env
VITE_API_URL=https://your-backend-domain.vercel.app/api
```

### 4. Пошаговый план

#### Шаг 1: MongoDB Atlas
1. Зайдите на https://cloud.mongodb.com
2. Создайте бесплатный кластер
3. Создайте пользователя базы данных
4. Получите строку подключения

#### Шаг 2: Деплой Backend
1. Создайте проект на Railway или Render
2. Подключите GitHub репозиторий
3. Настройте переменные окружения
4. Деплой backend папки

#### Шаг 3: Деплой Frontend
1. Создайте проект на Vercel
2. Подключите GitHub репозиторий
3. Настройте переменную `NEXT_PUBLIC_API_URL`
4. Деплой frontend папки

#### Шаг 4: Деплой Admin
1. Создайте проект на Vercel
2. Подключите GitHub репозиторий
3. Настройте переменную `VITE_API_URL`
4. Деплой admin папки

### 5. Альтернативный подход - Локальный сервер

Если деплой в облаке сложен, можно развернуть на локальном сервере:

```bash
# Установка на сервер
sudo apt update
sudo apt install nodejs npm mongodb

# Клонирование проекта
git clone https://github.com/your-username/technoline-store.git
cd technoline-store

# Установка зависимостей
npm run install:all

# Настройка переменных окружения
cp backend/env.example backend/.env
cp frontend/env.example frontend/.env.local
cp admin/env.example admin/.env

# Сборка проекта
npm run build

# Запуск с PM2
sudo npm install -g pm2
pm2 start ecosystem.config.js
```

### 6. Проверка деплоя

После деплоя проверьте:
1. ✅ Backend API отвечает
2. ✅ Frontend загружается
3. ✅ Admin панель работает
4. ✅ База данных подключена
5. ✅ Все функции работают

### 7. Создание первого администратора

```bash
# Через API
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

## 🎯 Результат

После успешного деплоя у вас будет:
- **Frontend**: https://your-project.vercel.app
- **Admin**: https://your-admin.vercel.app
- **Backend**: https://your-backend.railway.app

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи в панели управления
2. Убедитесь, что все переменные окружения настроены
3. Проверьте подключение к базе данных
4. Убедитесь, что все URL правильные

## 🚀 Готово!

Ваша платформа TechnoLine Store готова к использованию! 