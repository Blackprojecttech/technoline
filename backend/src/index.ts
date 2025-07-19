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
import { syncCategoryPages } from './utils/syncCategoryPages';
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
import cdekRoutes from './routes/cdek';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Socket.IO ---
const server = http.createServer(app);
export const io = new SocketIOServer(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
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
      /^https:\/\/.*\.netlify\.com$/ // netlify custom domains
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
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3100', // frontend
    'http://localhost:3200', // admin panel
    'http://localhost:3201', // admin panel
    'http://localhost:3202', // admin panel
    'http://localhost:3203', // admin panel
    'http://localhost:50438', // vercel dev
    'https://*.vercel.app', // vercel production
    'https://*.railway.app', // railway
    'https://*.render.com', // render
    /^https:\/\/.*\.vercel\.app$/, // any vercel subdomain
    /^https:\/\/.*\.railway\.app$/, // any railway subdomain
    /^https:\/\/.*\.render\.com$/, // any render subdomain
    /^http:\/\/localhost:\d+$/, // any localhost port
    /^https:\/\/.*\.netlify\.app$/, // netlify
    /^https:\/\/.*\.netlify\.com$/ // netlify custom domains
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'Access-Control-Allow-Headers'],
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Manual sync endpoint

// Handle preflight requests
app.options('*', cors());

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
// Глобальный логгер для /api/cdek/*
app.use('/api/cdek', (req, res, next) => {
  console.log('>>> GLOBAL /api/cdek/*', req.method, req.originalUrl, req.query);
  next();
});
app.use('/api/cdek', cdekRoutes);

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
    
    // Sync category pages
    syncCategoryPages();

    // Запуск скрипта отслеживания изменений
    fork(path.resolve(__dirname, '../../scripts/changelog-watcher.js'));
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🔄 Sync endpoint: http://localhost:${PORT}/api/sync`);
      console.log(`🟢 Socket.IO: ws://localhost:${PORT}`);
    });

    // Start automatic sync service
    // syncService.startSync();
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    // Don't exit the process, just log the error
    // This allows the server to run for demo purposes
  }
};

startServer();

export default app; 