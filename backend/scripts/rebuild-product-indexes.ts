import mongoose from 'mongoose';
import { Product } from '../src/models/Product';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/technoline';

async function rebuildIndexes() {
  try {
    console.log('🔄 Подключение к базе данных...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Подключено к MongoDB');

    console.log('🔄 Удаление всех индексов...');
    await Product.collection.dropIndexes();
    console.log('✅ Индексы удалены');

    console.log('🔄 Создание новых индексов...');
    await Product.syncIndexes();
    console.log('✅ Индексы пересозданы');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Отключено от MongoDB');
  }
}

// Запускаем пересоздание индексов
rebuildIndexes(); 