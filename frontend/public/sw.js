// TechnoLine PWA Service Worker
const CACHE_NAME = 'technoline-v1.2.0';
const STATIC_CACHE = 'technoline-static-v1.2.0';
const DYNAMIC_CACHE = 'technoline-dynamic-v1.2.0';
const API_CACHE = 'technoline-api-v1.2.0';

// Ресурсы для предварительного кэширования
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  // Добавляем основные страницы
  '/catalog',
  '/cart',
  '/profile',
  '/favorites',
  // Добавляем офлайн страницу
  '/offline'
];

// API endpoints для кэширования
const API_ENDPOINTS = [
  '/api/categories',
  '/api/delivery/active',
  '/api/payment-methods'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Кэшируем статические ресурсы
      caches.open(STATIC_CACHE).then(cache => {
        console.log('📦 Кэширование статических ресурсов...');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      }),
      // Кэшируем API данные
      caches.open(API_CACHE).then(cache => {
        console.log('🌐 Кэширование API данных...');
        return Promise.all(
          API_ENDPOINTS.map(endpoint => 
            fetch(endpoint)
              .then(response => response.ok ? cache.put(endpoint, response.clone()) : null)
              .catch(() => null) // Игнорируем ошибки при первичном кэшировании
          )
        );
      })
    ]).then(() => {
      console.log('✅ Service Worker установлен и ресурсы закэшированы');
      self.skipWaiting();
    })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker активируется...');
  
  event.waitUntil(
    Promise.all([
      // Очищаем старые кэши
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE &&
                cacheName !== CACHE_NAME) {
              console.log('🗑️ Удаление старого кэша:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Захватываем контроль над всеми клиентами
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Service Worker активирован');
    })
  );
});

// Стратегии кэширования
const cacheStrategies = {
  // Сначала кэш, потом сеть (для статических ресурсов)
  cacheFirst: async (request) => {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      console.log('❌ Сетевая ошибка:', error);
      // Возвращаем офлайн страницу для навигационных запросов
      if (request.mode === 'navigate') {
        return caches.match('/offline') || new Response('Офлайн режим', { status: 200 });
      }
      throw error;
    }
  },

  // Сначала сеть, потом кэш (для API)
  networkFirst: async (request) => {
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(API_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      console.log('🌐 Сеть недоступна, используем кэш для:', request.url);
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      throw error;
    }
  },

  // Только сеть (для критических запросов)
  networkOnly: async (request) => {
    return fetch(request);
  }
};

// Обработка запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Пропускаем запросы к другим доменам (кроме API)
  if (url.origin !== self.location.origin && !url.pathname.startsWith('/api')) {
    return;
  }

  // Пропускаем POST, PUT, DELETE запросы
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // API запросы - сначала сеть, потом кэш
        if (url.pathname.startsWith('/api')) {
          // Критические API запросы (аутентификация, заказы)
          if (url.pathname.includes('/auth/') || 
              url.pathname.includes('/orders/') ||
              url.pathname.includes('/cart/') ||
              url.pathname.includes('/payment/')) {
            return await cacheStrategies.networkOnly(request);
          }
          // Остальные API запросы
          return await cacheStrategies.networkFirst(request);
        }

        // Статические ресурсы - сначала кэш, потом сеть
        if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
          return await cacheStrategies.cacheFirst(request);
        }

        // HTML страницы - сначала сеть, потом кэш
        if (request.mode === 'navigate' || 
            request.headers.get('Accept')?.includes('text/html')) {
          return await cacheStrategies.networkFirst(request);
        }

        // Остальные запросы - сначала кэш
        return await cacheStrategies.cacheFirst(request);

      } catch (error) {
        console.log('❌ Ошибка обработки запроса:', request.url, error);
        
        // Для навигационных запросов возвращаем главную страницу из кэша
        if (request.mode === 'navigate') {
          const cachedHome = await caches.match('/');
          if (cachedHome) {
            return cachedHome;
          }
        }
        
        // Для остальных запросов пробуем найти в кэше
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Если ничего не найдено, возвращаем базовую ошибку
        return new Response('Ресурс недоступен', { 
          status: 404,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })()
  );
});

// Обработка push-уведомлений
self.addEventListener('push', (event) => {
  console.log('📬 Push уведомление получено:', event);
  
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { 
      title: 'Новое уведомление', 
      body: event.data ? event.data.text() : 'У вас новое уведомление' 
    };
  }

  const title = data.title || 'TechnoLine';
  const options = {
    body: data.body || 'У вас новое уведомление',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'notification',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'view',
        title: '👀 Посмотреть',
        icon: '/icon-192.png'
      },
      {
        action: 'close',
        title: '❌ Закрыть'
      }
    ],
    data: data
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Клик по уведомлению:', event);
  
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        // Ищем открытую вкладку с нашим сайтом
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Открываем новую вкладку
        if (self.clients.openWindow) {
          const url = event.notification.data?.url || '/';
          return self.clients.openWindow(url);
        }
      })
    );
  }
});

// Обработка закрытия уведомлений
self.addEventListener('notificationclose', (event) => {
  console.log('🔕 Уведомление закрыто:', event);
});

// Синхронизация в фоне (для будущих обновлений)
self.addEventListener('sync', (event) => {
  console.log('🔄 Фоновая синхронизация:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Здесь можно добавить логику синхронизации
      Promise.resolve()
    );
  }
});

// Обновление кэша при получении сообщения
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⏭️ Принудительное обновление Service Worker');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_UPDATE') {
    console.log('🔄 Обновление кэша по запросу');
    event.waitUntil(
      caches.open(DYNAMIC_CACHE).then(cache => {
        return cache.addAll(STATIC_ASSETS);
      })
    );
  }
});

console.log('🎉 TechnoLine PWA Service Worker загружен!'); 