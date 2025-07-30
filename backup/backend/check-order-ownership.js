const mongoose = require('mongoose');
require('dotenv').config();

// Подключение к базе данных
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/technoline');

// Схема заказа (упрощенная)
const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderNumber: String,
  total: Number,
  status: String,
  createdAt: Date
});

const Order = mongoose.model('Order', orderSchema);

// Схема пользователя (упрощенная)
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  role: String
});

const User = mongoose.model('User', userSchema);

async function checkOrderOwnership() {
  try {
    console.log('🔍 Проверяем заказ 687818e187c3db032d799385...');
    
    const order = await Order.findById('687818e187c3db032d799385');
    if (!order) {
      console.log('❌ Заказ не найден');
      return;
    }
    
    console.log('📦 Заказ найден:');
    console.log('  ID:', order._id);
    console.log('  Order Number:', order.orderNumber);
    console.log('  User ID (raw):', order.userId);
    console.log('  User ID type:', typeof order.userId);
    console.log('  User ID toString:', order.userId.toString());
    
    // Проверяем пользователя
    const user = await User.findById(order.userId);
    if (user) {
      console.log('👤 Пользователь найден:');
      console.log('  ID:', user._id);
      console.log('  Name:', user.firstName, user.lastName);
      console.log('  Email:', user.email);
      console.log('  Role:', user.role);
    } else {
      console.log('❌ Пользователь не найден для ID:', order.userId);
    }
    
    // Проверяем всех пользователей
    console.log('\n👥 Все пользователи в системе:');
    const allUsers = await User.find({});
    allUsers.forEach(user => {
      console.log(`  ${user._id} - ${user.firstName} ${user.lastName} (${user.email})`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkOrderOwnership(); 