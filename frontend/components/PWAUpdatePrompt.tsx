'use client';

import { useState, useEffect } from 'react';

export default function PWAUpdatePrompt() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    // Проверяем, запущен ли сайт как PWA виджет
    const isPWAWidget = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      return isStandalone || isIOSStandalone;
    };

    // Показываем PWA обновления только в виджете Safari
    if (!isPWAWidget()) {
      return;
    }

    if ('serviceWorker' in navigator) {
      const handleServiceWorkerUpdate = (registration: ServiceWorkerRegistration) => {
        const worker = registration.waiting;
        if (worker) {
          setWaitingWorker(worker);
          setShowUpdatePrompt(true);
        }
      };

      // Проверяем обновления Service Worker
      navigator.serviceWorker.ready.then(registration => {
        // Слушаем обновления
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                handleServiceWorkerUpdate(registration);
              }
            });
          }
        });

        // Проверяем, есть ли уже ожидающий worker
        if (registration.waiting) {
          handleServiceWorkerUpdate(registration);
        }
      });

      // Слушаем сообщения от Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATED') {
          setShowUpdatePrompt(true);
        }
      });
    }
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      setShowUpdatePrompt(false);
      
      // Перезагружаем страницу после небольшой задержки
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
    // Не показываем снова в течение сессии
    sessionStorage.setItem('pwa-update-dismissed', 'true');
  };

  if (!showUpdatePrompt || sessionStorage.getItem('pwa-update-dismissed')) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          {/* Иконка обновления */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          </div>

          {/* Содержимое */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-green-900 mb-1">
              🎉 Доступно обновление!
            </h3>
            <p className="text-xs text-green-700 mb-3">
              Новая версия приложения готова к установке. Обновите для получения новых функций и улучшений.
            </p>

            {/* Кнопки */}
            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-2 px-3 rounded-md transition-colors duration-200"
              >
                🚀 Обновить сейчас
              </button>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium py-2 px-3 rounded-md transition-colors duration-200"
              >
                Позже
              </button>
            </div>
          </div>
        </div>

        {/* Новые функции */}
        <div className="mt-3 pt-3 border-t border-green-100">
          <div className="flex items-center gap-4 text-xs text-green-600">
            <span className="flex items-center gap-1">
              ⚡ Быстрее загрузка
            </span>
            <span className="flex items-center gap-1">
              🛠️ Исправления ошибок
            </span>
            <span className="flex items-center gap-1">
              ✨ Новые функции
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 