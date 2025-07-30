const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/technoline');

// Определяем схему Order
const orderSchema = new mongoose.Schema({
  orderNumber: String,
  cdekPvzAddress: String,
  trackingNumber: String,
  _id: String,
  // другие поля...
});

const Order = mongoose.model('Order', orderSchema);

async function checkOrderPvz() {
  try {
    console.log('🔍 Проверяем заказ по трек-номеру 10139990099...');
    
    // Ищем заказ по трек-номеру
    const order = await Order.findOne({ 
      trackingNumber: '10139990099' 
    });
    
    if (!order) {
      console.log('❌ Заказ не найден по трек-номеру');
      return;
    }
    
    console.log('📦 Заказ найден:');
    console.log('  - orderNumber:', order.orderNumber);
    console.log('  - trackingNumber:', order.trackingNumber);
    console.log('  - cdekPvzAddress:', order.cdekPvzAddress);
    console.log('  - _id:', order._id);
    
    // Проверяем, что система должна использовать
    console.log('\n🔍 Анализ:');
    console.log('   - Система должна использовать ТОЛЬКО адрес из поля cdekPvzAddress');
    console.log('   - Если адрес ПВЗ не указан, система должна показать ошибку');
    console.log('   - Система НЕ должна использовать адрес доставки или другие адреса');
    
    if (!order.cdekPvzAddress) {
      console.log('❌ Адрес ПВЗ не указан в заказе!');
      console.log('💡 Нужно указать адрес ПВЗ в редакторе заказа');
    } else {
      console.log('✅ Адрес ПВЗ указан:', order.cdekPvzAddress);
      console.log('💡 Система должна использовать этот адрес для поиска ПВЗ');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkOrderPvz(); 