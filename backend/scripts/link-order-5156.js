const mongoose = require('mongoose');
const { User } = require('../dist/models/User');
const { Referral, ReferralClick } = require('../dist/models/Referral');
const { Order } = require('../dist/models/Order');
const { processReferralCommission } = require('../dist/controllers/referralController');
require('dotenv').config();

async function linkOrder5156() {
  try {
    // Подключение к базе данных
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/techno-line');
    console.log('✅ Подключено к MongoDB');

    // Найдем заказ и реферера
    const order = await Order.findOne({ orderNumber: 'TL-20250729-5156' }).populate('userId');
    const referrer = await User.findOne({ referralCode: '3144FCD9' });
    
    if (!order || !referrer) {
      console.log('❌ Заказ или реферер не найден');
      return;
    }

    console.log(`📦 Заказ: ${order.orderNumber} (${order.total}₽)`);
    console.log(`👤 Пользователь: ${order.userId.email}`);
    console.log(`👤 Реферер: ${referrer.email}`);
    console.log(`📅 Время заказа: ${order.createdAt}`);

    // Найдем клик
    const click = await ReferralClick.findOne({
      referrerId: referrer._id,
      ip: '192.168.50.69'
    });

    if (!click) {
      console.log('❌ Клик не найден');
      return;
    }

    console.log(`👆 Найден клик: ${click.clickDate} (IP: ${click.ip})`);
    console.log(`⏰ Разница во времени: ${Math.round((order.createdAt - click.clickDate) / (1000 * 60))} минут`);

    // Проверяем, можно ли связать
    const timeDifference = Math.abs(order.createdAt - click.clickDate) / (1000 * 60); // в минутах
    
    if (timeDifference > 120) { // более 2 часов
      console.log('⚠️ Слишком большая разница во времени между кликом и заказом');
      console.log('❓ Связать заказ с реферальной системой? (y/n)');
      // В реальном сценарии здесь можно было бы запросить подтверждение
    }

    console.log('\n🔧 Связываем заказ с реферальной системой...');

    // Создаем новый клик для этого пользователя или используем существующий
    let userClick = await ReferralClick.findOne({
      referrerId: referrer._id,
      referredUserId: order.userId._id
    });

    if (!userClick) {
      // Создаем новый клик для этого пользователя
      userClick = new ReferralClick({
        referralId: await Referral.findOne({ referrerId: referrer._id }).then(r => r?._id),
        referrerId: referrer._id,
        ip: '192.168.50.69', // Предполагаем тот же IP
        userAgent: 'Manual Link',
        clickDate: new Date(order.createdAt.getTime() - 10 * 60 * 1000), // 10 минут до заказа
        convertedToRegistration: false,
        convertedToOrder: false,
        commissionPaid: false,
        referredUserId: order.userId._id
      });
      await userClick.save();
      console.log('✅ Создан новый клик для пользователя');

      // Увеличиваем счетчик кликов
      await Referral.updateOne(
        { referrerId: referrer._id },
        { $inc: { clicks: 1 } }
      );
    }

    // 1. Привязываем пользователя к реферу
    if (!order.userId.referredBy) {
      order.userId.referredBy = referrer._id;
      await order.userId.save();
      console.log('✅ Пользователь привязан к рефереру');
    }

    // 2. НЕ засчитываем как регистрацию (гостевой заказ)
    console.log('ℹ️ Регистрация НЕ засчитывается (гостевой заказ)');

    // 3. Если заказ доставлен, начисляем комиссию
    if (order.status === 'delivered' && !userClick.convertedToOrder) {
      console.log('💰 Начисляем комиссию за доставленный заказ...');
      await processReferralCommission(String(order._id));
      console.log('✅ Комиссия начислена');
    }

    // Проверяем результат
    console.log('\n📊 Проверяем результат:');
    
    const updatedReferrer = await User.findById(referrer._id);
    const updatedReferral = await Referral.findOne({ referrerId: referrer._id });
    const updatedClick = await ReferralClick.findById(userClick._id);
    
    console.log('Статистика реферера:', updatedReferrer.referralStats);
    console.log('Статистика рефералов:', {
      clicks: updatedReferral.clicks,
      registrations: updatedReferral.registrations,
      orders: updatedReferral.orders,
      totalCommission: updatedReferral.totalCommission
    });

  } catch (error) {
    console.error('❌ Ошибка связывания:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Отключено от MongoDB');
  }
}

linkOrder5156(); 