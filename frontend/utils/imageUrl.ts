/**
 * Утилита для замены URL изображений в зависимости от окружения
 */

// Определяем, находимся ли мы в браузере
const isBrowser = typeof window !== 'undefined';

// Определяем, локально ли мы работаем
const isLocalhost = isBrowser && (
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.includes('localhost')
);

// Определяем, используем ли мы localtunnel
const isLocaltunnel = isBrowser && window.location.hostname.includes('loca.lt');

// Определяем, находимся ли мы в PWA режиме
const isPWA = isBrowser && ((window.navigator as any).standalone === true || 
                           window.matchMedia('(display-mode: standalone)').matches);

/**
 * Заменяет URL изображений в зависимости от окружения
 * @param imageUrl - исходный URL изображения
 * @returns - исправленный URL изображения
 */
export function fixImageUrl(imageUrl: string): string {
  if (!imageUrl) return imageUrl;
  
  // Если это placeholder.jpg из базы данных, конвертируем в путь для Next.js
  if (imageUrl === 'placeholder.jpg') {
    return '/placeholder.jpg';
  }
  
  // Если это статические файлы Next.js (начинаются с /, но не /uploads/), оставляем как есть
  if (imageUrl.startsWith('/') && !imageUrl.startsWith('/uploads/')) {
    return imageUrl; // Эти файлы обслуживаются Next.js напрямую
  }
  
  // Универсально: если путь начинается с /uploads/, подставляем базовый адрес API
  if (imageUrl.startsWith('/uploads/')) {
    const api = process.env.NEXT_PUBLIC_API_URL || 'https://technohubstore.net/api';
    const base = api.replace(/\/api$/, '');
    const result = base + imageUrl;
    console.log('🔧 Относительный путь преобразован:', imageUrl, '→', result);
    return result;
  }
  
  // Если изображение пытается загрузиться с localhost, заменяем на правильный адрес
  if (imageUrl.includes('localhost/uploads/') || imageUrl.includes('localhost:5002')) {
    const api = process.env.NEXT_PUBLIC_API_URL || 'https://technohubstore.net/api';
    const base = api.replace(/\/api$/, '');
    const result = imageUrl.replace(/http:\/\/localhost(:\d+)?/, base);
    console.log('🔧 localhost заменен на правильный адрес:', imageUrl, '→', result);
    return result;
  }
  
  // Если мы через localtunnel и URL содержит HTTP localtunnel, заменяем на HTTPS
  if (imageUrl.includes('http://technoline-api.loca.lt')) {
    const result = imageUrl.replace('http://technoline-api.loca.lt', 'https://technoline-api.loca.lt');
    console.log('🔒 HTTP заменен на HTTPS для localtunnel:', imageUrl, '→', result);
    return result;
  }
  
  // Если мы локально и URL содержит localtunnel, но нужно использовать локальный адрес
  if (isLocalhost && imageUrl.includes('technoline-api.loca.lt') && !isLocaltunnel) {
    const result = imageUrl.replace(/https?:\/\/technoline-api\.loca\.lt/, 'http://localhost:5002');
    console.log('🏠 URL заменен на localhost:', imageUrl, '→', result);
    return result;
  }
  
  // Если URL уже полный, оставляем как есть
  return imageUrl;
}

/**
 * Заменяет URL изображений в объекте товара
 * @param product - объект товара
 * @returns - товар с исправленными URL изображений
 */
export function fixProductImageUrls(product: any): any {
  if (!product) return product;
  
  const fixedProduct = { ...product };
  
  // Исправляем mainImage
  if (fixedProduct.mainImage) {
    fixedProduct.mainImage = fixImageUrl(fixedProduct.mainImage);
  }
  
  // Исправляем images
  if (fixedProduct.images && Array.isArray(fixedProduct.images)) {
    fixedProduct.images = fixedProduct.images.map(fixImageUrl);
  }
  
  return fixedProduct;
}

/**
 * Заменяет URL изображений в массиве товаров
 * @param products - массив товаров
 * @returns - массив товаров с исправленными URL изображений
 */
export function fixProductsImageUrls(products: any[]): any[] {
  if (!Array.isArray(products)) return products;
  
  return products.map(fixProductImageUrls);
} 