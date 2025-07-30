const mongoose = require('mongoose');
const { User } = require('../dist/models/User');
const { Referral, ReferralClick } = require('../dist/models/Referral');
const { Order } = require('../dist/models/Order');
require('dotenv').config();

async function debugReferralIssue() {
  try {
    // Подключение к базе данных
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/techno-line');
    console.log('✅ Подключено к MongoDB');

    // Найдем последние рефералы и их активность
    console.log('\n🔍 Поиск рефералов с активностью...');
    
    const referrals = await Referral.find({}).populate('referrerId', 'email firstName lastName referralCode');
    console.log(`📊 Найдено рефералов: ${referrals.length}`);
    
    for (const referral of referrals) {
      console.log(`\n👤 Реферер: ${referral.referrerId.email} (${referral.referrerId.firstName} ${referral.referrerId.lastName})`);
      console.log(`🔗 Код: ${referral.referralCode}`);
      console.log(`📈 Статистика: клики=${referral.clicks}, регистрации=${referral.registrations}, заказы=${referral.orders}`);
      
      // Найдем все клики для этого реферера
      const clicks = await ReferralClick.find({ referrerId: referral.referrerId._id });
      console.log(`👆 Кликов найдено: ${clicks.length}`);
      
      for (const click of clicks) {
        console.log(`  - IP: ${click.ip}, Дата: ${click.clickDate}`);
        console.log(`    Регистрация: ${click.convertedToRegistration ? '✅' : '❌'}`);
        console.log(`    Заказ: ${click.convertedToOrder ? '✅' : '❌'}`);
        console.log(`    Комиссия: ${click.commission || 0}`);
        
        if (click.referredUserId) {
          const referredUser = await User.findById(click.referredUserId);
          if (referredUser) {
            console.log(`    Реферал: ${referredUser.email} (${referredUser.firstName} ${referredUser.lastName})`);
            
            // Проверим заказы этого пользователя
            const userOrders = await Order.find({ userId: click.referredUserId });
            console.log(`    Заказов у реферала: ${userOrders.length}`);
            
            for (const order of userOrders) {
              console.log(`      Заказ ${order.orderNumber}: статус=${order.status}, сумма=${order.total}`);
            }
          }
        }
      }
      
      // Найдем всех пользователей, которые были привлечены этим реферером
      const referredUsers = await User.find({ referredBy: referral.referrerId._id });
      console.log(`👥 Привлеченных пользователей: ${referredUsers.length}`);
      
      for (const refUser of referredUsers) {
        console.log(`  - ${refUser.email} (${refUser.firstName} ${refUser.lastName})`);
        
        // Проверим заказы каждого привлеченного пользователя
        const orders = await Order.find({ userId: refUser._id });
        console.log(`    Заказов: ${orders.length}`);
        
        for (const order of orders) {
          console.log(`      ${order.orderNumber}: ${order.status}, ${order.total}₽, ${order.createdAt}`);
        }
      }
    }

    // Проверим последние заказы со статусом delivered
    console.log('\n📦 Последние доставленные заказы:');
    const deliveredOrders = await Order.find({ status: 'delivered' })
      .populate('userId', 'email firstName lastName referredBy')
      .sort({ updatedAt: -1 })
      .limit(10);
    
    for (const order of deliveredOrders) {
      console.log(`\n📦 Заказ ${order.orderNumber}:`);
      console.log(`  Пользователь: ${order.userId.email}`);
      console.log(`  Привлечен: ${order.userId.referredBy ? '✅' : '❌'}`);
      console.log(`  Сумма: ${order.total}₽`);
      console.log(`  Дата доставки: ${order.updatedAt}`);
      
      if (order.userId.referredBy) {
        const referrer = await User.findById(order.userId.referredBy);
        if (referrer) {
          console.log(`  Реферер: ${referrer.email} (${referrer.firstName} ${referrer.lastName})`);
          console.log(`  Статистика реферера:`, referrer.referralStats);
          
          // Проверим, была ли начислена комиссия за этот заказ
          const commissionClick = await ReferralClick.findOne({
            orderId: order._id,
            commissionPaid: true
          });
          console.log(`  Комиссия начислена: ${commissionClick ? '✅' : '❌'}`);
          if (commissionClick) {
            console.log(`  Размер комиссии: ${commissionClick.commission}₽`);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Ошибка диагностики:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Отключено от MongoDB');
  }
}

debugReferralIssue(); 