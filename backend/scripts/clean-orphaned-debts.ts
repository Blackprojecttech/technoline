require('dotenv').config();
import mongoose from 'mongoose';
import { Debt } from '../src/models/Debt';
import { Arrival } from '../src/models/Arrival';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/technoline-store';

async function cleanOrphanedDebts() {
  try {
    // Подключаемся к базе данных
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Получаем все долги
    const debts = await Debt.find();
    console.log(`Found ${debts.length} debts`);

    let deletedCount = 0;
    let errorCount = 0;

    // Проверяем каждый долг
    for (const debt of debts) {
      try {
        // Проверяем существование прихода
        const arrival = await Arrival.findById(debt.arrivalId);
        
        if (!arrival) {
          console.log(`Deleting orphaned debt: ${debt._id} (arrivalId: ${debt.arrivalId})`);
          await Debt.deleteOne({ _id: debt._id });
          deletedCount++;
        }
      } catch (error) {
        console.error(`Error processing debt ${debt._id}:`, error);
        errorCount++;
      }
    }

    console.log(`\nResults:`);
    console.log(`- Total debts processed: ${debts.length}`);
    console.log(`- Orphaned debts deleted: ${deletedCount}`);
    console.log(`- Errors encountered: ${errorCount}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

cleanOrphanedDebts(); 