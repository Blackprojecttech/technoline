import { Request, Response } from 'express';
import { Referral, ReferralClick, ReferralWithdrawal } from '../models/Referral';
import { User } from '../models/User';
import { Order } from '../models/Order';
import crypto from 'crypto';
import mongoose from 'mongoose';

// Интерфейс для аутентифицированного запроса
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

// Генерация уникального реферального кода
const generateReferralCode = (): string => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// Получить или создать реферальную ссылку пользователя
export const getUserReferralLink = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Пользователь не авторизован' });
      return;
    }

    let user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'Пользователь не найден' });
      return;
    }

    // Если у пользователя нет реферального кода, создаем его
    if (!user.referralCode) {
      let referralCode;
      let isUnique = false;
      
      // Генерируем уникальный код
      while (!isUnique) {
        referralCode = generateReferralCode();
        const existingUser = await User.findOne({ referralCode });
        if (!existingUser) {
          isUnique = true;
        }
      }

      user.referralCode = referralCode;
      await user.save();

      // Создаем запись в таблице рефералов (без фиксированного URL)
      await Referral.create({
        referrerId: userId,
        referralCode,
        referralUrl: '', // Будет генерироваться динамически
        clicks: 0,
        registrations: 0,
        orders: 0,
        totalCommission: 0,
        pendingCommission: 0,
        availableCommission: 0,
        withdrawnCommission: 0
      });
    }

    const referral = await Referral.findOne({ referrerId: userId });
    
    // Генерируем URL динамически на основе заголовка Origin или Host
    const origin = req.get('Origin') || req.get('Host') || process.env.FRONTEND_URL || 'http://localhost:3000';
    const baseUrl = origin.startsWith('http') ? origin : `https://${origin}`;
    const referralUrl = `${baseUrl}/?ref=${user.referralCode}`;
    
    res.json({
      referralCode: user.referralCode,
      referralUrl: referralUrl,
      stats: user.referralStats || {
        totalEarnings: 0,
        availableBalance: 0,
        withdrawnAmount: 0,
        totalReferrals: 0,
        activeReferrals: 0
      }
    });
  } catch (error) {
    console.error('Ошибка при получении реферальной ссылки:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Обработка клика по реферальной ссылке
export const trackReferralClick = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ref } = req.query;
    const ip = req.ip || req.connection.remoteAddress || '';
    const userAgent = req.get('User-Agent') || '';

    if (!ref) {
      res.status(400).json({ message: 'Реферальный код не указан' });
      return;
    }

    // Находим реферера по коду
    const referrer = await User.findOne({ referralCode: ref });
    if (!referrer) {
      res.status(404).json({ message: 'Реферальный код не найден' });
      return;
    }

    // Проверяем, не кликал ли уже этот IP по этой ссылке сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingClick = await ReferralClick.findOne({
      referrerId: referrer._id,
      ip,
      clickDate: { $gte: today }
    });

    if (!existingClick) {
      // Записываем клик
      const referralRecord = await Referral.findOne({ referrerId: referrer._id });
      const newClick = await ReferralClick.create({
        referralId: referralRecord?._id,
        referrerId: referrer._id,
        ip,
        userAgent,
        clickDate: new Date(),
        convertedToRegistration: false,
        convertedToOrder: false,
        commissionPaid: false
      });

      // Обновляем счетчик кликов
      await Referral.updateOne(
        { referrerId: referrer._id },
        { 
          $inc: { clicks: 1 },
          $set: { lastClickDate: new Date() }
        }
      );

      console.log('✅ Новый клик записан:', {
        clickId: newClick._id,
        referrerId: referrer._id,
        referrerEmail: referrer.email,
        ip,
        referralCode: ref
      });
    } else {
      console.log('ℹ️ Клик уже был записан сегодня:', {
        existingClickId: existingClick._id,
        referrerId: referrer._id,
        ip
      });
    }

    // Сохраняем реферальный код в сессии/куки для последующего отслеживания
    res.cookie('referralCode', ref, { 
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' // Позволяет передачу куки между сайтами
    });

    res.json({ message: 'Переход отслежен' });
  } catch (error) {
    console.error('Ошибка при отслеживании перехода:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Получить статистику рефералов пользователя
export const getUserReferralStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Пользователь не авторизован' });
      return;
    }

    const referral = await Referral.findOne({ referrerId: userId });
    if (!referral) {
      res.json({
        clicks: 0,
        registrations: 0,
        orders: 0,
        totalCommission: 0,
        availableCommission: 0,
        referrals: []
      });
      return;
    }

    // Получаем детальную информацию о рефералах
    const referralClicks = await ReferralClick.find({ referrerId: userId })
      .populate('orderId', 'orderNumber total status createdAt')
      .sort({ clickDate: -1 });

    const groupedReferrals = referralClicks.reduce((acc: any, click) => {
      if (!acc[click.ip]) {
        acc[click.ip] = {
          ip: click.ip,
          firstClick: click.clickDate,
          totalClicks: 0,
          registered: click.convertedToRegistration,
          registrationDate: click.registrationDate,
          orders: [],
          totalSpent: 0,
          totalCommission: 0
        };
      }
      
      acc[click.ip].totalClicks++;
      
      if (click.convertedToOrder && click.orderId) {
        acc[click.ip].orders.push({
          orderId: click.orderId,
          orderDate: click.orderDate,
          amount: click.orderAmount,
          commission: click.commission,
          paid: click.commissionPaid
        });
        acc[click.ip].totalSpent += click.orderAmount || 0;
        acc[click.ip].totalCommission += click.commission || 0;
      }
      
      return acc;
    }, {});

    res.json({
      clicks: referral.clicks,
      registrations: referral.registrations,
      orders: referral.orders,
      totalCommission: referral.totalCommission,
      pendingCommission: referral.pendingCommission,
      availableCommission: referral.availableCommission,
      withdrawnCommission: referral.withdrawnCommission,
      referrals: Object.values(groupedReferrals)
    });
  } catch (error) {
    console.error('Ошибка при получении статистики рефералов:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Запрос на вывод средств
export const requestWithdrawal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { amount, paymentMethod, paymentDetails } = req.body;

    if (!userId) {
      res.status(401).json({ message: 'Пользователь не авторизован' });
      return;
    }

    if (!amount || amount <= 0) {
      res.status(400).json({ message: 'Неверная сумма для вывода' });
      return;
    }

    if (!paymentMethod || !paymentDetails) {
      res.status(400).json({ message: 'Укажите способ оплаты и реквизиты' });
      return;
    }

    const user = await User.findById(userId);
    if (!user || !user.referralStats) {
      res.status(404).json({ message: 'Пользователь не найден' });
      return;
    }

    if (user.referralStats.availableBalance < amount) {
      res.status(400).json({ message: 'Недостаточно средств для вывода' });
      return;
    }

    // Создаем заявку на вывод
    const withdrawal = await ReferralWithdrawal.create({
      userId,
      amount,
      paymentMethod,
      paymentDetails,
      status: 'pending'
    });

    // Блокируем средства
    user.referralStats.availableBalance -= amount;
    await user.save();

    res.json({
      message: 'Заявка на вывод создана',
      withdrawalId: withdrawal._id
    });
  } catch (error) {
    console.error('Ошибка при создании заявки на вывод:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Admin: Получить все рефералы и статистику
export const getAllReferrals = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Получаем всех пользователей с реферальными кодами
    const users = await User.find({ 
      referralCode: { $exists: true, $ne: null } 
    })
    .select('firstName lastName email phone referralCode referralStats createdAt')
    .skip(skip)
    .limit(limit)
    .sort({ 'referralStats.totalEarnings': -1 });

    const total = await User.countDocuments({ 
      referralCode: { $exists: true, $ne: null } 
    });

    // Получаем статистику по каждому пользователю
    const referralsWithStats = await Promise.all(
      users.map(async (user) => {
        const referral = await Referral.findOne({ referrerId: user._id });
        return {
          user: {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            referralCode: user.referralCode,
            createdAt: user.createdAt
          },
          stats: {
            clicks: referral?.clicks || 0,
            registrations: referral?.registrations || 0,
            orders: referral?.orders || 0,
            totalCommission: referral?.totalCommission || 0,
            pendingCommission: referral?.pendingCommission || 0,
            // Используем актуальные данные из user.referralStats вместо устаревших из Referral
            availableCommission: user.referralStats?.availableBalance || 0,
            withdrawnCommission: user.referralStats?.withdrawnAmount || 0,
            referralStats: user.referralStats
          }
        };
      })
    );

    res.json({
      referrals: referralsWithStats,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('Ошибка при получении рефералов:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Admin: Получить детальную информацию о рефералах пользователя
export const getUserReferralDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    // Получаем информацию о пользователе
    const user = await User.findById(userId)
      .select('firstName lastName email phone referralCode referralStats createdAt');
    
    if (!user) {
      res.status(404).json({ message: 'Пользователь не найден' });
      return;
    }

    // Получаем всех пользователей, которых привлек этот пользователь
    const referredUsers = await User.find({ referredBy: userId })
      .select('firstName lastName email phone createdAt')
      .sort({ createdAt: -1 });

    // Получаем заказы привлеченных пользователей
    const referredUserIds = referredUsers.map(u => u._id);
    
    const orders = await Order.find({ 
      userId: { $in: referredUserIds },
      status: { $in: ['completed', 'delivered'] }
    })
    .populate('userId', 'firstName lastName email phone')
    .populate('items.productId', 'name price images')
    .select('orderNumber total status createdAt userId items')
    .sort({ createdAt: -1 });

    // Группируем заказы по пользователям
    const referralsWithOrders = referredUsers.map(referredUser => {
      const userOrders = orders.filter(order => 
        order.userId && order.userId._id.toString() === (referredUser._id as mongoose.Types.ObjectId).toString()
      );
      
      const totalSpent = userOrders.reduce((sum, order) => sum + order.total, 0);
      const totalCommission = totalSpent * 0.05; // 5% комиссия

      return {
        user: referredUser,
        orders: userOrders.map(order => ({
          _id: order._id,
          orderNumber: order.orderNumber,
          total: order.total,
          status: order.status,
          createdAt: order.createdAt,
          items: order.items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
          }))
        })),
        totalSpent,
        totalCommission,
        ordersCount: userOrders.length
      };
    });

    res.json({
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        referralCode: user.referralCode,
        createdAt: user.createdAt,
        referralStats: user.referralStats
      },
      referrals: referralsWithOrders,
      totalReferrals: referredUsers.length,
      totalOrders: orders.length,
      totalCommission: referralsWithOrders.reduce((sum, ref) => sum + ref.totalCommission, 0)
    });
  } catch (error) {
    console.error('Ошибка при получении деталей рефералов:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Admin: Получить заявки на вывод
export const getWithdrawalRequests = async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    const withdrawals = await ReferralWithdrawal.find(filter)
      .populate('userId', 'firstName lastName email phone')
      .populate('processedBy', 'firstName lastName email')
      .skip(skip)
      .limit(limit)
      .sort({ requestDate: -1 });

    const total = await ReferralWithdrawal.countDocuments(filter);

    res.json({
      withdrawals,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('Ошибка при получении заявок на вывод:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Admin: Обработать заявку на вывод
export const processWithdrawal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { withdrawalId } = req.params;
    const { status, notes } = req.body;
    const adminId = req.user?.id;

    if (!['approved', 'rejected', 'paid'].includes(status)) {
      res.status(400).json({ message: 'Неверный статус' });
      return;
    }

    const withdrawal = await ReferralWithdrawal.findById(withdrawalId);
    if (!withdrawal) {
      res.status(404).json({ message: 'Заявка не найдена' });
      return;
    }

    withdrawal.status = status;
    withdrawal.processedDate = new Date();
    withdrawal.processedBy = adminId ? new mongoose.Types.ObjectId(adminId) : undefined;
    if (notes) withdrawal.notes = notes;

    await withdrawal.save();

    // Если заявка отклонена, возвращаем средства пользователю
    if (status === 'rejected') {
      const user = await User.findById(withdrawal.userId);
      if (user && user.referralStats) {
        user.referralStats.availableBalance += withdrawal.amount;
        await user.save();
      }
    }

    // Если заявка одобрена/оплачена, увеличиваем выведенную сумму
    if (status === 'paid') {
      const user = await User.findById(withdrawal.userId);
      if (user && user.referralStats) {
        user.referralStats.withdrawnAmount += withdrawal.amount;
        await user.save();
      }
    }

    res.json({ message: 'Заявка обработана' });
  } catch (error) {
    console.error('Ошибка при обработке заявки:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Функция для начисления комиссии при смене статуса заказа на "доставлен"
// Отмена реферальной комиссии при изменении статуса заказа
export const cancelReferralCommission = async (orderId: string) => {
  try {
    console.log('🔄 Отмена реферальной комиссии для заказа:', orderId);

    const order = await Order.findById(orderId).populate('userId');
    if (!order) {
      console.log('❌ Заказ не найден:', orderId);
      return;
    }

    const user = order.userId as any;
    if (!user.referredBy) {
      console.log('ℹ️ Пользователь не привлечен по реферальной программе');
      return;
    }

    // Найдем реферера
    const referrer = await User.findById(user.referredBy);
    if (!referrer) {
      console.log('❌ Реферер не найден');
      return;
    }

    // Найдем клик, связанный с этим заказом
    let click = await ReferralClick.findOne({
      referrerId: referrer._id,
      referredUserId: user._id,
      convertedToOrder: true
    });

    if (!click) {
      // Резервный поиск - найдем любой клик этого реферера, который связан с заказом
      click = await ReferralClick.findOne({
        referrerId: referrer._id,
        convertedToOrder: true,
        commissionPaid: true
      }).sort({ clickDate: -1 });
    }

    if (!click) {
      console.log('❌ Клик для отмены не найден');
      return;
    }

    // Проверяем, была ли уже начислена комиссия
    if (!click.commissionPaid) {
      console.log('ℹ️ Комиссия еще не была начислена');
      return;
    }

    // Вычисляем комиссию для отмены
    const commissionRate = 0.015; // 1.5%
    const commission = Math.round(order.total * commissionRate);

    console.log('💸 Отменяем комиссию:', {
      orderTotal: order.total,
      commission: commission,
      referrerEmail: referrer.email
    });

    // Отменяем комиссию в клике
    click.commissionPaid = false;
    click.convertedToOrder = false;
    await click.save();

    // Обновляем статистику реферера
    await Referral.updateOne(
      { referrerId: referrer._id },
      {
        $inc: {
          orders: -1,
          totalCommission: -commission
        }
      }
    );

    // Обновляем статистику пользователя-реферера
    if (!referrer.referralStats) {
      referrer.referralStats = {
        totalReferrals: 0,
        activeReferrals: 0,
        totalEarnings: 0,
        availableBalance: 0,
        withdrawnAmount: 0
      };
    }

    referrer.referralStats.totalEarnings -= commission;
    referrer.referralStats.availableBalance -= commission;
    
    // Уменьшаем activeReferrals только если это был единственный заказ от этого пользователя
    const userOrdersCount = await Order.countDocuments({
      userId: user._id,
      status: 'delivered'
    });
    
    if (userOrdersCount === 0) {
      referrer.referralStats.activeReferrals -= 1;
    }

    await referrer.save();

    console.log('✅ Реферальная комиссия отменена:', {
      referrerId: referrer._id,
      cancelledCommission: commission,
      newTotalEarnings: referrer.referralStats.totalEarnings,
      newAvailableBalance: referrer.referralStats.availableBalance
    });

  } catch (error) {
    console.error('❌ Ошибка при отмене реферальной комиссии:', error);
  }
};

export const processReferralCommission = async (orderId: string) => {
  try {
    const order = await Order.findById(orderId).populate('userId');
    if (!order || !order.userId) return;

    const user = order.userId as any;
    
    // Проверяем, есть ли реферер у этого пользователя
    if (!user.referredBy) return;

    // Проверяем, не была ли уже начислена комиссия за этот заказ
    const existingCommission = await ReferralClick.findOne({
      orderId: orderId,
      commissionPaid: true
    });
    
    if (existingCommission) return;

    const commission = order.total * 0.015; // 1.5% комиссия

    // Обновляем статистику реферера
    const referrer = await User.findById(user.referredBy);
    if (referrer) {
      // Инициализируем referralStats если он не существует
      if (!referrer.referralStats) {
        referrer.referralStats = {
          totalEarnings: 0,
          availableBalance: 0,
          withdrawnAmount: 0,
          totalReferrals: 0,
          activeReferrals: 0
        };
      }
      
      referrer.referralStats.totalEarnings += commission;
      referrer.referralStats.availableBalance += commission;
      
      // Увеличиваем счетчик активных рефералов при первом заказе
      const existingOrdersCount = await ReferralClick.countDocuments({
        referrerId: user.referredBy,
        convertedToOrder: true,
        commissionPaid: true
      });
      
      if (existingOrdersCount === 0) { // Это первый заказ от этого реферала
        referrer.referralStats.activeReferrals += 1;
      }
      
      await referrer.save();
      console.log('💰 Обновлена статистика реферера:', {
        referrerId: referrer._id,
        totalEarnings: referrer.referralStats.totalEarnings,
        availableBalance: referrer.referralStats.availableBalance,
        activeReferrals: referrer.referralStats.activeReferrals
      });
    }

    // Обновляем статистику в таблице рефералов
    await Referral.updateOne(
      { referrerId: user.referredBy },
      {
        $inc: { 
          totalCommission: commission,
          availableCommission: commission,
          orders: 1
        }
      }
    );

    // Помечаем клик как конвертированный в заказ с комиссией
    // Ищем клик, который был конвертирован в регистрацию для этого пользователя
    let clickUpdated = await ReferralClick.updateOne(
      { 
        referrerId: user.referredBy,
        referredUserId: user._id, // Более точный поиск по ID пользователя
        convertedToRegistration: true,
        convertedToOrder: false
      },
      {
        $set: {
          convertedToOrder: true,
          orderId: orderId,
          orderDate: order.createdAt,
          orderAmount: order.total,
          commission: commission,
          commissionPaid: true
        }
      }
    );

    // Если не нашли по referredUserId, ищем по IP (fallback)
    if (clickUpdated.matchedCount === 0) {
      console.log('⚠️ Не найден клик по referredUserId, ищем по IP');
      await ReferralClick.updateOne(
        { 
          referrerId: user.referredBy,
          convertedToOrder: false,
          ip: { $exists: true }
        },
        {
          $set: {
            convertedToOrder: true,
            orderId: orderId,
            orderDate: order.createdAt,
            orderAmount: order.total,
            commission: commission,
            commissionPaid: true,
            referredUserId: user._id // Добавляем связь с пользователем
          }
        }
      );
    }

    console.log('💰 Реферальная комиссия начислена:', {
      referrerId: user.referredBy,
      referredUserId: user._id,
      orderId: orderId,
      commission: commission
    });

  } catch (error) {
    console.error('Ошибка при начислении реферальной комиссии:', error);
  }
}; 