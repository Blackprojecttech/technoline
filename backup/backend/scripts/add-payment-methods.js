const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

// Подключение к базе данных
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/technoline', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Схема способа оплаты
const PaymentMethodSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  isActive: { type: Boolean, default: true },
  deliveryTypes: [{ type: String }],
  systemCode: { type: String, required: true, unique: true },
}, { timestamps: true });

const PaymentMethod = mongoose.model('PaymentMethod', PaymentMethodSchema);

// Способы оплаты для добавления
const paymentMethods = [
  {
    name: 'Наличными при получении',
    description: 'Без перевода',
    systemCode: 'cash_on_delivery',
    isActive: true,
    deliveryTypes: []
  },
  {
    name: 'Банковской картой',
    description: 'ПВЗ, онлайн',
    systemCode: 'bank_card',
    isActive: true,
    deliveryTypes: []
  },
  {
    name: 'Перевод на Карту Сбербанка',
    description: '',
    systemCode: 'sberbank_transfer',
    isActive: true,
    deliveryTypes: []
  },
  {
    name: 'Купить в кредит',
    description: 'Сбербанк либо Т-Банк - Тинькофф',
    systemCode: 'credit_purchase',
    isActive: true,
    deliveryTypes: []
  },
  {
    name: 'Оплата USDT',
    description: '',
    systemCode: 'usdt_payment',
    isActive: true,
    deliveryTypes: []
  }
];

async function addPaymentMethods() {
  try {
    console.log('Начинаю добавление способов оплаты...');
    
    for (const method of paymentMethods) {
      const existingMethod = await PaymentMethod.findOne({ systemCode: method.systemCode });
      
      if (existingMethod) {
        console.log(`Способ оплаты "${method.name}" уже существует, обновляю...`);
        await PaymentMethod.findOneAndUpdate(
          { systemCode: method.systemCode },
          method,
          { new: true }
        );
      } else {
        console.log(`Добавляю способ оплаты: "${method.name}"`);
        await PaymentMethod.create(method);
      }
    }
    
    console.log('Все способы оплаты успешно добавлены!');
    
    // Показываем все добавленные способы
    const allMethods = await PaymentMethod.find();
    console.log('\nСписок всех способов оплаты:');
    allMethods.forEach(method => {
      console.log(`- ${method.name} (${method.systemCode})`);
    });
    
  } catch (error) {
    console.error('Ошибка при добавлении способов оплаты:', error);
  } finally {
    mongoose.connection.close();
  }
}

addPaymentMethods(); 