# TechnoLine Store

Современный интернет-магазин с админ-панелью для управления товарами, заказами и статистикой.

## 🚀 Технологии

### Backend
- **Node.js** + **Express.js** - серверная часть
- **MongoDB** + **Mongoose** - база данных
- **JWT** - аутентификация
- **bcrypt** - хеширование паролей
- **multer** - загрузка файлов
- **cors** - CORS middleware

### Frontend (Магазин)
- **Next.js 14** - React фреймворк
- **TypeScript** - типизация
- **Tailwind CSS** - стилизация
- **Redux Toolkit** - управление состоянием
- **Lucide React** - иконки

### Admin Panel
- **React** + **Vite** - быстрая разработка
- **TypeScript** - типизация
- **Ant Design** - UI компоненты
- **React Query** - управление данными
- **React Router** - роутинг

## 📁 Структура проекта

```
Techno-line.store/
├── backend/          # API сервер
├── frontend/         # Интернет-магазин
├── admin/           # Админ-панель
├── SETUP.md         # Инструкции по настройке
└── README.md        # Этот файл
```

## 🛠 Установка и запуск

### 1. Клонирование и установка зависимостей

```bash
# Клонировать репозиторий
git clone <repository-url>
cd Techno-line.store

# Установить зависимости для всех частей
npm install
cd frontend && npm install
cd ../admin && npm install
cd ../backend && npm install
```

### 2. Настройка окружения

Создайте файлы `.env` в каждой папке на основе `.env.example`:

```bash
# Backend (.env)
cp backend/env.example backend/.env

# Frontend (.env.local)
cp frontend/env.example frontend/.env.local

# Admin (.env)
cp admin/env.example admin/.env
```

### 3. Настройка базы данных

1. Установите MongoDB
2. Создайте базу данных
3. Обновите `MONGODB_URI` в `backend/.env`

## 🌐 Доступ в локальной сети

Чтобы другие пользователи могли открыть платформу с любых устройств в локальной сети:

### Быстрый запуск (рекомендуется)

**macOS/Linux:**
```bash
./start-local-network.sh
```

**Windows:**
```cmd
start-local-network.bat
```

Скрипт автоматически:
- Определит ваш IP-адрес в сети
- Настроит все переменные окружения
- Запустит все сервисы
- Покажет адреса для доступа

### Доступ с других устройств

После запуска платформа будет доступна по адресам:
- 🛒 **Интернет-магазин:** `http://ВАШ_IP:3100`
- ⚙️ **Админ-панель:** `http://ВАШ_IP:3200`

📖 **Подробные инструкции:** [NETWORK_ACCESS.md](NETWORK_ACCESS.md)

---

### 4. Запуск проекта

#### Backend (API)
```bash
cd backend
npm run dev
# Сервер запустится на http://localhost:5000
```

#### Frontend (Магазин)
```bash
cd frontend
npm run dev
# Магазин запустится на http://localhost:3000
```

#### Admin Panel
```bash
cd admin
npm run dev
# Админ-панель запустится на http://localhost:5173
```

## 📋 Функциональность

### Интернет-магазин
- ✅ Главная страница с каталогом товаров
- ✅ Поиск товаров
- ✅ Корзина покупок
- ✅ Регистрация и авторизация
- ✅ Оформление заказов
- ✅ Адаптивный дизайн

### Админ-панель
- ✅ Аутентификация администраторов
- ✅ Управление товарами (CRUD)
- ✅ Управление категориями
- ✅ Просмотр и обработка заказов
- ✅ Статистика продаж
- ✅ Современный интерфейс

## 🔧 API Endpoints

### Аутентификация
- `POST /api/auth/register` - регистрация
- `POST /api/auth/login` - вход
- `GET /api/auth/me` - получение профиля

### Товары
- `GET /api/products` - список товаров
- `GET /api/products/:id` - товар по ID
- `POST /api/products` - создание товара
- `PUT /api/products/:id` - обновление товара
- `DELETE /api/products/:id` - удаление товара

### Категории
- `GET /api/categories` - список категорий
- `POST /api/categories` - создание категории
- `PUT /api/categories/:id` - обновление категории
- `DELETE /api/categories/:id` - удаление категории

### Заказы
- `GET /api/orders` - список заказов
- `POST /api/orders` - создание заказа
- `PATCH /api/orders/:id/status` - обновление статуса

## 🎨 Дизайн

Проект использует современный дизайн с:
- Чистым и минималистичным интерфейсом
- Адаптивной версткой
- Плавными анимациями
- Интуитивной навигацией

## 🔒 Безопасность

- JWT токены для аутентификации
- Хеширование паролей с bcrypt
- Валидация данных на сервере
- CORS настройки
- Защищенные роуты в админ-панели

## 📱 Адаптивность

Все части проекта полностью адаптивны и работают на:
- Десктопах
- Планшетах
- Мобильных устройствах

## 🚀 Развертывание

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
npm start
```

### Admin Panel
```bash
cd admin
npm run build
# Разместить dist/ на веб-сервере
```

## 📞 Поддержка

Если у вас возникли вопросы или проблемы:
1. Проверьте логи в консоли
2. Убедитесь, что все зависимости установлены
3. Проверьте настройки окружения
4. Убедитесь, что MongoDB запущена

## 📄 Лицензия

MIT License 