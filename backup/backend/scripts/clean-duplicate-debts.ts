import mongoose from 'mongoose';
import { Debt } from '../src/models/Debt';
import { Arrival } from '../src/models/Arrival';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/technoline';

async function cleanDuplicateDebts() {
  try {
    console.log('🔄 Подключение к базе данных...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Подключено к MongoDB');

    // Получаем все долги, сгруппированные по arrivalId
    const debts = await Debt.find().lean();
    const debtsByArrival = new Map<string, any[]>();

    debts.forEach(debt => {
      if (!debt.arrivalId) return;
      
      if (!debtsByArrival.has(debt.arrivalId)) {
        debtsByArrival.set(debt.arrivalId, []);
      }
      debtsByArrival.get(debt.arrivalId)!.push(debt);
    });

    console.log(`📊 Найдено ${debts.length} долгов`);
    console.log(`📊 Уникальных приходов: ${debtsByArrival.size}`);

    // Проверяем каждый приход
    let duplicatesCount = 0;
    let deletedCount = 0;
    let orphanedCount = 0;

    for (const [arrivalId, arrivalDebts] of debtsByArrival) {
      // Проверяем существование прихода
      const arrival = await Arrival.findById(arrivalId).lean();
      
      if (!arrival) {
        console.log(`❌ Приход не найден для долгов: ${arrivalId}`);
        console.log(`🗑️ Удаляем ${arrivalDebts.length} осиротевших долгов`);
        await Debt.deleteMany({ arrivalId });
        orphanedCount += arrivalDebts.length;
        continue;
      }

      // Если есть дубликаты
      if (arrivalDebts.length > 1) {
        duplicatesCount++;
        console.log(`\n🔍 Найдены дубликаты для прихода ${arrivalId}:`);
        console.log(`📦 Приход от: ${new Date(arrival.date).toLocaleDateString()}`);
        console.log(`💰 Количество долгов: ${arrivalDebts.length}`);

        // Сортируем долги по дате создания (сначала новые)
        const sortedDebts = arrivalDebts.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Оставляем самый новый долг
        const latestDebt = sortedDebts[0];
        const debtsToDelete = sortedDebts.slice(1);

        console.log(`✅ Оставляем долг: ${latestDebt._id}`);
        console.log(`🗑️ Удаляем долги:`, debtsToDelete.map(d => d._id).join(', '));

        // Удаляем дубликаты
        for (const debt of debtsToDelete) {
          await Debt.deleteOne({ _id: debt._id });
          deletedCount++;
        }
      }
    }

    console.log('\n📊 Итоги очистки:');
    console.log(`🔍 Всего долгов: ${debts.length}`);
    console.log(`🔄 Найдено приходов с дубликатами: ${duplicatesCount}`);
    console.log(`🗑️ Удалено дублирующихся долгов: ${deletedCount}`);
    console.log(`🗑️ Удалено осиротевших долгов: ${orphanedCount}`);
    console.log(`✅ Осталось долгов: ${debts.length - deletedCount - orphanedCount}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Отключено от MongoDB');
  }
}

// Запускаем очистку
cleanDuplicateDebts(); 