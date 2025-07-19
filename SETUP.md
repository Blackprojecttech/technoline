# Инструкции по настройке TechnoLine Store

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
# Установка всех зависимостей
npm run install:all
```

### 2. Настройка переменных окружения

#### Backend (.env)
```bash
cd backend
cp env.example .env
```

Отредактируйте `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/technoline-store
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

#### Frontend (.env.local)
```bash
cd frontend
cp env.example .env.local
```

Отредактируйте `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

#### Admin (.env)
```bash
cd admin
cp env.example .env
```

Отредактируйте `admin/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Установка MongoDB

Убедитесь, что MongoDB установлен и запущен:

```bash
# macOS (с Homebrew)
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt update
sudo apt install mongodb
sudo systemctl start mongodb

# Windows
# Скачайте и установите MongoDB с официального сайта
```

### 4. Запуск проекта

#### Вариант 1: Запуск всех сервисов одновременно
```bash
npm run dev
```

#### Вариант 2: Запуск по отдельности

```bash
# Backend (API)
cd backend
npm run dev

# Frontend (сайт магазина)
cd frontend
npm run dev

# Admin (админ-панель)
cd admin
npm run dev
```

### 5. Доступ к приложениям

- **Сайт магазина**: http://localhost:3000
- **Админ-панель**: http://localhost:3001
- **API**: http://localhost:5000

## 📊 Структура проекта

```
techno-line.store/
├── backend/          # API сервер (Express + MongoDB)
├── frontend/         # Сайт магазина (Next.js)
├── admin/            # Админ-панель (React + Ant Design)
└── shared/           # Общие типы и утилиты
```

## 🔧 Основные функции

### Сайт магазина (Frontend)
- ✅ Каталог товаров с фильтрацией
- ✅ Корзина покупок
- ✅ Оформление заказов
- ✅ Личный кабинет
- ✅ Адаптивный дизайн

### Админ-панель (Admin)
- ✅ Управление товарами
- ✅ Управление заказами
- ✅ Управление пользователями
- ✅ Аналитика и статистика
- ✅ Управление категориями

### API (Backend)
- ✅ RESTful API
- ✅ Аутентификация JWT
- ✅ Управление пользователями
- ✅ CRUD операции для всех сущностей

## 🛠 Технологии

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT аутентификация
- TypeScript

### Frontend
- Next.js 14
- React 18
- Tailwind CSS
- Redux Toolkit
- TypeScript

### Admin
- React 18
- Ant Design
- React Query
- TypeScript

## 📝 Создание первого админа

После запуска backend, создайте первого администратора:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@technoline.store",
    "password": "admin123",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }'
```

## 🔒 Безопасность

- Измените `JWT_SECRET` в продакшене
- Настройте HTTPS для продакшена
- Используйте сильные пароли
- Настройте CORS для продакшена

## 🚀 Деплой

### Backend (Railway/Heroku)
```bash
cd backend
npm run build
# Настройте переменные окружения на платформе
```

### Frontend (Vercel)
```bash
cd frontend
npm run build
vercel --prod
```

### Admin (Vercel/Netlify)
```bash
cd admin
npm run build
# Загрузите dist/ на платформу
```

## 📞 Поддержка

При возникновении проблем:
1. Проверьте, что MongoDB запущен
2. Убедитесь, что все переменные окружения настроены
3. Проверьте логи в консоли
4. Убедитесь, что порты 3000, 3001, 5000 свободны 