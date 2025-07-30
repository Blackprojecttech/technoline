import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/technoline-store';

const generateUniqueDebtId = () => `debt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

async function fixDebtIds() {
  try {
    // Подключаемся к базе данных
    await mongoose.connect(MONGODB_URI);
    console.log('📦 Подключились к MongoDB');

    // Получаем коллекцию долгов
    const debtsCollection = mongoose.connection.collection('debts');
    
    // Получаем все долги
    const debts = await debtsCollection.find({}).toArray();
    console.log(`📊 Найдено ${debts.length} долгов`);

    // Обновляем ID каждого долга
    let updated = 0;
    for (const debt of debts) {
      const newId = generateUniqueDebtId();
      console.log(`🔄 Обновляем долг ${debt.id || debt._id} -> ${newId}`);
      
      try {
        await debtsCollection.updateOne(
          { _id: debt._id },
          { 
            $set: { 
              id: newId,
              // Убеждаемся, что все необходимые поля существуют
              arrivalId: debt.arrivalId || `arrival_${Date.now()}`,
              status: debt.status || 'active',
              items: debt.items || []
            } 
          }
        );
        updated++;
      } catch (err) {
        console.error(`❌ Ошибка при обновлении долга ${debt._id}:`, err);
      }
    }

    console.log(`✅ Обновлено ${updated} из ${debts.length} долгов`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Отключились от MongoDB');
  }
}

// Запускаем скрипт
fixDebtIds().catch(console.error); 