import mongoose from 'mongoose';
import PaymentMethod from '../src/models/PaymentMethod';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/technoline';

const paymentMethods = [
  {
    name: 'Наличными при получении',
    description: 'Без перевода',
    isActive: true,
    deliveryTypes: [],
    systemCode: 'cash_on_delivery',
    displayTitle: 'Наличными при получении',
    displayDescription: 'Оплатите заказ наличными при получении у курьера или в пункте выдачи',
    features: ['Без комиссии', 'Безопасно', 'Удобно'],
    icon: '💵',
    color: 'green',
    specialNote: 'Оплата производится только после проверки товара',
    noteType: 'info'
  },
  {
    name: 'Банковской картой онлайн',
    description: 'Безопасная оплата картой',
    isActive: true,
    deliveryTypes: [],
    systemCode: 'card',
    displayTitle: 'Банковской картой',
    displayDescription: 'Безопасная оплата картой Visa, MasterCard или МИР через защищенное соединение',
    features: ['Безопасно', 'Мгновенно', 'Любая карта'],
    icon: '💳',
    color: 'blue',
    specialNote: 'Платежи защищены SSL-шифрованием',
    noteType: 'success'
  },
  {
    name: 'Перевод на карту Сбербанка',
    description: 'Перевод по реквизитам',
    isActive: true,
    deliveryTypes: [],
    systemCode: 'bank_transfer',
    displayTitle: 'Перевод на карту',
    displayDescription: 'Переведите деньги на карту Сбербанка по указанным реквизитам',
    features: ['Без комиссии', 'Надежно', 'Быстро'],
    icon: '🏦',
    color: 'purple',
    specialNote: 'Реквизиты будут отправлены на ваш email после оформления заказа',
    noteType: 'info'
  },
  {
    name: 'Покупка в кредит',
    description: 'Кредит от Сбербанка или Тинькофф',
    isActive: true,
    deliveryTypes: [],
    systemCode: 'credit_purchase',
    displayTitle: 'Купить в кредит',
    displayDescription: 'Оформите покупку в кредит от Сбербанка или Тинькофф Банка',
    features: ['Без первоначального взноса', 'Быстрое решение', 'Выгодные условия'],
    icon: '📋',
    color: 'orange',
    specialNote: 'Решение по кредиту за 5 минут. Возраст от 18 лет',
    noteType: 'warning'
  },
  {
    name: 'Оплата USDT',
    description: 'Криптовалютой',
    isActive: true,
    deliveryTypes: [],
    systemCode: 'usdt',
    displayTitle: 'USDT (криптовалюта)',
    displayDescription: 'Оплатите заказ криптовалютой USDT через защищенный кошелек',
    features: ['Анонимно', 'Без комиссии', 'Мгновенно'],
    icon: '₿',
    color: 'green',
    specialNote: 'Поддерживаются сети TRC20 и ERC20',
    noteType: 'info'
  },
];

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    await PaymentMethod.deleteMany({});
    const result = await PaymentMethod.insertMany(paymentMethods);
    console.log(`Стартовые способы оплаты добавлены! Всего: ${result.length}`);
    process.exit(0);
  } catch (e) {
    console.error('Ошибка при добавлении способов оплаты:', e);
    process.exit(1);
  }
}

main(); 