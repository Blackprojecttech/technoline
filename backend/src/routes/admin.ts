import express from 'express';
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

const router = express.Router();

// Admin dashboard stats
router.get('/dashboard', auth, admin, async (req, res) => {
  try {
    // Получаем статистику
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    
    // Считаем общую выручку
    const orders = await Order.find({ status: 'completed' });
    const totalRevenue = orders.reduce((sum: number, order: IOrder) => sum + order.total, 0);
    
    // Получаем последние заказы
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'firstName lastName email');

    return res.json({
      totalOrders,
      totalUsers,
      totalProducts,
      totalRevenue,
      recentOrders: recentOrders.map((order) => {
        const user = (order as any).userId;
        return {
          orderNumber: order.orderNumber,
          customerName: user && user.firstName ? `${user.firstName} ${user.lastName}` : 'Неизвестный',
          total: order.total,
          status: order.status,
          createdAt: order.createdAt
        };
      })
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
    
    // Считаем сумму и средний чек
    const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const averageCheck = orders.length ? Math.round(totalSpent / orders.length) : 0;
    
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
    const changelogPath = path.resolve(__dirname, '../logs/ai-changelog.json');
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
    const changelogPath = path.resolve(__dirname, '../logs/ai-changelog.json');
    
    if (!fs.existsSync(changelogPath)) {
      return res.json([]);
    }
    
    const changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf-8'));
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

export default router; 