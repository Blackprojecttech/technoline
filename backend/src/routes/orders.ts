import express from 'express';
import { Order } from '../models/Order';
import DeliveryMethod from '../models/DeliveryMethod';
import { auth, adminOnly } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';
import fs from 'fs';
import path from 'path';
import { io } from '../index';

const router = express.Router();

// Функция для записи изменений заказов в changelog
function logOrderChange(action: string, details: any) {
  try {
    // Создаем папку logs в backend если её нет
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const CHANGELOG_PATH = path.join(logsDir, 'ai-changelog.json');
    const entry = {
      timestamp: new Date().toISOString(),
      action: 'order_change',
      type: 'order_management',
      order_action: action,
      details: details,
      description: `Изменение заказа: ${action}`
    };

    let changelog = [];
    if (fs.existsSync(CHANGELOG_PATH)) {
      try {
        changelog = JSON.parse(fs.readFileSync(CHANGELOG_PATH, 'utf8'));
      } catch {}
    }
    
    changelog.push(entry);
    
    // Оставляем только последние 100 записей
    if (changelog.length > 100) {
      changelog = changelog.slice(-100);
    }
    
    fs.writeFileSync(CHANGELOG_PATH, JSON.stringify(changelog, null, 2));
  } catch (error) {
    console.error('Ошибка записи в changelog:', error);
    // Не прерываем выполнение основного кода из-за ошибки записи в changelog
  }
}

// Get user orders
router.get('/my-orders', auth, async (req: AuthRequest, res) => {
  try {
    console.log('📦 Получение заказов пользователя:', req.user?._id);
    
    const orders = await Order.find({ userId: req.user?._id })
      .populate('items.productId', 'name mainImage')
      .populate('deliveryMethod', 'name type price')
      .sort({ createdAt: -1 });
    
    console.log('✅ Найдено заказов:', orders.length);
    console.log('📋 Детали заказов:', orders.map(o => ({
      id: o._id,
      orderNumber: o.orderNumber,
      callRequest: o.callRequest,
      callStatus: o.callStatus
    })));
    
    res.json(orders);
  } catch (error) {
    console.error('❌ Ошибка получения заказов:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Get order statistics (должен быть перед /:id)
router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Получаем текущую дату
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Финансовая статистика за сегодня
    const todayStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: today },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$total' },
          profit: { $sum: { $subtract: ['$total', '$shipping'] } }
        }
      }
    ]);

    // Финансовая статистика за месяц
    const monthStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: monthStart },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$total' },
          profit: { $sum: { $subtract: ['$total', '$shipping'] } }
        }
      }
    ]);

    const result = {
      total: 0,
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      // Финансовая статистика
      todayRevenue: todayStats[0]?.revenue || 0,
      todayProfit: todayStats[0]?.profit || 0,
      monthRevenue: monthStats[0]?.revenue || 0,
      monthProfit: monthStats[0]?.profit || 0
    };

    // Подсчитываем общее количество
    result.total = await Order.countDocuments();

    // Заполняем статистику по статусам
    stats.forEach(stat => {
      if (stat._id in result) {
        result[stat._id as keyof typeof result] = stat.count;
      }
    });

    res.json(result);
  } catch (error) {
    console.error('❌ Ошибка получения статистики:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Get order by ID
router.get('/:id', auth, async (req: AuthRequest, res) => {
  try {
    console.log('📦 Getting order by ID:', req.params.id);
    console.log('👤 Request user:', req.user?._id, 'Role:', req.user?.role);
    
    const order = await Order.findById(req.params.id)
      .populate('items.productId', 'name mainImage')
      .populate('userId', 'firstName lastName email')
      .populate('deliveryMethod', 'name type price');

    if (!order) {
      console.log('❌ Order not found:', req.params.id);
      res.status(404).json({ message: 'Заказ не найден' });
      return;
    }

    console.log('📦 Order found:', order._id);
    console.log('👤 Order owner (raw):', order.userId);
    console.log('👤 Order owner type:', typeof order.userId);
    console.log('🔐 Checking access...');

    // Check if user owns the order or is admin
    const userId = req.user?._id?.toString();
    
    // Handle both populated and unpopulated userId
    let orderOwnerId: string | undefined;
    const userIdObj = order.userId as any;
    if (userIdObj && typeof userIdObj === 'object' && userIdObj._id) {
      // If userId is populated (object), get the _id from it
      orderOwnerId = userIdObj._id.toString();
    } else {
      // If userId is not populated (string/ObjectId), convert to string
      orderOwnerId = order.userId?.toString();
    }
    
    console.log('🔍 Comparing IDs:');
    console.log('  User ID:', userId);
    console.log('  Order Owner ID:', orderOwnerId);
    console.log('  Are equal:', userId === orderOwnerId);
    console.log('  User role:', req.user?.role);
    
    if (userId !== orderOwnerId && req.user?.role !== 'admin') {
      console.log('❌ Access denied - User:', userId, 'Order owner:', orderOwnerId);
      res.status(403).json({ message: 'Доступ запрещен' });
      return;
    }

    console.log('✅ Access granted for order:', order._id);
    console.log('📋 Детали заказа:', {
      id: order._id,
      orderNumber: order.orderNumber,
      callRequest: order.callRequest,
      callStatus: order.callStatus
    });
    res.json(order);
  } catch (error) {
    console.error('❌ Error getting order:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Create new order
router.post('/', auth, async (req: AuthRequest, res) => {
  try {
    console.log('📦 Создание заказа:', {
      userId: req.user?._id,
      body: req.body
    });
    
    // Генерируем номер заказа
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const orderNumber = `TL-${year}${month}${day}-${random}`;

    // --- Сохраняем выбранный ПВЗ СДЭК в корень заказа ---
    let cdekPVZ = null;
    if (req.body.cdekPVZ) {
      cdekPVZ = req.body.cdekPVZ;
    } else if (req.body.shippingAddress && req.body.shippingAddress.pvzCdek) {
      cdekPVZ = req.body.shippingAddress.pvzCdek;
    }

    // --- Сохраняем адрес ПВЗ СДЭК, если пришёл ---
    let cdekPvzAddress = '';
    if (req.body.cdekPvzAddress) {
      cdekPvzAddress = req.body.cdekPvzAddress;
    } else if (req.body.shippingAddress && req.body.shippingAddress.cdekPvzAddress) {
      cdekPvzAddress = req.body.shippingAddress.cdekPvzAddress;
    }

    // --- Сохраняем ожидаемую дату доставки СДЭК, если пришла ---
    let cdekDeliveryDate = '';
    if (req.body.cdekDeliveryDate) {
      cdekDeliveryDate = req.body.cdekDeliveryDate;
    }

    // --- Новый блок: пересчёт shipping и total по deliveryMethod ---
    let shipping = req.body.shipping || 0; // Используем shipping из фронтенда, если передано
    let subtotal = 0;
    let total = 0;
    const items = req.body.items || [];
    subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    
    // Если shipping не передано с фронтенда, рассчитываем на бэкенде
    if (!req.body.shipping && req.body.deliveryMethod) {
      let deliveryMethod = await DeliveryMethod.findById(req.body.deliveryMethod);
      if (deliveryMethod) {
        // Корректно определяем стоимость доставки по типу
        const costType = (deliveryMethod as any).costType;
        // --- ДОБАВЛЕНО: поддержка zonePrices ---
        const zoneKey = req.body.zoneKey || req.body.zoneResult;
        if (costType === 'zone' && deliveryMethod.zonePrices && zoneKey && deliveryMethod.zonePrices[zoneKey] !== undefined) {
          shipping = deliveryMethod.zonePrices[zoneKey];
        } else if (costType === 'fixed' && (deliveryMethod as any).fixedCost !== undefined && (deliveryMethod as any).fixedCost !== null) {
          shipping = (deliveryMethod as any).fixedCost;
        } else if (costType === 'percentage' && (deliveryMethod as any).costPercentage) {
          shipping = Math.round(subtotal * ((deliveryMethod as any).costPercentage / 100));
        } else if ((deliveryMethod as any).price !== undefined) {
          shipping = (deliveryMethod as any).price;
        } else {
          shipping = 0;
        }
      }
    }
    total = subtotal + shipping;

    console.log('📦 Shipping calculation:', {
      frontendShipping: req.body.shipping,
      calculatedShipping: shipping,
      subtotal,
      total
    });

    const order = new Order({
      ...req.body,
      userId: req.user?._id,
      deliveryInterval: req.body.deliveryInterval || '',
      orderNumber: orderNumber,
      status: 'pending', // Ожидает подтверждения
      shipping,
      subtotal,
      total,
      ...(cdekPVZ ? { cdekPVZ } : {}),
      ...(cdekPvzAddress ? { cdekPvzAddress } : {}),
      ...(cdekDeliveryDate ? { cdekDeliveryDate } : {}),
    });
    
    console.log('📦 Заказ перед сохранением:', order);
    
    const createdOrder = await order.save();
    
    console.log('✅ Заказ создан успешно:', createdOrder._id);
    
    const populatedOrder = await Order.findById(createdOrder._id)
      .populate('items.productId', 'name mainImage')
      .populate('userId', 'firstName lastName email')
      .populate('deliveryMethod', 'name type price');
    
    // Логируем создание заказа
    logOrderChange('order_created', {
      order_id: createdOrder._id,
      order_number: createdOrder.orderNumber,
      user_id: req.user?._id,
      total: createdOrder.total,
      status: createdOrder.status,
      delivery_method: req.body.deliveryMethod,
      delivery_date: req.body.deliveryDate,
      delivery_time: req.body.deliveryTime,
      cdek_delivery_date: req.body.cdekDeliveryDate,
      cdek_pvz_address: req.body.cdekPvzAddress,
      items_count: createdOrder.items.length
    });
    
    res.status(201).json(populatedOrder);
  } catch (error) {
    console.error('❌ Ошибка создания заказа:', error);
    
    // Логируем ошибку создания заказа
    logOrderChange('order_creation_error', {
      user_id: req.user?._id,
      error: error instanceof Error ? error.message : String(error),
      request_body: req.body
    });
    
    res.status(400).json({ 
      message: 'Ошибка при создании заказа',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Admin routes
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    const filter: any = {};
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate('userId', 'firstName lastName email')
      .populate('deliveryMethod', 'name type price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Full order update (admin only)
router.put('/:id', auth, adminOnly, async (req: AuthRequest, res) => {
  try {
    console.log('🔄 Full order update request:', {
      orderId: req.params.id,
      body: req.body,
      shippingValue: req.body.shipping,
      shippingType: typeof req.body.shipping
    });

    console.log('🔍 Looking for order with ID:', req.params.id);
    console.log('📦 Order model available:', !!Order);
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      console.log('❌ Order not found:', req.params.id);
      res.status(404).json({ message: 'Заказ не найден' });
      return;
    }

    // Сохраняем старые значения для логирования
    const oldValues = {
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      deliveryMethod: order.deliveryMethod,
      deliveryDate: order.deliveryDate,
      deliveryTime: order.deliveryTime,
      trackingNumber: order.trackingNumber,
      estimatedDelivery: order.estimatedDelivery,
      notes: order.notes,
      shipping: order.shipping,
      items: order.items,
      shippingAddress: order.shippingAddress,
      cdekPvzAddress: order.cdekPvzAddress
    };

    // Обновляем основные поля
    if (req.body.status) order.status = req.body.status;
    if (req.body.paymentStatus) order.paymentStatus = req.body.paymentStatus;
    if (req.body.paymentMethod) order.paymentMethod = req.body.paymentMethod;
    if (req.body.deliveryMethod) order.deliveryMethod = req.body.deliveryMethod;
    if (req.body.deliveryDate) order.deliveryDate = req.body.deliveryDate;
    if (req.body.trackingNumber !== undefined) order.trackingNumber = req.body.trackingNumber;
    if (req.body.estimatedDelivery) order.estimatedDelivery = req.body.estimatedDelivery;
    if (req.body.notes !== undefined) order.notes = req.body.notes;
    if (req.body.deliveryInterval !== undefined) order.deliveryInterval = req.body.deliveryInterval;
    if (req.body.cdekPvzAddress !== undefined) order.cdekPvzAddress = req.body.cdekPvzAddress;
    // Обновляем стоимость доставки, если она передана с фронтенда
    if (req.body.shipping !== undefined) {
      order.shipping = parseFloat(req.body.shipping) || 0;
      console.log('🚚 Updated shipping cost from frontend:', order.shipping);
    }

    // Обновляем адрес доставки
    if (req.body.firstName) order.shippingAddress.firstName = req.body.firstName;
    if (req.body.lastName) order.shippingAddress.lastName = req.body.lastName;
    if (req.body.email) order.shippingAddress.email = req.body.email;
    if (req.body.phone) order.shippingAddress.phone = req.body.phone;
    if (req.body.address) order.shippingAddress.address = req.body.address;
    if (req.body.city) order.shippingAddress.city = req.body.city;
    if (req.body.state) order.shippingAddress.state = req.body.state;
    if (req.body.zipCode) order.shippingAddress.zipCode = req.body.zipCode;
    if (req.body.country) order.shippingAddress.country = req.body.country;

    // Обновляем товары
    if (req.body.items && Array.isArray(req.body.items)) {
      // Преобразуем строковые ID в ObjectId и добавляем недостающие поля
      const updatedItems = req.body.items.map((item: any) => ({
        productId: item.productId,
        name: item.name || 'Товар',
        price: item.price || 0,
        quantity: item.quantity || 1,
        image: item.image || '',
        sku: item.sku || ''
      }));
      
      order.items = updatedItems;
      // Пересчитываем общую сумму
      order.subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      console.log('📦 Updated items:', {
        itemsCount: order.items.length,
        subtotal: order.subtotal
      });
    }

    // Обновляем метод доставки и его цену (только если не передана стоимость с фронтенда)
    if (req.body.deliveryMethod && req.body.shipping === undefined) {
      order.deliveryMethod = req.body.deliveryMethod;
      
      // Получаем актуальную цену метода доставки
      const deliveryMethod = await DeliveryMethod.findById(req.body.deliveryMethod);
      if (deliveryMethod) {
        // Определяем цену доставки в зависимости от типа стоимости
        let shippingCost = 0;
        if (deliveryMethod.costType === 'fixed' && deliveryMethod.fixedCost) {
          shippingCost = deliveryMethod.fixedCost;
        } else if (deliveryMethod.costType === 'percentage' && deliveryMethod.costPercentage) {
          // Для процентной стоимости нужно пересчитать на основе подытога
          shippingCost = Math.round(order.subtotal * (deliveryMethod.costPercentage / 100));
        }
        
        order.shipping = shippingCost;
        console.log('🚚 Updated delivery method:', {
          methodId: req.body.deliveryMethod,
          methodName: deliveryMethod.name,
          costType: deliveryMethod.costType,
          fixedCost: deliveryMethod.fixedCost,
          costPercentage: deliveryMethod.costPercentage,
          calculatedShipping: shippingCost
        });
      }
    } else if (req.body.deliveryMethod) {
      // Если передана стоимость с фронтенда, просто обновляем метод доставки
      order.deliveryMethod = req.body.deliveryMethod;
      console.log('🚚 Updated delivery method (shipping cost from frontend):', req.body.deliveryMethod);
    }

    // Пересчитываем общую сумму с учетом доставки
    order.total = order.subtotal + (order.shipping || 0);

    console.log('💰 Order totals:', {
      subtotal: order.subtotal,
      shipping: order.shipping,
      total: order.total
    });

    const updatedOrder = await order.save();
    
    const populatedOrder = await Order.findById(updatedOrder._id)
      .populate('userId', 'firstName lastName email')
      .populate('deliveryMethod', 'name type price')
      .populate('items.productId', 'name mainImage');
    
    // Логируем полное обновление заказа
    logOrderChange('order_fully_updated', {
      order_id: order._id,
      order_number: order.orderNumber,
      admin_user_id: req.user?._id,
      admin_role: req.user?.role,
      old_values: oldValues,
      new_values: {
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        deliveryMethod: order.deliveryMethod,
        deliveryDate: order.deliveryDate,
        deliveryTime: order.deliveryTime,
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery,
        notes: order.notes,
        shipping: order.shipping,
        items: order.items,
        shippingAddress: order.shippingAddress,
        cdekPvzAddress: order.cdekPvzAddress
      }
    });
    
    console.log('✅ Order updated successfully');
    res.json(populatedOrder);
  } catch (error) {
    console.error('❌ Error updating order:', error);
    // Логируем ошибку полного обновления заказа
    logOrderChange('order_full_update_error', {
      order_id: req.params.id,
      admin_user_id: req.user?._id,
      admin_role: req.user?.role,
      error: error instanceof Error ? error.message : String(error),
      request_body: req.body
    });
    
    res.status(400).json({ message: 'Ошибка при обновлении заказа' });
  }
});

// Массовое изменение статуса заказов (admin only)
router.post('/bulk-update-status', auth, adminOnly, async (req: AuthRequest, res) => {
  try {
    const { orderIds, status } = req.body;
    const { user } = req as AuthRequest;
    if (!Array.isArray(orderIds) || !status) {
      res.status(400).json({ message: 'Передайте массив orderIds и новый статус' });
      return;
    }
    const result = await Order.updateMany(
      { _id: { $in: orderIds } },
      { $set: { status: status } }
    );
    // Логируем массовое изменение статуса
    logOrderChange('bulk_status_update', {
      order_ids: orderIds,
      new_status: status,
      admin_user_id: user?._id,
      admin_role: user?.role,
      modified_count: result.modifiedCount
    });
    res.json({ success: true, modifiedCount: result.modifiedCount });
    return;
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
    return;
  }
});

// Массовое удаление заказов (admin only)
router.post('/bulk-delete', auth, adminOnly, async (req: AuthRequest, res) => {
  try {
    const { orderIds } = req.body;
    const { user } = req as AuthRequest;
    if (!Array.isArray(orderIds)) {
      res.status(400).json({ message: 'Передайте массив orderIds' });
      return;
    }
    const result = await Order.deleteMany({ _id: { $in: orderIds } });
    // Логируем массовое удаление
    logOrderChange('bulk_delete', {
      order_ids: orderIds,
      admin_user_id: user?._id,
      admin_role: user?.role,
      deleted_count: result.deletedCount
    });
    res.json({ success: true, deletedCount: result.deletedCount });
    return;
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
    return;
  }
});

// Запрос звонка от клиента
router.post('/:id/call-request', auth, async (req: AuthRequest, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      res.status(404).json({ message: 'Заказ не найден' });
      return;
    }

    // Проверяем, что пользователь является владельцем заказа
    const userId = req.user?._id?.toString();
    const orderOwnerId = order.userId?.toString();
    
    if (userId !== orderOwnerId && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Доступ запрещен' });
      return;
    }

    // Обновляем поля звонка
    order.callRequest = req.body.callRequest || true;
    order.callStatus = 'requested'; // Устанавливаем статус как "запрошен"
    await order.save();

    // Логируем запрос звонка
    logOrderChange('call_request', {
      order_id: order._id,
      order_number: order.orderNumber,
      user_id: req.user?._id,
      user_role: req.user?.role,
      call_request: order.callRequest
    });

    // Отправляем событие через Socket.IO
    console.log('🔌 Sending Socket.IO event for call request:', {
      room: `order_${order._id}`,
      orderId: order._id,
      type: 'call-request',
      callRequest: order.callRequest,
      callStatus: order.callStatus
    });
    
    // Получаем количество клиентов в комнате
    const room = io.sockets.adapter.rooms.get(`order_${order._id}`);
    const clientsInRoom = room ? room.size : 0;
    console.log(`🔌 Clients in room order_${order._id}: ${clientsInRoom}`);
    
    // Отправляем событие в комнату конкретного заказа
    io.to(`order_${order._id}`).emit('order-updated', { 
      orderId: order._id,
      type: 'call-request',
      callRequest: order.callRequest,
      callStatus: order.callStatus
    });
    
    // Также отправляем в общую комнату для админки
    io.to('general').emit('order-updated', { 
      orderId: order._id,
      type: 'call-request',
      callRequest: order.callRequest,
      callStatus: order.callStatus
    });

    res.json({ success: true, message: 'Запрос звонка обработан' });
  } catch (error) {
    console.error('❌ Error processing call request:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Обновление статуса звонка (для админки)
router.patch('/:id/call-status', auth, adminOnly, async (req: AuthRequest, res) => {
  try {
    const { called } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      res.status(404).json({ message: 'Заказ не найден' });
      return;
    }

    // Обновляем статус звонка
    if (called) {
      order.callStatus = 'completed'; // Звонок выполнен
      order.callRequest = false; // Сбрасываем запрос, чтобы кнопка снова появилась
    } else {
      order.callStatus = 'not_completed'; // Звонок не выполнен
      order.callRequest = false; // Сбрасываем запрос и в случае невыполненного звонка
    }

    await order.save();

    // Логируем обновление статуса звонка
    logOrderChange('call_status_update', {
      order_id: order._id,
      order_number: order.orderNumber,
      admin_user_id: req.user?._id,
      admin_role: req.user?.role,
      called: called,
      call_request: order.callRequest,
      call_status: order.callStatus
    });

    // Отправляем событие через Socket.IO
    console.log('🔌 Sending Socket.IO event for call status update:', {
      room: `order_${order._id}`,
      orderId: order._id,
      type: 'call-status-update',
      callRequest: order.callRequest,
      callStatus: order.callStatus
    });
    
    // Получаем количество клиентов в комнате
    const room = io.sockets.adapter.rooms.get(`order_${order._id}`);
    const clientsInRoom = room ? room.size : 0;
    console.log(`🔌 Clients in room order_${order._id}: ${clientsInRoom}`);
    
    // Отправляем событие в комнату конкретного заказа
    io.to(`order_${order._id}`).emit('order-updated', { 
      orderId: order._id,
      type: 'call-status-update',
      callRequest: order.callRequest,
      callStatus: order.callStatus
    });
    
    // Также отправляем в общую комнату для админки
    io.to('general').emit('order-updated', { 
      orderId: order._id,
      type: 'call-status-update',
      callRequest: order.callRequest,
      callStatus: order.callStatus
    });

    res.json({ success: true, message: 'Статус звонка обновлен' });
  } catch (error) {
    console.error('❌ Error updating call status:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

export default router; 