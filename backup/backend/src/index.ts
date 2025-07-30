import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { syncService } from './services/syncService';
import { Category } from './models/Category';
import { fork } from 'child_process';
import path from 'path';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Routes
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import categoryRoutes from './routes/categories';
import orderRoutes from './routes/orders';
import userRoutes from './routes/users';
import cartRoutes from './routes/cart';
import reviewRoutes from './routes/reviews';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/upload';
import deliveryRoutes from './routes/delivery';
import addressesRoutes from './routes/addresses';
import paymentMethodsRoutes from './routes/paymentMethods';
import characteristicsRoutes from './routes/characteristics';
import characteristicGroupsRoutes from './routes/characteristicGroups';
import cdekRoutes from './routes/cdek';
import notificationsRoutes from './routes/notifications';
import suppliersRoutes from './routes/suppliers';
import arrivalsRoutes from './routes/arrivals';
import receiptsRoutes from './routes/receipts';
import debtsRoutes from './routes/debts';
import paymentsRoutes from './routes/payments';
import clientsRoutes from './routes/clients';
import adminActionsRoutes from './routes/adminActions';
import sberRecipientsRoutes from './routes/sberRecipients';
import eventsRoutes from './routes/events';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

// --- Socket.IO ---
const server = http.createServer(app);
export const io = new SocketIOServer(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.ADMIN_URL || 'http://localhost:3200',
      'http://localhost:3100',
      'http://localhost:3200',
      'http://localhost:3201',
      'http://localhost:3202',
      'http://localhost:3203',
      'http://localhost:50438', // vercel dev
      'https://*.vercel.app', // vercel production
      'https://*.railway.app', // railway
      'https://*.render.com', // render
      /^https:\/\/.*\.vercel\.app$/, // any vercel subdomain
      /^https:\/\/.*\.railway\.app$/, // any railway subdomain
      /^https:\/\/.*\.render\.com$/, // any render subdomain
      /^http:\/\/localhost:\d+$/, // any localhost port
      /^https:\/\/.*\.netlify\.app$/, // netlify
      /^https:\/\/.*\.netlify\.com$/, // netlify custom domains
      // Local network access (private IP ranges)
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // 192.168.x.x network
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/, // 10.x.x.x network
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/, // 172.16-31.x.x network
      // Localtunnel domains
      'https://technoline.loca.lt',
      'https://technoline-admin.loca.lt',
      'https://technoline-api.loca.lt',
      /^https:\/\/.*\.loca\.lt$/, // any localtunnel subdomain
      /^https:\/\/.*\.loca\.it$/, // alternative localtunnel domain
      /^https:\/\/.*\.ngrok\.io$/, // ngrok domains
      /^https:\/\/.*\.ngrok-free\.app$/ // ngrok free domains
    ],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('🔌 Socket.IO client connected:', socket.id);
  
  socket.on('joinOrderRoom', (orderId) => {
    socket.join(`order_${orderId}`);
    console.log(`🔌 Socket ${socket.id} joined room order_${orderId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Socket.IO client disconnected:', socket.id);
  });
  
  // Логируем все события для отладки
  socket.onAny((eventName, ...args) => {
    console.log(`🔌 Socket event: ${eventName}`, args);
  });
  
  // Логируем количество подключенных клиентов
  console.log(`🔌 Total connected clients: ${io.engine.clientsCount}`);
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" }
}));

// Handle preflight requests first
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  console.log('🔄 Preflight request from origin:', origin);
  
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, Expires');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.header('Access-Control-Expose-Headers', 'X-User-Role, X-Can-Edit');
  res.sendStatus(204);
});

app.use(cors({
  origin: function (origin, callback) {
    console.log('🌐 CORS request from origin:', origin);
    callback(null, true); // Разрешаем все origins для отладки
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With',
    'Access-Control-Allow-Headers',
    'cache-control',
    'pragma',
    'expires'
  ],
  exposedHeaders: ['X-User-Role', 'X-Can-Edit'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
// app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined'));

// Static files middleware with CORS
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
}, express.static('uploads'));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ОТКЛЮЧАЕМ ETag и Last-Modified для всех роутов
app.set('etag', false);
app.use((req, res, next) => {
  res.removeHeader && res.removeHeader('Last-Modified');
  next();
});

// Глобальный логгер для всех запросов
app.use((req, res, next) => {
  console.log('>>> GLOBAL REQUEST', req.method, req.originalUrl, req.query);
  next();
});

// Глобальный логгер для auth роутов
app.use('/api/auth', (req, res, next) => {
  console.log('>>> AUTH REQUEST', req.method, req.originalUrl, req.body);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/addresses', addressesRoutes);
app.use('/api/payment-methods', paymentMethodsRoutes);
app.use('/api/characteristics', characteristicsRoutes);
app.use('/api/characteristic-groups', characteristicGroupsRoutes);
// Глобальный логгер для /api/cdek/*
app.use('/api/cdek', (req, res, next) => {
  console.log('>>> GLOBAL /api/cdek/*', req.method, req.originalUrl, req.query);
  next();
});
app.use('/api/cdek', cdekRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/arrivals', arrivalsRoutes);
app.use('/api/receipts', receiptsRoutes);
app.use('/api/debts', debtsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/admin-actions', adminActionsRoutes);
app.use('/api/sber-recipients', sberRecipientsRoutes);
app.use('/api/events', eventsRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl 
  });
});

// Создание базовых категорий при запуске
async function createInitialCategories() {
  try {
    const categories = [
      {
        name: 'Мобильные телефоны',
        slug: 'mobilnye-telefony',
        description: 'Смартфоны и мобильные телефоны',
        isActive: true,
        sortOrder: 1
      },
      {
        name: 'Умные Часы',
        slug: 'umnye-chasy',
        description: 'Смарт-часы и фитнес-браслеты',
        isActive: true,
        sortOrder: 2
      },
      {
        name: 'Ноутбуки и Планшеты',
        slug: 'noutbuki-i-planshety',
        description: 'Ноутбуки, планшеты и аксессуары',
        isActive: true,
        sortOrder: 3
      },
      {
        name: 'Аксессуары',
        slug: 'aksessuary',
        description: 'Чехлы, зарядные устройства и другие аксессуары',
        isActive: true,
        sortOrder: 4
      },
      {
        name: 'Игровые приставки',
        slug: 'igrovye-pristavki',
        description: 'Игровые консоли и аксессуары',
        isActive: true,
        sortOrder: 5
      },
      {
        name: 'Наушники и Колонки',
        slug: 'naushniki-i-kolonki',
        description: 'Наушники, колонки и аудио оборудование',
        isActive: true,
        sortOrder: 6
      },
      {
        name: 'Техника для Дома',
        slug: 'tehnika-dlya-doma',
        description: 'Бытовая техника для дома',
        isActive: true,
        sortOrder: 7
      },
      {
        name: 'Компьютерное оборудование',
        slug: 'kompyuternoe-oborudovanie',
        description: 'Компьютеры, мониторы и комплектующие',
        isActive: true,
        sortOrder: 8
      },
      {
        name: 'Электротранспорт',
        slug: 'elektrotransport',
        description: 'Электросамокаты, велосипеды и другой электротранспорт',
        isActive: true,
        sortOrder: 9
      }
    ];

    for (const categoryData of categories) {
      const existingCategory = await Category.findOne({ slug: categoryData.slug });
      if (!existingCategory) {
        const category = new Category(categoryData);
        await category.save();
        console.log(`✅ Created category: ${categoryData.name}`);
      }
    }
    
    console.log('✅ Initial categories setup completed');
  } catch (error) {
    console.error('❌ Error creating initial categories:', error);
  }
}

// Start server
const startServer = async () => {
  try {
    // Try to connect to database, but don't fail if it's not available
    await connectDB();
    
    // Create initial categories
    await createInitialCategories();

    // Запуск скрипта отслеживания изменений
    fork(path.resolve(__dirname, '../../scripts/changelog-watcher.js'));
    
    const host = '0.0.0.0'; // Слушаем на всех интерфейсах
    server.listen(Number(PORT), host, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🌐 Network access: http://0.0.0.0:${PORT}/api`);
      console.log(`🌐 Local network: http://192.168.50.69:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

startServer();