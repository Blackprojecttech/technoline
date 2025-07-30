import { Request, Response } from 'express';
import DeliveryMethod, { IDeliveryMethod } from '../models/DeliveryMethod';
import DeliveryZone from '../models/DeliveryZone';
import { getDeliveryZoneByCoords, CKAD_POLYGON } from '../utils/geoZones';

// Получить все активные способы доставки (для фронтенда)
export const getActiveDeliveryMethods = async (req: Request, res: Response): Promise<void> => {
  try {
    const deliveryMethods = await DeliveryMethod.find({ isActive: true })
      .sort({ order: 1, name: 1 });
    const allZones = await DeliveryZone.find();

    const methodsWithZones = deliveryMethods.map(method => {
      let zonePrices: Record<string, number> | undefined = undefined;
      if (method.costType === 'zone' && method.useZones && Array.isArray(method.zoneKeys)) {
        zonePrices = {};
        for (const key of method.zoneKeys) {
          const zone = allZones.find(z => z.key === key);
          if (zone) (zonePrices as Record<string, number>)[key] = zone.price;
        }
      }
      return {
        ...method.toObject(),
        ...(zonePrices ? { zonePrices } : {})
      };
    });

    res.json({ deliveryMethods: methodsWithZones });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении способов доставки' });
  }
};

// Получить все способы доставки (для админки)
export const getAllDeliveryMethods = async (req: Request, res: Response): Promise<void> => {
  try {
    const deliveryMethods = await DeliveryMethod.find()
      .sort({ order: 1, name: 1 });
    res.json({ deliveryMethods }); // Исправлено: возвращаем объект
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении способов доставки' });
  }
};

// Создать новый способ доставки
export const createDeliveryMethod = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔐 Create delivery method request body:', req.body);
    
    // Проверяем обязательные поля
    if (!req.body.name || !req.body.description) {
      res.status(400).json({ 
        message: 'Название и описание обязательны для создания способа доставки'
      });
      return;
    }
    
    // Преобразуем время в правильный формат
    const createData = { ...req.body };
    const timeFields = [
      'orderTimeFrom', 'orderTimeTo', 'deliveryTodayTimeFrom', 'deliveryTodayTimeTo',
      'deliveryTomorrowTimeFrom', 'deliveryTomorrowTimeTo', 'orderTimeForToday', 'orderTimeForTomorrow'
    ];
    
    timeFields.forEach(field => {
      if (createData[field] !== undefined) {
        createData[field] = convertTimeFormat(createData[field]);
      }
    });
    
    console.log('🔧 Converted create data:', createData);
    console.log('🔍 Custom intervals in create data:', {
      useFlexibleIntervals: createData.useFlexibleIntervals,
      customInterval1: createData.customInterval1,
      customInterval2: createData.customInterval2
    });
    
    const deliveryMethod = new DeliveryMethod(createData);
    await deliveryMethod.save();
    
    console.log('✅ Delivery method created successfully:', deliveryMethod);
    res.status(201).json(deliveryMethod);
  } catch (error: any) {
    console.error('❌ Error creating delivery method:', error);
    
    // Возвращаем более подробную информацию об ошибке
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({ 
        message: 'Ошибка валидации при создании способа доставки',
        errors: validationErrors
      });
    } else {
      res.status(400).json({ 
        message: 'Ошибка при создании способа доставки',
        error: error.message 
      });
    }
  }
};

// Функция для преобразования ISO времени в формат HH:MM
const convertTimeFormat = (timeValue: any): string | null => {
  if (!timeValue) return null;
  
  // Если это уже формат HH:MM, возвращаем как есть
  if (typeof timeValue === 'string' && /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeValue)) {
    return timeValue;
  }
  
  // Если это ISO строка времени, преобразуем в HH:MM
  if (typeof timeValue === 'string' && timeValue.includes('T')) {
    try {
      const date = new Date(timeValue);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (error) {
      console.error('Error converting time format:', error);
      return null;
    }
  }
  
  return null;
};

// Обновить способ доставки
export const updateDeliveryMethod = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔐 Update delivery method request:', {
      id: req.params.id,
      body: req.body
    });
    
    const { id } = req.params;
    
    // Преобразуем время в правильный формат
    const updateData = { ...req.body };
    const timeFields = [
      'orderTimeFrom', 'orderTimeTo', 'deliveryTodayTimeFrom', 'deliveryTodayTimeTo',
      'deliveryTomorrowTimeFrom', 'deliveryTomorrowTimeTo', 'orderTimeForToday', 'orderTimeForTomorrow'
    ];
    
    timeFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updateData[field] = convertTimeFormat(updateData[field]);
      }
    });
    
    console.log('🔧 Converted update data:', updateData);
    console.log('🔍 Custom intervals in update data:', {
      useFlexibleIntervals: updateData.useFlexibleIntervals,
      customInterval1: updateData.customInterval1,
      customInterval2: updateData.customInterval2
    });
    
    const deliveryMethod = await DeliveryMethod.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!deliveryMethod) {
      console.log('❌ Delivery method not found:', id);
      res.status(404).json({ message: 'Способ доставки не найден' });
      return;
    }
    
    console.log('✅ Delivery method updated successfully:', deliveryMethod);
    res.json({ deliveryMethod });
  } catch (error: any) {
    console.error('❌ Error updating delivery method:', error);
    
    // Возвращаем более подробную информацию об ошибке
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({ 
        message: 'Ошибка валидации при обновлении способа доставки',
        errors: validationErrors
      });
    } else if (error.name === 'CastError') {
      res.status(400).json({ 
        message: 'Неверный формат ID способа доставки'
      });
    } else {
      res.status(400).json({ 
        message: 'Ошибка при обновлении способа доставки',
        error: error.message 
      });
    }
  }
};

// Удалить способ доставки
export const deleteDeliveryMethod = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deliveryMethod = await DeliveryMethod.findByIdAndDelete(id);
    
    if (!deliveryMethod) {
      res.status(404).json({ message: 'Способ доставки не найден' });
      return;
    }
    
    res.json({ message: 'Способ доставки успешно удален' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при удалении способа доставки' });
  }
};

// Получить способ доставки по ID
export const getDeliveryMethodById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deliveryMethod = await DeliveryMethod.findById(id);
    
    if (!deliveryMethod) {
      res.status(404).json({ message: 'Способ доставки не найден' });
      return;
    }
    
    res.json(deliveryMethod);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении способа доставки' });
  }
}; 

// Функция для нормализации строки (удаляет служебные слова, окончания, приводит к нижнему регистру)
function normalizeZoneString(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b(г(ород)?|обл(асть)?|рп|пгт|пос(елок)?|дер(евня)?|село|район|\.|,)/g, ' ')
    .replace(/ий\b|ый\b|ая\b|ое\b|ий\b|ий\b|ий\b|ий\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Функция для транслитерации кириллицы в латиницу
function translitToLatin(str: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
  };
  return str.split('').map(c => map[c] || map[c.toLowerCase()] || c).join('');
}
// Функция для транслитерации латиницы в кириллицу (упрощённо)
function translitToCyrillic(str: string): string {
  const map: Record<string, string> = {
    a: 'а', b: 'б', v: 'в', g: 'г', d: 'д', e: 'е', z: 'з', i: 'и', y: 'й', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', r: 'р', s: 'с', t: 'т', u: 'у', f: 'ф', h: 'х', c: 'ц'
  };
  return str.split('').map(c => map[c] || map[c.toLowerCase()] || c).join('');
}

function normalizeZoneStringAll(str: string): string[] {
  const norm = normalizeZoneString(str);
  return [
    norm,
    translitToLatin(norm),
    translitToCyrillic(norm)
  ];
}

// Расчёт стоимости доставки по адресу/координатам
export const calculateDeliveryCost = async (req: Request, res: Response): Promise<void> => {
  let zoneKey: string | null = null; // Объявляем zoneKey в самом начале функции
  try {
    const axios = require('axios');
    const { address, lat, lng, deliveryMethod, city, region, region_code } = req.body;
    if (!address || lat === undefined || lng === undefined) {
      res.status(400).json({ message: 'Необходимо указать адрес и координаты' });
      return;
    }

    // --- ФИЛЬТР ДЛЯ СДЭК ---
    if (deliveryMethod && typeof deliveryMethod === 'string' && deliveryMethod.toLowerCase().includes('cdek')) {
      let usedCity = city;
      let usedRegion = region;
      let usedRegionCode = region_code;
      let cityCode, fiasGuid;
      // Если не передан город или регион — ищем через CDEK API
      if (!usedCity || !(usedRegion || usedRegionCode)) {
        // Запрос к нашему backend-прокси /api/cdek/cities
        const params: Record<string, any> = { country_codes: 'RU', size: 10 };
        if (usedCity) params.city = usedCity;
        else if (address) params.city = address.split(',').map((s: any) => s.trim()).pop();
        if (usedRegionCode) params.region_code = usedRegionCode;
        if (usedRegion) params.region = usedRegion;
        const cdekResp = await axios.get(`${process.env.BACKEND_URL || 'http://localhost:5002'}/api/cdek/cities`, { params });
        const cities = cdekResp.data && Array.isArray(cdekResp.data) ? cdekResp.data : cdekResp.data?.cities || [];
        if (cities.length === 1) {
          usedCity = cities[0].city;
          usedRegion = cities[0].region;
          usedRegionCode = cities[0].region_code;
          cityCode = cities[0].code;
          fiasGuid = cities[0].fias_guid;
        } else {
          res.status(400).json({ message: 'Не удалось однозначно определить город и регион для СДЭК', found: cities });
          return;
        }
      }
      // Формируем address для ответа и дальнейших запросов
      let addressStr = usedCity;
      if (usedRegion) addressStr = `${usedCity}, ${usedRegion}`;
      else if (usedRegionCode) addressStr = `${usedCity}, ${usedRegionCode}`;
      // Здесь можно реализовать вызов CDEK API для расчёта сроков/стоимости с найденными параметрами
      res.json({ deliveryMethods: [], zone: null, zoneKey: null, city: usedCity, region: usedRegion, region_code: usedRegionCode, city_code: cityCode, fias_guid: fiasGuid, address: addressStr });
      return;
    }

    // Получаем координаты
    let coords: [number, number] = [parseFloat(lng), parseFloat(lat)];

    // Проверяем попадание в МКАД/ЦКАД
    const inMkad = require('../utils/geoZones').isPointInPolygon(coords, require('../utils/geoZones').MKAD_POLYGON);
    const inCkad = require('../utils/geoZones').isPointInPolygon(coords, require('../utils/geoZones').CKAD_POLYGON);
    const zone = getDeliveryZoneByCoords(coords);

    // Получаем все активные методы доставки
    const deliveryMethods = await DeliveryMethod.find({ isActive: true }).sort({ order: 1, name: 1 });
    const allZones = await DeliveryZone.find();

    // --- ДОБАВЛЕНО: расчет стоимости для СДЭК и возврат ПВЗ ---
    let cdekPVZList: Array<{ code: string; name: string; address: string; work_time: string }> = [];
    let orderValue = req.body.orderValue ? Number(req.body.orderValue) : 0;

    const result = deliveryMethods.map(method => {
      let available = true;
      let reason = '';
      if (method.addressValidationType === 'moscow_mkad') {
        if (zone !== 'mkad') {
          available = false;
          reason = 'Доставка только в пределах МКАД';
        }
      } else if (method.addressValidationType === 'moscow_region') {
        if (zone !== 'ckad') {
          available = false;
          reason = 'Доставка только между МКАД и ЦКАД';
        }
      }
      // --- ДОБАВЛЕНО: zonePrices для зональных методов ---
      let zonePrices: Record<string, number> | undefined = undefined;
      if (method.costType === 'zone' && method.useZones && Array.isArray(method.zoneKeys)) {
        zonePrices = {};
        for (const key of method.zoneKeys) {
          const zone = allZones.find(z => z.key === key);
          if (zone) (zonePrices as Record<string, number>)[key] = zone.price;
        }
      }
      // --- ДОБАВЛЕНО: расчет стоимости для СДЭК ---
      let cdekCost: number | null = null;
      const m = method as any;
      if ((m.type === 'cdek' || (m.name && m.name.toLowerCase().includes('сдэк')))) {
        if (method.costType === 'percentage' && orderValue > 0 && method.costPercentage) {
          cdekCost = Math.round(orderValue * (method.costPercentage / 100));
        } else if (method.costType === 'fixed' && method.fixedCost) {
          cdekCost = method.fixedCost;
        } else if (method.costType === 'fixed_plus_percentage' && method.fixedCost !== undefined && method.costPercentage && orderValue > 0) {
          const fixedPart = method.fixedCost;
          const percentagePart = Math.round(orderValue * (method.costPercentage / 100));
          cdekCost = fixedPart + percentagePart;
        } else if (method.costType === 'zone' && zonePrices && zoneKey && zonePrices[zoneKey] !== undefined) {
          cdekCost = zonePrices[zoneKey];
        }
      }
      return {
        ...method.toObject(),
        available,
        unavailableReason: available ? undefined : reason,
        ...(zonePrices ? { zonePrices } : {}),
        ...(cdekCost !== null ? { cdekCost } : {})
      };
    });

    // --- ДОБАВЛЕНО: получение ПВЗ СДЭК через API (только для zone === 'region') ---
    if (coords && coords.length === 2 && zone === 'region') {
      // Получаем координаты через Dadata
      let city = req.body.city;
      let region = req.body.region;
      let addressForPVZ = address;
      let lat = coords[1];
      let lon = coords[0];
      try {
        if (!city || !region) {
          const dadataResp = await require('axios').post(
            'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address',
            { query: address, count: 1 },
            {
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Token ${process.env.DADATA_API_KEY || 'ecb97bfa1e55c60cd6b89567e51fee54a8747af3'}`
              }
            }
          );
          const suggestions = dadataResp.data.suggestions;
          if (suggestions && suggestions.length > 0) {
            const data = suggestions[0].data;
            city = data.city || data.settlement_with_type || data.settlement || data.city_with_type || city;
            region = data.region_with_type || region;
            addressForPVZ = suggestions[0].value;
            lat = parseFloat(data.geo_lat) || lat;
            lon = parseFloat(data.geo_lon) || lon;
          }
        }
      } catch (e) {
        // ignore
      }
      // Получаем ПВЗ через сервис
      try {
        const { getPVZListFromCDEK, filterPVZByRadius } = require('../services/cdekService');
        let allPVZ = await getPVZListFromCDEK({ city, region, address: addressForPVZ });
        // Фильтруем ближайшие ПВЗ по координатам (10 км, если нет — 50 км)
        let nearestPVZ = filterPVZByRadius({ lat, lon }, allPVZ, 10);
        if (!nearestPVZ || nearestPVZ.length === 0) {
          nearestPVZ = filterPVZByRadius({ lat, lon }, allPVZ, 50);
        }
        // Для каждого ПВЗ получаем ожидаемую дату доставки (Москва -> этот ПВЗ, тариф 136, склад-склад)
        const axios = require('axios');
        const CDEK_API_BASE_URL = 'https://api.cdek.ru/v2';
        const token = await require('../services/cdekService').getCDEKToken();
        const fromCity = 'Москва';
        const getDistance = require('../utils/geoZones').getDistance;
        const cdekPVZList = await Promise.all(nearestPVZ.map(async (pvz: any) => {
          let deliveryDate = null;
          let respData = null;
          try {
            // Получаем дату доставки через API СДЭК (tariff_code 136, from Москва, to pvz)
            console.log(`[CDEK][DEBUG] Запрос даты доставки для ПВЗ ${pvz.code}, city_code: ${pvz.location.city_code}`);
            const resp = await axios.post(
              `${CDEK_API_BASE_URL}/calculator/tariff`,
              {
                type: 1, // склад-склад
                tariff_code: 136,
                from_location: { 
                  code: 44, // Код Москвы
                  city: fromCity 
                },
                to_location: { 
                  code: pvz.location.city_code,
                  city: pvz.location.city
                },
                packages: [{ 
                  weight: 1000, // 1 кг в граммах
                  length: 20, 
                  width: 20, 
                  height: 10 
                }]
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            respData = resp.data;
            console.log(`[CDEK][DEBUG] Ответ API для ПВЗ ${pvz.code}:`, respData);
            if (resp.data && resp.data.period_min) {
              // Плюсуем 2 дня к period_min
              const days = Number(resp.data.period_min) + 2;
              const today = new Date();
              today.setDate(today.getDate() + days);
              deliveryDate = today.toISOString().split('T')[0];
              console.log(`[CDEK][DEBUG] Рассчитанная дата доставки для ПВЗ ${pvz.code}: ${deliveryDate} (${days} дней)`);
            } else {
              console.log(`[CDEK][DEBUG] Нет period_min в ответе для ПВЗ ${pvz.code}`);
              deliveryDate = null; // Нет period_min — нет даты
            }
          } catch (e) {
            console.log(`[CDEK][DEBUG] Ошибка получения даты доставки для ПВЗ ${pvz.code}:`, (e as Error).message || e);
            deliveryDate = null;
          }
          // Логируем для отладки
          console.log('[CDEK][DEBUG] PVZ:', {
            code: pvz.code,
            city_code: pvz.location.city_code,
            deliveryDate,
            respData
          });
          // Добавляем distance (в метрах) если есть координаты
          let distance = null;
          if (pvz.location && typeof pvz.location.latitude === 'number' && typeof pvz.location.longitude === 'number') {
            distance = Math.round(getDistance(lat, lon, pvz.location.latitude, pvz.location.longitude) * 1000); // в метрах
          }
          return {
            code: pvz.code,
            name: pvz.name,
            address: pvz.location.address,
            work_time: pvz.work_time,
            deliveryDate,
            distance
          };
        }));
        cdekPVZList.sort((a, b) => (a.deliveryDate || '').localeCompare(b.deliveryDate || ''));
        // Возвращаем только ближайшие ПВЗ с датой доставки
        res.json({ deliveryMethods: result, zone, zoneKey, cdekPVZList, cdekDeliveryDates: cdekPVZList.map(p => p.deliveryDate).filter(Boolean) });
        return;
      } catch (e) {
        res.json({ deliveryMethods: result, zone, zoneKey, cdekPVZList: [] });
        return;
      }
    }

    // Получаем все зоны
    const allZonesForResult = await DeliveryZone.find();

    // Нормализуем адрес и разбиваем на слова
    const normalizedAddress = normalizeZoneString(address).replace(/[.,]/g, ' ');
    const addressWords = normalizedAddress.split(' ').filter(Boolean);
    // Добавляем транслитерацию для каждого слова
    const addressWordsAll = addressWords.flatMap(w => normalizeZoneStringAll(w));

    // --- Перемещаем определение zoneKey выше, чтобы использовать его везде ---
    let foundZone = null;
    let debugCompare = [];
    for (const z of allZonesForResult) {
      const zoneNameWords = normalizeZoneString(z.name).split(' ');
      const zoneKeyWords = normalizeZoneString(z.key).split(' ');
      const zoneWordsAll = [...zoneNameWords, ...zoneKeyWords].flatMap(w => normalizeZoneStringAll(w));
      debugCompare.push({
        zone: z.key,
        zoneWordsAll,
        addressWordsAll
      });
      if (
        addressWordsAll.some(word => zoneWordsAll.includes(word))
      ) {
        foundZone = z;
        break;
      }
    }
    if (foundZone) {
      zoneKey = foundZone.key;
    }

    if (deliveryMethod && typeof deliveryMethod === 'string' && deliveryMethod.toLowerCase().includes('cdek')) {
      res.json({ deliveryMethods: result, zone, zoneKey });
      return;
    }

    // Логируем для отладки
    console.log('=== DEBUG ZONE DETECTION ===');
    console.log('Адрес:', address);
    console.log('Нормализованный адрес:', normalizedAddress);
    console.log('addressWordsAll:', addressWordsAll);
    console.log('zoneKey:', zoneKey);
    console.log('Найденная зона:', foundZone);
    console.log('Все ключи зон:', allZonesForResult.map(z => ({ key: z.key, name: z.name, price: z.price })));
    
    // Добавляем отладку для каждого метода доставки
    result.forEach((method, index) => {
      console.log(`=== DEBUG METHOD ${index + 1}: ${method.name} ===`);
      console.log('costType:', method.costType);
      console.log('useZones:', method.useZones);
      console.log('zoneKeys:', method.zoneKeys);
      console.log('zonePrices:', method.zonePrices);
      if (method.zonePrices && zoneKey) {
        console.log(`zonePrices[${zoneKey}]:`, method.zonePrices[zoneKey]);
      }
      console.log('fixedCost:', method.fixedCost);
    });
    console.log('=== END DEBUG ===');

    res.json({ deliveryMethods: result, zone, zoneKey, cdekPVZList });
  } catch (error) {
    console.error('Ошибка при расчёте стоимости доставки:', error);
    res.status(500).json({ message: 'Ошибка сервера при расчёте стоимости доставки' });
  }
}; 