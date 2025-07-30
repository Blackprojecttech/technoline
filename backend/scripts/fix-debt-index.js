require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/technoline-store';

async function fixDebtIndex() {
  try {
    // Подключаемся к базе данных
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Получаем коллекцию debts
    const collection = mongoose.connection.collection('debts');

    // Удаляем индекс id_1
    try {
      await collection.dropIndex('id_1');
      console.log('Successfully dropped id_1 index');
    } catch (indexError) {
      if (indexError.code === 27) {
        console.log('Index id_1 does not exist');
      } else {
        throw indexError;
      }
    }

    // Выводим оставшиеся индексы
    const indexes = await collection.indexes();
    console.log('Remaining indexes:', indexes);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixDebtIndex(); 