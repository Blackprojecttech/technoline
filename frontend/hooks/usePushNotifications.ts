import { useState, useEffect } from 'react';

// Утилитарная функция для конвертации VAPID ключа
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Безопасное получение разрешения на уведомления
function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('🔍 getNotificationPermission: Notification API недоступен, возвращаем default');
    return 'default';
  }
  const permission = Notification.permission;
  console.log('🔍 getNotificationPermission: текущее разрешение', permission);
  return permission;
}

export interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    subscription: null,
  });

  const [isLoading, setIsLoading] = useState(false);

  // Проверяем поддержку push-уведомлений
  useEffect(() => {
    const checkSupport = async () => {
      console.log('🔍 Проверка поддержки push-уведомлений...');
      
      // Детальная проверка поддержки
      const hasServiceWorker = 'serviceWorker' in navigator;
      const hasPushManager = 'PushManager' in window;
      const hasNotification = 'Notification' in window;
             // В режиме разработки для локальной сети разрешаем HTTP
       const isDevelopment = process.env.NODE_ENV !== 'production';
       const isLocalNetwork = location.hostname.startsWith('192.168.') ||
                              location.hostname.startsWith('10.') ||
                              location.hostname.startsWith('172.') ||
                              location.hostname === 'localhost';
       
       const isSecureContext = window.isSecureContext || 
                               location.protocol === 'https:' || 
                               (isDevelopment && isLocalNetwork);
      
             console.log('📋 Проверка браузера:', {
         hasServiceWorker,
         hasPushManager,
         hasNotification,
         isSecureContext,
         isDevelopment,
         isLocalNetwork,
         protocol: location.protocol,
         hostname: location.hostname,
         userAgent: navigator.userAgent,
         standalone: (window.navigator as any).standalone,
         isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
         displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'
       });

             // Для iOS Safari PWA нужны дополнительные проверки
       const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
       const isStandalone = (window.navigator as any).standalone === true || 
                           window.matchMedia('(display-mode: standalone)').matches;
       
       let isSupported = hasServiceWorker && hasPushManager && hasNotification && isSecureContext;
       
               // На iOS push-уведомления работают только в PWA режиме (кроме режима разработки)
        if (isIOS && !isDevelopment) {
          isSupported = isSupported && isStandalone;
        }
        
        if (isIOS) {
          console.log('📱 iOS Safari проверка:', {
            isIOS,
            isStandalone,
            isDevelopment,
            standalone: (window.navigator as any).standalone,
            displayMode: window.matchMedia('(display-mode: standalone)').matches
          });
        }

      if (isSupported) {
        // Регистрируем Service Worker
        try {
          console.log('🔧 Регистрируем Service Worker...');
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('✅ Service Worker зарегистрирован:', registration);

          // Проверяем текущую подписку
          const subscription = await registration.pushManager.getSubscription();
          console.log('📡 Текущая подписка:', subscription);
          
          setState({
            isSupported: true,
            permission: getNotificationPermission(),
            isSubscribed: !!subscription,
            subscription,
          });

          // Автоматически запрашиваем разрешение в PWA режиме
          console.log('🔍 Проверка PWA режима:', {
            isStandalone,
            standalone: (window.navigator as any).standalone,
            displayMode: window.matchMedia('(display-mode: standalone)').matches,
            permission: getNotificationPermission(),
            hasNotification: 'Notification' in window
          });
          
          // Запрашиваем разрешения для всех поддерживаемых браузеров с приоритетом для PWA
          const shouldRequestPermission = getNotificationPermission() === 'default' && 'Notification' in window;
          
          if (shouldRequestPermission) {
            const requestDelay = isStandalone ? 1000 : 3000; // PWA быстрее, обычный браузер медленнее
            console.log(`🔔 Автоматически запрашиваем разрешение на уведомления (${isStandalone ? 'PWA' : 'браузер'}) через ${requestDelay}ms`);
              
              // Задержка зависит от типа браузера
              setTimeout(async () => {
                try {
                  if (!('Notification' in window)) {
                    console.log('❌ Notification API недоступен');
                    return;
                  }
                  
                  const permission = await Notification.requestPermission();
                  console.log('📱 Разрешение на уведомления:', permission);
                  
                  setState(prev => ({ ...prev, permission }));
                  
                  if (permission === 'granted' && !subscription) {
                    // Автоматически подписываемся на уведомления
                    const newSubscription = await registration.pushManager.subscribe({
                      userVisibleOnly: true,
                      applicationServerKey: urlBase64ToUint8Array(
                        'BCQmdw7UtjDaFV260LXlR3JuVxtojy_L2J8epI5ouclHmUSN1KC85FyuJtIY34RqhmPmn-SQh27jhh1PwKlZ-T8'
                      ),
                    });

                    // Отправляем подписку на сервер
                    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/subscribe`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                      },
                      body: JSON.stringify({
                        subscription: newSubscription,
                        userAgent: navigator.userAgent,
                      }),
                    });

                    console.log('✅ Автоматически подписались на push-уведомления');
                    
                    setState(prev => ({
                      ...prev,
                      isSubscribed: true,
                      subscription: newSubscription,
                    }));
                  }
                } catch (error) {
                  console.error('❌ Ошибка автоматической подписки:', error);
                }
              }, requestDelay);
          }
          
          // Если разрешение уже дано, но нет подписки - подписываемся автоматически
          if (getNotificationPermission() === 'granted' && !subscription) {
              console.log('🔔 Разрешение есть, но нет подписки - автоматически подписываемся');
              
              setTimeout(async () => {
                try {
                  const newSubscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(
                      'BCQmdw7UtjDaFV260LXlR3JuVxtojy_L2J8epI5ouclHmUSN1KC85FyuJtIY34RqhmPmn-SQh27jhh1PwKlZ-T8'
                    ),
                  });

                  // Отправляем подписку на сервер
                  await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/subscribe`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    },
                    body: JSON.stringify({
                      subscription: newSubscription,
                      userAgent: navigator.userAgent,
                    }),
                  });

                  console.log('✅ Автоматически подписались на push-уведомления');
                  
                  setState(prev => ({
                    ...prev,
                    isSubscribed: true,
                    subscription: newSubscription,
                  }));
                } catch (error) {
                  console.error('❌ Ошибка автоматической подписки:', error);
                }
            }, 500); // Задержка 0.5 секунды
          }
        } catch (error) {
          console.error('❌ Ошибка регистрации Service Worker:', error);
          setState({
            isSupported: false,
            permission: getNotificationPermission(),
            isSubscribed: false,
            subscription: null,
          });
        }
      } else {
        console.log('❌ Push-уведомления не поддерживаются:', {
          hasServiceWorker,
          hasPushManager,
          hasNotification,
          isSecureContext
        });
        setState({
          isSupported: false,
          permission: getNotificationPermission(),
          isSubscribed: false,
          subscription: null,
        });
      }
    };

    checkSupport();
  }, []);

  // Запрос разрешения на уведомления
  const requestPermission = async (): Promise<boolean> => {
    if (!state.isSupported) {
      alert('Push-уведомления не поддерживаются в этом браузере');
      return false;
    }

    if (!('Notification' in window)) {
      alert('Уведомления не поддерживаются в этом браузере');
      return false;
    }

    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      
      setState(prev => ({
        ...prev,
        permission,
      }));

      if (permission === 'granted') {
        await subscribe();
        return true;
      } else {
        alert('Разрешение на уведомления отклонено');
        return false;
      }
    } catch (error) {
      console.error('Ошибка при запросе разрешения:', error);
      alert('Ошибка при запросе разрешения на уведомления');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Подписка на push-уведомления
  const subscribe = async (): Promise<boolean> => {
    if (!state.isSupported || state.permission !== 'granted') {
      return false;
    }

    if (!('Notification' in window)) {
      return false;
    }

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
              // Генерируем VAPID ключи (в продакшене нужны настоящие ключи)
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            // Это тестовый VAPID ключ, в продакшене нужно использовать настоящие
            'BCQmdw7UtjDaFV260LXlR3JuVxtojy_L2J8epI5ouclHmUSN1KC85FyuJtIY34RqhmPmn-SQh27jhh1PwKlZ-T8'
          ),
        });

      // Отправляем подписку на сервер
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://technoline-api.loca.lt/api'}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          subscription,
          userAgent: navigator.userAgent,
        }),
      });

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        subscription,
      }));

      return true;
    } catch (error) {
      console.error('Ошибка подписки:', error);
      alert('Ошибка при подписке на уведомления');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Отписка от push-уведомлений
  const unsubscribe = async (): Promise<boolean> => {
    if (!state.subscription) {
      return false;
    }

    setIsLoading(true);
    try {
      await state.subscription.unsubscribe();

      // Уведомляем сервер об отписке
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://technoline-api.loca.lt/api'}/notifications/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          endpoint: state.subscription.endpoint,
        }),
      });

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        subscription: null,
      }));

      return true;
    } catch (error) {
      console.error('Ошибка отписки:', error);
      alert('Ошибка при отписке от уведомлений');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    ...state,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
  };
} 