# 🌐 Настройка DNS через Cloudflare для technohubstore.net

## 📋 DNS записи для настройки

### Основные записи (с прокси):
```
Тип   Имя      Значение           Прокси    TTL
A     @        91.232.39.213      ☁️ Да     Auto
A     www      91.232.39.213      ☁️ Да     Auto  
A     admin    91.232.39.213      ☁️ Да     Auto
```

### Почтовые записи (без прокси):
```
Тип   Имя      Значение                              Прокси    TTL
A     mail     91.232.39.213                        ⚪ Нет     Auto
MX    @        mail.technohubstore.net               -         Auto
TXT   @        "v=spf1 mx ~all"                     -         Auto
TXT   _dmarc   "v=DMARC1; p=none; rua=mailto:admin@technohubstore.net" - Auto
```

## 🔧 Настройка в Cloudflare

### 1. Добавление домена:
1. Зайдите на cloudflare.com
2. Add a Site → введите `technohubstore.net`
3. Выберите Free план
4. Cloudflare просканирует существующие записи

### 2. Настройка DNS:
1. Перейдите в DNS → Records
2. Добавьте записи из таблицы выше
3. **Важно**: mail запись должна быть серой (DNS only)

### 3. Изменение nameservers:
У вашего регистратора домена замените nameservers на:
```
adam.ns.cloudflare.com
rita.ns.cloudflare.com
```

### 4. SSL настройки:
1. SSL/TLS → Overview → Full (strict)
2. Edge Certificates → Always Use HTTPS: On

## ✅ Преимущества Cloudflare:
- 🛡️ Защита от DDoS атак
- 🚀 CDN и кэширование
- 🔒 Бесплатный SSL сертификат
- 📊 Аналитика трафика
- 🔧 Простая настройка

## ⚠️ Важные моменты:
- Почтовый сервер (mail) должен быть без прокси
- Первая настройка может занять до 24 часов
- Проверьте работу после полной активации

## 🧪 Проверка настройки:
```bash
# Проверка основного сайта
nslookup technohubstore.net

# Проверка почтового сервера  
nslookup mail.technohubstore.net
dig MX technohubstore.net
``` 