import mongoose from 'mongoose';
import PaymentMethod from '../src/models/PaymentMethod';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/technoline';

async function checkPaymentMethods() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Подключение к MongoDB установлено');

    const methods = await PaymentMethod.find({});
    
    console.log(`\nНайдено способов оплаты: ${methods.length}\n`);
    
    methods.forEach((method, index) => {
      console.log(`${index + 1}. ${method.name}`);
      console.log(`   Код: ${method.systemCode}`);
      console.log(`   Описание: ${method.description || '-'}`);
      console.log(`   Статус: ${method.isActive ? 'Активен' : 'Неактивен'}`);
      console.log(`   Заголовок: ${method.displayTitle || '-'}`);
      console.log(`   Описание для отображения: ${method.displayDescription || '-'}`);
      console.log(`   Иконка: ${method.icon || '-'}`);
      console.log(`   Цвет: ${method.color || '-'}`);
      console.log(`   Преимущества: ${method.features ? method.features.join(', ') : '-'}`);
      console.log(`   Примечание: ${method.specialNote || '-'}`);
      console.log(`   Тип примечания: ${method.noteType || '-'}`);
      console.log(`   Доступные доставки: ${method.deliveryTypes.length}`);
      console.log('');
    });

  } catch (error) {
    console.error('Ошибка при проверке:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Отключение от MongoDB');
  }
}

checkPaymentMethods(); 