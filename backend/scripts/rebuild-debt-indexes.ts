import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/technoline-store';

async function rebuildDebtIndexes() {
  try {
    // Подключаемся к базе данных
    await mongoose.connect(MONGODB_URI);
    console.log('📦 Подключились к MongoDB');

    // Получаем коллекцию долгов
    const debtsCollection = mongoose.connection.collection('debts');
    
    // Удаляем все существующие индексы
    console.log('🗑️ Удаляем существующие индексы...');
    await debtsCollection.dropIndexes();
    
    // Создаем новые индексы
    console.log('📝 Создаем новые индексы...');
    await debtsCollection.createIndex({ id: 1 }, { unique: true });
    await debtsCollection.createIndex({ supplierId: 1 });
    await debtsCollection.createIndex({ status: 1 });
    await debtsCollection.createIndex({ date: -1 });
    await debtsCollection.createIndex({ dueDate: 1 });
    await debtsCollection.createIndex({ createdBy: 1 });

    console.log('✅ Индексы успешно пересозданы');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Отключились от MongoDB');
  }
}

// Запускаем скрипт
rebuildDebtIndexes().catch(console.error); 