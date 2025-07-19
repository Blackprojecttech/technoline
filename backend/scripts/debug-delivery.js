const mongoose = require('mongoose');
require('dotenv').config();

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/technoline-store', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Схема способа доставки
const deliveryMethodSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['pickup', 'courier', 'cdek', 'urgent'] 
  },
  price: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  conditions: { type: String },
  workingHours: { type: String },
  address: { type: String },
  restrictions: { type: String }
}, {
  timestamps: true
});

const DeliveryMethod = mongoose.model('DeliveryMethod', deliveryMethodSchema);

async function debugDeliveryMethods() {
  try {
    console.log('🔍 Проверяю методы доставки в базе данных...');
    console.log('📡 Подключение к:', process.env.MONGODB_URI || 'mongodb://localhost:27017/technoline-store');
    
    // Получаем все методы доставки
    const allMethods = await DeliveryMethod.find({});
    console.log(`\n📊 Найдено ${allMethods.length} методов доставки:`);
    
    allMethods.forEach((method, index) => {
      console.log(`${index + 1}. ${method.name} - ${method.price}₽ (${method.type})`);
      console.log(`   ID: ${method._id}`);
      console.log(`   Активен: ${method.isActive}`);
      console.log(`   Порядок: ${method.order}`);
      console.log('   ---');
    });
    
    // Проверяем активные методы
    const activeMethods = await DeliveryMethod.find({ isActive: true });
    console.log(`\n✅ Активных методов: ${activeMethods.length}`);
    
    // Проверяем неактивные методы
    const inactiveMethods = await DeliveryMethod.find({ isActive: false });
    console.log(`❌ Неактивных методов: ${inactiveMethods.length}`);
    
  } catch (error) {
    console.error('❌ Ошибка при отладке:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugDeliveryMethods(); 