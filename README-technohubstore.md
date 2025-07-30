# 🚀 TechnoHub Store - Развертывание на technohubstore.net

## 🎯 Быстрый старт

### 1. Локальная настройка конфигураций
```bash
# Настройка всех .env файлов для домена technohubstore.net
./setup-technohubstore.sh
```

### 2. Редактирование конфигураций
Отредактируйте созданные файлы и заполните реальными значениями:

#### `backend/.env`
```bash
# Сгенерируйте секретные ключи
JWT_SECRET=$(openssl rand -base64 32)
ADMIN_JWT_SECRET=$(openssl rand -base64 32)

# MongoDB (локальный или Atlas)
MONGODB_URI=mongodb://localhost:27017/technohub_prod
# или
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/technohub_prod

# Email для уведомлений
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# API ключи (получите на соответствующих сайтах)
DADATA_API_KEY=your_dadata_key
CDEK_CLIENT_ID=your_cdek_id
CDEK_CLIENT_SECRET=your_cdek_secret
```

#### `frontend/.env.local`
```bash
# Google Maps (необязательно)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key

# Аналитика (необязательно)
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=your_ga_id
NEXT_PUBLIC_YANDEX_METRIKA_ID=your_metrika_id
```

### 3. DNS настройки
Добавьте в вашем DNS провайдере:
```
A    technohubstore.net         -> IP_ВАШЕГО_СЕРВЕРА
A    www.technohubstore.net     -> IP_ВАШЕГО_СЕРВЕРА  
A    admin.technohubstore.net   -> IP_ВАШЕГО_СЕРВЕРА
```

### 4. Развертывание на сервере
```bash
# На сервере (Ubuntu/Debian)
git clone https://github.com/your-username/techno-line.stor.git
cd techno-line.stor

# Автоматическое развертывание
./deploy.sh technohubstore.net

# Настройка SSL
./setup-ssl.sh technohubstore.net admin@technohubstore.net
```

## 🌐 Результат

После развертывания ваши сайты будут доступны:

- **🛍️ Интернет-магазин**: https://technohubstore.net
- **⚙️ Админ панель**: https://admin.technohubstore.net
- **🔗 API**: https://technohubstore.net/api

## 📋 Требования к серверу

- **ОС**: Ubuntu 20.04+ / Debian 11+
- **RAM**: 2GB минимум (4GB рекомендуется)
- **CPU**: 2 ядра минимум
- **Диск**: 20GB свободного места
- **Программы**: Node.js 18+, MongoDB 5.0+, Nginx 1.18+

## 🔧 Полезные команды

```bash
# Проверка статуса бэкенда
sudo systemctl status techno-line-backend

# Просмотр логов
sudo journalctl -u techno-line-backend -f

# Перезапуск сервисов
sudo systemctl restart techno-line-backend
sudo systemctl reload nginx

# Обновление сертификатов
sudo certbot renew

# Обновление приложения
git pull origin main
./deploy.sh technohubstore.net
```

## 🆘 Поддержка

Если возникли проблемы:
1. Проверьте логи: `sudo journalctl -u techno-line-backend -f`
2. Проверьте Nginx: `sudo nginx -t`
3. Проверьте DNS: `nslookup technohubstore.net`
4. Проверьте SSL: `sudo certbot certificates`

## 📞 Контакты

- **Email**: admin@technohubstore.net
- **Техподдержка**: support@technohubstore.net

---

**🎉 Добро пожаловать в TechnoHub Store!** 