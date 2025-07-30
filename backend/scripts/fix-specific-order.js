const mongoose = require('mongoose');
const { User } = require('../dist/models/User');
const { Referral, ReferralClick } = require('../dist/models/Referral');
const { Order } = require('../dist/models/Order');
const { processReferralCommission } = require('../dist/controllers/referralController');
require('dotenv').config();

async function fixSpecificOrder() {
  try {
    // Подключение к базе данных
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/techno-line');
    console.log('✅ Подключено к MongoDB');

    // Найдем заказ и пользователя
    const order = await Order.findOne({ orderNumber: 'TL-20250729-1589' }).populate('userId');
    const referrer = await User.findOne({ referralCode: '3144FCD9' });
    
    if (!order || !referrer) {
      console.log('❌ Заказ или реферер не найден');
      return;
    }

    console.log(`📦 Заказ: ${order.orderNumber} (${order.total}₽)`);
    console.log(`👤 Пользователь: ${order.userId.email}`);
    console.log(`👤 Реферер: ${referrer.email}`);

    // Найдем клик
    const click = await ReferralClick.findById('6888ea5ae01de8b2089371c1');
    if (!click) {
      console.log('❌ Клик не найден');
      return;
    }

    console.log(`\n🔧 Связываем заказ с реферальной системой...`);

    // 1. Привязываем пользователя к реферу
    if (!order.userId.referredBy) {
      order.userId.referredBy = referrer._id;
      await order.userId.save();
      console.log('✅ Пользователь привязан к рефереру');
    }

    // 2. Обновляем клик как конвертированный в регистрацию
    if (!click.convertedToRegistration) {
      click.convertedToRegistration = true;
      click.registrationDate = order.createdAt;
      click.referredUserId = order.userId._id;
      await click.save();
      console.log('✅ Клик помечен как конвертированный в регистрацию');

      // Обновляем статистику регистраций
      await Referral.updateOne(
        { referrerId: referrer._id },
        { $inc: { registrations: 1 } }
      );

      await User.updateOne(
        { _id: referrer._id },
        { $inc: { 'referralStats.totalReferrals': 1 } }
      );
      console.log('✅ Обновлена статистика регистраций');
    }

    // 3. Если заказ доставлен, начисляем комиссию
    if (order.status === 'delivered' && !click.convertedToOrder) {
      console.log('💰 Начисляем комиссию за доставленный заказ...');
      await processReferralCommission(String(order._id));
      console.log('✅ Комиссия начислена');
    }

    // Проверяем результат
    console.log('\n📊 Проверяем результат:');
    
    const updatedReferrer = await User.findById(referrer._id);
    const updatedReferral = await Referral.findOne({ referrerId: referrer._id });
    const updatedClick = await ReferralClick.findById(click._id);
    
    console.log('Статистика реферера:', updatedReferrer.referralStats);
    console.log('Статистика рефералов:', {
      clicks: updatedReferral.clicks,
      registrations: updatedReferral.registrations,
      orders: updatedReferral.orders,
      totalCommission: updatedReferral.totalCommission
    });
    console.log('Статус клика:', {
      convertedToRegistration: updatedClick.convertedToRegistration,
      convertedToOrder: updatedClick.convertedToOrder,
      commission: updatedClick.commission
    });

  } catch (error) {
    console.error('❌ Ошибка исправления:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Отключено от MongoDB');
  }
}

fixSpecificOrder(); 