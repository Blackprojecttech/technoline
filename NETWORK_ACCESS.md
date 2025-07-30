# 🌐 Доступ к платформе в локальной сети

Эта инструкция поможет настроить доступ к TechnoLine Store из локальной сети, чтобы другие пользователи могли открыть платформу с любых устройств в той же сети.

## 🚀 Быстрый запуск

### 1. Запуск с помощью скрипта (рекомендуется)

```bash
# Дайте права на выполнение скрипта
chmod +x start-local-network.sh

# Запустите скрипт
./start-local-network.sh
```

Скрипт автоматически:
- Определит ваш IP-адрес в локальной сети
- Настроит все необходимые переменные окружения
- Запустит все сервисы с правильными настройками
- Покажет адреса для доступа

### 2. Ручная настройка

Если скрипт не работает, можете настроить вручную:

#### Шаг 1: Определите ваш IP-адрес

```bash
# macOS
ipconfig getifaddr en0

# Linux
hostname -I | awk '{print $1}'

# Windows (в PowerShell)
(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi").IPAddress
```

#### Шаг 2: Настройте переменные окружения

**Backend (.env):**
```env
PORT=5002
MONGODB_URI=mongodb://localhost:27017/technoline-store
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
FRONTEND_URL=http://ВАШ_IP:3100
ADMIN_URL=http://ВАШ_IP:3200
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://ВАШ_IP:5002/api
```

**Admin (.env):**
```env
VITE_API_URL=http://ВАШ_IP:5002/api
```

#### Шаг 3: Запустите сервисы

```bash
# Backend
cd backend
npm run dev

# Frontend (в новом терминале)
cd frontend
npm run dev -- --hostname 0.0.0.0 --port 3100

# Admin (в новом терминале)
cd admin
npm run dev -- --host 0.0.0.0 --port 3200
```

## 📱 Доступ с других устройств

После запуска платформа будет доступна по следующим адресам:

- **🛒 Интернет-магазин:** `http://ВАШ_IP:3100`
- **⚙️ Админ-панель:** `http://ВАШ_IP:3200`
- **🔌 API Backend:** `http://ВАШ_IP:5002`

### Примеры адресов:
Если ваш IP-адрес `192.168.1.100`, то:
- Магазин: http://192.168.1.100:3100
- Админка: http://192.168.1.100:3200

## 🔧 Решение проблем

### Проблема: Не удается подключиться с других устройств

**Возможные причины и решения:**

1. **Брандмауэр блокирует подключения**
   ```bash
   # macOS - разрешить входящие подключения
   sudo pfctl -d  # временно отключить firewall для теста
   
   # Linux - открыть порты
   sudo ufw allow 3100
   sudo ufw allow 3200
   sudo ufw allow 5002
   
   # Windows - добавить правила в Windows Defender
   # Откройте "Дополнительные параметры брандмауэра Windows"
   # Создайте правила для портов 3100, 3200, 5002
   ```

2. **Неправильный IP-адрес**
   ```bash
   # Проверьте все сетевые интерфейсы
   ifconfig  # macOS/Linux
   ipconfig  # Windows
   
   # Используйте IP-адрес активного сетевого интерфейса
   ```

3. **Порты уже заняты**
   ```bash
   # Проверьте, какие порты используются
   lsof -i :3100  # macOS/Linux
   netstat -an | grep :3100  # Windows
   ```

### Проблема: CORS ошибки

Если возникают CORS ошибки, убедитесь, что в `backend/src/index.ts` правильно настроены разрешенные домены:

```typescript
cors: {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // Локальная сеть
    /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,   // Локальная сеть
    /^http:\/\/172\.\d+\.\d+\.\d+:\d+$/,  // Локальная сеть
  ],
  credentials: true
}
```

### Проблема: База данных недоступна

MongoDB должна быть запущена локально:

```bash
# Проверьте статус MongoDB
brew services list | grep mongodb  # macOS
sudo systemctl status mongodb      # Linux
net start MongoDB                  # Windows

# Запустите MongoDB если не запущена
brew services start mongodb-community  # macOS
sudo systemctl start mongodb           # Linux
net start MongoDB                      # Windows
```

## 🔒 Безопасность

⚠️ **Важно:** Этот способ предназначен только для разработки в доверенной локальной сети.

Для продакшена:
- Используйте HTTPS
- Настройте правильную аутентификацию
- Ограничьте доступ к админ-панели
- Используйте переменные окружения для секретов

## 📞 Поддержка

Если у вас возникли проблемы:

1. Проверьте логи серверов в терминале
2. Убедитесь, что все зависимости установлены: `npm run install:all`
3. Перезапустите все сервисы
4. Проверьте настройки сети и брандмауэра

---

**Совет:** Сохраните IP-адреса в закладки браузера для удобного доступа! 