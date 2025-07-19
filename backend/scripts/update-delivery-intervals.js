const mongoose = require('mongoose');

// Подключение к MongoDB
mongoose.connect('mongodb://localhost:27017/technoline-store', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Схема для методов доставки
const deliveryMethodSchema = new mongoose.Schema({
  name: String,
  customInterval1: String,
  customInterval2: String,
  // другие поля...
});

const DeliveryMethod = mongoose.model('DeliveryMethod', deliveryMethodSchema);

async function updateDeliveryMethods() {
  try {
    console.log('🔄 Обновление методов доставки...');
    
    // Обновляем все методы доставки, убирая кастомные интервалы
    const result = await DeliveryMethod.updateMany(
      {}, // все документы
      {
        $set: {
          customInterval1: null,
          customInterval2: null
        }
      }
    );
    
    console.log(`✅ Обновлено ${result.modifiedCount} методов доставки`);
    
    // Проверяем результат
    const methods = await DeliveryMethod.find({});
    console.log('📋 Текущие методы доставки:');
    methods.forEach(method => {
      console.log(`- ${method.name}: customInterval1=${method.customInterval1}, customInterval2=${method.customInterval2}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    mongoose.connection.close();
  }
}

updateDeliveryMethods(); 