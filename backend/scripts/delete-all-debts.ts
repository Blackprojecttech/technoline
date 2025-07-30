import mongoose from 'mongoose';
import { Debt } from '../src/models/Debt';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/technoline';

async function deleteAllDebts() {
  try {
    console.log('🔄 Подключение к базе данных...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Подключено к MongoDB');

    // Получаем количество долгов перед удалением
    const count = await Debt.countDocuments();
    console.log(`📊 Найдено долгов: ${count}`);

    // Удаляем все долги
    const result = await Debt.deleteMany({});
    console.log(`🗑️ Удалено долгов: ${result.deletedCount}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Отключено от MongoDB');
  }
}

// Запускаем удаление
deleteAllDebts(); 