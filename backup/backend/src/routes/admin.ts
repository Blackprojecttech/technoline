import express from "express";
import { auth } from '../middleware/auth';
import { admin } from '../middleware/admin';
import { Order, IOrder } from '../models/Order';
import { User, IUser } from '../models/User';
import { Product, IProduct } from '../models/Product';
import { ProductView, IProductView } from '../models/ProductView';
import { 
  getAllZones, 
  createZone, 
  updateZone, 
  deleteZone 
} from '../controllers/deliveryZoneController';
import fs from 'fs';
import path from 'path';
const { createProduct, updateProduct } = require('../controllers/productController');
import Characteristic from '../models/Characteristic';
import CharacteristicValue from '../models/CharacteristicValue';
import { Category } from '../models/Category';
const axios = require('axios');

async function downloadAndSaveImage(url: string): Promise<string> {
  try {
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const ext = path.extname(url.split('?')[0]) || '.jpg';
    const filename = `imported_${Date.now()}_${Math.floor(Math.random()*1e6)}${ext}`;
    const filePath = path.join(uploadsDir, filename);
    console.log(`[IMAGE IMPORT] Начинаю скачивание: ${url}`);
    console.log(`[IMAGE IMPORT] Путь для сохранения: ${filePath}`);

    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      timeout: 20000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    console.log(`[IMAGE IMPORT] HTTP статус: ${response.status}`);
    if (response.status !== 200) {
      console.error('[IMAGE IMPORT] Ошибка скачивания, статус:', response.status, url);
      return url;
    }

    const writer = fs.createWriteStream(filePath);
    await new Promise<void>((resolve, reject) => {
      response.data.pipe(writer);
      let error: Error | null = null;
      writer.on('error', (err: Error) => {
        error = err;
        writer.close();
        fs.unlinkSync(filePath); // удаляем пустой файл
        console.error('[IMAGE IMPORT] Ошибка записи файла:', err.message, url);
        reject(err);
      });
      writer.on('close', () => {
        if (!error) resolve();
      });
    });

    // Проверяем размер файла
    const stats = fs.statSync(filePath);
    console.log(`[IMAGE IMPORT] Размер скачанного файла: ${stats.size} байт`);
    if (stats.size === 0) {
      fs.unlinkSync(filePath);
      console.error('[IMAGE IMPORT] Файл пустой после скачивания:', url);
      return url;
    }

    console.log(`[IMAGE IMPORT] Успешно скачано: ${filePath}`);
    return `/uploads/${filename}`;
  } catch (e) {
    console.error('[IMAGE IMPORT] Ошибка при скачивании изображения:', url, e);
    return url;
  }
}

const router = express.Router();

// Admin dashboard stats
router.get('/dashboard', auth, admin, async (req, res) => {
  try {
    // Получаем базовую статистику
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    
    // Считаем общую выручку БЕЗ доставки (только доставленные заказы)
    const totalRevenueStats = await Order.aggregate([
      {
        $match: {
          status: 'delivered'
        }
      },
      {
        $addFields: {
          totalRevenue: {
            $sum: {
              $map: {
                input: '$items',
                as: 'item',
                in: {
                  $multiply: [
                    '$$item.quantity',
                    '$$item.price'
                  ]
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalRevenue' }
        }
      }
    ]);
    const totalRevenue = totalRevenueStats[0]?.revenue || 0;
    
    // Статистика по статусам заказов
    const orderStatusStats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Статистика за сегодня БЕЗ доставки
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = await Order.countDocuments({ createdAt: { $gte: today } });
    const todayRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: today },
          status: 'delivered'
        }
      },
      {
        $addFields: {
          totalRevenue: {
            $sum: {
              $map: {
                input: '$items',
                as: 'item',
                in: {
                  $multiply: [
                    '$$item.quantity',
                    '$$item.price'
                  ]
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalRevenue' }
        }
      }
    ]);

    // Статистика за неделю БЕЗ доставки
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekOrders = await Order.countDocuments({ createdAt: { $gte: weekAgo } });
    const weekRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: weekAgo },
          status: 'delivered'
        }
      },
      {
        $addFields: {
          totalRevenue: {
            $sum: {
              $map: {
                input: '$items',
                as: 'item',
                in: {
                  $multiply: [
                    '$$item.quantity',
                    '$$item.price'
                  ]
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalRevenue' }
        }
      }
    ]);

    // Статистика за месяц БЕЗ доставки
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthOrders = await Order.countDocuments({ createdAt: { $gte: monthAgo } });
    const monthRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: monthAgo },
          status: 'delivered'
        }
      },
      {
        $addFields: {
          totalRevenue: {
            $sum: {
              $map: {
                input: '$items',
                as: 'item',
                in: {
                  $multiply: [
                    '$$item.quantity',
                    '$$item.price'
                  ]
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalRevenue' }
        }
      }
    ]);

    // Средний чек
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Активные пользователи (за последние 30 дней)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: thirtyDaysAgo } });

    // Статистика посещаемости за последние 30 дней
    const visitStats = await User.aggregate([
      {
        $match: {
          lastLogin: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$lastLogin"
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);

    // Статистика прибыли по месяцам за последний год
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    
    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: yearAgo },
          status: 'delivered'
        }
      },
      {
        $addFields: {
          totalRevenue: {
            $sum: {
              $map: {
                input: '$items',
                as: 'item',
                in: {
                  $multiply: [
                    '$$item.quantity',
                    '$$item.price'
                  ]
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          revenue: { $sum: "$totalRevenue" },
          orders: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      }
    ]);

    // Статистика прибыли по годам БЕЗ доставки
    const yearlyRevenue = await Order.aggregate([
      {
        $match: {
          status: 'delivered'
        }
      },
      {
        $addFields: {
          totalRevenue: {
            $sum: {
              $map: {
                input: '$items',
                as: 'item',
                in: {
                  $multiply: [
                    '$$item.quantity',
                    '$$item.price'
                  ]
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: { year: { $year: "$createdAt" } },
          revenue: { $sum: "$totalRevenue" },
          orders: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": 1 }
      }
    ]);

    // Статистика по дням недели БЕЗ доставки
    const weeklyStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: monthAgo },
          status: 'delivered'
        }
      },
      {
        $addFields: {
          totalRevenue: {
            $sum: {
              $map: {
                input: '$items',
                as: 'item',
                in: {
                  $multiply: [
                    '$$item.quantity',
                    '$$item.price'
                  ]
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" },
          revenue: { $sum: "$totalRevenue" },
          orders: { $sum: 1 }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);

    // Статистика по часам дня БЕЗ доставки
    const hourlyStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: monthAgo },
          status: 'delivered'
        }
      },
      {
        $addFields: {
          totalRevenue: {
            $sum: {
              $map: {
                input: '$items',
                as: 'item',
                in: {
                  $multiply: [
                    '$$item.quantity',
                    '$$item.price'
                  ]
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: { $hour: "$createdAt" },
          revenue: { $sum: "$totalRevenue" },
          orders: { $sum: 1 }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);

    // Статистика по дням за последние 30 дней
    const dailyStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          status: 'delivered'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);

    return res.json({
      totalOrders,
      totalUsers,
      totalProducts,
      totalRevenue,
      averageOrderValue,
      activeUsers,
      orderStatusStats: orderStatusStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {} as any),
      today: {
        orders: todayOrders,
        revenue: todayRevenue[0]?.revenue || 0
      },
      week: {
        orders: weekOrders,
        revenue: weekRevenue[0]?.revenue || 0
      },
      month: {
        orders: monthOrders,
        revenue: monthRevenue[0]?.revenue || 0
      },
      visitStats,
      monthlyRevenue,
      yearlyRevenue,
      weeklyStats,
      hourlyStats,
      dailyStats
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Admin products management
router.get('/products', auth, admin, async (req, res) => {
  try {
    return res.json({ message: 'Admin products route working' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Admin orders management
router.get('/orders', auth, admin, async (req, res) => {
  try {
    return res.json({ message: 'Admin orders route working' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Admin users management
router.get('/users', auth, admin, async (req, res) => {
  try {
    // Получаем всех пользователей
    const users = await User.find({}, 'email firstName lastName role lastLogin').lean();
    // Получаем все заказы
    const orders = await Order.find({}, 'userId total').lean();
    // Считаем статистику по каждому пользователю
    const userStats = users.map(user => {
      const userOrders = orders.filter(order => order.userId?.toString() === user._id.toString());
      const ordersCount = userOrders.length;
      const totalSpent = userOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      
      // Определяем статус онлайн (если последний вход был менее 5 минут назад)
      const isOnline = user.lastLogin ? 
        (Date.now() - new Date(user.lastLogin).getTime()) < 5 * 60 * 1000 : false;
      
      return {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        ordersCount,
        totalSpent,
        isOnline
      };
    });
    return res.json(userStats);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Подробная информация о пользователе
router.get('/users/:id', auth, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('+password').lean();
    if (!user) { 
      return res.status(404).json({ message: 'Пользователь не найден' }); 
    }
    
    // Получаем заказы пользователя
    const orders = await Order.find({ userId: user._id }).sort({ createdAt: -1 }).lean();
    
    // Получаем только доставленные заказы для подсчета суммы и среднего чека
    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    
    // Считаем сумму и средний чек только по доставленным заказам
    const totalSpent = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const averageCheck = deliveredOrders.length ? Math.round(totalSpent / deliveredOrders.length) : 0;
    
    // Определяем статус онлайн (если последний вход был менее 5 минут назад)
    const isOnline = user.lastLogin ? 
      (Date.now() - new Date(user.lastLogin).getTime()) < 5 * 60 * 1000 : false;
    
    // Получаем историю входов (последние 10)
    const loginHistory = user.lastLogin ? [
      {
        date: user.lastLogin,
        ip: '127.0.0.1', // В реальном приложении это должно приходить с фронтенда
        userAgent: 'Chrome/138.0.0.0'
      }
    ] : [];
    
    // Получаем реальные просмотры товаров пользователем
    const userViews = await ProductView.find({ userId: user._id })
      .sort({ viewedAt: -1 })
      .limit(10)
      .populate('productId')
      .lean();
    
    const viewedProducts = userViews.map(view => {
      const product = (view as any).productId;
      if (!product) return null; // Пропускаем просмотры товаров, которые были удалены
      
      return {
        _id: product._id,
        name: product.name,
        category: product.categoryId ? product.categoryId.name : 'Без категории',
        viewedAt: view.viewedAt,
        price: product.price,
        isReal: true // Флаг для реальных данных
      };
    }).filter(Boolean); // Убираем null значения
    
    // Если нет реальных просмотров, показываем сообщение
    if (viewedProducts.length === 0) {
      viewedProducts.push({
        _id: 'no-views',
        name: 'Нет просмотренных товаров',
        category: 'Информация',
        viewedAt: new Date(),
        price: 0,
        isReal: false,
        message: 'Пользователь пока не просматривал товары'
      } as any);
    }
    
    return res.json({
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        address: user.address,
        password: user.password, // Реальный пароль для админ-панели
        isOnline
      },
      orders,
      totalSpent,
      averageCheck,
      loginHistory,
      viewedProducts
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Создание нового пользователя
router.post('/users', auth, admin, async (req, res) => {
  try {
    const { email, password, firstName, lastName, middleName, phone, role = 'user' } = req.body;
    
    // Валидация обязательных полей
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'Все обязательные поля должны быть заполнены' });
    }
    
    // Проверяем валидность роли
    const validRoles = ['user', 'admin', 'moderator', 'accountant'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Недопустимая роль' });
    }
    
    // Проверяем, существует ли пользователь с таким email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
    }
    
    // Создаем нового пользователя
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      middleName: middleName || '',
      phone: phone || '',
      role,
      isActive: true,
      emailVerified: true // Пользователи, созданные админом, считаются верифицированными
    });
    
    return res.status(201).json({
      message: 'Пользователь успешно создан',
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Изменение роли пользователя
router.put('/users/:id/role', auth, admin, async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;
    
    // Проверяем, что роль валидна
    const validRoles = ['user', 'admin', 'moderator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Недопустимая роль' });
    }
    
    // Находим пользователя
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    // Проверяем, что админ не может изменить свою роль
    if (userId === (req as any).user.id && role !== 'admin') {
      return res.status(400).json({ message: 'Нельзя изменить свою роль' });
    }
    
    // Обновляем роль
    user.role = role;
    await user.save();
    
    return res.json({ 
      message: 'Роль успешно изменена',
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Изменение пароля пользователя
router.put('/users/:id/password', auth, admin, async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.params.id;
    
    // Проверяем, что пароль предоставлен
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Пароль должен содержать минимум 6 символов' });
    }
    
    // Находим пользователя
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    // Обновляем пароль (хеширование происходит автоматически в pre-save middleware)
    user.password = password;
    await user.save();
    
    return res.json({ 
      message: 'Пароль успешно изменен',
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Error updating user password:', error);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Удаление пользователя
router.delete('/users/:id', auth, admin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Находим пользователя
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    // Проверяем, что админ не может удалить себя
    if (userId === (req as any).user.id) {
      return res.status(400).json({ message: 'Нельзя удалить свою учетную запись' });
    }
    
    // Проверяем, что админ не может удалить другого админа
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Нельзя удалить администратора' });
    }
    
    // Удаляем связанные данные пользователя
    await Order.deleteMany({ userId: user._id });
    await ProductView.deleteMany({ userId: user._id });
    
    // Удаляем самого пользователя
    await User.findByIdAndDelete(userId);
    
    return res.json({ 
      message: 'Пользователь успешно удален',
      deletedUser: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// CRUD для зон доставки
router.get('/delivery-zones', auth, admin, getAllZones);
router.post('/delivery-zones', auth, admin, createZone);
router.put('/delivery-zones/:id', auth, admin, updateZone);
router.delete('/delivery-zones/:id', auth, admin, deleteZone);

// Импорт товаров (массовое обновление/создание)
router.post('/import-products', auth, admin, async (req, res) => {
  try {
    const { products, identifyBy = 'sku', updateFields = [], updateStrategy = 'merge' } = req.body;
    console.log('=== [IMPORT PRODUCTS] ===');
    console.log('identifyBy:', identifyBy);
    console.log('updateFields:', updateFields);
    console.log('updateStrategy:', updateStrategy);
    console.log('products.length:', Array.isArray(products) ? products.length : 'not array');
    if (!Array.isArray(products)) {
      console.log('products is not array:', products);
      return res.status(400).json({ message: 'products должен быть массивом' });
    }
    const results = [];
    for (const prod of products) {
      let query = {};
      if (identifyBy === 'sku') query = { sku: prod.sku };
      else if (identifyBy === 'name') query = { name: prod.name };
      else if (identifyBy === 'sku_name') query = { sku: prod.sku, name: prod.name };
      let existing = null;
      if (Object.keys(query).length > 0) {
        existing = await Product.findOne(query);
        console.log('[IMPORT] Поиск товара по', query, '→', existing ? 'Найден' : 'Не найден');
      } else {
        console.log('[IMPORT] Не задан критерий поиска, query:', query);
      }
      // --- Обработка characteristics ---
      async function normalizeCharacteristics(characteristics: any[]): Promise<any[]> {
        if (!Array.isArray(characteristics)) return characteristics;
        const normalized = [];
        for (const char of characteristics as any[]) {
          if (char.characteristicId) {
            normalized.push(char);
          } else if (char.name && char.value) {
            // Создаём характеристику, если нет id
            let newChar = await Characteristic.findOne({ name: char.name });
            if (!newChar) {
              newChar = await Characteristic.create({ name: char.name });
              console.log(`[IMPORT] Создана новая характеристика: ${char.name}, id=${newChar._id}`);
            } else {
              console.log(`[IMPORT] Найдена существующая характеристика: ${char.name}, id=${newChar._id}`);
            }
            // Можно также создать значение, если требуется (в CharacteristicValue)
            // let newValue = await CharacteristicValue.findOne({ characteristicId: newChar._id, value: char.value });
            // if (!newValue) {
            //   newValue = await CharacteristicValue.create({ characteristicId: newChar._id, value: char.value });
            //   console.log(`[IMPORT] Создано новое значение характеристики: ${char.value}, id=${newValue._id}`);
            // }
            normalized.push({ characteristicId: newChar._id, value: char.value });
          } else {
            console.log('[IMPORT] Пропущена характеристика без id и имени:', char);
          }
        }
        return normalized;
      }
      if (updateStrategy === 'merge' && updateFields.includes('characteristics')) {
        if (prod.characteristics) {
          prod.characteristics = await normalizeCharacteristics(prod.characteristics);
        }
      } else if (updateStrategy !== 'merge' && prod.characteristics) {
        prod.characteristics = await normalizeCharacteristics(prod.characteristics);
      }
      // --- Скачивание изображений по ссылкам ---
      // Обработка mainImage и images как строки с несколькими ссылками
      if (typeof prod.mainImage === 'string' && prod.mainImage.trim()) {
        // Разбиваем по запятой, пробелу или просто если подряд ссылки
        let links = prod.mainImage.split(/[,\s]+/).filter(Boolean);
        if (links.length > 1) {
          // Скачиваем все, сохраняем массив локальных путей
          const localPaths = [];
          for (const link of links) {
            if (link.startsWith('http')) {
              localPaths.push(await downloadAndSaveImage(link));
            }
          }
          if (localPaths.length) {
            prod.mainImage = localPaths[0];
            prod.images = localPaths;
          }
        } else if (links.length === 1 && links[0].startsWith('http')) {
          prod.mainImage = await downloadAndSaveImage(links[0]);
        }
      }
      if (Array.isArray(prod.images)) {
        let newImages = [];
        for (let i = 0; i < prod.images.length; i++) {
          let val = prod.images[i];
          if (typeof val === 'string' && val.trim()) {
            let links = val.split(/[,\s]+/).filter(Boolean);
            for (const link of links) {
              if (link.startsWith('http')) {
                newImages.push(await downloadAndSaveImage(link));
              }
            }
          }
        }
        if (newImages.length) {
          prod.images = newImages;
          if (!prod.mainImage && newImages[0]) prod.mainImage = newImages[0];
        }
      }
      if (existing) {
        const existingAny = existing as any;
        console.log(`[IMPORT] Обновляем товар _id=${existing._id} по`, query);
        if (updateStrategy === 'merge') {
          for (const field of updateFields) {
            if (field in prod) {
              console.log(`  - Обновляем поле ${field}:`, 'старое:', existingAny[field], '→ новое:', prod[field]);
              existingAny[field] = prod[field];
            } else {
              console.log(`  - Поле ${field} отсутствует в prod, не обновляем`);
            }
          }
        } else {
          for (const key of Object.keys(prod)) {
            if (key !== '_id') {
              console.log(`  - Заменяем поле ${key}:`, 'старое:', existingAny[key], '→ новое:', prod[key]);
              existingAny[key] = prod[key];
            }
          }
        }
        // Фильтруем characteristics без characteristicId
        if (Array.isArray(existingAny.characteristics)) {
          existingAny.characteristics = existingAny.characteristics.filter((c: any) => c.characteristicId);
        }
        console.log('[IMPORT] Итоговый объект для сохранения:', existingAny);
        await existing.save();
        results.push({ status: 'updated', id: existing._id });
        console.log('  ✓ Сохранено');
      } else {
        // --- Перед созданием товара ---
        // Генерация уникального slug для товара
        if (!prod.slug || typeof prod.slug !== 'string' || !prod.slug.trim()) {
          let baseSlug = toSlug(prod.name || 'product');
          let slug = baseSlug;
          let i = 1;
          // Проверяем уникальность slug
          while (await Product.findOne({ slug })) {
            slug = `${baseSlug}-${i++}`;
          }
          prod.slug = slug;
        }
        // Обработка mainImage: если несколько ссылок через пробел — первая в mainImage, все в images
        if (typeof prod.mainImage === 'string' && prod.mainImage.includes(' ')) {
          const imgs = prod.mainImage.split(' ').filter(Boolean);
          prod.mainImage = imgs[0];
          if (imgs.length > 1) {
            if (Array.isArray(prod.images)) {
              prod.images = Array.from(new Set([...imgs, ...prod.images]));
            } else {
              prod.images = imgs;
            }
          }
        }
        // Фильтруем characteristics без characteristicId
        if (Array.isArray(prod.characteristics)) {
          prod.characteristics = prod.characteristics.filter((c: any) => c.characteristicId);
        }
        // Внутри цикла импорта товаров, перед созданием/обновлением товара:
        if (Array.isArray(prod.categories) && prod.categories.length > 0) {
          let parent = null;
          let lastCategory = null;
          let cat: any;
          for (const catName of prod.categories) {
            cat = await Category.findOne({ name: catName, parentId: parent ? parent._id : null });
            if (!cat) {
              // Генерация уникального slug для категории
              let baseSlug = toSlug(catName);
              let slug = baseSlug;
              let i = 1;
              while (await Category.findOne({ slug })) {
                slug = `${baseSlug}-${i++}`;
              }
              cat = await Category.create({ name: catName, slug, parentId: parent ? parent._id : null });
              console.log(`[IMPORT][CATEGORY] Создана категория: ${catName} (parent: ${parent ? parent.name : 'root'}) id=${cat._id}`);
            } else {
              console.log(`[IMPORT][CATEGORY] Найдена категория: ${catName} (parent: ${parent ? parent.name : 'root'}) id=${cat._id}`);
            }
            parent = cat;
            lastCategory = cat;
          }
          if (lastCategory) {
            prod.categoryId = lastCategory._id;
          }
          delete prod.categories;
        }
        console.log('[IMPORT] Создаём новый товар:', prod);
        const created = await Product.create(prod);
        results.push({ status: 'created', id: created._id });
        console.log(`Создан новый товар _id=${created._id} (sku=${prod.sku}, name=${prod.name})`);
      }
    }
    console.log('=== [IMPORT PRODUCTS DONE] ===');
    return res.json({ success: true, results, input: products });
  } catch (e: any) {
    let errorMsg = '';
    if (e && typeof e === 'object' && e.name === 'ValidationError') {
      // Собираем все сообщения из ValidationError
      errorMsg = Object.values(e.errors || {}).map((err: any) => err.message).join(', ');
      if (!errorMsg) errorMsg = e.message || String(e);
    } else {
      errorMsg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e);
    }
    return res.json({ success: false, error: errorMsg });
  }
});

// Восстановление по changelog
router.post('/changelog/rollback', async (req, res) => {
  const lockPath = path.resolve(__dirname, '../../../.rollback-lock');
  try {
    // Создаём lock-файл перед откатом
    fs.writeFileSync(lockPath, 'rollback in progress');
    // Даем watcher время увидеть lock-файл
    await new Promise(r => setTimeout(r, 300));
    const { step } = req.body;
    if (typeof step !== 'number' || step < 0) {
      if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
      return res.status(400).json({ message: 'Некорректный шаг' });
    }
    // Путь к changelog
    const changelogPath = path.resolve(__dirname, '../../logs/ai-changelog.json');
    if (!fs.existsSync(changelogPath)) {
      if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
      return res.status(404).json({ message: 'Файл истории изменений не найден' });
    }
    const changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf-8'));
    if (!Array.isArray(changelog) || step >= changelog.length) {
      if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
      return res.status(400).json({ message: 'Некорректный шаг' });
    }
    // Восстанавливаем все файлы до указанного шага включительно
    for (let i = 0; i <= step; i++) {
      const entry = changelog[i];
      if (!entry || !entry.file) continue;
      if (entry.action === 'add' || entry.action === 'change') {
        if (entry.new !== undefined && entry.new !== null) {
          // Создать или перезаписать файл
          fs.mkdirSync(path.dirname(entry.file), { recursive: true });
          fs.writeFileSync(entry.file, entry.new, 'utf-8');
        }
      } else if (entry.action === 'unlink') {
        // Удалить файл
        if (fs.existsSync(entry.file)) {
          fs.unlinkSync(entry.file);
        }
      }
    }
    // После успешного восстановления удаляем lock-файл
    if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
    // Даем watcher время обработать снятие lock-файла
    await new Promise(r => setTimeout(r, 2000));
    return res.json({ success: true });
  } catch (error) {
    // В случае ошибки тоже удаляем lock-файл
    if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
    await new Promise(r => setTimeout(r, 2000));
    return res.status(500).json({ message: 'Ошибка восстановления', error: (error instanceof Error ? error.message : String(error)) });
  }
});

// Получение changelog
router.get('/changelog', async (req, res) => {
  try {
    const changelogPath = path.resolve(__dirname, '../../logs/ai-changelog.json');
    console.log('Читаем changelog из:', changelogPath);
    if (!fs.existsSync(changelogPath)) {
      console.log('Файл changelog не найден!');
      return res.json([]);
    }
    const fileContent = fs.readFileSync(changelogPath, 'utf-8');
    let changelog;
    try {
      changelog = JSON.parse(fileContent);
    } catch (e) {
      console.error('Ошибка парсинга changelog:', e);
      return res.status(500).json({ message: 'Ошибка парсинга changelog', error: String(e), fileContent });
    }
    console.log('Прочитано записей:', Array.isArray(changelog) ? changelog.length : 'не массив');
    return res.json(changelog);
  } catch (error) {
    console.error('❌ Ошибка при чтении changelog:', error);
    return res.status(500).json({ 
      message: 'Ошибка чтения истории изменений', 
      error: (error instanceof Error ? error.message : String(error)) 
    });
  }
});

// Удаление всей истории изменений
router.post('/changelog/clear', async (req, res) => {
  try {
    const changelogPath = path.resolve(__dirname, '../logs/ai-changelog.json');
    
    // Временно снимаем защиту файла для удаления
    if (fs.existsSync(changelogPath)) {
      fs.chmodSync(changelogPath, 0o666);
      fs.unlinkSync(changelogPath);
    }
    
    // Создаем новый пустой файл changelog
    const emptyChangelog: any[] = [];
    fs.writeFileSync(changelogPath, JSON.stringify(emptyChangelog, null, 2), 'utf-8');
    
    // Восстанавливаем защиту файла
    fs.chmodSync(changelogPath, 0o444);
    
    console.log('✅ История изменений полностью очищена');
    return res.json({ 
      success: true, 
      message: 'История изменений полностью очищена',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Ошибка при очистке истории изменений:', error);
    return res.status(500).json({ 
      message: 'Ошибка удаления истории', 
      error: (error instanceof Error ? error.message : String(error)) 
    });
  }
});

router.post('/api/import-products', auth, admin, async (req, res) => {
  // Дублируем логику из /import-products
  try {
    const { products, identifyBy = 'sku', updateFields = [], updateStrategy = 'merge' } = req.body;
    console.log('=== [IMPORT PRODUCTS] ===');
    console.log('identifyBy:', identifyBy);
    console.log('updateFields:', updateFields);
    console.log('updateStrategy:', updateStrategy);
    console.log('products.length:', Array.isArray(products) ? products.length : 'not array');
    if (!Array.isArray(products)) {
      console.log('products is not array:', products);
      return res.status(400).json({ message: 'products должен быть массивом' });
    }
    const results = [];
    for (const prod of products) {
      let query = {};
      if (identifyBy === 'sku') query = { sku: prod.sku };
      else if (identifyBy === 'name') query = { name: prod.name };
      else if (identifyBy === 'sku_name') query = { sku: prod.sku, name: prod.name };
      let existing = null;
      if (Object.keys(query).length > 0) {
        existing = await Product.findOne(query);
        console.log('[IMPORT] Поиск товара по', query, '→', existing ? 'Найден' : 'Не найден');
      } else {
        console.log('[IMPORT] Не задан критерий поиска, query:', query);
      }
      // --- Обработка characteristics ---
      async function normalizeCharacteristics(characteristics: any[]): Promise<any[]> {
        if (!Array.isArray(characteristics)) return characteristics;
        const normalized = [];
        for (const char of characteristics) {
          if (char.characteristicId) {
            normalized.push(char);
          } else if (char.name && char.value) {
            // Создаём характеристику, если нет id
            let newChar = await Characteristic.findOne({ name: char.name });
            if (!newChar) {
              newChar = await Characteristic.create({ name: char.name });
              console.log(`[IMPORT] Создана новая характеристика: ${char.name}, id=${newChar._id}`);
            } else {
              console.log(`[IMPORT] Найдена существующая характеристика: ${char.name}, id=${newChar._id}`);
            }
            // Можно также создать значение, если требуется (в CharacteristicValue)
            // let newValue = await CharacteristicValue.findOne({ characteristicId: newChar._id, value: char.value });
            // if (!newValue) {
            //   newValue = await CharacteristicValue.create({ characteristicId: newChar._id, value: char.value });
            //   console.log(`[IMPORT] Создано новое значение характеристики: ${char.value}, id=${newValue._id}`);
            // }
            normalized.push({ characteristicId: newChar._id, value: char.value });
          } else {
            console.log('[IMPORT] Пропущена характеристика без id и имени:', char);
          }
        }
        return normalized;
      }
      if (updateStrategy === 'merge' && updateFields.includes('characteristics')) {
        if (prod.characteristics) {
          prod.characteristics = await normalizeCharacteristics(prod.characteristics);
        }
      } else if (updateStrategy !== 'merge' && prod.characteristics) {
        prod.characteristics = await normalizeCharacteristics(prod.characteristics);
      }
      if (existing) {
        const existingAny = existing as any;
        console.log(`[IMPORT] Обновляем товар _id=${existing._id} по`, query);
        if (updateStrategy === 'merge') {
          for (const field of updateFields) {
            if (field in prod) {
              console.log(`  - Обновляем поле ${field}:`, 'старое:', existingAny[field], '→ новое:', prod[field]);
              existingAny[field] = prod[field];
            } else {
              console.log(`  - Поле ${field} отсутствует в prod, не обновляем`);
            }
          }
        } else {
          for (const key of Object.keys(prod)) {
            if (key !== '_id') {
              console.log(`  - Заменяем поле ${key}:`, 'старое:', existingAny[key], '→ новое:', prod[key]);
              existingAny[key] = prod[key];
            }
          }
        }
        // Фильтруем characteristics без characteristicId
        if (Array.isArray(existingAny.characteristics)) {
          existingAny.characteristics = existingAny.characteristics.filter((c: any) => c.characteristicId);
        }
        console.log('[IMPORT] Итоговый объект для сохранения:', existingAny);
        await existing.save();
        results.push({ status: 'updated', id: existing._id });
        console.log('  ✓ Сохранено');
      } else {
        // --- Перед созданием товара ---
        // Генерация уникального slug для товара
        if (!prod.slug || typeof prod.slug !== 'string' || !prod.slug.trim()) {
          let baseSlug = toSlug(prod.name || 'product');
          let slug = baseSlug;
          let i = 1;
          // Проверяем уникальность slug
          while (await Product.findOne({ slug })) {
            slug = `${baseSlug}-${i++}`;
          }
          prod.slug = slug;
        }
        // Обработка mainImage: если несколько ссылок через пробел — первая в mainImage, все в images
        if (typeof prod.mainImage === 'string' && prod.mainImage.includes(' ')) {
          const imgs = prod.mainImage.split(' ').filter(Boolean);
          prod.mainImage = imgs[0];
          if (imgs.length > 1) {
            if (Array.isArray(prod.images)) {
              prod.images = Array.from(new Set([...imgs, ...prod.images]));
            } else {
              prod.images = imgs;
            }
          }
        }
        // Фильтруем characteristics без characteristicId
        if (Array.isArray(prod.characteristics)) {
          prod.characteristics = prod.characteristics.filter((c: any) => c.characteristicId);
        }
        console.log('[IMPORT] Создаём новый товар:', prod);
        const created = await Product.create(prod);
        results.push({ status: 'created', id: created._id });
        console.log(`Создан новый товар _id=${created._id} (sku=${prod.sku}, name=${prod.name})`);
      }
    }
    console.log('=== [IMPORT PRODUCTS DONE] ===');
    return res.json({ success: true, results, input: products });
  } catch (e: any) {
    console.error('Ошибка при импорте товаров:', e, e?.stack);
    return res.status(500).json({ message: 'Ошибка при импорте товаров', error: e?.message || String(e) });
  }
});

// --- МАССОВЫЕ ОПЕРАЦИИ С ТОВАРАМИ ---

// Переместить в корзину (soft delete)
router.post('/products/bulk-delete', auth, admin, async (req, res) => {
  try {
    const { ids, all, filter } = req.body;
    if (all && filter && typeof filter === 'object') {
      const mongoFilter: any = {};
      Object.entries(filter).forEach(([key, value]) => {
        if (key === 'category' && value === 'none') {
          mongoFilter.$or = [
            { categoryId: { $exists: false } },
            { categoryId: null }
          ];
        } else if (key === 'category') {
          mongoFilter.categoryId = value;
        } else if (key === 'stockQuantity') {
          mongoFilter.stockQuantity = Number(value);
        } else if (key === 'stockQuantity_gt') {
          mongoFilter.stockQuantity = { $gt: Number(value) };
        } else if (key === 'noImages' && value === 1) {
          mongoFilter.$and = [
            { $or: [ 
              { mainImage: { $exists: false } }, 
              { mainImage: '' }, 
              { mainImage: null },
              { mainImage: 'placeholder.jpg' }
            ] },
            { $or: [ 
              { images: { $exists: false } }, 
              { images: { $size: 0 } },
              { images: [] }
            ] }
          ];
        } else if (key === 'withImages' && value === 1) {
          mongoFilter.$or = [
            { $and: [ 
              { mainImage: { $ne: null } }, 
              { mainImage: { $ne: '' } },
              { mainImage: { $ne: 'placeholder.jpg' } }
            ] },
            { images: { $exists: true, $not: { $size: 0 } } }
          ];
        } else if (key === 'isActive') {
          mongoFilter.isActive = value === 'true' || value === true;
        } else if (key === 'isMainPage' && value === 1) {
          mongoFilter.isMainPage = true;
        } else if (key === 'isPromotion' && value === 1) {
          mongoFilter.isPromotion = true;
        } else if (key === 'isNewProduct' && value === 1) {
          mongoFilter.isNewProduct = true;
        } else if (key === 'isBestseller' && value === 1) {
          mongoFilter.isBestseller = true;
        } else if (key === 'duplicates' && value === 1) {
          // Дубликаты: ищем все названия, которые встречаются более одного раза
          // (упрощённо, без учёта других фильтров)
          // Можно доработать при необходимости
        } else {
          mongoFilter[key] = value;
        }
      });
      await Product.updateMany(mongoFilter, { isDeleted: true, deletedAt: new Date() });
      return res.json({ success: true, filter: mongoFilter });
    } else if (Array.isArray(ids) && ids.length > 0) {
      await Product.updateMany({ _id: { $in: ids } }, { isDeleted: true, deletedAt: new Date() });
      return res.json({ success: true });
    } else {
      return res.status(400).json({ message: 'Нет id или фильтра для удаления' });
    }
  } catch (e) {
    console.error('Ошибка при массовом soft-удалении:', e);
    return res.status(500).json({ message: 'Ошибка при массовом soft-удалении', error: String(e) });
  }
});

// Восстановить из корзины
router.post('/products/bulk-restore', auth, admin, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'Нет id для восстановления' });
  await Product.updateMany({ _id: { $in: ids } }, { isDeleted: false, deletedAt: null });
  return res.json({ success: true });
});

// Окончательное удаление
router.post('/products/bulk-hard-delete', auth, admin, async (req, res) => {
  try {
    const { ids, all, filter } = req.body;
    if (all && filter && typeof filter === 'object') {
      // Удаление по фильтру
      // Собираем фильтр аналогично getProducts (только нужные поля)
      const mongoFilter: any = {};
      // Преобразуем filter в mongoFilter
      Object.entries(filter).forEach(([key, value]) => {
        if (key === 'category' && value === 'none') {
          mongoFilter.$or = [
            { categoryId: { $exists: false } },
            { categoryId: null }
          ];
        } else if (key === 'category') {
          // Поиск по категории (slug или id)
          mongoFilter.categoryId = value;
        } else if (key === 'stockQuantity') {
          mongoFilter.stockQuantity = Number(value);
        } else if (key === 'stockQuantity_gt') {
          mongoFilter.stockQuantity = { $gt: Number(value) };
        } else if (key === 'noImages' && value === 1) {
          mongoFilter.$and = [
            { $or: [ 
              { mainImage: { $exists: false } }, 
              { mainImage: '' }, 
              { mainImage: null },
              { mainImage: 'placeholder.jpg' }
            ] },
            { $or: [ 
              { images: { $exists: false } }, 
              { images: { $size: 0 } },
              { images: [] }
            ] }
          ];
        } else if (key === 'withImages' && value === 1) {
          mongoFilter.$or = [
            { $and: [ 
              { mainImage: { $ne: null } }, 
              { mainImage: { $ne: '' } },
              { mainImage: { $ne: 'placeholder.jpg' } }
            ] },
            { images: { $exists: true, $not: { $size: 0 } } }
          ];
        } else if (key === 'isActive') {
          mongoFilter.isActive = value === 'true' || value === true;
        } else if (key === 'isMainPage' && value === 1) {
          mongoFilter.isMainPage = true;
        } else if (key === 'isPromotion' && value === 1) {
          mongoFilter.isPromotion = true;
        } else if (key === 'isNewProduct' && value === 1) {
          mongoFilter.isNewProduct = true;
        } else if (key === 'isBestseller' && value === 1) {
          mongoFilter.isBestseller = true;
        } else if (key === 'duplicates' && value === 1) {
          // Дубликаты: ищем все названия, которые встречаются более одного раза
          // (упрощённо, без учёта других фильтров)
          // Можно доработать при необходимости
        } else {
          mongoFilter[key] = value;
        }
      });
      await Product.deleteMany(mongoFilter);
      return res.json({ success: true, filter: mongoFilter });
    } else if (Array.isArray(ids) && ids.length > 0) {
      await Product.deleteMany({ _id: { $in: ids } });
      return res.json({ success: true });
    } else {
      return res.status(400).json({ message: 'Нет id или фильтра для удаления' });
    }
  } catch (e) {
    console.error('Ошибка при массовом удалении:', e);
    return res.status(500).json({ message: 'Ошибка при массовом удалении', error: String(e) });
  }
});

// Массовое обновление полей
router.post('/products/bulk-update', auth, admin, async (req, res) => {
  const { ids, update } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'Нет id для обновления' });
  if (!update || typeof update !== 'object') return res.status(400).json({ message: 'Нет данных для обновления' });
  // Защита: не позволяем затирать slug на пустой/undefined/null
  if ('slug' in update && (!update.slug || typeof update.slug !== 'string' || !update.slug.trim())) {
    delete update.slug;
  }
  await Product.updateMany({ _id: { $in: ids } }, update);
  return res.json({ success: true });
});

// Транслитерация кириллицы в латиницу
function translit(str: string): string {
  const map: { [key: string]: string } = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
    А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'E', Ж: 'Zh', З: 'Z', И: 'I', Й: 'Y', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', П: 'P', Р: 'R', С: 'S', Т: 'T', У: 'U', Ф: 'F', Х: 'H', Ц: 'Ts', Ч: 'Ch', Ш: 'Sh', Щ: 'Sch', Ъ: '', Ы: 'Y', Ь: '', Э: 'E', Ю: 'Yu', Я: 'Ya'
  };
  return str.split('').map(char => map[char] !== undefined ? map[char] : char).join('');
}

// Генерация slug из имени категории
function toSlug(str: string): string {
  return translit(str)
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^a-z0-9-_]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default router; 