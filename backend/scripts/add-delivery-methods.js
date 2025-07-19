const mongoose = require('mongoose');
require('dotenv').config();

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/technoline', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Схема способа доставки
const deliveryMethodSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['pickup', 'courier', 'cdek', 'urgent'] 
  },
  price: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  conditions: { type: String },
  workingHours: { type: String },
  address: { type: String },
  restrictions: { type: String }
}, {
  timestamps: true
});

const DeliveryMethod = mongoose.model('DeliveryMethod', deliveryMethodSchema);

const deliveryMethods = [
  {
    name: 'Самовывоз из магазина',
    description: 'Заберите заказ самостоятельно из нашего магазина. Бесплатно и быстро!',
    type: 'pickup',
    price: 0,
    isActive: true,
    order: 1,
    conditions: 'Оплата наличными или картой при получении',
    workingHours: 'Пн-Пт 9:00-18:00, Сб 10:00-16:00',
    address: 'Наш магазин',
    restrictions: 'Необходимо предварительно оформить заказ'
  },
  {
    name: 'Самовывоз на Митинском Радиорынке',
    description: 'Самовывоз метро Волоколамская, Москва, Пятницкое шоссе, 18, 1 этаж, 73 павильон, 3-ий вход, от пятницкого шоссе прямо до конца, угловой павильон с зеленой вывеской, слева от микс бара, обратите внимание, что вам нужен именно 73 павильон, так как на радиорынке много павильонов с похожими названиями.',
    type: 'pickup',
    price: 0,
    isActive: true,
    order: 2,
    conditions: 'Оплата Картой при самовывозе [ПВЗ, онлайн]. К оплате принимаются кредитные и дебетовые карты МИР, VISA или Mastercard; ​заказ оплачивается банковской картой при получении товара в пункте выдачи на Пятницком шоссе, 18. через пункт сдэка, либо Boxberry, либо терминал; Способ исключительно для самовывоза на Митинском Радиорынке, необходимо при себе иметь паспорт.',
    workingHours: 'Работаем с 10:00 до 19:00 без выходных',
    address: 'ТЦ Митинский Радиорынок. Возможность приехать посмотреть и выбрать нужную вам технику.',
    restrictions: 'Стоимость самовывоза при оплате картой рассчитывается в автоматическом режиме при оформлении заказа.'
  },
  {
    name: 'Курьером в пределах МКАД',
    description: 'Доставка по Москве: Доставка осуществляется курьерской службой нашего магазина в пределах МКАД (Кроме ВДНХ, Царицыно, Люблино, Бирюлево, Орехово-Борисово, Чертаново и Ясенево - Для этих районов стоимость 800-900 Рублей) в этот же( Для заказов до 11:00), либо на следующий день после заказа по указанному адресу.',
    type: 'courier',
    price: 300,
    isActive: true,
    order: 3,
    conditions: 'Время доставки можно выбрать с 13 до 17, либо с 17 до 21. По выходным не доставляем!',
    workingHours: 'Время доставки: 13:00-17:00 или 17:00-21:00',
    address: 'В пределах МКАД',
    restrictions: 'Цена указана для негабаритного товара (телефон, часы, планшет и т.д.) Для остальных товаров доставка рассчитывается индивидуально'
  },
  {
    name: 'Доставка курьером за МКАД',
    description: 'Доставка за пределы МКАД осуществляется в этот же, либо на следующий день после заказа. Обязательно укажите точный адрес для расчета стоимости доставки.',
    type: 'courier',
    price: 1300,
    isActive: true,
    order: 4,
    conditions: 'Время доставки можно выбрать с 13 до 17, либо с 17 до 21. По выходным не доставляем!',
    workingHours: 'Время доставки: 13:00-17:00 или 17:00-21:00',
    address: 'За пределами МКАД',
    restrictions: 'Стоимость доставки ОТ 1300 Рублей. Подробнее'
  },
  {
    name: 'Срочная Доставка по Москве',
    description: 'Срочная доставка по Москве в течение нескольких часов',
    type: 'urgent',
    price: 800,
    isActive: true,
    order: 5,
    conditions: 'Стоимость уточнять у оператора',
    workingHours: 'По договоренности',
    address: 'По Москве',
    restrictions: 'Минимальная сумма заказа может быть увеличена'
  },
  {
    name: 'Курьерская служба доставки СДЭК',
    description: 'Доставка курьерской службой "СДЭК" в любые города России. Доставка осуществляется по полной предоплате, стоимость доставки зависит от стоимости заказа, рассчитывается в автоматическом режиме, в эту стоимость входит страховка, упаковка, отправка и доставка до вашего пункта выдачи СДЭК.',
    type: 'cdek',
    price: 500,
    isActive: true,
    order: 6,
    conditions: 'Чтобы рассчитать сроки доставки нажмите здесь. Город отправки - Митино.',
    workingHours: 'По графику работы СДЭК',
    address: 'По всей России',
    restrictions: 'Цена указана для негабаритного товара (телефон, часы, планшет, ноутбук и т.д.) Для остальных товаров доставка рассчитывается индивидуально'
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
      console.log(`${index + 1}. ${method.name} - ${method.price}₽`);
    });

    console.log('\n✅ Все методы доставки успешно добавлены!');
  } catch (error) {
    console.error('❌ Ошибка при добавлении методов доставки:', error);
  } finally {
    mongoose.connection.close();
  }
}

addDeliveryMethods(); 