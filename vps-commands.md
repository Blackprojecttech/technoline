# Команды для управления платформой TechnoLine на VPS

## 🔗 ПОДКЛЮЧЕНИЕ К VPS
ssh root@62.60.178.146

## 🚀 ЗАПУСК ПЛАТФОРМЫ

# Запуск всех сервисов по порядку:
systemctl start mongodb
systemctl start technohub-backend
systemctl start technohub-frontend
systemctl start technohub-admin
systemctl start nginx

# Запуск одной командой:
systemctl start mongodb technohub-backend technohub-frontend technohub-admin nginx

# Запуск через SSH одной командой:
ssh root@62.60.178.146 "systemctl start mongodb technohub-backend technohub-frontend technohub-admin nginx"

## ⏹️ ОСТАНОВКА ПЛАТФОРМЫ

# Остановка всех сервисов по порядку:
systemctl stop nginx
systemctl stop technohub-admin
systemctl stop technohub-frontend
systemctl stop technohub-backend
systemctl stop mongodb

# Остановка одной командой:
systemctl stop technohub-backend technohub-frontend technohub-admin nginx

# Остановка через SSH одной командой:
ssh root@62.60.178.146 "systemctl stop technohub-backend technohub-frontend technohub-admin nginx"

## 🔄 ПЕРЕЗАПУСК ПЛАТФОРМЫ

# Перезапуск всех сервисов:
systemctl restart mongodb
systemctl restart technohub-backend
systemctl restart technohub-frontend
systemctl restart technohub-admin
systemctl restart nginx

# Перезапуск одной командой:
systemctl restart technohub-backend technohub-frontend technohub-admin nginx

# Перезапуск через SSH одной командой:
ssh root@62.60.178.146 "systemctl restart technohub-backend technohub-frontend technohub-admin nginx"

## 📊 ПРОВЕРКА СТАТУСА

# Проверка статуса всех сервисов:
systemctl status technohub-backend technohub-frontend technohub-admin mongodb nginx

# Краткий статус:
systemctl is-active technohub-backend technohub-frontend technohub-admin mongodb nginx

# Проверка статуса через SSH:
ssh root@62.60.178.146 "systemctl is-active technohub-backend technohub-frontend technohub-admin mongodb nginx"

# Проверка портов:
netstat -tlnp | grep -E ":3000|:3001|:5002|:27017|:80|:443"

## 🔍 ПРОСМОТР ЛОГОВ

# Логи бэкенда:
journalctl -u technohub-backend -f

# Логи фронтенда:
journalctl -u technohub-frontend -f

# Логи админки:
journalctl -u technohub-admin -f

# Логи MongoDB:
journalctl -u mongodb -f

# Логи Nginx:
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

## 🔧 АВТОЗАПУСК

# Включить автозапуск при загрузке системы:
systemctl enable technohub-backend technohub-frontend technohub-admin mongodb nginx

# Отключить автозапуск:
systemctl disable technohub-backend technohub-frontend technohub-admin

# Включить автозапуск через SSH:
ssh root@62.60.178.146 "systemctl enable technohub-backend technohub-frontend technohub-admin mongodb nginx"

## 🌐 ПРОВЕРКА САЙТА

# Проверка основного сайта:
curl -I https://technohubstore.net

# Проверка админки:
curl -I https://admin.technohubstore.net

## 💾 УПРАВЛЕНИЕ БАЗОЙ ДАННЫХ

# Подключение к MongoDB:
docker exec -it mongodb mongosh

# Просмотр баз данных:
docker exec mongodb mongosh --eval "show dbs"

# Бэкап базы данных:
docker exec mongodb mongodump --db technoline-store --out /data/backup/$(date +%Y%m%d)

## 📁 ПУТИ К ФАЙЛАМ

# Фронтенд: /var/www/technohub/frontend/
# Админка: /var/www/technohub/admin/
# Бэкенд: /var/www/technohub/backend/
# Логи: /var/log/nginx/
# Конфиг Nginx: /etc/nginx/sites-available/technohub

## 🚨 ЭКСТРЕННЫЕ КОМАНДЫ

# Полная остановка всего:
ssh root@62.60.178.146 "systemctl stop technohub-backend technohub-frontend technohub-admin nginx && docker stop mongodb"

# Полный запуск всего:
ssh root@62.60.178.146 "docker start mongodb && sleep 5 && systemctl start technohub-backend technohub-frontend technohub-admin nginx"

# Перезагрузка VPS:
ssh root@62.60.178.146 "reboot"

## 📝 ПОРЯДОК ДЕЙСТВИЙ

# Правильный порядок запуска:
# 1. MongoDB (база данных)
# 2. Backend (API)
# 3. Frontend (сайт)
# 4. Admin (админка)
# 5. Nginx (веб-сервер)

# Правильный порядок остановки:
# 1. Nginx
# 2. Admin
# 3. Frontend
# 4. Backend
# 5. MongoDB (можно оставить работать)

## 🔐 БЕЗОПАСНОСТЬ

# Для подключения потребуется:
# - SSH ключ или пароль от VPS
# - IP адрес: 62.60.178.146
# - Пользователь: root

# Рекомендуется настроить SSH ключи вместо пароля:
# ssh-keygen -t rsa -b 4096
# ssh-copy-id root@62.60.178.146 