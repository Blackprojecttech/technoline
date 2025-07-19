# 🚀 Быстрый старт TechnoLine Store

## Установка и запуск за 5 минут

### 1. Установка зависимостей
```bash
npm run install:all
```

### 2. Настройка окружения
```bash
# Backend
cp backend/env.example backend/.env

# Frontend  
cp frontend/env.example frontend/.env.local

# Admin
cp admin/env.example admin/.env
```

### 3. Настройка MongoDB
1. Установите MongoDB
2. Запустите MongoDB сервер
3. Обновите `MONGODB_URI` в `backend/.env`

### 4. Запуск проекта
```bash
# Запуск всех частей одновременно
npm run dev

# Или по отдельности:
npm run dev:backend    # http://localhost:5000
npm run dev:frontend   # http://localhost:3000  
npm run dev:admin      # http://localhost:5173
```

## 📱 Доступ к приложениям

- **Магазин**: http://localhost:3000
- **Админ-панель**: http://localhost:5173
- **API**: http://localhost:5000

## 🔑 Тестовые данные

После первого запуска создайте администратора:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Admin",
    "lastName": "User", 
    "email": "admin@technoline.store",
    "password": "admin123",
    "role": "admin"
  }'
```

## 📋 Что включено

✅ **Интернет-магазин**
- Главная страница с товарами
- Поиск и фильтрация
- Корзина покупок
- Оформление заказов

✅ **Админ-панель**
- Управление товарами
- Управление категориями  
- Просмотр заказов
- Статистика продаж

✅ **API Backend**
- RESTful API
- JWT аутентификация
- MongoDB интеграция
- Загрузка файлов

## 🛠 Команды разработки

```bash
# Сборка для продакшена
npm run build

# Запуск только backend
npm run dev:backend

# Запуск только frontend
npm run dev:frontend

# Запуск только admin
npm run dev:admin
```

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте, что MongoDB запущена
2. Убедитесь, что все порты свободны
3. Проверьте файлы `.env`
4. Посмотрите логи в консоли

---

**Удачной разработки! 🎉** 