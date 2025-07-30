@echo off
echo 🌐 Настройка доступа к платформе в локальной сети (Windows)
echo.

:: Получаем IP-адрес машины в локальной сети
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /c:"IPv4 Address"') do set LOCAL_IP=%%i
set LOCAL_IP=%LOCAL_IP: =%

if "%LOCAL_IP%"=="" (
    echo ❌ Не удалось определить IP-адрес в локальной сети
    echo Попробуйте запустить: ipconfig | findstr "IPv4 Address"
    pause
    exit /b 1
)

echo 📍 Ваш IP-адрес в локальной сети: %LOCAL_IP%
echo.

echo ⚙️ Настройка переменных окружения...

:: Backend env
(
echo PORT=5002
echo MONGODB_URI=mongodb://localhost:27017/technoline-store
echo JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
echo NODE_ENV=development
echo FRONTEND_URL=http://%LOCAL_IP%:3100
echo ADMIN_URL=http://%LOCAL_IP%:3200
) > backend\.env.local-network

:: Frontend env
(
echo NEXT_PUBLIC_API_URL=http://%LOCAL_IP%:5002/api
) > frontend\.env.local-network

:: Admin env
(
echo VITE_API_URL=http://%LOCAL_IP%:5002/api
) > admin\.env.local-network

echo ✅ Переменные окружения настроены
echo.

echo 🚀 Запуск серверов для локальной сети...
echo.

:: Останавливаем существующие процессы
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

:: Копируем env файлы
copy backend\.env.local-network backend\.env >nul
copy frontend\.env.local-network frontend\.env.local >nul
copy admin\.env.local-network admin\.env >nul

echo 🔧 Запуск Backend API...
start "Backend" cmd /c "cd backend && npm run dev"

echo 🔧 Запуск Frontend...
start "Frontend" cmd /c "cd frontend && npm run dev -- --hostname 0.0.0.0 --port 3100"

echo 🔧 Запуск Admin панели...
start "Admin" cmd /c "cd admin && npm run dev -- --host 0.0.0.0 --port 3200"

echo.
echo ⏳ Ожидание запуска всех сервисов...
timeout /t 15 /nobreak >nul

echo.
echo 🌐 Доступ к платформе в локальной сети:
echo.
echo ┌─────────────────────────────────────────────────────────────┐
echo │                    АДРЕСА ДЛЯ ДОСТУПА                      │
echo ├─────────────────────────────────────────────────────────────┤
echo │ 🛒 Интернет-магазин:  http://%LOCAL_IP%:3100                │
echo │ ⚙️  Админ-панель:     http://%LOCAL_IP%:3200                │  
echo │ 🔌 API Backend:       http://%LOCAL_IP%:5002                │
echo ├─────────────────────────────────────────────────────────────┤
echo │ Локальный доступ также работает:                            │
echo │ 🛒 Магазин:           http://localhost:3100                 │
echo │ ⚙️  Админка:          http://localhost:3200                 │
echo └─────────────────────────────────────────────────────────────┘
echo.
echo 📱 Пользователи в локальной сети могут открыть эти адреса
echo    с любого устройства (компьютер, планшет, телефон)
echo.
echo 🔥 Для остановки всех сервисов закройте это окно или нажмите Ctrl+C
echo.

pause 