const mongoose = require('mongoose');
require('dotenv').config();

const DeliveryZone = require('./src/models/DeliveryZone').default;

const zones = [
  { key: '9-severnaya', name: '9-ая Северная линия', price: 800 },
  { key: '9km-novoriga', name: '9-ый км Новорижского шоссе', price: 1000 },
  { key: 'aprelevka', name: 'Апрелевка', price: 1300 },
  { key: 'aeroport', name: 'Аэропорт (Внуково, Шереметьево, Домодедово)', price: 1700 },
  { key: 'balashiha', name: 'Балашиха', price: 1400 },
  { key: 'belaya-dacha', name: 'Белая дача мкр-н', price: 800 },
  { key: 'bronnitsy', name: 'Бронницы', price: 2800 },
  { key: 'veshki', name: 'Вешки', price: 1000 },
  { key: 'vidnoe', name: 'Видное', price: 1000 },
  { key: 'vlasikha', name: 'Власиха', price: 1500 },
  { key: 'gazoprovod', name: 'Газопровод (поселок)', price: 1300 },
  { key: 'gorki-2', name: 'Горки-2', price: 1300 },
  { key: 'grad-moskovskiy', name: 'Град Московский мкр-н', price: 1400 },
  { key: 'dzerzhinskiy', name: 'Дзержинский', price: 1100 },
  { key: 'dolgoprudny', name: 'Долгопрудный', price: 1000 },
  { key: 'zhavoronki', name: 'Жаворонки', price: 2000 },
  { key: 'zheleznodorozhny', name: 'Железнодорожный мкр-н', price: 2200 },
  { key: 'zhukovskiy', name: 'Жуковский', price: 2200 },
  { key: 'zhulebino', name: 'Жулебино', price: 1200 },
  { key: 'zakharkovo', name: 'Захарково (Красногорский р-н)', price: 1100 },
  { key: 'zelenograd', name: 'Зеленоград', price: 1700 },
  { key: 'ivanteevka', name: 'Ивантеевка', price: 2200 },
  { key: 'kapotnya', name: 'Капотня', price: 900 },
  { key: 'kommunarka', name: 'Коммунарка', price: 1200 },
  { key: 'korolev', name: 'Королев', price: 1200 },
  { key: 'kotelniki', name: 'Котельники', price: 1200 },
  { key: 'krasnogorsk', name: 'Красногорск', price: 1000 },
  { key: 'krasnoznamensk', name: 'Краснознаменск', price: 3000 },
  { key: 'krekshino', name: 'Крекшино', price: 2500 },
  { key: 'kurkino', name: 'Куркино', price: 700 },
  { key: 'lobnya', name: 'Лобня', price: 1300 },
  { key: 'lytkarino', name: 'Лыткарино', price: 1500 },
  { key: 'lyubertsy', name: 'Люберцы', price: 1300 },
  { key: 'malakhovka', name: 'Малаховка', price: 1500 },
  { key: 'monino', name: 'Монино', price: 2500 },
  { key: 'moskovskiy', name: 'Московский (город)', price: 1800 },
  { key: 'mytishchi', name: 'Мытищи', price: 1000 },
  { key: 'nahabino', name: 'Нахабино', price: 1400 },
  { key: 'nekrasovka', name: 'Некрасовка', price: 1300 },
  { key: 'novo-peredelkino', name: 'Ново-Переделкино мкр-н', price: 1300 },
  { key: 'novokosino', name: 'Новокосино', price: 900 },
  { key: 'noginsk', name: 'Ногинск', price: 3600 },
  { key: 'odintsovo', name: 'Одинцово', price: 1400 },
  { key: 'opalikha', name: 'Опалиха', price: 1200 },
  { key: 'ostrovtsy', name: 'Островцы (поселок)', price: 1700 },
  { key: 'peredelkino', name: 'Переделкино', price: 1200 },
  { key: 'pirogovo', name: 'Пирогово', price: 1800 },
  { key: 'podolsk', name: 'Подольск', price: 1400 },
  { key: 'putilkovo', name: 'Путилково', price: 800 },
  { key: 'pushkino', name: 'Пушкино', price: 2200 },
  { key: 'ramenskoe', name: 'Раменское', price: 3000 },
  { key: 'reutov', name: 'Реутов', price: 1100 },
  { key: 'riga-land', name: 'Рига Ленд', price: 1100 },
  { key: 'rumyantsevo', name: 'Румянцево', price: 1100 },
  { key: 'solntsevo', name: 'Солнцево', price: 1200 },
  { key: 'skhodnya', name: 'Сходня', price: 1300 },
  { key: 'tomilino', name: 'Томилино', price: 1300 },
  { key: 'troitsk', name: 'Троицк', price: 2700 },
  { key: 'fryazino', name: 'Фрязино', price: 2800 },
  { key: 'khimki', name: 'Химки', price: 900 },
  { key: 'chernaya-gryaz', name: 'Черная Грязь', price: 1400 },
  { key: 'shulgino', name: 'Шульгино (Рублевка)', price: 1000 },
  { key: 'shchelkovo', name: 'Щелково', price: 1700 },
  { key: 'shcherbinka', name: 'Щербинка', price: 1500 },
  { key: 'elektrougli', name: 'Электроугли', price: 2200 },
  { key: 'pavlovskaya-sloboda', name: 'посёлок Станция Павловская Слобода', price: 2200 },
];

async function addZones() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/technoline', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  await DeliveryZone.deleteMany({});
  for (let i = 0; i < zones.length; i++) {
    zones[i].sortOrder = i;
    await DeliveryZone.create(zones[i]);
    console.log(`Добавлена зона: ${zones[i].name}`);
  }
  console.log('✅ Все зоны успешно добавлены!');
  mongoose.connection.close();
}

addZones(); 