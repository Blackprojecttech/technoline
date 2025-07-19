const mongoose = require('mongoose');
const DeliveryZone = require('../src/models/DeliveryZone');

const zones = [
  { name: 'Красногорск', key: 'krasnogorsk', price: 1000 },
  { name: 'Реутов', key: 'reutov', price: 1000 },
  { name: 'Балашиха', key: 'balashiha', price: 1000 },
  { name: 'Мытищи', key: 'mytishchi', price: 1000 },
  { name: 'Химки', key: 'khimki', price: 1000 },
  { name: 'Одинцово', key: 'odintsovo', price: 1000 },
  { name: 'Долгопрудный', key: 'dolgoprudny', price: 1000 },
  { name: 'Котельники', key: 'kotelniki', price: 1000 },
  { name: 'Видное', key: 'vidnoe', price: 1000 },
  { name: 'Новокосино', key: 'novokosino', price: 1000 },
  { name: 'Томилино', key: 'tomilino', price: 1000 },
  { name: 'Сходня', key: 'skhodnya', price: 1000 },
  { name: 'Лобня', key: 'lobnya', price: 1000 },
  { name: 'Железнодорожный', key: 'zheleznodorozhny', price: 1000 },
  { name: 'Королёв', key: 'korolev', price: 1100 },
  { name: 'Юбилейный', key: 'yubileyniy', price: 1100 },
  { name: 'Апрелевка', key: 'aprelevka', price: 1100 },
  { name: 'Лыткарино', key: 'lytkarino', price: 1100 },
  { name: 'Щербинка', key: 'shcherbinka', price: 1100 },
  { name: 'Жулебино', key: 'zhulebino', price: 1000 },
];

async function addZones() {
  await mongoose.connect('mongodb://localhost:27017/technoline-store');
  const DZ = mongoose.model('DeliveryZone');
  const existing = await DZ.find({ key: { $in: zones.map(z => z.key) } });
  const existingKeys = new Set(existing.map(z => z.key));
  const toInsert = zones.filter(z => !existingKeys.has(z.key));
  if (toInsert.length === 0) {
    console.log('Все зоны уже есть в базе.');
    process.exit(0);
  }
  for (let i = 0; i < toInsert.length; i++) {
    toInsert[i].sortOrder = 100 + i;
  }
  await DZ.insertMany(toInsert);
  console.log('Добавлены зоны:', toInsert.map(z => z.name));
  process.exit(0);
}

addZones(); 