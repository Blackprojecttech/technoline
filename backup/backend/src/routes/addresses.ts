import express from 'express';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { auth } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';

// Добавляем импорт fetch для Node.js
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Улицы, которые точно находятся в пределах МКАД
const DEFINITE_MKAD_STREETS = [
  'арбат', 'тверская', 'покровка', 'маросейка', 'лубянка', 'кировская',
  'кузнецкий мост', 'неглинная', 'театральная', 'охотный ряд', 'моховая',
  'волхонка', 'пречистенка', 'новый арбат', 'смоленская', 'арбатская',
  'калининский проспект', 'ленинский проспект', 'кутузовский проспект',
  'ленинградский проспект', 'ярославское шоссе', 'шоссе энтузиастов',
  'варшавское шоссе', 'каширское шоссе', 'воробьевское шоссе',
  'университетский проспект', 'проспект вернадского', 'мичуринский проспект',
  'комсомольский проспект', 'проспект мира', 'ярославская', 'ростовская',
  'алтуфьевское шоссе', 'дмитровское шоссе', 'ленинградское шоссе',
  'волоколамское шоссе', 'новорижское шоссе', 'рублевское шоссе',
  'минское шоссе', 'киевское шоссе', 'калужское шоссе', 'воронежское шоссе',
  'рязанский проспект', 'волгоградский проспект', 'шоссе энтузиастов',
  'измайловское шоссе', 'щёлковское шоссе', 'открытое шоссе',
  'алтуфьевское шоссе', 'дмитровское шоссе', 'ленинградское шоссе'
];

// Улицы, которые точно находятся за пределами МКАД
const DEFINITE_REGION_STREETS = [
  'пятницкое шоссе', 'новорижское шоссе', 'рублевское шоссе',
  'минское шоссе', 'киевское шоссе', 'калужское шоссе', 'воронежское шоссе',
  'рязанский проспект', 'волгоградский проспект', 'шоссе энтузиастов',
  'измайловское шоссе', 'щёлковское шоссе', 'открытое шоссе',
  'алтуфьевское шоссе', 'дмитровское шоссе', 'ленинградское шоссе',
  'волоколамское шоссе', 'новорижское шоссе', 'рублевское шоссе',
  'минское шоссе', 'киевское шоссе', 'калужское шоссе', 'воронежское шоссе'
];

// Координаты полигона МКАД (упрощённый вариант, можно заменить на более точный при необходимости)
const MKAD_POLYGON = [
  [55.774558, 37.842762], [55.76522, 37.842789], [55.755723, 37.842627], [55.747399, 37.841828],
  [55.739103, 37.841217], [55.730482, 37.840175], [55.721939, 37.83916], [55.712203, 37.837121],
  [55.703048, 37.83262], [55.694287, 37.829512], [55.68529, 37.831353], [55.675945, 37.834605],
  [55.667752, 37.837597], [55.658667, 37.839348], [55.650053, 37.833842], [55.643713, 37.824787],
  [55.637347, 37.814564], [55.62913, 37.802473], [55.623758, 37.794235], [55.617713, 37.781928],
  [55.611755, 37.771139], [55.604956, 37.758725], [55.599677, 37.747945], [55.594143, 37.734785],
  [55.589234, 37.723062], [55.583983, 37.709425], [55.578834, 37.696256], [55.574019, 37.683167],
  [55.571999, 37.668911], [55.573093, 37.647765], [55.573928, 37.633419], [55.574732, 37.616719],
  [55.575816, 37.60107], [55.5778, 37.586536], [55.581271, 37.571938], [55.585143, 37.555732],
  [55.587509, 37.545132], [55.5922, 37.526366], [55.594728, 37.516108], [55.60249, 37.502274],
  [55.609685, 37.49391], [55.617424, 37.484846], [55.625801, 37.477553], [55.630207, 37.472909],
  [55.641041, 37.464328], [55.648794, 37.459022], [55.654675, 37.45464], [55.660424, 37.450737],
  [55.670701, 37.445885], [55.67994, 37.443209], [55.686873, 37.441029], [55.695697, 37.439181],
  [55.702805, 37.438668], [55.709657, 37.438834], [55.718273, 37.440233], [55.728581, 37.443596],
  [55.735201, 37.446436], [55.744789, 37.451264], [55.75435, 37.456864], [55.764018, 37.463916],
  [55.771554, 37.4697], [55.779868, 37.476053], [55.789569, 37.48464], [55.797993, 37.491742],
  [55.805443, 37.498597], [55.814629, 37.510073], [55.819864, 37.518419], [55.827795, 37.529248],
  [55.832707, 37.53705], [55.840376, 37.548266], [55.846597, 37.558711], [55.850327, 37.56496],
  [55.857614, 37.575531], [55.862464, 37.584672], [55.867786, 37.59391], [55.87214, 37.602474],
  [55.877018, 37.612532], [55.88173, 37.623423], [55.885464, 37.632935], [55.889094, 37.642121],
  [55.892603, 37.651693], [55.896973, 37.661665], [55.90057, 37.670661], [55.904911, 37.681209],
  [55.909105, 37.692254], [55.913885, 37.704728], [55.917795, 37.716018], [55.921934, 37.728209],
  [55.925999, 37.740482], [55.929661, 37.751907], [55.932849, 37.762611], [55.935516, 37.772797],
  [55.938396, 37.782812], [55.941674, 37.794235], [55.94494, 37.805796], [55.947873, 37.816438],
  [55.950537, 37.826327], [55.952943, 37.835707], [55.955195, 37.844789], [55.957392, 37.853681],
  [55.95953, 37.862406], [55.961603, 37.870987], [55.963606, 37.879447], [55.965534, 37.887808],
  [55.967383, 37.89609], [55.969147, 37.904312], [55.970822, 37.912491], [55.972404, 37.920642],
  [55.973889, 37.928779], [55.975273, 37.936917], [55.976553, 37.94507], [55.977726, 37.953252],
  [55.978789, 37.961478], [55.97974, 37.969762], [55.980577, 37.978119], [55.981298, 37.986563],
  [55.981902, 37.99511], [55.982387, 38.003774], [55.982752, 38.01257], [55.982995, 38.021513],
  [55.983116, 38.030617], [55.983116, 38.039897], [55.983116, 38.049368], [55.983116, 38.059045],
  [55.983116, 38.068944], [55.983116, 38.079081], [55.983116, 38.089472], [55.983116, 38.100134],
  [55.983116, 38.111084], [55.983116, 38.12234], [55.983116, 38.13392], [55.983116, 38.145843],
  [55.983116, 38.158128], [55.983116, 38.170794], [55.983116, 38.18386], [55.983116, 38.197347],
  [55.983116, 38.211274], [55.983116, 38.225662], [55.983116, 38.240532], [55.983116, 38.255904],
  [55.983116, 38.2718], [55.983116, 38.288241], [55.983116, 38.30525], [55.983116, 38.322849],
  [55.983116, 38.341062], [55.983116, 38.359914], [55.983116, 38.37943], [55.983116, 38.399637],
  [55.983116, 38.420561], [55.983116, 38.44223], [55.983116, 38.464672], [55.983116, 38.487917],
  [55.983116, 38.511995], [55.983116, 38.536937], [55.983116, 38.562776], [55.983116, 38.589545],
  [55.983116, 38.61728], [55.983116, 38.646016], [55.983116, 38.675792], [55.983116, 38.706646],
  [55.983116, 38.738617], [55.983116, 38.771747], [55.983116, 38.80608], [55.983116, 38.841661],
  [55.983116, 38.878537], [55.983116, 38.916757], [55.983116, 38.956372], [55.983116, 38.997434],
  [55.983116, 39.04], [55.774558, 37.842762] // замыкаем полигон
];

// Функция проверки попадания точки в полигон (алгоритм лучевого прохода)
function isPointInPolygon(lat: number, lon: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > lon) !== (yj > lon)) &&
      (lat < (xj - xi) * (lon - yi) / (yj - yi + 0.0000001) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Извлекает номер дома из адреса
 */
function extractHouseNumber(address: string): string | null {
  const houseMatch = address.match(/(?:дом|д\.|№)\s*(\d+)/i);
  if (houseMatch) {
    return houseMatch[1];
  }
  
  // Ищем номер дома в конце строки
  const endMatch = address.match(/(\d+)\s*$/);
  if (endMatch) {
    return endMatch[1];
  }
  
  return null;
}

/**
 * Извлекает название улицы из адреса
 */
function extractStreetName(address: string): string {
  // Убираем номер дома и другие детали
  let streetName = address
    .replace(/(?:дом|д\.|№)\s*\d+/gi, '')
    .replace(/\d+\s*$/g, '')
    .replace(/кв\.?\s*\d+/gi, '')
    .replace(/оф\.?\s*\d+/gi, '')
    .trim();
  
  return streetName.toLowerCase();
}

/**
 * Проверяет, находится ли адрес в пределах МКАД на основе улицы и номера дома
 */
function checkAddressLocation(address: string): 'moscow_mkad' | 'moscow_region' | 'unknown' {
  const normalizedAddress = address.toLowerCase();
  const streetName = extractStreetName(address);
  const houseNumber = extractHouseNumber(address);
  
  // Проверяем определенные улицы в пределах МКАД
  if (DEFINITE_MKAD_STREETS.some(street => streetName.includes(street))) {
    return 'moscow_mkad';
  }
  
  // Проверяем определенные улицы за пределами МКАД
  if (DEFINITE_REGION_STREETS.some(street => streetName.includes(street))) {
    // Для некоторых улиц нужно проверять номер дома
    if (streetName.includes('пятницкое шоссе')) {
      if (houseNumber) {
        const houseNum = parseInt(houseNumber);
        // Если номер дома больше определенного значения, то это за МКАД
        if (houseNum > 50) {
          return 'moscow_region';
        }
      }
      // По умолчанию считаем, что это за МКАД
      return 'moscow_region';
    }
    return 'moscow_region';
  }
  
  return 'unknown';
}

// Поиск адресов через Dadata Suggest API
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    console.log('>>> /api/addresses/search?q=', query); // Логируем входящий запрос
    if (!query || query.length < 2) {
      return res.json({ suggestions: [] });
    }

    const dadataToken = 'ecb97bfa1e55c60cd6b89567e51fee54a8747af3';
    const response = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Token ${dadataToken}`
      },
      body: JSON.stringify({ 
        query, 
        count: 10,
        locations: [
          { country: 'Россия' },
          { region: 'Москва' },
          { region: 'Московская область' }
        ],
        locations_boost: [
          { region: 'Москва' },
          { region: 'Московская область' }
        ]
      })
    });
    const data = await response.json() as any;
    console.log('>>> Dadata response:', JSON.stringify(data, null, 2)); // Логируем ответ Dadata

    const suggestions = (data.suggestions || []).map((s: any, idx: number) => {
      const value = s.value || '';
      const dataObj = s.data || {};
      
      // Определяем тип адреса на основе данных
      let addressType = 'unknown';
      const region = dataObj.region_with_type || '';
      const city = dataObj.city_with_type || dataObj.settlement_with_type || '';
      
      // Сначала проверяем по городу и области
      if (region.includes('Москва') && !region.includes('область')) {
        addressType = 'moscow_mkad';
      } else if (region.includes('Московская область')) {
        addressType = 'moscow_region';
      }
      
      // Затем проверяем конкретный адрес для более точного определения
      const fullAddress = [
        dataObj.street_with_type,
        dataObj.house,
        dataObj.flat
      ].filter(Boolean).join(', ');
      
      if (fullAddress) {
        const preciseLocation = checkAddressLocation(fullAddress);
        if (preciseLocation !== 'unknown') {
          addressType = preciseLocation;
        }
      }
      
      // Формируем полный адрес
      const fullAddressFormatted = [
        dataObj.street_with_type,
        dataObj.house,
        dataObj.flat
      ].filter(Boolean).join(', ');
      
      return {
        value: value,
        data: {
          geo_lat: dataObj.geo_lat,
          geo_lon: dataObj.geo_lon,
          city: dataObj.city || dataObj.settlement || '',
          region_with_type: dataObj.region_with_type || '',
          postal_code: dataObj.postal_code || '',
          street_with_type: dataObj.street_with_type || '',
          house: dataObj.house || '',
          flat: dataObj.flat || '',
          area_with_type: dataObj.area_with_type || '',
          addressType: addressType
        }
      };
    });

    return res.json({ suggestions });
  } catch (error) {
    console.error('❌ Ошибка поиска адресов через Dadata:', error);
    return res.json({ suggestions: [] });
  }
});

// Получение существующих адресов пользователя (для авторизованных)
router.get('/user', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?._id;
    
    // Поиск адресов из заказов пользователя
    const orderAddresses = await Order.aggregate([
      { $match: { userId: userId } },
      { $group: { 
        _id: '$shippingAddress.address',
        address: { $first: '$shippingAddress.address' },
        city: { $first: '$shippingAddress.city' },
        state: { $first: '$shippingAddress.state' },
        zipCode: { $first: '$shippingAddress.zipCode' },
        country: { $first: '$shippingAddress.country' },
        lastUsed: { $max: '$createdAt' },
        usageCount: { $sum: 1 }
      }},
      { $addFields: {
        fullAddress: {
          $concat: [
            { $ifNull: ['$address', ''] }, ', ',
            { $ifNull: ['$city', ''] }, ', ',
            { $ifNull: ['$state', ''] }
          ]
        }
      }},
      { $sort: { lastUsed: -1 } },
      { $limit: 10 }
    ]);

    // Поиск адресов из профиля пользователя
    const user = await User.findById(userId);
    const profileAddresses = (user as any)?.addresses || [];

    const allAddresses = [
      ...profileAddresses.map((addr: any, idx: number) => ({
        _id: `profile_${idx}`,
        ...addr,
        fullAddress: `${addr.address}, ${addr.city}, ${addr.state}`,
        displayText: `${addr.address}, ${addr.city}, ${addr.state}`,
        shortText: addr.address,
        source: 'profile',
        usageCount: 0,
        addressType: 'unknown'
      })),
      ...orderAddresses.map((addr: any, idx: number) => ({
        ...addr,
        _id: `order_${addr._id}`,
        displayText: `${addr.fullAddress} (использован ${addr.usageCount} раз)`,
        shortText: addr.address,
        source: 'order',
        addressType: 'unknown'
      }))
    ];

    return res.json({ addresses: allAddresses });
    
  } catch (error) {
    console.error('Error getting user addresses:', error);
    return res.status(500).json({ error: 'Failed to get user addresses' });
  }
});

// Добавление нового адреса в профиль пользователя
router.post('/user', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?._id;
    const { address, city, state, zipCode, country } = req.body;
    if (!address) {
      res.status(400).json({ error: 'address is required' });
      return;
    }
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    // Проверяем, нет ли уже такого адреса
    const exists = (user.addresses || []).some(a => a.address.trim() === address.trim());
    if (exists) {
      res.status(409).json({ error: 'Address already exists' });
      return;
    }
    // Формируем новый адрес
    const newAddress = {
      id: uuidv4(),
      name: `Адрес ${(user.addresses?.length || 0) + 1}`,
      address,
      city: city || '',
      state: state || '',
      zipCode: zipCode || '',
      country: country || 'Россия',
      apartment: req.body.apartment || '',
      entrance: req.body.entrance || '',
      floor: req.body.floor || '',
      comment: req.body.comment || '',
      isDefault: false,
      createdAt: new Date()
    };
    user.addresses = user.addresses || [];
    user.addresses.push(newAddress);
    await user.save();
    // Не возвращаем пароль
    const userObj = user.toObject();
    delete (userObj as any).password;
    res.json(userObj);
    return;
  } catch (error) {
    console.error('Error adding address to profile:', error);
    res.status(500).json({ error: 'Failed to add address' });
    return;
  }
});

// --- Обновление адреса пользователя ---
router.put('/user/:addressId', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?._id;
    const { addressId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    user.addresses = user.addresses || [];
    const addrIdx = user.addresses.findIndex(a => a.id === addressId);
    if (addrIdx === -1) {
      return res.status(404).json({ error: 'Address not found' });
    }
    // Обновляем все поля, если они пришли
    const addr = user.addresses[addrIdx];
    addr.address = req.body.address || addr.address;
    addr.city = req.body.city || addr.city;
    addr.state = req.body.state || addr.state;
    addr.zipCode = req.body.zipCode || addr.zipCode;
    if ('country' in addr) {
      addr.country = req.body.country || addr.country || '';
    }
    addr.apartment = req.body.apartment || addr.apartment;
    addr.entrance = req.body.entrance || addr.entrance;
    addr.floor = req.body.floor || addr.floor;
    addr.comment = req.body.comment || addr.comment;
    addr.name = req.body.name || addr.name;
    if (typeof req.body.isDefault === 'boolean') {
      addr.isDefault = req.body.isDefault;
    }
    user.addresses[addrIdx] = addr;
    await user.save();
    const userObj = user.toObject();
    delete (userObj as any).password;
    res.json(userObj);
    return;
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ error: 'Failed to update address' });
    return;
  }
});

export default router; 