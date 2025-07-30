const mongoose = require('mongoose');
const { User } = require('../dist/models/User');
const { Referral, ReferralClick } = require('../dist/models/Referral');
const { Order } = require('../dist/models/Order');
require('dotenv').config();

async function checkOrder5156() {
  try {
    // Подключение к базе данных
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/techno-line');
    console.log('✅ Подключено к MongoDB');

    // Найдем заказ TL-20250729-5156
    const order = await Order.findOne({ orderNumber: 'TL-20250729-5156' }).populate('userId');
    if (!order) {
      console.log('❌ Заказ TL-20250729-5156 не найден');
      return;
    }

    console.log(`📦 Найден заказ: ${order.orderNumber}`);
    console.log(`📅 Дата создания: ${order.createdAt}`);
    console.log(`👤 Пользователь: ${order.userId.email} (${order.userId.firstName} ${order.userId.lastName})`);
    console.log(`💰 Сумма: ${order.total}₽`);
    console.log(`📊 Статус: ${order.status}`);
    console.log(`🔗 Привлечен по реферальной ссылке: ${order.userId.referredBy ? '✅' : '❌'}`);

    if (order.userId.referredBy) {
      const referrer = await User.findById(order.userId.referredBy);
      if (referrer) {
        console.log(`👤 Реферер: ${referrer.email} (${referrer.firstName} ${referrer.lastName})`);
        console.log(`🔗 Реферальный код: ${referrer.referralCode}`);
      }
    }

    // Найдем реферера с кодом 3144FCD9
    const referrer = await User.findOne({ referralCode: '3144FCD9' });
    if (referrer) {
      console.log(`\n🔍 Информация о реферере с кодом 3144FCD9:`);
      console.log(`👤 Реферер: ${referrer.email} (${referrer.firstName} ${referrer.lastName})`);
      
      // Найдем все клики этого реферера
      const allClicks = await ReferralClick.find({ referrerId: referrer._id }).sort({ clickDate: -1 });
      console.log(`\n👆 Все клики реферера (${allClicks.length}):`);
      
      for (const click of allClicks) {
        console.log(`\n📊 Клик ${click._id}:`);
        console.log(`  IP: ${click.ip}`);
        console.log(`  Дата: ${click.clickDate}`);
        console.log(`  User-Agent: ${click.userAgent}`);
        console.log(`  Регистрация: ${click.convertedToRegistration ? '✅' : '❌'}`);
        console.log(`  Заказ: ${click.convertedToOrder ? '✅' : '❌'}`);
        
        if (click.referredUserId) {
          const referredUser = await User.findById(click.referredUserId);
          if (referredUser) {
            console.log(`  Привлеченный пользователь: ${referredUser.email}`);
          }
        }
      }
      
      // Найдем клики в период времени заказа
      const orderTime = new Date(order.createdAt);
      const startTime = new Date(orderTime.getTime() - 2 * 60 * 60 * 1000); // 2 часа до
      const endTime = new Date(orderTime.getTime() + 30 * 60 * 1000); // 30 минут после
      
      console.log(`\n🕐 Поиск кликов в период с ${startTime} до ${endTime}:`);
      
      const relevantClicks = await ReferralClick.find({
        referrerId: referrer._id,
        clickDate: { $gte: startTime, $lte: endTime }
      });
      
      console.log(`Найдено кликов в периоде: ${relevantClicks.length}`);
      
      if (relevantClicks.length === 0) {
        console.log('❌ Нет кликов в период создания заказа!');
        console.log('⚠️ Возможные причины:');
        console.log('  1. Пользователь НЕ переходил по реферальной ссылке');
        console.log('  2. Куки были очищены');
        console.log('  3. Проблема с отслеживанием кликов');
        console.log('  4. Разные IP адреса');
      }
      
      // Проверим все заказы около этого времени с IP 192.168.50.69
      console.log(`\n🔍 Поиск заказов с IP 192.168.50.69 около времени ${orderTime}:`);
      
      const orders = await Order.find({
        createdAt: { $gte: startTime, $lte: endTime }
      }).populate('userId');
      
      console.log(`Найдено заказов в периоде: ${orders.length}`);
      
      for (const ord of orders) {
        console.log(`\n📦 ${ord.orderNumber} (${ord.createdAt}):`);
        console.log(`  Пользователь: ${ord.userId.email}`);
        console.log(`  Привлечен: ${ord.userId.referredBy ? '✅' : '❌'}`);
        console.log(`  Частично зарегистрирован: ${ord.userId.isPartiallyRegistered ? '✅' : '❌'}`);
      }
      
      // Проверим статистику реферера
      const referralRecord = await Referral.findOne({ referrerId: referrer._id });
      if (referralRecord) {
        console.log(`\n📈 Текущая статистика реферера:`);
        console.log(`  Клики: ${referralRecord.clicks}`);
        console.log(`  Регистрации: ${referralRecord.registrations}`);
        console.log(`  Заказы: ${referralRecord.orders}`);
        console.log(`  Комиссия: ${referralRecord.totalCommission}₽`);
      }
    }

    // Дополнительная диагностика
    console.log(`\n🔧 Дополнительная диагностика:`);
    console.log(`Пользователь заказа:`);
    console.log(`  Email: ${order.userId.email}`);
    console.log(`  Частично зарегистрирован: ${order.userId.isPartiallyRegistered}`);
    console.log(`  Дата регистрации: ${order.userId.createdAt}`);
    console.log(`  Привлечен: ${order.userId.referredBy ? 'Да' : 'Нет'}`);

  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Отключено от MongoDB');
  }
}

checkOrder5156(); 