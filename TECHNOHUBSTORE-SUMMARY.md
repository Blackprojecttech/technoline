# 🎯 TechnoHub Store - Готово к развертыванию!

## ✅ Что настроено для домена `technohubstore.net`

### 📁 Созданные файлы конфигурации:
- ✅ `nginx.conf` - Nginx конфигурация с SSL и поддоменами
- ✅ `deploy.sh` - Автоматический скрипт развертывания
- ✅ `setup-ssl.sh` - Скрипт настройки SSL сертификатов
- ✅ `setup-technohubstore.sh` - Быстрая настройка .env файлов
- ✅ `backend/.env` - Конфигурация бэкенда
- ✅ `frontend/.env.local` - Конфигурация фронтенда
- ✅ `admin/.env` - Конфигурация админки

### 🌐 Настроенные домены:
- **Основной сайт**: `technohubstore.net` + `www.technohubstore.net`
- **Админ панель**: `admin.technohubstore.net`
- **API**: `technohubstore.net/api`

## 🚀 Инструкция по развертыванию

### 1. Настройка DNS (у вашего провайдера)
```
A    technohubstore.net         -> IP_ВАШЕГО_СЕРВЕРА
A    www.technohubstore.net     -> IP_ВАШЕГО_СЕРВЕРА
A    admin.technohubstore.net   -> IP_ВАШЕГО_СЕРВЕРА
```

### 2. Локальная подготовка (уже выполнено)
```bash
✅ ./setup-technohubstore.sh  # Уже запущен
```

### 3. Редактирование конфигураций
Отредактируйте файлы и заполните реальными значениями:

#### `backend/.env` - ОБЯЗАТЕЛЬНО:
```bash
# Сгенерируйте новые секреты!
JWT_SECRET=ваш_новый_jwt_секрет
ADMIN_JWT_SECRET=ваш_новый_admin_секрет

# MongoDB
MONGODB_URI=mongodb://localhost:27017/technohub_prod
# или MongoDB Atlas:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/technohub_prod

# Email для уведомлений
SMTP_USER=ваш-email@gmail.com
SMTP_PASS=ваш-пароль-приложения
```

#### `frontend/.env.local` - ОПЦИОНАЛЬНО:
```bash
# Google Maps API (для карт)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=ваш_google_maps_ключ

# Аналитика
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=ваш_ga_id
```

### 4. Развертывание на сервере
```bash
# Клонирование на сервер
git clone https://github.com/your-username/techno-line.stor.git
cd techno-line.stor

# Копирование локальных .env файлов на сервер
scp backend/.env user@server:/path/to/project/backend/
scp frontend/.env.local user@server:/path/to/project/frontend/
scp admin/.env user@server:/path/to/project/admin/

# Автоматическое развертывание
./deploy.sh technohubstore.net

# Настройка SSL
./setup-ssl.sh technohubstore.net admin@technohubstore.net
```

## 🔑 Что нужно получить/настроить

### Обязательные:
- [ ] **VPS/Сервер** (Ubuntu 20.04+, 2GB RAM, Node.js, MongoDB, Nginx)
- [ ] **JWT секреты** (сгенерировать: `openssl rand -base64 32`)
- [ ] **MongoDB** (локальный или MongoDB Atlas)
- [ ] **Email SMTP** (Gmail App Password или другой провайдер)

### Опциональные:
- [ ] **Google Maps API** (для карт доставки)
- [ ] **Dadata API** (для автодополнения адресов)
- [ ] **СДЭК API** (для доставки)
- [ ] **Сбербанк API** (для платежей)
- [ ] **Google Analytics** (для аналитики)

## 📞 Результат после развертывания

Ваши сайты будут доступны по адресам:
- 🛍️ **Интернет-магазин**: https://technohubstore.net
- ⚙️ **Админ панель**: https://admin.technohubstore.net
- 🔗 **API**: https://technohubstore.net/api

## 🆘 Поддержка

Если нужна помощь с развертыванием:
1. Проверьте документацию: `DEPLOYMENT.md`
2. Используйте краткую инструкцию: `README-technohubstore.md`
3. Проверьте логи: `sudo journalctl -u techno-line-backend -f`

---

## 🎉 Готово!

Все файлы настроены для домена `technohubstore.net`. 
Теперь нужно только:
1. Настроить DNS записи
2. Отредактировать .env файлы с реальными данными  
3. Запустить развертывание на сервере

**Удачи с запуском TechnoHub Store! 🚀** 