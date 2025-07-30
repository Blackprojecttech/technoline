# 🚀 Развертывание Techno-line.stor на вашем домене

Данное руководство поможет вам развернуть полную платформу Techno-line.stor на вашем собственном домене.

## 📋 Требования

### Сервер
- Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- Минимум 2GB RAM, 2 CPU cores
- 20GB свободного места на диске
- Root доступ

### Программное обеспечение
- Node.js 18+
- MongoDB 5.0+
- Nginx 1.18+
- PM2 или systemd для управления процессами

## 🔧 Пошаговое развертывание

### 1. Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Установка Nginx
sudo apt install -y nginx

# Запуск сервисов
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. Настройка DNS записей

Добавьте следующие DNS записи для домена technohubstore.net:

```
A    technohubstore.net         -> IP_ВАШЕГО_СЕРВЕРА
A    www.technohubstore.net     -> IP_ВАШЕГО_СЕРВЕРА
A    admin.technohubstore.net   -> IP_ВАШЕГО_СЕРВЕРА
```

### 3. Развертывание приложения

```bash
# Клонирование репозитория
git clone https://github.com/your-username/techno-line.stor.git
cd techno-line.stor

# Запуск скрипта развертывания
chmod +x deploy.sh
./deploy.sh technohubstore.net
```

### 4. Настройка SSL сертификатов

```bash
# Запуск скрипта настройки SSL
chmod +x setup-ssl.sh
./setup-ssl.sh technohubstore.net admin@technohubstore.net
```

### 5. Настройка переменных окружения

#### Бэкенд (`/var/www/techno-line/backend/.env`)
```bash
# Скопируйте конфигурацию
cp /var/www/techno-line/backend/env.production /var/www/techno-line/backend/.env

# Отредактируйте файл
sudo nano /var/www/techno-line/backend/.env
```

Замените следующие значения:
- `JWT_SECRET` на случайную строку (генерируйте с помощью `openssl rand -base64 32`)
- `ADMIN_JWT_SECRET` на другую случайную строку  
- `MONGODB_URI` на ваш MongoDB connection string
- Email настройки для уведомлений (SMTP_USER, SMTP_PASS)
- API ключи внешних сервисов (DADATA_API_KEY, CDEK_CLIENT_ID, etc.)
- Платежные системы (SBERBANK_USERNAME, SBERBANK_PASSWORD)

#### Фронтенд (`/var/www/techno-line/frontend/.env.local`)
```bash
cp /var/www/techno-line/frontend/env.production /var/www/techno-line/frontend/.env.local
sudo nano /var/www/techno-line/frontend/.env.local
```

#### Админка (`/var/www/techno-line/admin/.env`)
```bash
cp /var/www/techno-line/admin/env.production /var/www/techno-line/admin/.env
sudo nano /var/www/techno-line/admin/.env
```

### 6. Пересборка с новыми настройками

```bash
cd /var/www/techno-line

# Пересборка фронтенда
cd frontend
npm run build

# Пересборка админки
cd ../admin
npm run build

# Пересборка бэкенда
cd ../backend
npm run build

# Перезапуск службы бэкенда
sudo systemctl restart techno-line-backend
```

## 🔍 Проверка работоспособности

```bash
# Проверка статуса бэкенда
sudo systemctl status techno-line-backend

# Проверка логов
sudo journalctl -u techno-line-backend -f

# Проверка Nginx
sudo nginx -t
sudo systemctl status nginx

# Проверка SSL сертификатов
sudo certbot certificates
```

## 🌐 Доступ к приложению

После успешного развертывания ваша платформа будет доступна по адресам:

- **Основной сайт**: https://technohubstore.net
- **Админ панель**: https://admin.technohubstore.net
- **API**: https://technohubstore.net/api

## 📊 Мониторинг и обслуживание

### Логи
```bash
# Логи бэкенда
sudo journalctl -u techno-line-backend -f

# Логи Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Логи MongoDB
sudo tail -f /var/log/mongodb/mongod.log
```

### Резервное копирование
```bash
# Создание бэкапа MongoDB
mongodump --out /backup/mongodb/$(date +%Y%m%d_%H%M%S)

# Создание бэкапа файлов
tar -czf /backup/files/techno-line-$(date +%Y%m%d_%H%M%S).tar.gz /var/www/techno-line
```

### Обновление приложения
```bash
cd /var/www/techno-line
git pull origin main
./deploy.sh technohubstore.net
```

## 🔧 Настройка производительности

### Nginx оптимизация
Добавьте в `/etc/nginx/nginx.conf`:
```nginx
worker_processes auto;
worker_connections 1024;

gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
```

### MongoDB оптимизация
```bash
# Настройка индексов
mongo technoline_prod --eval "
db.products.createIndex({name: 'text', description: 'text'});
db.orders.createIndex({userId: 1, createdAt: -1});
db.users.createIndex({email: 1});
"
```

## 🆘 Решение проблем

### Бэкенд не запускается
```bash
# Проверка портов
sudo netstat -tlnp | grep :5002

# Проверка MongoDB
sudo systemctl status mongod

# Проверка переменных окружения
cd /var/www/techno-line/backend && node -e "require('dotenv').config(); console.log(process.env.MONGODB_URI)"
```

### Проблемы с SSL
```bash
# Обновление сертификатов
sudo certbot renew --dry-run

# Проверка конфигурации Nginx
sudo nginx -t
```

### Проблемы с доступом к файлам
```bash
# Исправление прав доступа
sudo chown -R www-data:www-data /var/www/techno-line
sudo chmod -R 755 /var/www/techno-line
```

## 📞 Поддержка

Если у вас возникли проблемы с развертыванием, создайте issue в репозитории GitHub или обратитесь к документации отдельных компонентов.

## 🔐 Безопасность

- Регулярно обновляйте систему и зависимости
- Используйте сильные пароли и JWT секреты
- Настройте firewall (ufw)
- Регулярно создавайте резервные копии
- Мониторьте логи на предмет подозрительной активности 