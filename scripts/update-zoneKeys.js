const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://localhost:27017/technoline-store';

const deliveryZoneSchema = new mongoose.Schema({ key: String }, { collection: 'deliveryzones' });
const deliveryMethodSchema = new mongoose.Schema({ name: String, zoneKeys: [String], useZones: Boolean, costType: String }, { collection: 'deliverymethods' });

const DeliveryZone = mongoose.model('DeliveryZone', deliveryZoneSchema);
const DeliveryMethod = mongoose.model('DeliveryMethod', deliveryMethodSchema);

(async () => {
  await mongoose.connect(MONGO_URI);
  const allZones = await DeliveryZone.find();
  const allZoneKeys = allZones.map(z => z.key);
  const res = await DeliveryMethod.updateMany(
    { costType: 'zone' },
    { $set: { zoneKeys: allZoneKeys, useZones: true, costType: 'zone' } }
  );
  const updated = await DeliveryMethod.find({ costType: 'zone' }, { name: 1, zoneKeys: 1 });
  console.log('Обновлено методов доставки:', res.modifiedCount);
  console.log('zoneKeys теперь:');
  updated.forEach(m => console.log(m.name, m.zoneKeys));
  await mongoose.disconnect();
  process.exit(0);
})(); 