import { Request } from 'express';
import { User } from '../models/User';
import { Referral, ReferralClick } from '../models/Referral';
import mongoose from 'mongoose';

export async function linkOrderToReferralSystem(req: Request, userId: mongoose.Types.ObjectId): Promise<void> {
  try {
    // Получаем реферальный код из куки или заголовков
    const referralCode = req.cookies?.referralCode || (req.headers && req.headers['x-referral-code']) as string;
    
    // Найдем пользователя
    const user = await User.findById(userId);
    if (!user) {
      return;
    }

    // Если пользователь уже привязан к реферу, ничего не делаем
    if (user.referredBy) {
      console.log('ℹ️ Пользователь уже привязан к реферальной системе');
      return;
    }

    let referrer = null;
    let foundByCode = false;

    // Попытка 1: Поиск по реферальному коду из куки/заголовков
    if (referralCode) {
      referrer = await User.findOne({ referralCode });
      if (referrer) {
        foundByCode = true;
        console.log('✅ Реферер найден по коду из куки:', referralCode);
      }
    }

    // Попытка 2: Поиск по IP и времени (резервный механизм)
    if (!referrer) {
      const userIP = req.ip || req.connection?.remoteAddress;
      const userCreationTime = user.createdAt;
      const searchStartTime = new Date(userCreationTime.getTime() - 2 * 60 * 60 * 1000); // 2 часа до
      
      console.log('🔍 Поиск реферера по IP и времени:', {
        ip: userIP,
        timeRange: `${searchStartTime} - ${userCreationTime}`
      });

      // Найдем клики по IP в течение 2 часов до создания пользователя
      const recentClicks = await ReferralClick.find({
        ip: userIP,
        clickDate: { $gte: searchStartTime, $lte: userCreationTime },
        referredUserId: { $exists: false } // Еще не связанные с пользователем
      }).sort({ clickDate: -1 }).limit(1);

      if (recentClicks.length > 0) {
        const recentClick = recentClicks[0];
        referrer = await User.findById(recentClick.referrerId);
        if (referrer) {
          console.log('✅ Реферер найден по IP и времени:', {
            referrerEmail: referrer.email,
            clickTime: recentClick.clickDate,
            orderTime: userCreationTime,
            ip: userIP
          });
        }
      }
    }

    if (!referrer) {
      console.log('❌ Реферер не найден ни по коду, ни по IP/времени');
      return;
    }

    // Привязываем пользователя к реферу
    user.referredBy = referrer._id as mongoose.Types.ObjectId;
    await user.save();

    console.log('🔗 Пользователь автоматически привязан к реферальной системе:', {
      method: foundByCode ? 'По коду из куки' : 'По IP и времени',
      referrerEmail: referrer.email,
      userId: user._id,
      userEmail: user.email
    });

    // Создаем или обновляем клик
    let click = await ReferralClick.findOne({
      referrerId: referrer._id,
      ip: req.ip || req.connection?.remoteAddress,
      referredUserId: { $exists: false }
    });

    if (!click) {
      // Создаем новый клик, если не найден
      click = new ReferralClick({
        referralId: await Referral.findOne({ referrerId: referrer._id }).then(r => r?._id),
        referrerId: referrer._id,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent') || 'Auto-detected',
        clickDate: new Date(user.createdAt.getTime() - 5 * 60 * 1000), // 5 минут до создания пользователя
        convertedToRegistration: false,
        convertedToOrder: false,
        commissionPaid: false
      });
      await click.save();

      // Увеличиваем счетчик кликов
      await Referral.updateOne(
        { referrerId: referrer._id },
        { $inc: { clicks: 1 } }
      );

      console.log('✅ Создан новый клик для автоматического связывания');
    }

    // Связываем клик с пользователем
    (click as any).referredUserId = user._id;
    await click.save();

    console.log('🔗 Клик связан с пользователем:', {
      clickId: click._id,
      referredUserId: user._id
    });

  } catch (error) {
    console.error('❌ Ошибка при автоматическом связывании с реферальной системой:', error);
  }
} 