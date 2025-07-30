import mongoose from 'mongoose';
import { Payment } from '../src/models/Payment';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/technoline';

async function deleteAllPayments() {
  try {
    console.log('🔄 Подключение к базе данных...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Подключено к MongoDB');

    // Получаем количество платежей перед удалением
    const count = await Payment.countDocuments();
    console.log(`📊 Найдено платежей: ${count}`);

    // Удаляем все платежи
    const result = await Payment.deleteMany({});
    console.log(`🗑️ Удалено платежей: ${result.deletedCount}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Отключено от MongoDB');
  }
}

deleteAllPayments(); 