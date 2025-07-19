# 🚀 Руководство по деплою на Vercel

## Шаг 1: Подготовка

### Установка Vercel CLI
```bash
npm install -g vercel
```

### Авторизация в Vercel
```bash
vercel login
```

## Шаг 2: Деплой Backend

```bash
cd backend
vercel --prod
```

После деплоя backend, скопируйте URL (например: `https://your-backend.vercel.app`)

## Шаг 3: Настройка переменных окружения

В Vercel Dashboard для backend проекта добавьте:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/technoline
JWT_SECRET=your-super-secret-jwt-key
CDEK_CLIENT_ID=your-cdek-client-id
CDEK_CLIENT_SECRET=your-cdek-client-secret
```

## Шаг 4: Деплой Frontend

```bash
cd frontend
# Создайте .env.production с URL backend
echo "NEXT_PUBLIC_API_URL=https://your-backend.vercel.app/api" > .env.production
vercel --prod
```

## Шаг 5: Деплой Admin Panel

```bash
cd admin
# Создайте .env.production с URL backend
echo "VITE_API_URL=https://your-backend.vercel.app/api" > .env.production
npm run build
vercel --prod
```

## Шаг 6: Проверка

1. Откройте frontend URL
2. Попробуйте зарегистрироваться
3. Проверьте admin panel

## Полезные команды

```bash
# Посмотреть все проекты
vercel ls

# Посмотреть логи
vercel logs

# Обновить переменные окружения
vercel env add MONGODB_URI
```

## Структура URL после деплоя

- **Frontend**: `https://your-frontend.vercel.app`
- **Backend**: `https://your-backend.vercel.app`
- **Admin**: `https://your-admin.vercel.app`

## Troubleshooting

### Проблема с CORS
Убедитесь, что в backend настроен CORS для всех доменов Vercel:

```javascript
app.use(cors({
  origin: [
    'https://*.vercel.app',
    'https://*.railway.app',
    /^https:\/\/.*\.vercel\.app$/,
    /^https:\/\/.*\.railway\.app$/
  ],
  credentials: true
}));
```

### Проблема с MongoDB
Убедитесь, что MongoDB Atlas настроен для доступа с любых IP (0.0.0.0/0) 