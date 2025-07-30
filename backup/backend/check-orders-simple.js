const mongoose = require('mongoose');

// Схема заказа
const orderSchema = new mongoose.Schema({
  orderNumber: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: Number,
    price: Number
  }],
  total: Number,
  status: { type: String, default: 'pending' },
  paymentMethod: String,
  deliveryMethod: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryMethod' },
  deliveryDate: String,
  deliveryTime: String,
  deliveryAddress: String,
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

mongoose.connect('mongodb://localhost:27017/technoline')
  .then(async () => {
    try {
      console.log('🔍 Проверяем заказы в базе данных...');
      const orders = await Order.find({}).populate('userId', 'email firstName lastName');
      console.log(`📊 Найдено заказов: ${orders.length}`);
      
      if (orders.length === 0) {
        console.log('❌ Заказов не найдено');
      } else {
        orders.forEach((order, index) => {
          console.log(`${index + 1}. Заказ #${order.orderNumber}`);
          console.log(`   ID: ${order._id}`);
          console.log(`   Пользователь: ${order.userId ? order.userId.email : 'Не указан'}`);
          console.log(`   Статус: ${order.status}`);
          console.log(`   Сумма: ${order.total} ₽`);
          console.log(`   Дата: ${order.createdAt}`);
          console.log('---');
        });
      }
    } catch (error) {
      console.error('❌ Ошибка:', error);
    }
    process.exit();
  })
  .catch(err => {
    console.error('❌ Ошибка подключения к базе данных:', err);
    process.exit(1);
  }); 