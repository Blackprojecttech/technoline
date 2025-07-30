const mongoose = require('mongoose');
require('dotenv').config();

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/technoline', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Обновленная схема способа доставки
const deliveryMethodSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  conditions: { type: String },
  workingHours: { type: String },
  address: { type: String },
  restrictions: { type: String },
  deadlines: { type: String },
  costType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
  fixedCost: { type: Number, min: 0, default: null },
  costPercentage: { type: Number, min: 0, max: 100, default: null },
  // Параметры времени доставки
  orderTimeFrom: { type: String, match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, default: null },
  orderTimeTo: { type: String, match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, default: null },
  // Время доставки для сегодня
  deliveryTodayTimeFrom: { type: String, match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, default: null },
  deliveryTodayTimeTo: { type: String, match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, default: null },
  // Время доставки для завтра
  deliveryTomorrowTimeFrom: { type: String, match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, default: null },
  deliveryTomorrowTimeTo: { type: String, match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, default: null },
  // Условия для определения дня доставки
  orderTimeForToday: { type: String, match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, default: null },
  orderTimeForTomorrow: { type: String, match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, default: null }
}, {
  timestamps: true
});

const DeliveryMethod = mongoose.model('DeliveryMethod', deliveryMethodSchema);

const deliveryMethods = [
  {
    name: 'Самовывоз из магазина',
    description: 'Заберите заказ самостоятельно из нашего магазина. Бесплатно и быстро!',
    conditions: 'Оплата наличными или картой при получении',
    workingHours: 'Пн-Пт 9:00-18:00, Сб 10:00-16:00',
    address: 'Наш магазин',
    restrictions: 'Необходимо предварительно оформить заказ',
    deadlines: 'В день заказа или на следующий день',
    costType: 'fixed',
    fixedCost: 0,
    costPercentage: null,
    orderTimeFrom: '09:00',
    orderTimeTo: '18:00',
    deliveryTodayTimeFrom: '09:00',
    deliveryTodayTimeTo: '18:00',
    deliveryTomorrowTimeFrom: '09:00',
    deliveryTomorrowTimeTo: '18:00',
    orderTimeForToday: '18:00',
    orderTimeForTomorrow: '18:00'
  },
  {
    name: 'Самовывоз на Митинском Радиорынке',
    description: 'Самовывоз метро Волоколамская, Москва, Пятницкое шоссе, 18, 1 этаж, 73 павильон, 3-ий вход, от пятницкого шоссе прямо до конца, угловой павильон с зеленой вывеской, слева от микс бара, обратите внимание, что вам нужен именно 73 павильон, так как на радиорынке много павильонов с похожими названиями.',
    conditions: 'Оплата Картой при самовывозе [ПВЗ, онлайн]. К оплате принимаются кредитные и дебетовые карты МИР, VISA или Mastercard; ​заказ оплачивается банковской картой при получении товара в пункте выдачи на Пятницком шоссе, 18. через пункт сдэка, либо Boxberry, либо терминал; Способ исключительно для самовывоза на Митинском Радиорынке, необходимо при себе иметь паспорт.',
    workingHours: 'Работаем с 10:00 до 19:00 без выходных',
    address: 'ТЦ Митинский Радиорынок. Возможность приехать посмотреть и выбрать нужную вам технику.',
    restrictions: 'Стоимость самовывоза при оплате картой рассчитывается в автоматическом режиме при оформлении заказа.',
    deadlines: 'В день заказа или на следующий день',
    costType: 'fixed',
    fixedCost: 0,
    costPercentage: null,
    orderTimeFrom: '10:00',
    orderTimeTo: '19:00',
    deliveryTodayTimeFrom: '10:00',
    deliveryTodayTimeTo: '19:00',
    deliveryTomorrowTimeFrom: '10:00',
    deliveryTomorrowTimeTo: '19:00',
    orderTimeForToday: '19:00',
    orderTimeForTomorrow: '19:00'
  },
  {
    name: 'Курьером в пределах МКАД',
    description: 'Доставка по Москве: Доставка осуществляется курьерской службой нашего магазина в пределах МКАД (Кроме ВДНХ, Царицыно, Люблино, Бирюлево, Орехово-Борисово, Чертаново и Ясенево - Для этих районов стоимость 800-900 Рублей) в этот же( Для заказов до 11:00), либо на следующий день после заказа по указанному адресу.',
    conditions: 'Время доставки можно выбрать с 13 до 17, либо с 17 до 21. По выходным не доставляем!',
    workingHours: 'Время доставки: 13:00-17:00 или 17:00-21:00',
    address: 'В пределах МКАД',
    restrictions: 'Цена указана для негабаритного товара (телефон, часы, планшет и т.д.) Для остальных товаров доставка рассчитывается индивидуально',
    deadlines: 'В этот же день (для заказов до 11:00) или на следующий день',
    costType: 'fixed',
    fixedCost: 300,
    costPercentage: null,
    orderTimeFrom: '00:00',
    orderTimeTo: '18:50',
    deliveryTodayTimeFrom: '13:00',
    deliveryTodayTimeTo: '21:00',
    deliveryTomorrowTimeFrom: '13:00',
    deliveryTomorrowTimeTo: '21:00',
    orderTimeForToday: '18:50',
    orderTimeForTomorrow: '18:50'
  },
  {
    name: 'Доставка курьером за МКАД',
    description: 'Доставка за пределы МКАД осуществляется в этот же, либо на следующий день после заказа. Обязательно укажите точный адрес для расчета стоимости доставки.',
    conditions: 'Время доставки можно выбрать с 13 до 17, либо с 17 до 21. По выходным не доставляем!',
    workingHours: 'Время доставки: 13:00-17:00 или 17:00-21:00',
    address: 'За пределами МКАД',
    restrictions: 'Стоимость доставки ОТ 1300 Рублей. Подробнее',
    deadlines: 'В этот же день или на следующий день',
    costType: 'fixed',
    fixedCost: 1300,
    costPercentage: null,
    orderTimeFrom: '00:00',
    orderTimeTo: '18:50',
    deliveryTodayTimeFrom: '13:00',
    deliveryTodayTimeTo: '21:00',
    deliveryTomorrowTimeFrom: '13:00',
    deliveryTomorrowTimeTo: '21:00',
    orderTimeForToday: '18:50',
    orderTimeForTomorrow: '18:50'
  },
  {
    name: 'Срочная Доставка по Москве',
    description: 'Срочная доставка по Москве в течение нескольких часов',
    conditions: 'Стоимость уточнять у оператора',
    workingHours: 'По договоренности',
    address: 'По Москве',
    restrictions: 'Минимальная сумма заказа может быть увеличена',
    deadlines: 'В течение нескольких часов',
    costType: 'percentage',
    fixedCost: null,
    costPercentage: 15,
    orderTimeFrom: '09:00',
    orderTimeTo: '18:00',
    deliveryTodayTimeFrom: '10:00',
    deliveryTodayTimeTo: '20:00',
    deliveryTomorrowTimeFrom: '10:00',
    deliveryTomorrowTimeTo: '20:00',
    orderTimeForToday: '18:00',
    orderTimeForTomorrow: '18:00'
  },
  {
    name: 'Курьерская служба доставки СДЭК',
    description: 'Доставка курьерской службой "СДЭК" в любые города России. Доставка осуществляется по полной предоплате, стоимость доставки зависит от стоимости заказа, рассчитывается в автоматическом режиме, в эту стоимость входит страховка, упаковка, отправка и доставка до вашего пункта выдачи СДЭК.',
    conditions: 'Чтобы рассчитать сроки доставки нажмите здесь. Город отправки - Митино.',
    workingHours: 'По графику работы СДЭК',
    address: 'По всей России',
    restrictions: 'Цена указана для негабаритного товара (телефон, часы, планшет, ноутбук и т.д.) Для остальных товаров доставка рассчитывается индивидуально',
    deadlines: '2-7 дней в зависимости от региона',
    costType: 'percentage',
    fixedCost: null,
    costPercentage: 10,
    orderTimeFrom: '00:00',
    orderTimeTo: '18:50',
    deliveryTodayTimeFrom: '09:00',
    deliveryTodayTimeTo: '18:00',
    deliveryTomorrowTimeFrom: '09:00',
    deliveryTomorrowTimeTo: '18:00',
    orderTimeForToday: '18:50',
    orderTimeForTomorrow: '18:50'
  }
];

async function addDeliveryMethods() {
  try {
    // Удаляем все существующие методы доставки
    await DeliveryMethod.deleteMany({});
    console.log('✅ Существующие методы доставки удалены');

    // Добавляем новые методы доставки
    const createdMethods = await DeliveryMethod.insertMany(deliveryMethods);
    
    console.log('✅ Добавлено', createdMethods.length, 'методов доставки:');
    createdMethods.forEach((method, index) => {
      let costInfo;
      if (method.costType === 'percentage' && method.costPercentage) {
        costInfo = `${method.costPercentage}% от заказа`;
      } else if (method.costType === 'fixed' && method.fixedCost && method.fixedCost > 0) {
        costInfo = `${method.fixedCost} ₽`;
      } else {
        costInfo = 'Бесплатно';
      }
      
      let timeInfo = '';
      if (method.orderTimeFrom && method.orderTimeTo && 
          method.deliveryTodayTimeFrom && method.deliveryTodayTimeTo && 
          method.deliveryTomorrowTimeFrom && method.deliveryTomorrowTimeTo) {
        timeInfo = ` | Заказ: ${method.orderTimeFrom}-${method.orderTimeTo}, Сегодня: ${method.deliveryTodayTimeFrom}-${method.deliveryTodayTimeTo}, Завтра: ${method.deliveryTomorrowTimeFrom}-${method.deliveryTomorrowTimeTo}`;
      }
      
      console.log(`${index + 1}. ${method.name} - ${costInfo}${timeInfo}`);
    });

    console.log('\n✅ Все методы доставки успешно добавлены!');
  } catch (error) {
    console.error('❌ Ошибка при добавлении методов доставки:', error);
  } finally {
    mongoose.connection.close();
  }
}

addDeliveryMethods(); 