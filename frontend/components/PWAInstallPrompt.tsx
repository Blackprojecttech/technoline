'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Проверяем, запущено ли приложение как PWA
    const checkIfPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      const isInWebAppiOS = window.matchMedia('(display-mode: standalone)').matches;
      
      return isStandalone || isIOSStandalone || isInWebAppiOS;
    };

    // Проверяем, мобильное ли устройство
    const isMobile = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
             window.matchMedia('(max-width: 768px)').matches;
    };

    // Не показываем PWA промпт на десктопе
    if (!isMobile()) {
      return;
    }

    setIsInstalled(checkIfPWA());

    // Обработчик события beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Показываем промпт через небольшую задержку
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 3000);
    };

    // Обработчик установки PWA
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      console.log('✅ PWA установлено!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ Пользователь согласился установить PWA');
      } else {
        console.log('❌ Пользователь отклонил установку PWA');
      }
      
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error('Ошибка при установке PWA:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Не показываем снова в течение сессии
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Не показываем, если уже установлено или было отклонено
  if (isInstalled || 
      !showInstallPrompt || 
      !deferredPrompt || 
      sessionStorage.getItem('pwa-install-dismissed')) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          {/* Иконка приложения */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          {/* Содержимое */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Установить TechnoLine
            </h3>
            <p className="text-xs text-gray-600 mb-3">
              Добавьте наше приложение на главный экран для быстрого доступа и лучшего опыта покупок
            </p>

            {/* Кнопки */}
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 px-3 rounded-md transition-colors duration-200"
              >
                📱 Установить
              </button>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium py-2 px-3 rounded-md transition-colors duration-200"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Преимущества */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              ⚡ Быстрая загрузка
            </span>
            <span className="flex items-center gap-1">
              📱 Как нативное приложение
            </span>
            <span className="flex items-center gap-1">
              🔔 Уведомления
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 