import { Request, Response, NextFunction } from 'express';

// Middleware для обработки прокси-запросов
export const proxyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Если запрос идет через прокси, устанавливаем правильные заголовки
    if (process.env.PROXY_ENABLED === 'true') {
    // Получаем реальный IP из заголовков прокси
    const realIP = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   req.connection.remoteAddress;
    
    // Устанавливаем реальный IP (используем type assertion для обхода readonly)
    (req as any).ip = Array.isArray(realIP) ? realIP[0] : realIP as string;
    
    // Устанавливаем протокол HTTPS для всех запросов через прокси
    req.headers['x-forwarded-proto'] = 'https';
    
    // Логируем информацию о прокси (только в development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 Proxy request: ${req.method} ${req.url} from ${req.ip}`);
    }
  }
  
  next();
};

// Middleware для настройки CORS с учетом прокси
export const proxyCorsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.PROXY_ENABLED === 'true') {
    const allowedOrigins = [
      'https://technohubstore.net',
      'https://www.technohubstore.net',
      'https://admin.technohubstore.net',
      'https://mail.technohubstore.net'
    ];
    
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  }
  
  next();
};

// Middleware для логирования прокси-статистики
export const proxyStatsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.PROXY_ENABLED === 'true') {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const proxyHost = process.env.PROXY_HOST;
      
      // Логируем статистику только для важных запросов
      if (req.url.startsWith('/api/') && duration > 1000) {
        console.log(`⚡ Slow proxy request: ${req.method} ${req.url} - ${duration}ms via ${proxyHost}`);
      }
    });
  }
  
  next();
}; 