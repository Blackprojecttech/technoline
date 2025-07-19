# 🚀 РАЗВЕРТЫВАНИЕ ПРЯМО СЕЙЧАС

## 📋 Выполните эти команды по порядку:

### **1. Откройте Terminal на MacBook**
- Нажмите `Cmd + Space`
- Введите "Terminal"
- Нажмите Enter

### **2. Найдите папку проекта**
```bash
cd ~
ls -la | grep "Techno-line.store"
```

### **3. Перейдите в папку проекта**
```bash
cd "Techno-line.store — копия 2"
```

### **4. Установите инструменты развертывания**
```bash
npm install -g vercel @railway/cli
```

### **5. Разверните Backend (Railway)**
```bash
cd backend
railway login
railway init
railway up
```
**Скопируйте URL** (например: `https://your-project.railway.app`)

### **6. Разверните Frontend (Vercel)**
```bash
cd ../frontend
vercel login
vercel --prod
```
**Скопируйте URL** (например: `https://your-project.vercel.app`)

### **7. Разверните Admin (Vercel)**
```bash
cd ../admin
npm run build
vercel --prod
```
**Скопируйте URL** (например: `https://your-admin.vercel.app`)

### **8. Настройте переменные окружения**

#### **В Railway (Backend):**
1. Откройте https://railway.app/dashboard
2. Найдите ваш проект
3. Перейдите в Variables
4. Добавьте:
   ```
   JWT_SECRET=your-super-secret-key-here
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/technoline-store
   NODE_ENV=production
   ```

#### **В Vercel (Frontend):**
1. Откройте https://vercel.com/dashboard
2. Найдите ваш проект
3. Перейдите в Settings → Environment Variables
4. Добавьте:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
   ```

#### **В Vercel (Admin):**
1. Найдите admin проект
2. Добавьте переменную:
   ```
   VITE_API_URL=https://your-backend-url.railway.app
   ```

## 🎯 Результат

После выполнения у вас будет:
- **Frontend**: https://your-project.vercel.app
- **Admin**: https://your-admin.vercel.app
- **Backend**: https://your-backend.railway.app

## ⚡ Быстрые команды (скопируйте и вставьте):

```bash
# Установка инструментов
npm install -g vercel @railway/cli

# Backend
cd backend && railway login && railway init && railway up

# Frontend
cd ../frontend && vercel login && vercel --prod

# Admin
cd ../admin && npm run build && vercel --prod
```

## 🔧 Если что-то не работает:

1. **Проверьте логи**: `railway logs` / `vercel logs`
2. **Убедитесь, что переменные окружения настроены**
3. **Проверьте, что MongoDB подключен**
4. **Убедитесь, что все URL правильные**

## 💡 Полезные ссылки:

- **Railway**: https://railway.app/dashboard
- **Vercel**: https://vercel.com/dashboard
- **MongoDB Atlas**: https://cloud.mongodb.com

**Время выполнения: ~30 минут** 