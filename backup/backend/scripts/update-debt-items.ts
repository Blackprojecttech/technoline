import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/technoline-store';

interface DebtItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  costPrice: number;
  isAccessory: boolean;
  isService?: boolean;
  serialNumbers?: string[];
  barcode?: string;
}

interface ArrivalItem extends DebtItem {
  id?: string;
}

async function updateDebtItems() {
  try {
    // Подключаемся к базе данных
    await mongoose.connect(MONGODB_URI);
    console.log('📦 Подключились к MongoDB');

    // Получаем коллекции
    const arrivalsCollection = mongoose.connection.collection('arrivals');
    const debtsCollection = mongoose.connection.collection('debts');
    
    // Получаем все долги
    const debts = await debtsCollection.find({}).toArray();
    console.log(`📊 Найдено ${debts.length} долгов`);

    // Обновляем каждый долг
    let updated = 0;
    for (const debt of debts) {
      try {
        // Находим соответствующий приход
        const arrival = await arrivalsCollection.findOne({ 
          $or: [
            { _id: new mongoose.Types.ObjectId(debt.arrivalId) },
            { id: debt.arrivalId }
          ]
        });

        if (!arrival) {
          console.log(`⚠️ Не найден приход для долга ${debt._id}`);
          continue;
        }

        // Обновляем items в долге, добавляя serialNumbers и barcode
        const updatedItems = debt.items.map((debtItem: DebtItem) => {
          // Находим соответствующий item в приходе
          const arrivalItem = arrival.items.find((item: ArrivalItem) => 
            item.productId === debtItem.productId && 
            item.productName === debtItem.productName
          );

          if (!arrivalItem) {
            console.log(`⚠️ Не найден товар ${debtItem.productName} в приходе ${arrival._id}`);
            return debtItem;
          }

          return {
            ...debtItem,
            serialNumbers: arrivalItem.serialNumbers || [],
            barcode: arrivalItem.barcode
          };
        });

        // Обновляем долг
        await debtsCollection.updateOne(
          { _id: debt._id },
          { $set: { items: updatedItems } }
        );
        
        updated++;
        console.log(`✅ Обновлен долг ${debt._id}`);
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
updateDebtItems().catch(console.error); 