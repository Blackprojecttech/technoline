// Создаем EventSource для получения обновлений о товарах
let productUpdateEventSource: EventSource | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let subscribers = 0; // Счетчик подписчиков

export const initializeProductEvents = () => {
  subscribers++;
  console.log(`🔌 Initializing ProductEvents - subscribers: ${subscribers}`);
  
  // Если уже есть активное подключение, не создаем новое
  if (productUpdateEventSource && productUpdateEventSource.readyState === EventSource.OPEN) {
    console.log('✅ EventSource уже подключен, переиспользуем существующее подключение');
    return;
  }
  
  if (productUpdateEventSource) {
    console.log('🔄 Closing existing EventSource connection');
    productUpdateEventSource.close();
  }

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  // Список возможных API URL
  const apiUrls = [
    import.meta.env.VITE_API_URL,
    'http://192.168.50.69:5002/api',
    'http://localhost:5002/api',
    'https://technoline-api.loca.lt/api'
  ].filter(Boolean);

  const token = localStorage.getItem('admin_token');
  
  console.log('🔍 Checking token:', token ? 'Token found' : 'No token');
  console.log('🔍 Token length:', token ? token.length : 0);
  console.log('🔍 Available API URLs:', apiUrls);
  
  if (!token) {
    console.error('❌ No auth token found');
    return;
  }

  // Функция для попытки подключения к EventSource с определенным URL
  const tryConnectWithUrl = (apiUrl: string) => {
    try {
      const url = new URL(`${apiUrl}/events/products`);
      url.searchParams.append('token', token);
      
      const finalUrl = url.toString();
      console.log(`🔌 Trying EventSource connection: ${finalUrl}`);
      
      const eventSource = new EventSource(finalUrl);

      eventSource.onopen = () => {
        console.log(`✅ EventSource connection established with ${apiUrl}`);
        productUpdateEventSource = eventSource;
      };

      eventSource.onmessage = (event) => {
        console.log('📨 Received SSE event:', event.data);
        try {
          const data = JSON.parse(event.data);
          console.log('📦 Parsed SSE data:', data);
          
          // Обрабатываем разные типы событий
          if (data.type === 'arrivalDeleted') {
            console.log('🗑️ *** IMPORTANT *** Received arrivalDeleted event:', data);
            console.log('🗑️ arrivalId from event:', data.arrivalId);
            console.log('🗑️ supplierName from event:', data.supplierName);
            window.dispatchEvent(new CustomEvent('arrivalDeleted', { detail: data }));
            console.log('🔔 *** DISPATCHED *** arrivalDeleted event to window');
          } else {
            // Обрабатываем события продуктов (productAdded, productRemoved)
            console.log('📦 Product event type:', data.type);
            window.dispatchEvent(new CustomEvent('productUpdate', { detail: data }));
            console.log('🔔 Dispatched productUpdate event to window');
          }
        } catch (error) {
          console.error('❌ Error parsing SSE data:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error(`❌ EventSource error with ${apiUrl}:`, error);
        console.log('📊 EventSource readyState:', eventSource?.readyState);
        
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log(`🔄 Connection closed for ${apiUrl}, trying next URL...`);
          // Пробуем следующий URL
          const currentIndex = apiUrls.indexOf(apiUrl);
          const nextIndex = currentIndex + 1;
          
          if (nextIndex < apiUrls.length) {
            setTimeout(() => tryConnectWithUrl(apiUrls[nextIndex]), 1000);
          } else {
            // Если все URL попробованы, ждем и пробуем сначала
            if (!reconnectTimeout) {
              console.log('⏳ All URLs failed, attempting to reconnect in 5 seconds...');
              reconnectTimeout = setTimeout(() => {
                reconnectTimeout = null;
                initializeProductEvents();
              }, 5000);
            }
          }
        }
      };

      return eventSource;
    } catch (error) {
      console.error(`❌ Error initializing EventSource with ${apiUrl}:`, error);
      return null;
    }
  };

  // Начинаем с первого URL
  if (apiUrls.length > 0) {
    tryConnectWithUrl(apiUrls[0]);
  }
};

export const closeProductEvents = () => {
  subscribers--;
  console.log(`👋 Closing ProductEvents - remaining subscribers: ${subscribers}`);
  
  // Закрываем подключение только если больше нет подписчиков
  if (subscribers <= 0) {
    if (productUpdateEventSource) {
      console.log('🔌 Закрываем EventSource - нет больше подписчиков');
      productUpdateEventSource.close();
      productUpdateEventSource = null;
    }

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    
    subscribers = 0; // Сбрасываем счетчик
  } else {
    console.log('🔌 EventSource остается открытым - есть другие подписчики');
  }
}; 