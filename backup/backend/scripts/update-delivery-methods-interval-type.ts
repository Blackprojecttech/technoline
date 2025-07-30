import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DeliveryMethod from '../src/models/DeliveryMethod';

dotenv.config();

const updateDeliveryMethodsIntervalType = async () => {
  try {
    // Подключение к базе данных
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/technoline';
    await mongoose.connect(mongoUri);
    console.log('✅ Подключение к базе данных установлено');

    // Обновляем все способы доставки, добавляя поле intervalType
    const result = await DeliveryMethod.updateMany(
      { intervalType: { $exists: false } },
      { 
        $set: { 
          intervalType: 'standard' // По умолчанию устанавливаем стандартный тип
        } 
      }
    );

    console.log(`✅ Обновлено ${result.modifiedCount} способов доставки`);

    // Выводим список всех способов доставки с их новыми полями
    const deliveryMethods = await DeliveryMethod.find({});
    console.log('\n📋 Список способов доставки:');
    deliveryMethods.forEach((method, index) => {
      console.log(`${index + 1}. ${method.name} - intervalType: ${method.intervalType || 'не установлен'}`);
    });

    console.log('\n✅ Обновление завершено успешно');
  } catch (error) {
    console.error('❌ Ошибка при обновлении:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Отключение от базы данных');
  }
};

// Запускаем скрипт
updateDeliveryMethodsIntervalType(); 