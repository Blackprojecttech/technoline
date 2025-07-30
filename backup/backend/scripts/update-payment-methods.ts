import mongoose from 'mongoose';
import PaymentMethod from '../src/models/PaymentMethod';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/technoline';

async function updatePaymentMethods() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Подключение к MongoDB установлено');

    // Обновляем существующие способы оплаты с правильными кодами
    const updates = [
      {
        systemCode: 'cash_on_delivery',
        displayTitle: 'Оплата при получении',
        displayDescription: 'Оплатите заказ наличными курьеру при доставке',
        features: ['Без комиссии', 'Безопасно', 'Удобно'],
        icon: '💳',
        color: 'blue',
        specialNote: 'Подготовьте точную сумму для оплаты при получении',
        noteType: 'warning'
      },
      {
        systemCode: 'bank_card',
        displayTitle: 'Банковская карта',
        displayDescription: 'Оплата картой онлайн через защищенное соединение',
        features: ['Безопасно', 'Мгновенно', 'Все карты'],
        icon: '💳',
        color: 'green',
        specialNote: 'Оплата производится через защищенный шлюз',
        noteType: 'info'
      },
      {
        systemCode: 'sberbank_transfer',
        displayTitle: 'Перевод Сбербанк',
        displayDescription: 'Перевод через Сбербанк Онлайн или мобильное приложение',
        features: ['Без комиссии', 'Надежно', 'Быстро'],
        icon: '🏦',
        color: 'green',
        specialNote: 'Укажите номер заказа в комментарии к переводу',
        noteType: 'info'
      },
      {
        systemCode: 'credit_purchase',
        displayTitle: 'Покупка в кредит',
        displayDescription: 'Оформите покупку в кредит через Сбербанк или Тинькофф',
        features: ['Рассрочка', 'Выгодно', 'Просто'],
        icon: '💰',
        color: 'purple',
        specialNote: 'Одобрение кредита занимает до 5 минут',
        noteType: 'success'
      },
      {
        systemCode: 'usdt',
        displayTitle: 'Оплата USDT',
        displayDescription: 'Оплата криптовалютой USDT через сеть TRC20',
        features: ['Анонимно', 'Быстро', 'Без комиссии'],
        icon: '₿',
        color: 'yellow',
        specialNote: 'Оплата будет зачислена в течение 10-30 минут',
        noteType: 'success'
      }
    ];

    for (const update of updates) {
      const result = await PaymentMethod.findOneAndUpdate(
        { systemCode: update.systemCode },
        { 
          $set: {
            displayTitle: update.displayTitle,
            displayDescription: update.displayDescription,
            features: update.features,
            icon: update.icon,
            color: update.color,
            specialNote: update.specialNote,
            noteType: update.noteType
          }
        },
        { new: true }
      );

      if (result) {
        console.log(`✅ Обновлен способ оплаты: ${result.name}`);
        console.log(`   - Заголовок: ${update.displayTitle}`);
        console.log(`   - Описание: ${update.displayDescription}`);
        console.log(`   - Преимущества: ${update.features.join(', ')}`);
        console.log(`   - Примечание: ${update.specialNote}`);
        console.log(`   - Тип: ${update.noteType}`);
      } else {
        console.log(`❌ Не найден способ оплаты с кодом: ${update.systemCode}`);
      }
    }

    console.log('Обновление завершено');
  } catch (error) {
    console.error('Ошибка при обновлении:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Отключение от MongoDB');
  }
}

updatePaymentMethods(); 