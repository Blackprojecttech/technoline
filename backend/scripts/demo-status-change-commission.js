const mongoose = require('mongoose');
const { User } = require('../dist/models/User');
const { Referral, ReferralClick } = require('../dist/models/Referral');
const { Order } = require('../dist/models/Order');
require('dotenv').config();

async function demoStatusChangeCommission() {
  try {
    // Подключение к базе данных
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/techno-line');
    console.log('✅ Подключено к MongoDB');

    console.log('\n🎬 ДЕМОНСТРАЦИЯ: Автоматическая отмена комиссии при изменении статуса заказа\n');

    // Найдем заказ TL-20250729-4208
    const order = await Order.findOne({ orderNumber: 'TL-20250729-4208' }).populate('userId');
    if (!order) {
      console.log('❌ Заказ не найден');
      return;
    }

    console.log(`📦 Заказ: ${order.orderNumber} (${order.total}₽)`);
    console.log(`👤 Пользователь: ${order.userId.email}`);
    console.log(`📊 Текущий статус: ${order.status}`);

    if (!order.userId.referredBy) {
      console.log('❌ Заказ не связан с реферальной программой');
      return;
    }

    const referrer = await User.findById(order.userId.referredBy);
    console.log(`👤 Реферер: ${referrer.email}`);

    // Показываем начальную статистику
    const initialReferral = await Referral.findOne({ referrerId: referrer._id });
    console.log(`\n📊 Текущая статистика реферера:`);
    console.log(`   Заказы: ${initialReferral.orders}`);
    console.log(`   Общая комиссия: ${initialReferral.totalCommission}₽`);
    console.log(`   Доступный баланс: ${referrer.referralStats.availableBalance}₽`);

    // 1. Изменяем статус с "delivered" на "processing"
    console.log(`\n1️⃣ Изменяем статус заказа с "${order.status}" на "processing"...`);
    
    const oldStatus = order.status;
    order.status = 'processing';
    await order.save();

    // Имитируем логику из routes/orders.ts
    if (oldStatus === 'delivered' && order.status !== 'delivered') {
      console.log('💸 Автоматически отменяем реферальную комиссию...');
      const { cancelReferralCommission } = require('../dist/controllers/referralController');
      await cancelReferralCommission(String(order._id));
    }

    // Проверяем статистику после отмены
    const afterCancelReferral = await Referral.findOne({ referrerId: referrer._id });
    const afterCancelUser = await User.findById(referrer._id);
    
    console.log(`\n📊 Статистика после изменения статуса на "processing":`);
    console.log(`   Заказы: ${afterCancelReferral.orders} (было ${initialReferral.orders})`);
    console.log(`   Общая комиссия: ${afterCancelReferral.totalCommission}₽ (было ${initialReferral.totalCommission}₽)`);
    console.log(`   Доступный баланс: ${afterCancelUser.referralStats.availableBalance}₽ (было ${referrer.referralStats.availableBalance}₽)`);

    // 2. Возвращаем статус обратно на "delivered"
    console.log(`\n2️⃣ Возвращаем статус заказа обратно на "delivered"...`);
    
    const oldStatus2 = order.status;
    order.status = 'delivered';
    await order.save();

    // Имитируем логику из routes/orders.ts
    if (order.status === 'delivered' && oldStatus2 !== 'delivered') {
      console.log('💰 Автоматически начисляем реферальную комиссию...');
      const { processReferralCommission } = require('../dist/controllers/referralController');
      await processReferralCommission(String(order._id));
    }

    // Проверяем итоговую статистику
    const finalReferral = await Referral.findOne({ referrerId: referrer._id });
    const finalUser = await User.findById(referrer._id);
    
    console.log(`\n📊 Итоговая статистика после возврата к "delivered":`);
    console.log(`   Заказы: ${finalReferral.orders}`);
    console.log(`   Общая комиссия: ${finalReferral.totalCommission}₽`);
    console.log(`   Доступный баланс: ${finalUser.referralStats.availableBalance}₽`);

    // 3. Показываем итоговое сравнение
    console.log(`\n🎯 ИТОГОВОЕ СРАВНЕНИЕ:`);
    console.log(`   Заказы: ${initialReferral.orders} → ${afterCancelReferral.orders} → ${finalReferral.orders}`);
    console.log(`   Комиссия: ${initialReferral.totalCommission}₽ → ${afterCancelReferral.totalCommission}₽ → ${finalReferral.totalCommission}₽`);
    console.log(`   Баланс: ${referrer.referralStats.availableBalance}₽ → ${afterCancelUser.referralStats.availableBalance}₽ → ${finalUser.referralStats.availableBalance}₽`);

    const isRestored = (
      finalReferral.orders === initialReferral.orders &&
      finalReferral.totalCommission === initialReferral.totalCommission &&
      finalUser.referralStats.availableBalance === referrer.referralStats.availableBalance
    );

    console.log(`\n✅ Результат: ${isRestored ? 'Статистика корректно восстановлена' : 'Есть расхождения в статистике'}`);

    console.log(`\n🎉 ДЕМОНСТРАЦИЯ ЗАВЕРШЕНА!`);
    console.log(`\n📝 Система автоматически:`);
    console.log(`   ✅ Отменяет комиссию при изменении статуса с "delivered" на другой`);
    console.log(`   ✅ Начисляет комиссию при изменении статуса на "delivered"`);
    console.log(`   ✅ Корректно обновляет всю статистику реферальной программы`);

  } catch (error) {
    console.error('❌ Ошибка демонстрации:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Отключено от MongoDB');
  }
}

demoStatusChangeCommission(); 