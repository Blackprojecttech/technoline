import express from 'express';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import DeliveryMethod from '../models/DeliveryMethod';
import { auth, adminOnly, adminOrModerator, adminOrAccountant } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';
import fs from 'fs';
import path from 'path';
import { io } from '../index';
import { getTrackingInfo } from '../services/trackingService';
import { cdekServiceInstance } from '../services/cdekService';
import { User } from '../models/User';
import { Types } from 'mongoose';
import Notification from '../models/Notification';
import { normalizePhone, isPhoneNumber, createPhoneSearchRegex, createDigitsSearchRegex } from '../utils/phoneUtils';
import { eventController } from '../controllers/eventController';

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
    const user = req.user!;
    const userId = user._id;
    const email = user.email;
    const phone = user.phone;
    
    console.log('📦 Получение заказов пользователя:', {
      userId,
      email,
      phone
    });

    // Ищем заказы по userId или контактным данным
    const orders = await Order.find({
      $or: [
        { userId },
        { guestEmail: email },
        { guestPhone: phone }
      ]
    })
      .populate('items.productId', 'name mainImage slug')
      .populate('deliveryMethod', 'name type price')
      .sort({ createdAt: -1 });

    console.log('✅ Найдено заказов:', orders.length);
    
    res.json(orders);
  } catch (error) {
    console.error('❌ Ошибка получения заказов:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Get order statistics (должен быть перед /:id)
router.get('/stats', auth, adminOrAccountant, async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Получаем текущую дату в московском времени (UTC+3)
    const now = new Date();
    
    // Создаем даты в московском времени
    const moscowOffset = 3; // UTC+3 для Москвы
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - moscowOffset));
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1 - moscowOffset));



    // Финансовая статистика за сегодня - ОБОРОТ (только доставленные заказы)
    const todayRevenueStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: today, $lt: tomorrow },
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

    // Финансовая статистика за сегодня - ПРИБЫЛЬ (только доставленные заказы)
    const todayProfitStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: today, $lt: tomorrow },
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
          },
          totalCost: {
            $sum: {
              $map: {
                input: '$items',
                as: 'item',
                in: {
                  $multiply: [
                    '$$item.quantity',
                    { $ifNull: ['$$item.costPrice', 0] }
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
          profit: { $sum: { $subtract: ['$totalRevenue', '$totalCost'] } }
        }
      }
    ]);



    // Финансовая статистика за месяц - ОБОРОТ (только доставленные заказы)
    const monthRevenueStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: monthStart },
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

    // Финансовая статистика за месяц - ПРИБЫЛЬ (только доставленные заказы)
    const monthProfitStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: monthStart },
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
          },
          totalCost: {
            $sum: {
              $map: {
                input: '$items',
                as: 'item',
                in: {
                  $multiply: [
                    '$$item.quantity',
                    { $ifNull: ['$$item.costPrice', 0] }
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
          profit: { $sum: { $subtract: ['$totalRevenue', '$totalCost'] } }
        }
      }
    ]);



    // Статистика по запросам звонков
    const callRequestStats = await Order.aggregate([
      {
        $match: {
          callRequest: true,
          callStatus: { $ne: 'completed' }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 }
        }
      }
    ]);

    // Статистика по новым заказам (pending)
    const newOrdersStats = await Order.aggregate([
      {
        $match: {
          status: 'pending'
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 }
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
      todayRevenue: todayRevenueStats[0]?.revenue || 0,
      todayProfit: todayProfitStats[0]?.profit || 0,
      monthRevenue: monthRevenueStats[0]?.revenue || 0,
      monthProfit: monthProfitStats[0]?.profit || 0,
      // Уведомления
      callRequests: callRequestStats[0]?.count || 0,
      newOrders: newOrdersStats[0]?.count || 0
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

// Получение информации о трекинге заказа
router.get('/tracking/:trackingNumber', auth, async (req: AuthRequest, res) => {
  try {
    const { trackingNumber } = req.params;
    
    if (!trackingNumber) {
      res.status(400).json({ message: 'Трек-номер не указан' });
      return;
    }

    // Получаем информацию о трекинге через CDEK API
    const trackingInfo = await getTrackingInfo(trackingNumber);
    
    if (!trackingInfo) {
      res.status(404).json({ message: 'Информация о трекинге не найдена' });
      return;
    }

    res.json(trackingInfo);
  } catch (error) {
    console.error('❌ Error fetching tracking info:', error);
    res.status(500).json({ message: 'Ошибка получения информации о трекинге' });
  }
});

// Get order by ID
router.get('/:id', async (req, res) => {
  try {
    console.log('📦 Getting order by ID:', req.params.id);
    
    const order = await Order.findById(req.params.id)
      .populate('items.productId', 'name mainImage slug')
      .populate('userId', 'firstName lastName email')
      .populate('deliveryMethod', 'name type price');

    if (!order) {
      console.log('❌ Order not found:', req.params.id);
      res.status(404).json({ message: 'Заказ не найден' });
      return;
    }

    console.log('✅ Order found:', order._id);
    console.log('📋 Детали заказа:', {
      id: order._id,
      orderNumber: order.orderNumber,
      callRequest: order.callRequest,
      callStatus: order.callStatus,
      cdekPvzCode: order.cdekPvzCode
    });

    res.json(order);
  } catch (error) {
    console.error('❌ Error getting order:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Create new order
router.post('/', async (req, res) => {
  try {
    console.log('📦 Создание заказа:', {
      userId: req.body.userId,
      body: req.body
    });

    // Проверяем, существует ли пользователь с таким email или телефоном
    const { email, phone } = req.body.shippingAddress;
    let userId = req.body.userId;

    if (!userId && (email || phone)) {
      let user = await User.findOne({
        $or: [
          { email: email },
          { phone: phone }
        ]
      });

      if (!user) {
        // Создаем нового пользователя без пароля
        user = new User({
          email: email,
          phone: phone,
          firstName: req.body.shippingAddress.firstName,
          lastName: req.body.shippingAddress.lastName,
          address: req.body.shippingAddress.address,
          city: req.body.shippingAddress.city,
          state: req.body.shippingAddress.state,
          zipCode: req.body.shippingAddress.zipCode,
          isPartiallyRegistered: true
        });
        await user.save();
        console.log('✅ Создан новый пользователь:', user._id);
      }

      userId = user._id;
    }

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

    // --- Сохраняем код ПВЗ СДЭК, если пришёл ---
    let cdekPvzCode = '';
    if (req.body.cdekPvzCode) {
      cdekPvzCode = req.body.cdekPvzCode;
    } else if (req.body.shippingAddress && req.body.shippingAddress.cdekPvzCode) {
      cdekPvzCode = req.body.shippingAddress.cdekPvzCode;
    }

    // --- Сохраняем ожидаемую дату доставки СДЭК, если пришла ---
    let cdekDeliveryDate = '';
    if (req.body.cdekDeliveryDate) {
      cdekDeliveryDate = req.body.cdekDeliveryDate;
    }

    // --- Новый блок: пересчёт shipping и total по deliveryMethod ---
    let shipping = req.body.shipping || 0;
    let subtotal = 0;
    let total = 0;
    const items = req.body.items || [];
    
    // Получаем себестоимость товаров из базы данных
    const productIds = items.map((item: any) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } }).select('costPrice');
    const productCostMap = new Map();
    products.forEach((product: any) => {
      productCostMap.set(product._id.toString(), product.costPrice || 0);
    });
    
    // Добавляем себестоимость к каждому товару
    const itemsWithCost = items.map((item: any) => ({
      ...item,
      costPrice: productCostMap.get(item.productId.toString()) || 0
    }));
    
    subtotal = itemsWithCost.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    
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
        } else if (costType === 'fixed_plus_percentage' && (deliveryMethod as any).fixedCost !== undefined && (deliveryMethod as any).costPercentage) {
          const fixedPart = (deliveryMethod as any).fixedCost;
          const percentagePart = Math.round(subtotal * ((deliveryMethod as any).costPercentage / 100));
          shipping = fixedPart + percentagePart;
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

    const orderData = {
      ...req.body,
      items: itemsWithCost,
      userId: userId, // Используем ID найденного или созданного пользователя
      guestEmail: req.body.shippingAddress?.email,
      guestPhone: req.body.shippingAddress?.phone,
      deliveryInterval: req.body.deliveryInterval || '',
      orderNumber: orderNumber,
      status: 'pending',
      shipping,
      subtotal,
      total,
      ...(cdekPVZ ? { cdekPVZ } : {}),
      ...(cdekPvzAddress ? { cdekPvzAddress } : {}),
      ...(cdekPvzCode ? { cdekPvzCode } : {}),
      ...(cdekDeliveryDate ? { cdekDeliveryDate } : {})
    };

    console.log('📦 Заказ перед сохранением:', orderData);
    
    const order = new Order(orderData);
    const createdOrder = await order.save();
    
    console.log('✅ Заказ создан успешно:', createdOrder._id);
    
    const populatedOrder = await Order.findById(createdOrder._id)
      .populate('items.productId', 'name mainImage')
      .populate('userId', 'firstName lastName email')
      .populate('deliveryMethod', 'name type price');
    
    // Логируем создание заказа
    logOrderChange('order_created', {
      order_id: String(createdOrder._id),
      order_number: createdOrder.orderNumber,
      user_id: req.body.userId,
      total: createdOrder.total,
      status: createdOrder.status,
      delivery_method: req.body.deliveryMethod,
      delivery_date: req.body.deliveryDate,
      delivery_time: req.body.deliveryTime,
      cdek_delivery_date: req.body.cdekDeliveryDate,
      cdek_pvz_address: req.body.cdekPvzAddress,
      items_count: createdOrder.items.length
    });
    
    // Отправляем уведомление о новом заказе в канал
    try {
      const messageText = `🆕 <b>НОВЫЙ ЗАКАЗ С САЙТА!</b> 🆕\n\n` +
        `📋 <b>Номер заказа:</b> <code>${createdOrder.orderNumber}</code>\n\n` +
        `👤 <b>КЛИЕНТ:</b>\n` +
        `   Имя: ${req.body.shippingAddress?.firstName || ''} ${req.body.shippingAddress?.lastName || ''}\n` +
        `   📞 Телефон: <code>${req.body.shippingAddress?.phone || ''}</code>\n\n` +
        `📍 <b>АДРЕС ДОСТАВКИ:</b>\n   ${[req.body.shippingAddress?.address, req.body.shippingAddress?.city, req.body.shippingAddress?.state, req.body.shippingAddress?.zipCode, req.body.shippingAddress?.country].filter(Boolean).join(', ')}\n\n` +
        `📦 <b>ТОВАРЫ:</b>\n` +
        itemsWithCost.map((item: any, idx: number) => 
          `   ${idx + 1}. ${item.name}\n      ${item.quantity} шт. × ${item.price}₽ = ${item.quantity * item.price}₽`
        ).join('\n') + `\n\n` +
        `💰 <b>ИТОГО:</b>\n` +
        `   Товары: ${subtotal.toLocaleString()}₽\n` +
        `   Доставка: ${shipping.toLocaleString()}₽\n` +
        `   <b>К ОПЛАТЕ: ${total.toLocaleString()}₽</b>\n\n` +
        `📅 <b>ВРЕМЯ ДОСТАВКИ:</b> ${(() => {
          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const day3 = new Date(today);
          day3.setDate(day3.getDate() + 2);
          
          const formatDate = (date: Date) => {
            const options: Intl.DateTimeFormatOptions = { 
              day: 'numeric', 
              month: 'long'
            };
            return date.toLocaleDateString('ru-RU', options);
          };
          
          if (req.body.deliveryDate === 'today') {
            return `Сегодня ${formatDate(today)}`;
          } else if (req.body.deliveryDate === 'tomorrow') {
            return `Завтра ${formatDate(tomorrow)}`;
          } else if (req.body.deliveryDate === 'day3') {
            return `Послезавтра ${formatDate(day3)}`;
          } else {
            return req.body.deliveryDate;
          }
        })()}${req.body.deliveryInterval ? ` (${req.body.deliveryInterval})` : ''}\n\n` +
        `⏰ <i>Время создания: ${new Date().toLocaleString('ru-RU')}</i>`;
      
      const telegramToken = '7838214378:AAGhAoArjQMTarjD7Gg5t7Y7z7tJrCBjdMU';
      const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
      
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: '-1002852588371', // Канал для новых заказов с сайта
          text: messageText,
          parse_mode: 'HTML'
        })
      });
      
      console.log('✅ Уведомление о новом заказе отправлено в канал');
    } catch (telegramError) {
      console.error('❌ Ошибка отправки уведомления в Telegram:', telegramError);
    }
    
    res.status(201).json(populatedOrder);
  } catch (error) {
    console.error('❌ Ошибка создания заказа:', error);
    
    // Логируем ошибку создания заказа
    logOrderChange('order_creation_error', {
      user_id: req.body.userId,
      error: error instanceof Error ? error.message : String(error),
      request_body: req.body
    });
    
    res.status(400).json({ 
      message: 'Ошибка при создании заказа',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Update order
router.put('/:id', auth, adminOnly, async (req: AuthRequest, res) => {
  try {
    console.log('📦 Обновление заказа:', req.params.id);
    console.log('📋 Полученные данные:', JSON.stringify(req.body, null, 2));
    
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      console.log('❌ Заказ не найден:', req.params.id);
      res.status(404).json({ message: 'Заказ не найден' });
      return;
    }

    console.log('✅ Заказ найден:', order.orderNumber);

    // Обновляем поля заказа
    const updateData: any = {};
    
    // Основные поля
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.paymentStatus !== undefined) updateData.paymentStatus = req.body.paymentStatus;
    if (req.body.paymentMethod !== undefined) updateData.paymentMethod = req.body.paymentMethod;
    if (req.body.deliveryMethod !== undefined) updateData.deliveryMethod = req.body.deliveryMethod;
    if (req.body.deliveryDate !== undefined) updateData.deliveryDate = req.body.deliveryDate;
    if (req.body.trackingNumber !== undefined) updateData.trackingNumber = req.body.trackingNumber;
    if (req.body.estimatedDelivery !== undefined) updateData.estimatedDelivery = req.body.estimatedDelivery;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;
    if (req.body.shipping !== undefined) updateData.shipping = req.body.shipping;
    if (req.body.deliveryInterval !== undefined) updateData.deliveryInterval = req.body.deliveryInterval;
    if (req.body.cdekPvzAddress !== undefined) updateData.cdekPvzAddress = req.body.cdekPvzAddress;
    if (req.body.cdekPvzCode !== undefined) updateData.cdekPvzCode = req.body.cdekPvzCode;
    if (req.body.items !== undefined) updateData.items = req.body.items;

    // Контактные данные
    if (req.body.firstName !== undefined) updateData['shippingAddress.firstName'] = req.body.firstName;
    if (req.body.lastName !== undefined) updateData['shippingAddress.lastName'] = req.body.lastName;
    if (req.body.email !== undefined) updateData['shippingAddress.email'] = req.body.email;
    if (req.body.phone !== undefined) updateData['shippingAddress.phone'] = req.body.phone;
    if (req.body.address !== undefined) updateData['shippingAddress.address'] = req.body.address;
    if (req.body.city !== undefined) updateData['shippingAddress.city'] = req.body.city;
    if (req.body.state !== undefined) updateData['shippingAddress.state'] = req.body.state;
    if (req.body.zipCode !== undefined) updateData['shippingAddress.zipCode'] = req.body.zipCode;
    if (req.body.country !== undefined) updateData['shippingAddress.country'] = req.body.country;

    console.log('📦 Обновляемые данные:', updateData);

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).populate('userId', 'firstName lastName email')
     .populate('deliveryMethod', 'name type price');

    if (!updatedOrder) {
      console.log('❌ Ошибка при обновлении заказа');
      res.status(500).json({ message: 'Ошибка при обновлении заказа' });
      return;
    }

    console.log('✅ Заказ обновлен успешно:', updatedOrder.orderNumber);
    console.log('📦 Возвращаемый заказ:', JSON.stringify(updatedOrder, null, 2));
    console.log('📦 Трек-номер в возвращаемом заказе:', updatedOrder.trackingNumber);

    // --- Определяем реально изменённые поля и их значения (с учётом вложенных shippingAddress.*) ---
    const changedFields: Record<string, { from: any, to: any }> = {};
    for (const key of Object.keys(updateData)) {
      if (key.startsWith('shippingAddress.')) {
        const field = key.split('.')[1];
        const shippingAddress = (order.shippingAddress || {}) as Record<string, any>;
        const oldValue = shippingAddress[field];
        const newValue = updateData[key];
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changedFields[key] = { from: oldValue, to: newValue };
        }
      } else {
        const orderAny = order as any;
        const oldValue = orderAny[key];
        const newValue = updateData[key];
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changedFields[key] = { from: oldValue, to: newValue };
        }
      }
    }
    // Логируем обновление заказа
    logOrderChange('order_updated', {
      order_id: String(updatedOrder._id),
      order_number: updatedOrder.orderNumber,
      admin_user_id: req.user?._id,
      admin_user_name: req.user ? `${req.user.firstName} ${req.user.lastName}` : undefined,
      updated_fields: Object.keys(changedFields),
      changed_fields: changedFields,
      tracking_number: req.body.trackingNumber,
      status: req.body.status
    });

    // Отправляем событие через Socket.IO
    io.to(`order_${updatedOrder._id}`).emit('order-updated', { 
      orderId: updatedOrder._id,
      type: 'order-updated',
      trackingNumber: updatedOrder.trackingNumber,
      status: updatedOrder.status
    });

    // После обновления заказа
    // Если статус стал 'delivered', создать уведомление пользователю
    if (
      updateData.status === 'delivered' &&
      updatedOrder && updatedOrder.userId
    ) {
      // Для каждого товара заказа создать уведомление
      for (const item of updatedOrder.items) {
        // Берём slug только из productId.slug, не генерируем!
        let link = (item.productId && typeof item.productId === 'object' && 'slug' in item.productId && item.productId.slug)
          ? `/product/${item.productId.slug}`
          : undefined;
        await Notification.create({
          user: updatedOrder.userId,
          type: 'review_request',
          text: `Оставьте отзыв на товар "${item.name || 'Товар'}"! Нам важно ваше мнение.`,
          link
        });
      }
    }

    res.json(updatedOrder);
  } catch (error) {
    console.error('❌ Ошибка обновления заказа:', error);
    res.status(500).json({ message: 'Ошибка сервера при обновлении заказа' });
  }
});

// Admin routes
router.get('/', auth, adminOrModerator, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, dateFrom, dateTo, deliveryFilter } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Получаем даты для фильтров в московском времени
    const now = new Date();
    const moscowOffset = 3 * 60; // Москва UTC+3 (в минутах)
    const moscowTime = new Date(now.getTime() + moscowOffset * 60 * 1000);
    
    const today = new Date(moscowTime.getFullYear(), moscowTime.getMonth(), moscowTime.getDate());
    const tomorrow = new Date(moscowTime.getFullYear(), moscowTime.getMonth(), moscowTime.getDate() + 1);

    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    
    // Создаем более гибкие паттерны для поиска дат
    const todayDay = today.getDate();
    const tomorrowDay = tomorrow.getDate();
    const monthNames = ['январ', 'феврал', 'март', 'апрел', 'мая', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр'];
    const currentMonth = monthNames[today.getMonth()];
    const tomorrowMonth = monthNames[tomorrow.getMonth()];
    
    // Создаем функцию для создания гибких условий поиска даты
    const createDateConditions = (targetDate: Date, targetDateStr: string, dayName: string) => {
      const day = targetDate.getDate();
      const month = monthNames[targetDate.getMonth()];
      
      return [
        { deliveryDate: dayName === 'today' ? 'today' : 'tomorrow' }, // Старый формат
        { deliveryDate: targetDateStr }, // ISO формат (YYYY-MM-DD)
        { deliveryDate: { $regex: new RegExp(dayName === 'today' ? 'сегодня' : 'завтра', 'i') } }, // Русский текст
        { deliveryDate: { $regex: new RegExp(`${day}.*${month}`, 'i') } }, // "29 июля"
        { deliveryDate: { $regex: new RegExp(`${dayName === 'today' ? 'сегодня' : 'завтра'}.*${day}`, 'i') } } // "Завтра, 29"
      ];
    };

    // Базовый фильтр
    let filter: any = {};

    // Фильтр по статусу
    if (status) {
      filter.status = status;
    }

    // Фильтр по дате создания
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(String(dateFrom));
      }
      if (dateTo) {
        filter.createdAt.$lte = new Date(String(dateTo));
      }
    }

    // Проверяем, нужна ли агрегация для фильтра доставки
    const needsAggregation = deliveryFilter && ['pickup_today', 'delivery_today', 'delivery_tomorrow'].includes(String(deliveryFilter));

    if (needsAggregation) {
      // Используем агрегацию для фильтров, требующих данные о методах доставки
      let pipeline = [
        {
          $lookup: {
            from: 'deliverymethods',
            localField: 'deliveryMethod',
            foreignField: '_id',
            as: 'deliveryMethodData'
          }
        } as any,
        {
          $unwind: {
            path: '$deliveryMethodData',
            preserveNullAndEmptyArrays: true
          }
        } as any
      ];

      // Применяем фильтр доставки
      switch (deliveryFilter) {
        case 'pickup_today':
          filter.$and = [
            {
              $or: [
                { 'deliveryMethodData.name': { $regex: /самовывоз/i } },
                { 'deliveryMethodData.name': { $regex: /pickup/i } },
                { 'deliveryMethodData.name': { $regex: /пункт выдачи/i } },
                { 'deliveryMethodData.name': { $regex: /магазин/i } }
              ]
            },
            {
              $or: createDateConditions(today, todayStr, 'today')
            }
          ];
          break;
        case 'delivery_today':
          filter.$and = [
            {
              $or: [
                { 'deliveryMethodData.name': { $regex: /курьер/i } },
                { 'deliveryMethodData.name': { $regex: /доставка/i } },
                { 'deliveryMethodData.name': { $regex: /экспресс/i } },
                { 'deliveryMethodData.name': { $regex: /срочная/i } }
              ]
            },
            {
              $or: createDateConditions(today, todayStr, 'today')
            }
          ];
          break;
        case 'delivery_tomorrow':
          filter.$and = [
            {
              $or: [
                { 'deliveryMethodData.name': { $regex: /курьер/i } },
                { 'deliveryMethodData.name': { $regex: /доставка/i } },
                { 'deliveryMethodData.name': { $regex: /экспресс/i } },
                { 'deliveryMethodData.name': { $regex: /срочная/i } }
              ]
            },
            {
              $or: createDateConditions(tomorrow, tomorrowStr, 'tomorrow')
            }
          ];
          break;
      }

      // Обработка поиска для агрегации
      if (search) {
        const searchStr = String(search);
        const isOnlyDigits = /^\d+$/.test(searchStr);
        
        if (isOnlyDigits) {
          const digitsRegex = createDigitsSearchRegex(searchStr);
          const searchFilter = {
            $or: [
              { orderNumber: digitsRegex },
              { 'shippingAddress.phone': digitsRegex },
              { 'guestPhone': digitsRegex }
            ]
          };
          filter = { $and: [filter, searchFilter] };
        } else {
          try {
            const qrData = JSON.parse(searchStr);
            if (qrData.orderNumber) {
              const qrFilter = {
                $or: [
                  { orderNumber: qrData.orderNumber },
                  { _id: qrData.orderId }
                ]
              };
              filter = { $and: [filter, qrFilter] };
            } else if (qrData.userId && qrData.type === 'profile') {
              const { Types } = require('mongoose');
              const userFilter = { userId: new Types.ObjectId(qrData.userId) };
              filter = { $and: [filter, userFilter] };
            }
          } catch (e) {
            const searchRegex = new RegExp(searchStr, 'i');
            const searchFilter = {
              $or: [
                { orderNumber: searchRegex },
                { 'shippingAddress.email': searchRegex },
                { 'shippingAddress.firstName': searchRegex },
                { 'shippingAddress.lastName': searchRegex },
                { 'shippingAddress.address': searchRegex },
                { 'items.name': searchRegex },
                { notes: searchRegex },
                { guestEmail: searchRegex }
              ] as Array<{[key: string]: RegExp}>
            };
            if (searchStr.match(/^[0-9a-fA-F]{24}$/)) {
              (searchFilter.$or as Array<{[key: string]: any}>).push({ _id: searchStr });
            }
            filter = { $and: [filter, searchFilter] };
          }
        }
      }

      // Отладочная информация
          console.log('🔍 Фильтр доставки:', deliveryFilter);
    console.log('🕐 Исходное время сервера (UTC):', new Date().toISOString());
    console.log('🕐 Московское время:', moscowTime.toISOString());
    console.log('📅 Сегодняшняя дата:', todayStr, 'день:', todayDay, 'месяц:', currentMonth);
    console.log('📅 Завтрашняя дата:', tomorrowStr, 'день:', tomorrowDay, 'месяц:', tomorrowMonth);
      
      // Показываем условия поиска для текущего фильтра
      if (deliveryFilter === 'pickup_today' || deliveryFilter === 'delivery_today') {
        console.log('🎯 Условия поиска для СЕГОДНЯ:', JSON.stringify(createDateConditions(today, todayStr, 'today'), null, 2));
      } else if (deliveryFilter === 'delivery_tomorrow') {
        console.log('🎯 Условия поиска для ЗАВТРА:', JSON.stringify(createDateConditions(tomorrow, tomorrowStr, 'tomorrow'), null, 2));
      }
      
      console.log('🎯 Финальный фильтр:', JSON.stringify(filter, null, 2));

      // Завершаем агрегацию
      pipeline.push(
        { $match: filter } as any,
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userData'
          }
        } as any,
        {
          $addFields: {
            userData: {
              $cond: {
                if: { $eq: [{ $size: '$userData' }, 0] },
                then: [{
                  _id: null,
                  firstName: '$shippingAddress.firstName',
                  lastName: '$shippingAddress.lastName',
                  email: '$shippingAddress.email',
                  phone: '$shippingAddress.phone',
                  isPartiallyRegistered: true
                }],
                else: '$userData'
              }
            },
            // Переименовываем deliveryMethodData в deliveryMethod для совместимости с фронтендом
            deliveryMethod: '$deliveryMethodData'
          }
        } as any,
        // Добавляем подсчет доставленных заказов для каждого пользователя
        {
          $lookup: {
            from: 'orders',
            let: { currentUserId: '$userId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$userId', '$$currentUserId'] },
                      { $eq: ['$status', 'delivered'] }
                    ]
                  }
                }
              },
              { $count: 'total' }
            ],
            as: 'deliveredOrdersCount'
          }
        } as any,
        {
          $addFields: {
            deliveredOrdersCount: {
              $ifNull: [{ $arrayElemAt: ['$deliveredOrdersCount.total', 0] }, 0]
            }
          }
        } as any,
        { $unwind: '$userData' } as any,
        { $sort: { createdAt: -1 } } as any
      );

      // Получаем общее количество
      const totalPipeline = [...pipeline, { $count: 'total' } as any];
      const totalResult = await Order.aggregate(totalPipeline);
      const total = totalResult[0]?.total || 0;

      // Получаем заказы с пагинацией
      const ordersPipeline = [
        ...pipeline,
        { $skip: skip } as any,
        { $limit: Number(limit) } as any
      ];
      const orders = await Order.aggregate(ordersPipeline);

      // Отладочная информация о найденных заказах
      if (deliveryFilter) {
        console.log(`📦 Найдено заказов с фильтром "${deliveryFilter}":`, orders.length);
        if (orders.length > 0) {
          console.log('📦 Примеры найденных заказов:', orders.slice(0, 3).map(o => ({
            orderNumber: o.orderNumber,
            deliveryDate: o.deliveryDate,
            deliveryMethodName: o.deliveryMethod?.name
          })));
        }
        
        // Посмотрим на все заказы без фильтра, чтобы понять структуру данных
        if (orders.length === 0) {
          const allOrdersSample = await Order.aggregate([
            {
              $lookup: {
                from: 'deliverymethods',
                localField: 'deliveryMethod',
                foreignField: '_id',
                as: 'deliveryMethodData'
              }
            },
            {
              $unwind: {
                path: '$deliveryMethodData',
                preserveNullAndEmptyArrays: true
              }
            },
            { $limit: 5 },
                         {
               $addFields: {
                 deliveryMethod: '$deliveryMethodData'
               }
             },
             {
               $project: {
                 orderNumber: 1,
                 deliveryDate: 1,
                 'deliveryMethod.name': 1
               }
             }
          ]);
          console.log('📊 Примеры всех заказов в базе:', allOrdersSample);
        }
      }

      return res.json({
        orders,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      });

    } else {
      // Простые фильтры без агрегации
      if (deliveryFilter) {
        switch (deliveryFilter) {
          case 'new':
            filter.status = 'pending';
            break;
          case 'with_courier':
            filter.status = 'with_courier';
            break;
        }
      }

      // Обработка поиска
      if (search) {
        const searchStr = String(search);
        const isOnlyDigits = /^\d+$/.test(searchStr);
        
        if (isOnlyDigits) {
          // Поиск по цифрам
          const digitsRegex = createDigitsSearchRegex(searchStr);
          
          const searchFilter = {
            $or: [
              { orderNumber: digitsRegex },
              { 'shippingAddress.phone': digitsRegex },
              { 'guestPhone': digitsRegex }
            ]
          };

          filter = Object.keys(filter).length > 0 
            ? { $and: [filter, searchFilter] }
            : searchFilter;

        } else {
          // Обработка JSON или текстового поиска
          try {
            const qrData = JSON.parse(searchStr);
            
            if (qrData.orderNumber) {
              const qrFilter = {
                $or: [
                  { orderNumber: qrData.orderNumber },
                  { _id: qrData.orderId }
                ]
              };
              filter = Object.keys(filter).length > 0 
                ? { $and: [filter, qrFilter] }
                : qrFilter;
            } else if (qrData.userId && qrData.type === 'profile') {
              const { Types } = require('mongoose');
              const userFilter = { userId: new Types.ObjectId(qrData.userId) };
              filter = Object.keys(filter).length > 0 
                ? { $and: [filter, userFilter] }
                : userFilter;
            }
          } catch (e) {
            // Обычный текстовый поиск
            const searchRegex = new RegExp(searchStr, 'i');
            const searchFilter = {
              $or: [
                { orderNumber: searchRegex },
                { 'shippingAddress.email': searchRegex },
                { 'shippingAddress.firstName': searchRegex },
                { 'shippingAddress.lastName': searchRegex },
                { 'shippingAddress.address': searchRegex },
                { 'items.name': searchRegex },
                { notes: searchRegex },
                { guestEmail: searchRegex }
              ] as Array<{[key: string]: RegExp}>
            };

            if (searchStr.match(/^[0-9a-fA-F]{24}$/)) {
              (searchFilter.$or as Array<{[key: string]: any}>).push({ _id: searchStr });
            }

            filter = Object.keys(filter).length > 0 
              ? { $and: [filter, searchFilter] }
              : searchFilter;
          }
        }
      }

      // Получаем заказы с пагинацией и всеми связанными данными
      const orders = await Order.aggregate([
        { $match: filter } as any,
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userData'
          }
        } as any,
        {
          $lookup: {
            from: 'deliverymethods',
            localField: 'deliveryMethod',
            foreignField: '_id',
            as: 'deliveryMethodData'
          }
        } as any,
        {
          $unwind: {
            path: '$deliveryMethodData',
            preserveNullAndEmptyArrays: true
          }
        } as any,
        {
          $addFields: {
            userData: {
              $cond: {
                if: { $eq: [{ $size: '$userData' }, 0] },
                then: [{
                  _id: null,
                  firstName: '$shippingAddress.firstName',
                  lastName: '$shippingAddress.lastName',
                  email: '$shippingAddress.email',
                  phone: '$shippingAddress.phone',
                  isPartiallyRegistered: true
                }],
                else: '$userData'
              }
            },
            // Переименовываем deliveryMethodData в deliveryMethod для совместимости с фронтендом
            deliveryMethod: '$deliveryMethodData'
          }
        } as any,
        // Добавляем подсчет доставленных заказов для каждого пользователя
        {
          $lookup: {
            from: 'orders',
            let: { currentUserId: '$userId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$userId', '$$currentUserId'] },
                      { $eq: ['$status', 'delivered'] }
                    ]
                  }
                }
              },
              { $count: 'total' }
            ],
            as: 'deliveredOrdersCount'
          }
        } as any,
        {
          $addFields: {
            deliveredOrdersCount: {
              $ifNull: [{ $arrayElemAt: ['$deliveredOrdersCount.total', 0] }, 0]
            }
          }
        } as any,
        { $unwind: '$userData' } as any,
        { $sort: { createdAt: -1 } } as any,
        { $skip: skip } as any,
        { $limit: Number(limit) } as any
      ]);

      // Получаем общее количество для пагинации
      const total = await Order.countDocuments(filter);

      return res.json({
        orders,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      });
    }

  } catch (error) {
    console.error('Error getting orders:', error);
    return res.status(500).json({ error: 'Error getting orders' });
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
    if (req.body.status) {
      order.status = req.body.status;
      
      // Автоматически устанавливаем статус оплаты как "оплачен" при статусе "доставлен"
      if (req.body.status === 'delivered' && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        console.log('💰 Автоматически установлен статус оплаты как "оплачен" для доставленного заказа');
      }
    }
    if (req.body.paymentStatus) order.paymentStatus = req.body.paymentStatus;
    if (req.body.paymentMethod) order.paymentMethod = req.body.paymentMethod;
    if (req.body.deliveryMethod) order.deliveryMethod = req.body.deliveryMethod;
    if (req.body.deliveryDate) order.deliveryDate = req.body.deliveryDate;
    if (req.body.trackingNumber !== undefined) order.trackingNumber = req.body.trackingNumber;
    if (req.body.estimatedDelivery) order.estimatedDelivery = req.body.estimatedDelivery;
    if (req.body.notes !== undefined) order.notes = req.body.notes;
    if (req.body.deliveryInterval !== undefined) order.deliveryInterval = req.body.deliveryInterval;
    if (req.body.cdekPvzAddress !== undefined) order.cdekPvzAddress = req.body.cdekPvzAddress;
    if (req.body.cdekPvzCode !== undefined) order.cdekPvzCode = req.body.cdekPvzCode;
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
        costPrice: item.costPrice || 0,
        quantity: item.quantity || 1,
        image: item.image || '',
        sku: item.sku || ''
      }));
      
      order.items = updatedItems;
      // Пересчитываем общую сумму
      order.subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      console.log('📦 Updated items:', {
        itemsCount: order.items.length,
        subtotal: order.subtotal,
        itemsWithCostPrice: order.items.filter(item => item.costPrice > 0).length
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
        } else if (deliveryMethod.costType === 'fixed_plus_percentage' && deliveryMethod.fixedCost !== undefined && deliveryMethod.costPercentage) {
          const fixedPart = deliveryMethod.fixedCost;
          const percentagePart = Math.round(order.subtotal * (deliveryMethod.costPercentage / 100));
          shippingCost = fixedPart + percentagePart;
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
      order_id: String(updatedOrder._id),
      order_number: updatedOrder.orderNumber,
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
      order_id: String(req.params.id),
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
    // Подготавливаем обновления
    const updateData: any = { status: status };
    
    // Если статус "доставлен", автоматически устанавливаем оплату как "оплачен"
    if (status === 'delivered') {
      updateData.paymentStatus = 'paid';
      console.log('💰 Массовое обновление: автоматически устанавливаем статус оплаты как "оплачен" для доставленных заказов');
    }
    
    const result = await Order.updateMany(
      { _id: { $in: orderIds } },
      { $set: updateData }
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
      order_id: String(order._id),
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

// Получение заказов клиента (для админки)
router.get('/customer/:userId', auth, adminOnly, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    
    const orders = await Order.find({ userId })
      .select('_id orderNumber createdAt')
      .sort({ createdAt: -1 });
    
    const orderCount = orders.length;
    
    res.json({
      orderCount,
      orders: orders.map(order => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching customer orders:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Обновление статуса звонка (для админки)
router.patch('/:id/call-status', auth, adminOnly, async (req: AuthRequest, res) => {
  try {
    console.log('📞 Call status update request:', {
      orderId: req.params.id,
      body: req.body,
      user: {
        id: req.user?._id,
        role: req.user?.role
      }
    });
    
    const { called } = req.body;
    
    if (typeof called !== 'boolean') {
      console.log('❌ Invalid called parameter:', called);
      res.status(400).json({ message: 'Параметр called должен быть boolean' });
      return;
    }
    
    const order = await Order.findById(req.params.id);
    console.log('📞 Order found:', !!order, order ? order.orderNumber : 'N/A');
    
    if (!order) {
      console.log('❌ Order not found:', req.params.id);
      res.status(404).json({ message: 'Заказ не найден' });
      return;
    }

    console.log('📞 Before update:', {
      callStatus: order.callStatus,
      callRequest: order.callRequest,
      callAttempts: order.callAttempts?.length || 0
    });

    // Подготавливаем данные для обновления
    const updateData: any = {
      callRequest: false // Сбрасываем запрос в любом случае
    };

    if (called) {
      updateData.callStatus = 'completed'; // Звонок выполнен
      updateData.callAttempts = []; // Сбросить историю неудачных попыток
    } else {
      updateData.callStatus = 'not_completed'; // Звонок не выполнен
    }

    console.log('📞 Updating with data:', updateData);

    // Используем findByIdAndUpdate для обновления только нужных полей
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: false } // Отключаем валидацию для существующих данных
    );

    if (!updatedOrder) {
      console.log('❌ Order not found after update:', req.params.id);
      res.status(404).json({ message: 'Заказ не найден после обновления' });
      return;
    }

    console.log('📞 Order updated successfully:', {
      callStatus: updatedOrder.callStatus,
      callRequest: updatedOrder.callRequest,
      callAttempts: updatedOrder.callAttempts?.length || 0
    });

    // Логируем обновление статуса звонка
    logOrderChange('call_status_update', {
      order_id: String(updatedOrder._id),
      order_number: updatedOrder.orderNumber,
      admin_user_id: req.user?._id,
      admin_role: req.user?.role,
      called: called,
      call_request: updatedOrder.callRequest,
      call_status: updatedOrder.callStatus
    });

    // Отправляем событие через Socket.IO
    console.log('🔌 Sending Socket.IO event for call status update:', {
      room: `order_${updatedOrder._id}`,
      orderId: updatedOrder._id,
      type: 'call-status-update',
      callRequest: updatedOrder.callRequest,
      callStatus: updatedOrder.callStatus
    });
    
    // Получаем количество клиентов в комнате
    const room = io.sockets.adapter.rooms.get(`order_${updatedOrder._id}`);
    const clientsInRoom = room ? room.size : 0;
    console.log(`🔌 Clients in room order_${updatedOrder._id}: ${clientsInRoom}`);
    
    // Отправляем событие в комнату конкретного заказа
    io.to(`order_${updatedOrder._id}`).emit('order-updated', { 
      orderId: updatedOrder._id,
      type: 'call-status-update',
      callRequest: updatedOrder.callRequest,
      callStatus: updatedOrder.callStatus
    });
    
    // Также отправляем в общую комнату для админки
    io.to('general').emit('order-updated', { 
      orderId: updatedOrder._id,
      type: 'call-status-update',
      callRequest: updatedOrder.callRequest,
      callStatus: updatedOrder.callStatus
    });

    res.json({ success: true, message: 'Статус звонка обновлен' });
  } catch (error: unknown) {
    console.error('❌ Error updating call status:', error);
    
    // Более подробное логирование ошибки
    if (error instanceof Error) {
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
    
    res.status(500).json({ 
      message: 'Ошибка сервера',
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
});



// Создание СДЭК отправления
router.post('/:id/create-cdek-order', auth, adminOnly, async (req: AuthRequest, res) => {
  try {
    console.log('📦 Создание СДЭК отправления для заказа:', req.params.id);
    console.log('📋 Полученные данные:', JSON.stringify(req.body, null, 2));
    console.log('🔐 Пользователь:', req.user?._id, 'Роль:', req.user?.role);
    
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      console.log('❌ Заказ не найден:', req.params.id);
      res.status(404).json({ message: 'Заказ не найден' });
      return;
    }

    console.log('✅ Заказ найден:', order.orderNumber);
    console.log('📦 Детали заказа:', {
      id: order._id,
      orderNumber: order.orderNumber,
      items: order.items.length,
      total: order.total,
      shipping: order.shipping
    });

    // Используем ТОЛЬКО адрес ПВЗ из заказа, больше ничего не используем
    const recipientAddress = order.cdekPvzAddress || '';
    if (!recipientAddress) {
      console.log('❌ Адрес ПВЗ не указан в заказе!');
      return res.status(400).json({ 
        error: 'Адрес ПВЗ не указан в заказе. Укажите адрес ПВЗ в редакторе заказа.' 
      });
    }
    console.log('📦 Адрес ПВЗ из заказа:', recipientAddress);

    // Валидируем и исправляем данные
    const toLocation = { ...req.body.to_location };
    
    // Используем адрес получателя из заказа
    toLocation.address = recipientAddress;
    
    // Проверяем и исправляем почтовый индекс
    if (toLocation.postal_code === 'Самовывоз' || !toLocation.postal_code || toLocation.postal_code.length !== 6) {
      toLocation.postal_code = '125222'; // Используем индекс Митино как fallback
      console.log('⚠️ Исправлен почтовый индекс:', toLocation.postal_code);
    }

    // Извлекаем город из адреса получателя
    if (!toLocation.city && toLocation.address) {
      // Ищем город в адресе (обычно после запятой)
      const addressParts = toLocation.address.split(',');
      if (addressParts.length >= 3) {
        // Берем третью часть адреса (обычно это город после страны)
        const cityPart = addressParts[2].trim();
        // Убираем лишние слова
        toLocation.city = cityPart.replace(/^(г\.|город\s*)/i, '').trim();
        console.log('🏙️ Извлечен город из адреса получателя:', toLocation.city);
      } else if (addressParts.length >= 2) {
        // Если только 2 части, берем вторую
        const cityPart = addressParts[1].trim();
        // Проверяем, что это не "Россия"
        if (cityPart.toLowerCase() !== 'россия') {
          toLocation.city = cityPart.replace(/^(г\.|город\s*)/i, '').trim();
          console.log('��️ Извлечен город из адреса получателя:', toLocation.city);
        } else {
          // Если вторая часть "Россия", используем Санкт-Петербург
          toLocation.city = 'Санкт-Петербург';
          console.log('🏙️ Использован город по умолчанию (вторая часть была "Россия"):', toLocation.city);
        }
      } else {
        // Если не можем извлечь из адреса, используем Санкт-Петербург как fallback
        toLocation.city = 'Санкт-Петербург';
        console.log('🏙️ Использован город по умолчанию:', toLocation.city);
      }
    }

    // Функция для поиска ближайшего ПВЗ по адресу
    async function findNearestPvz(address: string, city: string, postalCode: string): Promise<string | null> {
      let result: string | null = null;
      try {
        console.log('🔍 Ищем ПВЗ с ТОЧНО ТАКИМ ЖЕ адресом:', address);
        
        // Получаем токен
        const token = await cdekServiceInstance.getProdToken();
        
        // Извлекаем город из адреса для поиска
        let searchCity = city;
        
        // Сначала ищем по ключевым словам в адресе
        if (address.toLowerCase().includes('архангельск')) {
          searchCity = 'Архангельск';
        } else if (address.toLowerCase().includes('санкт-петербург') || address.toLowerCase().includes('спб')) {
          searchCity = 'Санкт-Петербург';
        } else if (address.toLowerCase().includes('москва')) {
          searchCity = 'Москва';
        } else {
          // Если не нашли по ключевым словам, ищем в частях адреса
          const addressParts = address.split(',').map(part => part.trim());
          const cityPart = addressParts.find(part => 
            part.includes('Санкт-Петербург') || 
            part.includes('Архангельск') || 
            part.includes('Москва') ||
            part.includes('город')
          );
          
          if (cityPart) {
            searchCity = cityPart.replace(/^(г\.|город\s*)/i, '').trim();
          }
        }
        
        // Дополнительная проверка - если нашли "область", заменяем на город
        if (searchCity.includes('область')) {
          if (searchCity.includes('архангельск')) {
            searchCity = 'Архангельск';
          } else if (searchCity.includes('ленинград')) {
            searchCity = 'Санкт-Петербург';
          } else if (searchCity.includes('московск')) {
            searchCity = 'Москва';
          }
        }
        
        console.log('🏙️ Ищем в городе:', searchCity);
        
        // Получаем код города
        const cityResponse = await fetch(`https://api.cdek.ru/v2/location/cities?city=${encodeURIComponent(searchCity)}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!cityResponse.ok) {
          console.error('❌ Ошибка получения кода города:', cityResponse.status);
          return null;
        }

        const cities = await cityResponse.json() as any[];
        if (!cities || cities.length === 0) {
          console.error('❌ Город не найден:', searchCity);
          return null;
        }

        const cityCode = cities[0].code;
        console.log('🏙️ Код города:', cityCode);

        // Получаем список ПВЗ для города
        const pvzResponse = await fetch(`https://api.cdek.ru/v2/deliverypoints?city_code=${cityCode}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!pvzResponse.ok) {
          console.error('❌ Ошибка получения ПВЗ:', pvzResponse.status);
          return null;
        }

        const pvzList = await pvzResponse.json() as any[];
        console.log('🏪 Найдено ПВЗ:', pvzList.length);

        if (!pvzList || pvzList.length === 0) {
          console.error('❌ ПВЗ не найдены для города:', searchCity);
          return null;
        }

        // Ищем ПВЗ с ТОЧНО ТАКИМ ЖЕ адресом или частичным совпадением по улице
        console.log('🔍 Ищем ПВЗ с точным адресом или совпадением по улице:', address);
        
        let exactMatch = null;
        let partialMatch = null;
        
        for (const pvz of pvzList) {
          const pvzAddress = pvz.address?.toLowerCase() || '';
          const pvzName = pvz.name?.toLowerCase() || '';
          const requiredAddress = address.toLowerCase();
          
          console.log(`\n📍 Проверяем ПВЗ: ${pvz.name} (${pvz.code})`);
          console.log(`   Адрес ПВЗ: ${pvz.address || 'Не указан'}`);
          console.log(`   Название ПВЗ: ${pvz.name}`);
          
          // ТОЧНОЕ совпадение адреса
          if (pvzAddress === requiredAddress || pvzName.includes(requiredAddress)) {
            exactMatch = pvz;
            console.log(`   ✅ ТОЧНОЕ СОВПАДЕНИЕ АДРЕСА!`);
            break;
          }
          
          // Частичное совпадение по улице
          const requiredStreet = requiredAddress.match(/ул\.\s*([^,]+)/i)?.[1]?.trim();
          const pvzStreet = pvzName.match(/ул\.\s*([^,]+)/i)?.[1]?.trim();
          
          if (requiredStreet && pvzStreet && requiredStreet.toLowerCase() === pvzStreet.toLowerCase()) {
            partialMatch = pvz;
            console.log(`   ✅ СОВПАДЕНИЕ ПО УЛИЦЕ: ${requiredStreet}`);
          }
        }
        
        // Используем точное совпадение или частичное
        if (exactMatch) {
          console.log('✅ Найден ПВЗ с точным адресом:', exactMatch.name, 'Код:', exactMatch.code);
          result = exactMatch.code;
        } else if (partialMatch) {
          console.log('⚠️ Найден ПВЗ с частичным совпадением по улице:', partialMatch.name, 'Код:', partialMatch.code);
          console.log('✅ Используем ПВЗ с частичным совпадением');
          result = partialMatch.code;
        } else {
          console.log('❌ ПВЗ с совпадающим адресом НЕ НАЙДЕН');
          console.log('🚫 Заказ НЕ БУДЕТ СОЗДАН - нет совпадения');
          result = null;
        }
      } catch (error) {
        console.error('❌ Ошибка поиска ПВЗ:', error);
        result = null;
      }
      
      return result;
    }
    
    // Проверяем адрес получателя
    if (!toLocation.address || toLocation.address.length < 10) {
      console.log('⚠️ Адрес получателя слишком короткий:', toLocation.address);
      res.status(400).json({ message: 'Адрес получателя должен содержать минимум 10 символов' });
      return;
    }
    
    // Проверяем, что адрес не содержит специальных символов
    if (toLocation.address.includes('литер') || toLocation.address.includes('лит.')) {
      console.log('⚠️ Адрес содержит специальные символы, очищаем:', toLocation.address);
      toLocation.address = toLocation.address.replace(/литер\s*[А-Я]/gi, '').replace(/лит\.\s*[А-Я]/gi, '').trim();
    }

    // Проверяем, есть ли код ПВЗ в запросе или в заказе
    let pvzCode = req.body.pvz_code || order!.cdekPvzCode;
    
    if (!pvzCode) {
      // Если код ПВЗ не указан, ищем ПВЗ по адресу
      console.log('🔍 Код ПВЗ не указан, ищем по адресу...');
      const foundPvzCode = await findNearestPvz(toLocation.address, toLocation.city, toLocation.postal_code);
      
      if (!foundPvzCode) {
        console.error('❌ ПВЗ с точным адресом НЕ НАЙДЕН:', toLocation.address);
        
        res.status(400).json({ 
          message: 'ПВЗ с указанным адресом не найден в CDEK. Укажите код ПВЗ в редакторе заказа или проверьте правильность адреса.',
          address: toLocation.address,
          suggestion: 'Используйте адрес существующего ПВЗ CDEK или укажите код ПВЗ вручную.'
        });
        return;
      }
      
      pvzCode = foundPvzCode;
    } else {
      console.log('✅ Используем указанный код ПВЗ:', pvzCode);
    }
    
    console.log('✅ Найден ПВЗ с точным адресом:', pvzCode);

    // Создаем отправление через СДЭК API согласно документации
    const orderData = {
      type: 1, // Тип заказа: 1 - SHOP_TYPE
      tariff_code: 136, // Тариф: 136 - Посылка склад-склад
      from_location: req.body.from_location,
      delivery_point: pvzCode, // Адрес ПВЗ из заказа
      packages: req.body.packages.map((pkg: any, index: number) => ({
        ...pkg,
        number: `PKG${index + 1}`,
        comment: `Упаковка ${index + 1} для заказа ${order!.orderNumber}`,
        items: order!.items.map((item: any, itemIndex: number) => ({
          name: item.name || 'Товар',
          ware_key: item.productId?.sku || item.sku || `ITEM${index + 1}_${itemIndex + 1}`,
          cost: item.price * item.quantity,
          weight: Math.round(pkg.weight / order!.items.length),
          amount: item.quantity,
          payment: {
            value: 0
          }
        }))
      })),
      sender: {
        ...req.body.sender,
        company: 'ТехноЛайн'
      },
      recipient: req.body.recipient,
      services: [
        {
          code: 'INSURANCE',
          parameter: order!.total + (order!.shipping || 0)
        }
      ],
      cost: order!.total + (order!.shipping || 0),
      currency: 'RUB',
      comment: `Заказ ${order!.orderNumber}`,
      developer_key: process.env.CDEK_DEVELOPER_KEY || 'ecb97bfa1e55c60cd6b89567e51fee54a8747af3',
      // Добавляем обязательные поля согласно документации СДЭК
      date_invoice: new Date().toISOString().split('T')[0], // Дата инвойса
      number: `${order!.orderNumber}-${Date.now()}` // Уникальный номер заказа с временной меткой
    };

    console.log('📦 Создание СДЭК отправления для заказа:', order!.orderNumber);
    console.log('📋 Данные отправления:', JSON.stringify(orderData, null, 2));
    console.log('📍 Адрес получателя после обработки:', toLocation.address);
    console.log('📮 Почтовый индекс получателя:', toLocation.postal_code);
    console.log('🔍 Проверяем обязательные поля:');
    console.log('  - type:', orderData.type);
    console.log('  - tariff_code:', orderData.tariff_code);
    console.log('  - from_location:', orderData.from_location);
    console.log('  - delivery_point:', orderData.delivery_point);
    console.log('  - sender:', orderData.sender);
    console.log('  - recipient:', orderData.recipient);
    console.log('  - packages:', orderData.packages);
    console.log('  - date_invoice:', orderData.date_invoice);
    console.log('  - number:', orderData.number);

    // Получаем токен и создаем отправление
    const token = await cdekServiceInstance.getProdToken();
    console.log('🔑 Получен токен СДЭК:', token ? 'Токен получен' : 'Токен не получен');
    
    const response = await fetch('https://api.cdek.ru/v2/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const errorData = await response.json() as any;
      console.error('❌ Ошибка создания СДЭК отправления:', errorData);
      console.error('❌ Статус ответа:', response.status);
      console.error('❌ Заголовки ответа:', response.headers);
      
      // Детальное логирование ошибок
      if (errorData.requests && errorData.requests[0] && errorData.requests[0].errors) {
        console.error('❌ Детальные ошибки СДЭК:');
        errorData.requests[0].errors.forEach((error: any, index: number) => {
          console.error(`  ${index + 1}. Код: ${error.code}, Сообщение: ${error.message}`);
        });
      }
      
      res.status(response.status).json({ 
        message: 'Ошибка создания СДЭК отправления',
        details: errorData 
      });
      return;
    }

    const result = await response.json() as any;
    console.log('✅ СДЭК отправление создано:', result);
    console.log('📦 Детали ответа СДЭК:', {
      uuid: result.entity?.uuid,
      cdek_number: result.entity?.cdek_number,
      number: result.entity?.number
    });
    
    // Проверяем статус запроса
    if (result.requests && result.requests.length > 0) {
      const latestRequest = result.requests[result.requests.length - 1];
      console.log('📋 Статус запроса СДЭК:', {
        type: latestRequest.type,
        state: latestRequest.state,
        date_time: latestRequest.date_time
      });
      
      if (latestRequest.errors && latestRequest.errors.length > 0) {
        console.log('❌ Ошибки СДЭК:');
        latestRequest.errors.forEach((error: any, index: number) => {
          console.log(`  ${index + 1}. Код: ${error.code}, Сообщение: ${error.message}`);
        });
      }
    }

    // Обновляем заказ с UUID СДЭК
    // UUID будет использоваться для получения трек-номера позже
    const cdekUuid = result.entity.uuid;
    order!.trackingNumber = cdekUuid; // Временно сохраняем UUID
    order!.status = 'shipped';
    await order!.save();

    console.log('📦 СДЭК UUID сохранен как трек-номер:', cdekUuid);
    console.log('ℹ️ Трек-номер будет доступен позже, когда СДЭК обработает отправление');

    // Логируем создание СДЭК отправления
    logOrderChange('create_cdek_order', {
      order_id: String(order!._id),
      order_number: order!.orderNumber,
      admin_user_id: req.user?._id,
      cdek_uuid: result.entity.uuid,
      cdek_number: result.entity.cdek_number,
      tracking_number: order!.trackingNumber
    });

    // Отправляем событие через Socket.IO
    io.to(`order_${order!._id}`).emit('order-updated', { 
      orderId: order!._id,
      type: 'cdek-order-created',
      trackingNumber: order!.trackingNumber,
      status: order!.status
    });

    res.json({ 
      success: true, 
      message: 'СДЭК отправление создано успешно',
      trackingNumber: order!.trackingNumber,
      cdekUuid: result.entity.uuid,
      note: 'UUID сохранен. Трек-номер будет доступен позже.',
      pvzCode: pvzCode
    });
    return;
  } catch (error) {
    console.error('❌ Ошибка создания СДЭК отправления:', error);
    res.status(500).json({ message: 'Ошибка сервера при создании СДЭК отправления' });
    return;
  }
});

// Получение трек-номера СДЭК по UUID
router.get('/:id/get-cdek-tracking', auth, adminOnly, async (req: AuthRequest, res) => {
  try {
    console.log('📦 Получение трек-номера СДЭК для заказа:', req.params.id);
    
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      console.log('❌ Заказ не найден:', req.params.id);
      res.status(404).json({ message: 'Заказ не найден' });
      return;
    }

    if (!order.trackingNumber) {
      console.log('❌ Трек-номер не найден для заказа:', order.orderNumber);
      res.status(404).json({ message: 'Трек-номер не найден' });
      return;
    }

    console.log('✅ Заказ найден:', order.orderNumber);
    console.log('📦 UUID СДЭК:', order.trackingNumber);

    // Получаем информацию о заказе через СДЭК API
    const token = await cdekServiceInstance.getProdToken();
    
    const response = await fetch(`https://api.cdek.ru/v2/orders/${order.trackingNumber}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('❌ Ошибка получения информации о заказе СДЭК:', response.status);
      res.status(response.status).json({ 
        message: 'Ошибка получения информации о заказе СДЭК',
        uuid: order.trackingNumber
      });
      return;
    }

    const result = await response.json() as any;
    console.log('✅ Информация о заказе СДЭК получена:', result);

    // Проверяем статус заказа СДЭК
    const requests = result.requests || [];
    const latestRequest = requests[requests.length - 1];
    
    if (latestRequest?.state === 'INVALID') {
      console.log(`❌ Заказ СДЭК не создан корректно:`);
      console.log(`   UUID: ${order.trackingNumber}`);
      console.log(`   Статус: ${latestRequest.state}`);
      console.log(`   Тип запроса: ${latestRequest.type}`);
      console.log(`   Дата: ${latestRequest.date_time}`);
      console.log(`   Ошибки:`, JSON.stringify(latestRequest.errors, null, 2));
      
      res.json({ 
        success: false, 
        message: 'Заказ СДЭК не был создан корректно',
        uuid: order.trackingNumber,
        errors: latestRequest.errors
      });
      return;
    }

    // Проверяем, есть ли трек-номер
    const trackingNumber = result.entity?.cdek_number || result.entity?.number;
    
    if (trackingNumber) {
      console.log('✅ Найден трек-номер СДЭК:', trackingNumber);
      
      // Обновляем заказ с настоящим трек-номером
      order.trackingNumber = trackingNumber;
      await order.save();
      
      console.log('✅ Заказ обновлен с трек-номером:', trackingNumber);
      
      res.json({ 
        success: true, 
        trackingNumber: trackingNumber,
        uuid: result.entity.uuid,
        status: result.entity.status
      });
    } else {
      console.log('ℹ️ Трек-номер еще не доступен, UUID:', order.trackingNumber);
      res.json({ 
        success: false, 
        message: 'Трек-номер еще не доступен',
        uuid: order.trackingNumber,
        status: result.entity?.status || 'unknown'
      });
    }
  } catch (error) {
    console.error('❌ Ошибка получения трек-номера СДЭК:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении трек-номера' });
  }
});

// Функция для автоматического получения трек-номеров СДЭК
async function checkAndUpdateCdekTrackingNumbers() {
  try {
    console.log('🔄 Автоматическая проверка трек-номеров СДЭК...');
    
    // Находим все заказы с UUID вместо трек-номера
    const ordersWithUuid = await Order.find({
      trackingNumber: { $regex: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i }
    });

    console.log(`📦 Найдено заказов с UUID: ${ordersWithUuid.length}`);

    if (ordersWithUuid.length === 0) {
      console.log('✅ Нет заказов для проверки трек-номеров');
      return;
    }

    // Получаем токен СДЭК
    const token = await cdekServiceInstance.getProdToken();
    
    let updatedCount = 0;
    let errorCount = 0;

    for (const order of ordersWithUuid) {
      try {
        console.log(`📦 Проверяем заказ: ${order.orderNumber} (UUID: ${order.trackingNumber})`);
        
        const response = await fetch(`https://api.cdek.ru/v2/orders/${order.trackingNumber}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          console.log(`⚠️ Ошибка получения информации для заказа ${order.orderNumber}: ${response.status}`);
          errorCount++;
          continue;
        }

        const result = await response.json() as any;
        
        // Проверяем статус заказа СДЭК
        const requests = result.requests || [];
        const latestRequest = requests[requests.length - 1];
        
        if (latestRequest?.state === 'INVALID') {
          console.log(`❌ Заказ СДЭК не создан корректно для ${order.orderNumber}:`);
          console.log(`   UUID: ${order.trackingNumber}`);
          console.log(`   Статус: ${latestRequest.state}`);
          console.log(`   Тип запроса: ${latestRequest.type}`);
          console.log(`   Дата: ${latestRequest.date_time}`);
          console.log(`   Ошибки:`, JSON.stringify(latestRequest.errors, null, 2));
          
          // Удаляем некорректный UUID из заказа
          order.trackingNumber = undefined;
          await order.save();
          
          console.log(`🗑️ UUID удален из заказа ${order.orderNumber}`);
          
          // Отправляем событие через Socket.IO
          io.to(`order_${order._id}`).emit('order-updated', { 
            orderId: order._id,
            type: 'tracking-number-invalid',
            message: 'Заказ СДЭК не был создан корректно'
          });
          
          continue;
        }
        
        // Проверяем, есть ли трек-номер
        const trackingNumber = result.entity?.cdek_number || result.entity?.number;
        
        if (trackingNumber) {
          console.log(`✅ Найден трек-номер для заказа ${order.orderNumber}: ${trackingNumber}`);
          
          // Обновляем заказ с настоящим трек-номером
          order.trackingNumber = trackingNumber;
          await order.save();
          
          updatedCount++;
          
          // Отправляем событие через Socket.IO
          io.to(`order_${order._id}`).emit('order-updated', { 
            orderId: order._id,
            type: 'tracking-number-updated',
            trackingNumber: trackingNumber
          });
          
          // Логируем обновление
          logOrderChange('tracking_number_updated', {
            order_id: String(order._id),
            order_number: order.orderNumber,
            old_tracking: result.entity.uuid,
            new_tracking: trackingNumber
          });
        } else {
          console.log(`⏳ Трек-номер еще не доступен для заказа ${order.orderNumber}`);
        }
      } catch (error) {
        console.error(`❌ Ошибка проверки заказа ${order.orderNumber}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Автоматическая проверка завершена:`);
    console.log(`   📦 Обновлено заказов: ${updatedCount}`);
    console.log(`   ❌ Ошибок: ${errorCount}`);
    console.log(`   ⏳ Ожидают трек-номер: ${ordersWithUuid.length - updatedCount - errorCount}`);
    
  } catch (error) {
    console.error('❌ Ошибка автоматической проверки трек-номеров:', error);
  }
}

// Endpoint для ручного запуска проверки трек-номеров
router.post('/check-cdek-tracking', auth, adminOnly, async (req: AuthRequest, res) => {
  try {
    console.log('🔄 Ручной запуск проверки трек-номеров СДЭК');
    
    // Запускаем проверку в фоне
    checkAndUpdateCdekTrackingNumbers().then(() => {
      console.log('✅ Ручная проверка трек-номеров завершена');
    }).catch((error) => {
      console.error('❌ Ошибка ручной проверки трек-номеров:', error);
    });
    
    res.json({ 
      success: true, 
      message: 'Проверка трек-номеров запущена в фоне'
    });
  } catch (error) {
    console.error('❌ Ошибка запуска проверки трек-номеров:', error);
    res.status(500).json({ message: 'Ошибка запуска проверки' });
  }
});

// Проверка статуса заказа СДЭК по UUID (временно без авторизации для отладки)
router.get('/check-cdek-order/:uuid', async (req, res) => {
  try {
    console.log('📦 Проверка статуса заказа СДЭК по UUID:', req.params.uuid);
    
    const result = await cdekServiceInstance.getOrderByUuid(req.params.uuid);
    console.log('�� Результат проверки заказа СДЭК:', result);
    
    // Проверяем статус запроса
    if (result.requests && result.requests.length > 0) {
      const latestRequest = result.requests[result.requests.length - 1];
      console.log('📋 Статус запроса СДЭК:', {
        type: latestRequest.type,
        state: latestRequest.state,
        date_time: latestRequest.date_time
      });
      
      if (latestRequest.errors && latestRequest.errors.length > 0) {
        console.log('❌ Ошибки СДЭК:');
        latestRequest.errors.forEach((error: any, index: number) => {
          console.log(`  ${index + 1}. Код: ${error.code}, Сообщение: ${error.message}`);
        });
      }
    }
    
    res.json({ 
      success: true, 
      order: result,
      status: result.requests?.[result.requests.length - 1]?.state || 'unknown'
    });
  } catch (error) {
    console.error('❌ Ошибка проверки заказа СДЭК:', error);
    res.status(500).json({ message: 'Ошибка проверки заказа СДЭК' });
  }
});

// Запускаем автоматическую проверку каждые 5 минут
setInterval(checkAndUpdateCdekTrackingNumbers, 5 * 60 * 1000);

// Запускаем первую проверку через 1 минуту после старта сервера
setTimeout(checkAndUpdateCdekTrackingNumbers, 60 * 1000);

// Добавить PATCH-эндпоинт для попытки дозвона
router.patch('/:id/call-attempt', auth, adminOnly, async (req: AuthRequest, res) => {
  try {
    console.log('📞 Call attempt request:', {
      orderId: req.params.id,
      body: req.body,
      user: {
        id: req.user?._id,
        role: req.user?.role
      }
    });
    
    const { id } = req.params;
    const { status } = req.body; // 'failed' | 'success'
    
    console.log('📞 Попытка дозвона для заказа:', id, 'статус:', status);
    
    if (!['failed', 'success'].includes(status)) {
      console.log('❌ Неверный статус:', status);
      res.status(400).json({ error: 'Invalid status. Must be "failed" or "success"' });
      return;
    }
    
    const order = await Order.findById(id);
    console.log('📞 Order found for call attempt:', !!order, order ? order.orderNumber : 'N/A');
    
    if (!order) {
      console.log('❌ Заказ не найден:', id);
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    
    // Получаем текущие попытки или инициализируем пустой массив
    const currentAttempts = order.callAttempts || [];
    console.log('📞 Current attempts:', currentAttempts.length);
    
    // Добавляем новую попытку
    const newAttempt = { 
      date: new Date(), 
      status 
    };
    const updatedAttempts = [...currentAttempts, newAttempt];
    
    console.log('📞 Adding new attempt:', newAttempt);
    
    // Подготавливаем данные для обновления  
    const updateData: any = {
      callAttempts: updatedAttempts
    };
    
    // Если звонок успешный, обновляем статус звонка
    if (status === 'success') {
      updateData.callStatus = 'completed';
      console.log('📞 Will update call status to completed');
    }
    
    console.log('📞 Updating order with data:', {
      totalAttempts: updatedAttempts.length,
      newCallStatus: updateData.callStatus
    });
    
    // Используем findByIdAndUpdate для обновления только нужных полей
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: false } // Отключаем валидацию для существующих данных
    );
    
    if (!updatedOrder) {
      console.log('❌ Order not found after update:', id);
      res.status(404).json({ error: 'Order not found after update' });
      return;
    }
    
    console.log('📞 Order updated successfully:', {
      totalAttempts: updatedOrder.callAttempts?.length || 0,
      callStatus: updatedOrder.callStatus
    });
    
    console.log('✅ Попытка дозвона зафиксирована для заказа:', updatedOrder.orderNumber);
    
    // Отправляем событие через Socket.IO
    io.to(`order_${updatedOrder._id}`).emit('order-updated', { 
      orderId: updatedOrder._id,
      type: 'call-attempt',
      callAttempts: updatedOrder.callAttempts,
      callStatus: updatedOrder.callStatus
    });
    
    // Логируем изменение
    logOrderChange('call_attempt_added', {
      order_id: String(updatedOrder._id),
      order_number: updatedOrder.orderNumber,
      status: status,
      total_attempts: updatedOrder.callAttempts?.length || 0,
      admin_user_id: req.user?._id,
      admin_user_name: req.user ? `${req.user.firstName} ${req.user.lastName}` : undefined
    });
    
    res.json({ 
      success: true, 
      callAttempts: updatedOrder.callAttempts,
      callStatus: updatedOrder.callStatus
    });
  } catch (error: unknown) {
    console.error('❌ Ошибка фиксации попытки дозвона:', error);
    
    // Более подробное логирование ошибки
    if (error instanceof Error) {
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
    
    res.status(500).json({ 
      error: 'Failed to update call attempts',
      message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
});

// Привязка заказов к пользователю
router.post('/link-orders', auth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const userId = user._id;
    const email = user.email;
    const phone = user.phone;

    console.log('👤 Привязка заказов к пользователю:', {
      userId,
      email,
      phone
    });

    // Ищем заказы по email или телефону
    const orders = await Order.find({
      $or: [
        { guestEmail: email },
        { guestPhone: phone }
      ],
      userId: { $exists: false } // Только заказы без привязки к пользователю
    });

    console.log('📦 Найдено заказов для привязки:', orders.length);

    // Привязываем заказы к пользователю
    const updatePromises = orders.map(order => 
      Order.findByIdAndUpdate(order._id, {
        $set: { userId },
        $unset: { guestEmail: "", guestPhone: "" }
      })
    );

    await Promise.all(updatePromises);

    console.log('✅ Заказы успешно привязаны к пользователю');

    res.json({ 
      success: true, 
      message: `Привязано заказов: ${orders.length}`,
      orders: orders.map(o => ({
        orderNumber: o.orderNumber,
        total: o.total,
        createdAt: o.createdAt
      }))
    });
  } catch (error) {
    console.error('❌ Ошибка привязки заказов:', error);
    res.status(500).json({ message: 'Ошибка привязки заказов' });
  }
});

export default router; 