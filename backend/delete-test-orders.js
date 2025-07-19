const mongoose = require('mongoose');

// Схема заказа
const orderSchema = new mongoose.Schema({
  orderNumber: String,
  notes: String,
});

const Order = mongoose.model('Order', orderSchema);

mongoose.connect('mongodb://localhost:27017/technoline')
  .then(async () => {
    try {
      console.log('🗑️ Удаляем тестовые заказы...');
      const result = await Order.deleteMany({
        $or: [
          { orderNumber: { $regex: /^TL-2025/ } },
          { notes: { $regex: /тест/i } },
          { notes: { $regex: /test/i } }
        ]
      });
      console.log(`✅ Удалено заказов: ${result.deletedCount}`);
    } catch (error) {
      console.error('❌ Ошибка:', error);
    }
    process.exit();
  })
  .catch(err => {
    console.error('❌ Ошибка подключения к базе данных:', err);
    process.exit(1);
  }); 