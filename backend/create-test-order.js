const mongoose = require('mongoose');

// Схема пользователя
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
  phone: String,
  address: String,
  role: { type: String, default: 'user' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

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
      console.log('🔍 Создаем тестовый заказ...');
      
      // Находим пользователя admin@test.com
      const user = await User.findOne({ email: 'admin@test.com' });
      if (!user) {
        console.log('❌ Пользователь admin@test.com не найден');
        process.exit(1);
      }
      
      console.log('✅ Пользователь найден:', user.email);
      
      // Создаем тестовый заказ
      const testOrder = new Order({
        orderNumber: 'TL-20250716-0001',
        userId: user._id,
        items: [
          {
            productId: new mongoose.Types.ObjectId(), // Временный ID
            quantity: 2,
            price: 1500
          }
        ],
        total: 3000,
        status: 'confirmed',
        paymentMethod: 'cash',
        deliveryAddress: 'г. Москва, ул. Тестовая, д. 1, кв. 1',
        notes: 'Тестовый заказ для проверки'
      });
      
      const savedOrder = await testOrder.save();
      console.log('✅ Тестовый заказ создан:');
      console.log(`   ID: ${savedOrder._id}`);
      console.log(`   Номер: ${savedOrder.orderNumber}`);
      console.log(`   Пользователь: ${user.email}`);
      console.log(`   Статус: ${savedOrder.status}`);
      console.log(`   Сумма: ${savedOrder.total} ₽`);
      
    } catch (error) {
      console.error('❌ Ошибка:', error);
    }
    process.exit();
  })
  .catch(err => {
    console.error('❌ Ошибка подключения к базе данных:', err);
    process.exit(1);
  }); 