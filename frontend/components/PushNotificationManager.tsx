'use client';

import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function PushNotificationManager() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    requestPermission,
    unsubscribe,
  } = usePushNotifications();

  // Проверяем iOS и PWA статус только на клиенте
  const [mounted, setMounted] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    setIsStandalone((window.navigator as any).standalone === true || 
                    window.matchMedia('(display-mode: standalone)').matches);
  }, []);

  // Проверяем, мобильное ли устройство
  const isMobile = mounted && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

  // Не рендерим на сервере
  if (!mounted) {
    return null;
  }

  if (!isSupported) {
    // Специальное сообщение для iOS Safari не в PWA режиме
    if (isIOS && !isStandalone) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 text-red-700 mb-2">
            <BellOff className="w-5 h-5" />
            <span className="text-sm font-medium">Нужен режим приложения для iPhone</span>
          </div>
          <div className="text-xs text-red-600 space-y-2">
            <p><strong>Вы сейчас в обычном Safari, но нужно открыть как приложение:</strong></p>
            <ol className="list-decimal list-inside ml-2 space-y-1">
              <li>Закройте эту вкладку Safari</li>
              <li>Найдите иконку приложения на домашнем экране</li>
              <li>Нажмите на иконку приложения (не на Safari!)</li>
              <li>Приложение откроется без адресной строки Safari</li>
              <li>Push-уведомления автоматически включатся</li>
            </ol>
            <div className="mt-2 p-2 bg-red-100 rounded text-xs">
              💡 <strong>Подсказка:</strong> Если адресная строка Safari видна - вы НЕ в режиме приложения
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center space-x-2 text-blue-700 mb-3">
          <Bell className="w-5 h-5" />
          <span className="text-sm font-medium">Установите приложение на iPhone для уведомлений</span>
        </div>
        <div className="text-xs text-blue-600 space-y-2">
          <p className="font-medium">📱 Как установить приложение:</p>
          <ol className="list-decimal list-inside ml-2 space-y-1">
            <li>Откройте этот сайт в Safari на iPhone</li>
            <li>Нажмите кнопку <strong>"Поделиться"</strong> (квадрат со стрелкой вверх)</li>
            <li>Выберите <strong>"На экран Домой"</strong></li>
            <li>Нажмите <strong>"Добавить"</strong> - приложение появится на экране</li>
            <li>Откройте приложение через <strong>иконку с домашнего экрана</strong></li>
            <li>Push-уведомления автоматически включатся!</li>
          </ol>
          <div className="mt-3 p-2 bg-blue-100 rounded text-xs">
            ✨ <strong>В приложении:</strong> уведомления о заказах, акциях и новостях будут приходить прямо на iPhone!
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Bell className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Push-уведомления</h3>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          isSubscribed 
            ? 'bg-green-100 text-green-700' 
            : permission === 'granted' 
            ? 'bg-yellow-100 text-yellow-700'
            : 'bg-gray-100 text-gray-700'
        }`}>
          {isSubscribed ? 'Включены' : permission === 'granted' ? 'Разрешены' : 'Отключены'}
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Получайте уведомления о новых заказах, акциях и важных обновлениях прямо на ваш телефон.
      </p>

      {/* Показываем разную информацию в зависимости от PWA статуса */}
      {isStandalone ? (
        <div className="space-y-3">
          {permission === 'default' && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                ⏳ <strong>Автоматически запрашиваем разрешение...</strong><br />
                Через секунду появится запрос iOS на разрешение уведомлений.
              </p>
            </div>
          )}
          
          {permission === 'denied' && (
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-800">
                ❌ <strong>Уведомления заблокированы</strong><br />
                Включите их в настройках iPhone: Настройки → Safari → Уведомления → Разрешить
              </p>
            </div>
          )}
          
          {permission === 'granted' && !isSubscribed && (
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                🔄 <strong>Подключаемся к уведомлениям...</strong><br />
                Автоматически настраиваем push-уведомления.
              </p>
            </div>
          )}
          
          {permission === 'granted' && isSubscribed && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                ✅ <strong>Уведомления активны!</strong><br />
                Вы будете получать push-уведомления о заказах и новостях.
              </p>
              <button
                onClick={unsubscribe}
                disabled={isLoading}
                className={`mt-3 w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <BellOff className="w-4 h-4" />
                <span>{isLoading ? 'Отписка...' : 'Отключить уведомления'}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Для мобильных устройств показываем инструкцию по установке приложения */}
          {isMobile ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 text-blue-700 mb-3">
                <Bell className="w-5 h-5" />
                <span className="text-sm font-medium">Установите приложение на iPhone для уведомлений</span>
              </div>
              <div className="text-xs text-blue-600 space-y-2">
                <p className="font-medium">📱 Как установить приложение:</p>
                <ol className="list-decimal list-inside ml-2 space-y-1">
                  <li>Откройте этот сайт в Safari на iPhone</li>
                  <li>Нажмите кнопку <strong>"Поделиться"</strong> (квадрат со стрелкой вверх)</li>
                  <li>Выберите <strong>"На экран Домой"</strong></li>
                  <li>Нажмите <strong>"Добавить"</strong> - приложение появится на экране</li>
                  <li>Откройте приложение через <strong>иконку с домашнего экрана</strong></li>
                  <li>Push-уведомления автоматически включатся!</li>
                </ol>
                <div className="mt-3 p-2 bg-blue-100 rounded text-xs">
                  ✨ <strong>В приложении:</strong> уведомления о заказах, акциях и новостях будут приходить прямо на iPhone!
                </div>
              </div>
            </div>
          ) : (
            /* Для десктоп показываем обычные кнопки */
            <>
              {!isSubscribed && permission !== 'granted' && (
                <button
                  onClick={requestPermission}
                  disabled={isLoading}
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <BellRing className="w-4 h-4" />
                  <span>{isLoading ? 'Настройка...' : 'Разрешить уведомления'}</span>
                </button>
              )}

              {!isSubscribed && permission === 'granted' && (
                <button
                  onClick={requestPermission}
                  disabled={isLoading}
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  <span>{isLoading ? 'Подписка...' : 'Подписаться на уведомления'}</span>
                </button>
              )}

              {isSubscribed && (
                <button
                  onClick={unsubscribe}
                  disabled={isLoading}
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <BellOff className="w-4 h-4" />
                  <span>{isLoading ? 'Отписка...' : 'Отключить уведомления'}</span>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Информационные заметки только для десктопа */}
      {!isStandalone && !isMobile && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">📱 Как установить приложение на iPhone:</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Нажмите "Поделиться" → "На экран Домой"</li>
            <li>• Откройте приложение через иконку с домашнего экрана</li>
            <li>• Уведомления автоматически включатся в режиме приложения</li>
          </ul>
        </div>
      )}
    </motion.div>
  );
} 