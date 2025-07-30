const mongoose = require('mongoose');
const { User } = require('../dist/models/User');
const { Referral, ReferralClick } = require('../dist/models/Referral');
const { Order } = require('../dist/models/Order');
require('dotenv').config();

async function checkOrder4208() {
  try {
    // Подключение к базе данных
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/techno-line');
    console.log('✅ Подключено к MongoDB');

    // Найдем заказ TL-20250729-4208
    const order = await Order.findOne({ orderNumber: 'TL-20250729-4208' }).populate('userId');
    if (!order) {
      console.log('❌ Заказ TL-20250729-4208 не найден');
      return;
    }

    console.log(`📦 Найден заказ: ${order.orderNumber}`);
    console.log(`📅 Дата создания: ${order.createdAt}`);
    console.log(`👤 Пользователь: ${order.userId.email} (${order.userId.firstName} ${order.userId.lastName})`);
    console.log(`💰 Сумма: ${order.total}₽`);
    console.log(`📊 Статус: ${order.status}`);
    console.log(`🔗 Привлечен по реферальной ссылке: ${order.userId.referredBy ? '✅' : '❌'}`);

    // Найдем реферера с кодом 3144FCD9
    const referrer = await User.findOne({ referralCode: '3144FCD9' });
    if (!referrer) {
      console.log('❌ Реферер не найден');
      return;
    }

    console.log(`\n🔍 Информация о реферере:`);
    console.log(`👤 Реферер: ${referrer.email} (${referrer.firstName} ${referrer.lastName})`);
    
    // Найдем все клики реферера за последние несколько часов
    const orderTime = new Date(order.createdAt);
    const startTime = new Date(orderTime.getTime() - 4 * 60 * 60 * 1000); // 4 часа до
    const endTime = new Date(orderTime.getTime() + 1 * 60 * 60 * 1000); // 1 час после
    
    console.log(`\n👆 Поиск кликов в период с ${startTime} до ${endTime}:`);
    
    const clicks = await ReferralClick.find({
      referrerId: referrer._id,
      clickDate: { $gte: startTime, $lte: endTime }
    }).sort({ clickDate: -1 });
    
    console.log(`Найдено кликов в периоде: ${clicks.length}`);
    
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

    // Проверим все заказы в этот период времени
    console.log(`\n📦 Все заказы в период с ${startTime} до ${endTime}:`);
    
    const orders = await Order.find({
      createdAt: { $gte: startTime, $lte: endTime }
    }).populate('userId').sort({ createdAt: -1 });
    
    console.log(`Найдено заказов: ${orders.length}`);
    
    for (const ord of orders) {
      console.log(`\n📦 ${ord.orderNumber} (${ord.createdAt}):`);
      console.log(`  Пользователь: ${ord.userId.email}`);
      console.log(`  Привлечен: ${ord.userId.referredBy ? '✅' : '❌'}`);
      console.log(`  Частично зарегистрирован: ${ord.userId.isPartiallyRegistered ? '✅' : '❌'}`);
      console.log(`  Дата создания пользователя: ${ord.userId.createdAt}`);
    }

    // Проверим, есть ли новые клики после 18:35
    console.log(`\n🔍 Поиск ВСЕХ кликов реферера:`);
    const allClicks = await ReferralClick.find({ referrerId: referrer._id }).sort({ clickDate: -1 });
    
    console.log(`Всего кликов: ${allClicks.length}`);
    for (const click of allClicks) {
      console.log(`  ${click.clickDate} - IP: ${click.ip} - Связан с: ${click.referredUserId ? 'Да' : 'Нет'}`);
    }

    // Проверим текущую статистику
    const referralRecord = await Referral.findOne({ referrerId: referrer._id });
    console.log(`\n📈 Текущая статистика:`);
    console.log(`  Клики: ${referralRecord.clicks}`);
    console.log(`  Регистрации: ${referralRecord.registrations}`);
    console.log(`  Заказы: ${referralRecord.orders}`);
    console.log(`  Комиссия: ${referralRecord.totalCommission}₽`);

  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Отключено от MongoDB');
  }
}

checkOrder4208(); 