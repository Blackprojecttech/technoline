# ⚡ Быстрое развертывание TechnoLine Store

## 🚀 Быстрый старт (5 минут)

### 1. Подготовка сервера
```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl start mongod && sudo systemctl enable mongod

# Установка PM2
sudo npm install -g pm2
```

### 2. Загрузка проекта
```bash
# Создание директории
sudo mkdir -p /var/www/technoline-store
sudo chown $USER:$USER /var/www/technoline-store
cd /var/www/technoline-store

# Клонирование проекта
git clone <your-repository-url> .

# Установка зависимостей
npm run install:all
```

### 3. Настройка окружения
```bash
# Backend
cd backend && cp env.example .env
nano .env
# Установить:
# PORT=5000
# MONGODB_URI=mongodb://localhost:27017/technoline-store
# JWT_SECRET=your-secret-key
# NODE_ENV=production

# Frontend
cd ../frontend && cp env.example .env.local
nano .env.local
# Установить:
# NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Admin
cd ../admin && cp env.example .env
nano .env
# Установить:
# VITE_API_URL=http://localhost:5000/api
```

### 4. Сборка и запуск
```bash
# Сборка всех частей
cd /var/www/technoline-store
npm run build

# Создание PM2 конфигурации
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'technoline-backend',
      cwd: '/var/www/technoline-store/backend',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      env: { NODE_ENV: 'production', PORT: 5000 }
    },
    {
      name: 'technoline-frontend',
      cwd: '/var/www/technoline-store/frontend',
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      env: { NODE_ENV: 'production', PORT: 3000 }
    }
  ]
};
EOF

# Запуск
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. Проверка
```bash
# Статус приложений
pm2 status

# Проверка портов
curl http://localhost:5000/api/health
curl http://localhost:3000
```

## 🌐 Настройка домена (опционально)

### 1. Установка Nginx
```bash
sudo apt install -y nginx
```

### 2. Конфигурация Nginx
```bash
sudo nano /etc/nginx/sites-available/technoline
```

Содержимое:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. Активация
```bash
sudo ln -s /etc/nginx/sites-available/technoline /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```

## 🔧 Полезные команды

```bash
# Перезапуск приложений
pm2 restart all

# Просмотр логов
pm2 logs

# Обновление проекта
cd /var/www/technoline-store
git pull
npm run install:all
npm run build
pm2 restart all

# Создание администратора
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123","firstName":"Admin","lastName":"User","role":"admin"}'
```

## 📊 Мониторинг

```bash
# Статус всех сервисов
pm2 status
sudo systemctl status mongod
sudo systemctl status nginx

# Использование ресурсов
pm2 monit
htop
```

## 🎯 Готово!

Ваш проект теперь доступен:
- **Магазин**: http://localhost:3000
- **API**: http://localhost:5000/api
- **Админ-панель**: http://localhost:3200

Для продакшена настройте домен и SSL сертификаты. 