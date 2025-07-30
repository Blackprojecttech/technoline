const mongoose = require('mongoose');
const { User } = require('../dist/models/User');
const { Referral, ReferralClick } = require('../dist/models/Referral');
const { Order } = require('../dist/models/Order');
require('dotenv').config();

async function checkSpecificOrder() {
  try {
    // Подключение к базе данных
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/techno-line');
    console.log('✅ Подключено к MongoDB');

    // Найдем заказ TL-20250729-1589
    const order = await Order.findOne({ orderNumber: 'TL-20250729-1589' }).populate('userId');
    if (!order) {
      console.log('❌ Заказ TL-20250729-1589 не найден');
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
    } else {
      console.log('⚠️ Пользователь НЕ привязан к реферальной ссылке');
    }

    // Найдем реферера с кодом 3144FCD9
    const referrer = await User.findOne({ referralCode: '3144FCD9' });
    if (referrer) {
      console.log(`\n🔍 Информация о реферере с кодом 3144FCD9:`);
      console.log(`👤 Реферер: ${referrer.email} (${referrer.firstName} ${referrer.lastName})`);
      
      // Найдем клики этого реферера около времени заказа
      const orderTime = new Date(order.createdAt);
      const startTime = new Date(orderTime.getTime() - 60 * 60 * 1000); // 1 час до
      const endTime = new Date(orderTime.getTime() + 60 * 60 * 1000); // 1 час после
      
      console.log(`\n👆 Поиск кликов в период с ${startTime} до ${endTime}:`);
      
      const clicks = await ReferralClick.find({
        referrerId: referrer._id,
        clickDate: { $gte: startTime, $lte: endTime }
      });
      
      console.log(`Найдено кликов: ${clicks.length}`);
      
      for (const click of clicks) {
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
      
      // Проверим всех пользователей, привлеченных этим реферером
      const referredUsers = await User.find({ referredBy: referrer._id });
      console.log(`\n👥 Всего привлеченных пользователей: ${referredUsers.length}`);
      
      for (const user of referredUsers) {
        console.log(`  - ${user.email} (${user.firstName} ${user.lastName})`);
        console.log(`    Дата регистрации: ${user.createdAt}`);
        
        // Проверим заказы этого пользователя
        const userOrders = await Order.find({ userId: user._id });
        console.log(`    Заказов: ${userOrders.length}`);
        
        for (const userOrder of userOrders) {
          console.log(`      📦 ${userOrder.orderNumber}: ${userOrder.status}, ${userOrder.total}₽, ${userOrder.createdAt}`);
          
          if (userOrder.status === 'delivered') {
            // Проверим, была ли начислена комиссия
            const commissionClick = await ReferralClick.findOne({
              orderId: userOrder._id,
              commissionPaid: true
            });
            console.log(`        Комиссия: ${commissionClick ? '✅ ' + commissionClick.commission + '₽' : '❌'}`);
          }
        }
      }
      
      // Проверим статистику реферера
      const referralRecord = await Referral.findOne({ referrerId: referrer._id });
      if (referralRecord) {
        console.log(`\n📈 Статистика реферера:`);
        console.log(`  Клики: ${referralRecord.clicks}`);
        console.log(`  Регистрации: ${referralRecord.registrations}`);
        console.log(`  Заказы: ${referralRecord.orders}`);
        console.log(`  Комиссия: ${referralRecord.totalCommission}₽`);
      }
      
      console.log(`\n💰 Статистика пользователя-реферера:`);
      console.log(referrer.referralStats);
    }

    // Проверим, можем ли мы связать этот заказ с реферальной системой
    if (!order.userId.referredBy && referrer) {
      console.log(`\n🔧 Попытка связать заказ с реферальной системой...`);
      
      // Найдем клик по IP и времени
      const orderTime = new Date(order.createdAt);
      const startTime = new Date(orderTime.getTime() - 2 * 60 * 60 * 1000); // 2 часа до
      
      const possibleClick = await ReferralClick.findOne({
        referrerId: referrer._id,
        ip: '192.168.50.69', // IP из реферальной ссылки
        clickDate: { $gte: startTime, $lte: orderTime },
        convertedToRegistration: false
      });
      
      if (possibleClick) {
        console.log(`✅ Найден подходящий клик: ${possibleClick._id}`);
        console.log(`Время клика: ${possibleClick.clickDate}`);
        console.log(`Время заказа: ${order.createdAt}`);
        
        // Можем попробовать связать (но это нужно делать осторожно)
        console.log(`⚠️ Заказ можно связать с реферальной системой, но требуется ручное вмешательство`);
      } else {
        console.log(`❌ Не найден подходящий клик для связывания`);
      }
    }

  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Отключено от MongoDB');
  }
}

checkSpecificOrder(); 