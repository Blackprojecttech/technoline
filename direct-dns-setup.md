# 🌐 Прямая настройка DNS для technohubstore.net (без CDN)

## 📋 DNS записи у регистратора домена

### Основные записи:
```
Тип   Имя      Значение           TTL
A     @        91.232.39.213      3600
A     www      91.232.39.213      3600  
A     admin    91.232.39.213      3600
A     mail     91.232.39.213      3600
```

### Почтовые записи:
```
Тип   Имя      Значение                              TTL
MX    @        mail.technohubstore.net               3600 (приоритет: 10)
TXT   @        "v=spf1 mx ~all"                     3600
TXT   _dmarc   "v=DMARC1; p=none; rua=mailto:admin@technohubstore.net" 3600
```

## 🔧 Где настраивать

### Популярные российские регистраторы:

#### **Reg.ru:**
1. Войдите в личный кабинет
2. Домены и DNS → выберите домен
3. DNS-записи → Добавить запись

#### **Nic.ru:**
1. Личный кабинет → Домены
2. Управление → DNS
3. Добавить записи

#### **Timeweb:**
1. Панель управления → Домены
2. DNS-записи → Редактировать

#### **Beget:**
1. Панель управления → Домены
2. DNS → Добавить запись

## ✅ Преимущества прямого подключения:
- 🚀 Нет блокировок в России
- 💰 Бесплатно
- 🔧 Простая настройка
- 📧 Полная поддержка почты

## ⚠️ Недостатки:
- Нет защиты от DDoS
- Нет CDN кэширования
- Нужно настраивать SSL самостоятельно

## 🔒 SSL сертификаты

Используйте Let's Encrypt (бесплатно):
```bash
# Автоматическая настройка SSL
./setup-ssl.sh technohubstore.net admin@technohubstore.net
```

## 🧪 Проверка настройки:
```bash
# Проверка DNS записей
nslookup technohubstore.net
nslookup www.technohubstore.net
nslookup admin.technohubstore.net
nslookup mail.technohubstore.net

# Проверка MX записи
dig MX technohubstore.net
``` 