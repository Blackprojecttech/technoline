# 🚀 Развертывание TechnoLine Store на сервер

## 📋 Требования к серверу

### Минимальные требования:
- **ОС**: Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- **RAM**: 2GB (рекомендуется 4GB+)
- **CPU**: 2 ядра+
- **Диск**: 20GB+ свободного места
- **Порты**: 80, 443, 3000, 5000, 27017

## 🛠 Подготовка сервера

### 1. Обновление системы
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Установка Node.js и npm
```bash
# Установка Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверка версии
node --version
npm --version
```

### 3. Установка MongoDB
```bash
# Импорт ключа MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Добавление репозитория MongoDB
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Установка MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Запуск и включение MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Проверка статуса
sudo systemctl status mongod
```

### 4. Установка PM2 (менеджер процессов)
```bash
sudo npm install -g pm2
```

### 5. Установка Nginx (веб-сервер)
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 📁 Загрузка проекта на сервер

### 1. Клонирование репозитория
```bash
# Создание директории для проекта
sudo mkdir -p /var/www/technoline-store
sudo chown $USER:$USER /var/www/technoline-store
cd /var/www/technoline-store

# Клонирование проекта (замените на ваш репозиторий)
git clone <your-repository-url> .
```

### 2. Установка зависимостей
```bash
# Установка всех зависимостей
npm run install:all
```

## ⚙️ Настройка переменных окружения

### 1. Backend (.env)
```bash
cd backend
cp env.example .env
nano .env
```

Содержимое `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/technoline-store
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
ADMIN_URL=https://admin.your-domain.com
```

### 2. Frontend (.env.local)
```bash
cd frontend
cp env.example .env.local
nano .env.local
```

Содержимое `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

### 3. Admin (.env)
```bash
cd admin
cp env.example .env
nano .env
```

Содержимое `admin/.env`:
```env
VITE_API_URL=https://api.your-domain.com
```

## 🏗️ Сборка проекта

### 1. Сборка Backend
```bash
cd /var/www/technoline-store/backend
npm run build
```

### 2. Сборка Frontend
```bash
cd /var/www/technoline-store/frontend
npm run build
```

### 3. Сборка Admin
```bash
cd /var/www/technoline-store/admin
npm run build
```

## 🚀 Запуск с PM2

### 1. Создание конфигурации PM2
```bash
cd /var/www/technoline-store
nano ecosystem.config.js
```

Содержимое `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'technoline-backend',
      cwd: '/var/www/technoline-store/backend',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    },
    {
      name: 'technoline-frontend',
      cwd: '/var/www/technoline-store/frontend',
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
```

### 2. Запуск приложений
```bash
cd /var/www/technoline-store
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🌐 Настройка Nginx

### 1. Создание конфигурации для API
```bash
sudo nano /etc/nginx/sites-available/technoline-api
```

Содержимое:
```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. Создание конфигурации для Frontend
```bash
sudo nano /etc/nginx/sites-available/technoline-frontend
```

Содержимое:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Создание конфигурации для Admin
```bash
sudo nano /etc/nginx/sites-available/technoline-admin
```

Содержимое:
```nginx
server {
    listen 80;
    server_name admin.your-domain.com;

    root /var/www/technoline-store/admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. Активация сайтов
```bash
sudo ln -s /etc/nginx/sites-available/technoline-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/technoline-frontend /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/technoline-admin /etc/nginx/sites-enabled/

# Удаление дефолтного сайта
sudo rm /etc/nginx/sites-enabled/default

# Проверка конфигурации
sudo nginx -t

# Перезапуск Nginx
sudo systemctl restart nginx
```

## 🔒 Настройка SSL (HTTPS)

### 1. Установка Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Получение SSL сертификатов
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
sudo certbot --nginx -d api.your-domain.com
sudo certbot --nginx -d admin.your-domain.com
```

### 3. Автоматическое обновление
```bash
sudo crontab -e
# Добавить строку:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Мониторинг и логи

### 1. Просмотр статуса PM2
```bash
pm2 status
pm2 logs
```

### 2. Просмотр логов Nginx
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 3. Просмотр логов MongoDB
```bash
sudo tail -f /var/log/mongodb/mongod.log
```

## 🔧 Полезные команды

### Управление PM2
```bash
# Перезапуск приложений
pm2 restart all

# Остановка приложений
pm2 stop all

# Просмотр логов
pm2 logs technoline-backend
pm2 logs technoline-frontend

# Мониторинг ресурсов
pm2 monit
```

### Обновление проекта
```bash
cd /var/www/technoline-store
git pull origin main
npm run install:all
npm run build
pm2 restart all
```

### Резервное копирование MongoDB
```bash
# Создание бэкапа
mongodump --db technoline-store --out /var/backups/mongodb/$(date +%Y%m%d)

# Восстановление
mongorestore --db technoline-store /var/backups/mongodb/20240101/technoline-store/
```

## 🚨 Безопасность

### 1. Настройка файрвола
```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2. Обновление системы
```bash
# Автоматические обновления
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 3. Настройка MongoDB безопасности
```bash
sudo nano /etc/mongod.conf
# Добавить:
# security:
#   authorization: enabled
```

## 📞 Поддержка

### Полезные команды для диагностики:
```bash
# Проверка статуса сервисов
sudo systemctl status nginx
sudo systemctl status mongod
pm2 status

# Проверка портов
sudo netstat -tlnp

# Проверка дискового пространства
df -h

# Проверка использования памяти
free -h
```

### Логи для отладки:
- **Nginx**: `/var/log/nginx/`
- **MongoDB**: `/var/log/mongodb/`
- **PM2**: `pm2 logs`
- **Приложения**: `/var/www/technoline-store/logs/`

## 🎯 Готово!

После выполнения всех шагов ваш проект будет доступен по адресам:
- **Магазин**: https://your-domain.com
- **API**: https://api.your-domain.com
- **Админ-панель**: https://admin.your-domain.com

Не забудьте:
1. Заменить `your-domain.com` на ваш реальный домен
2. Изменить `JWT_SECRET` на уникальный ключ
3. Настроить DNS записи для всех поддоменов
4. Создать первого администратора через API 