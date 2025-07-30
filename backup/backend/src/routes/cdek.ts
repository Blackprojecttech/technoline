import express from 'express';
import * as cdekService from '../services/cdekService';
import { filterPVZByRadius, cdekServiceInstance, getPVZListFromCDEK } from '../services/cdekService';

const router = express.Router();



// Получить доступные даты доставки по адресу
router.get('/delivery-dates', async (req, res) => {
  try {
    const { address, city_code, fias_guid, from_address, tariff_code, postalCode, city, region, code } = req.query;
    console.log('CDEK delivery-dates request:', { address, city_code, fias_guid, from_address, tariff_code, query: req.query });
    if (!region || typeof region !== 'string' || !region.trim()) {
      return res.status(400).json({ error: 'Для расчёта доставки СДЭК необходимо явно указать регион (region) вместе с городом.' });
    }
    const fromCityCodeForQuery = req.query.from_city_code as string | undefined;
    const fromFiasGuidForQuery = req.query.from_fias_guid as string | undefined;
    const fromPostalCodeForQuery = req.query.from_postal_code as string | undefined;
    // --- Всегда используем getCDEKDeliveryPeriods для расчёта срока доставки ---
    const addressForQuery = address as string | undefined;
    const fromAddressForQuery = from_address as string | undefined;
    const tariffCodeForQuery = tariff_code ? Number(tariff_code) : 136;
    const codeForQuery = city_code as string | undefined;
    const fiasGuidForQuery = fias_guid as string | undefined;
    const cityForQuery = city as string | undefined;
    const regionForQuery = region as string | undefined;
    const postalCodeForQuery = postalCode as string | undefined;
    const fullAddress = [
      postalCodeForQuery,
      'Россия',
      regionForQuery,
      cityForQuery,
      addressForQuery && addressForQuery !== cityForQuery ? addressForQuery : undefined
    ].filter(Boolean).join(', ');
    const result = await cdekServiceInstance.getCDEKDeliveryPeriods(
      fullAddress,
      fromAddressForQuery && fromAddressForQuery.length > 0 ? fromAddressForQuery : 'Москва, Митино, ул. Митинская, д. 1',
      tariffCodeForQuery,
      {
        code: codeForQuery,
        postalCode: postalCodeForQuery,
        fias_guid: fiasGuidForQuery,
        city: cityForQuery,
        region: regionForQuery,
        from_code: fromCityCodeForQuery,
        from_fias_guid: fromFiasGuidForQuery,
        from_postal_code: fromPostalCodeForQuery
      }
    );
    console.log('Result from getCDEKDeliveryPeriods:', result);
    return res.json({
      success: true,
      periods: result.periods || [],
      intervals: result.intervals || []
    });
  } catch (error) {
    console.error('Error getting CDEK delivery dates:', error);
    return res.status(500).json({ error: 'Ошибка при получении дат доставки СДЭК' });
  }
});

// Получить список ПВЗ СДЭК по адресу (НОВАЯ ЛОГИКА)
router.get('/pvz-list', async (req, res) => {
  console.log('pvz-list req.query:', req.query);
  try {
    const { city, region, address } = req.query;
    if (!city || typeof city !== 'string') {
      return res.status(400).json({ error: 'city обязателен' });
    }
    // Шаг 1: Получаем ПВЗ по адресу через API СДЭК
    const pvzList = await getPVZListFromCDEK({ city, region: typeof region === 'string' ? region : undefined, address: typeof address === 'string' ? address : undefined });
    // Временно возвращаем результат сразу (для теста)
    return res.json({ pvzList });
  } catch (error) {
    return res.status(500).json({ error: 'Ошибка при поиске ПВЗ СДЭК', details: String(error) });
  }
});

// Получить информацию о конкретном ПВЗ по коду
router.get('/pvz/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    console.log('CDEK pvz-by-code request:', { code });
    
    if (!code) {
      return res.status(400).json({ 
        error: 'Код ПВЗ обязателен' 
      });
    }

    const pvz = await cdekServiceInstance.getPVZByCode(code);
    
    if (!pvz) {
      return res.status(404).json({ 
        error: 'ПВЗ не найден' 
      });
    }
    
    console.log('CDEK pvz-by-code result:', { found: true });
    
    return res.json({
      success: true,
      pvz: pvz
    });
  } catch (error) {
    console.error('Error getting CDEK PVZ by code:', error);
    return res.status(500).json({ 
      error: 'Ошибка при получении информации о ПВЗ СДЭК' 
    });
  }
});

// Поиск городов по названию (V2)
router.get('/cities/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    console.log('CDEK cities-search request:', { query });
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ 
        error: 'Поисковый запрос обязателен' 
      });
    }

    // Используем только suggestCities (V2)
    const cities = await cdekServiceInstance.suggestCities(query);
    
    console.log('CDEK cities-search result:', { count: Array.isArray(cities) ? cities.length : 0 });
    
    return res.json({
      success: true,
      cities: cities
    });
  } catch (error) {
    console.error('Error searching CDEK cities:', error);
    return res.status(500).json({ 
      error: 'Ошибка при поиске городов СДЭК' 
    });
  }
});

// Получить код города по названию
router.get('/city-code', async (req, res) => {
  try {
    const { city, postcode } = req.query;
    
    console.log('CDEK city-code request:', { city, postcode });
    
    if (!city || typeof city !== 'string') {
      return res.status(400).json({ 
        error: 'Название города обязательно' 
      });
    }

    const cityCode = await cdekServiceInstance.getCityCode(city, postcode as string);
    
    if (!cityCode) {
      return res.status(404).json({ 
        error: 'Город не найден' 
      });
    }
    
    console.log('CDEK city-code result:', { cityCode });
    
    return res.json({
      success: true,
      cityCode: cityCode
    });
  } catch (error) {
    console.error('Error getting CDEK city code:', error);
    return res.status(500).json({ 
      error: 'Ошибка при получении кода города СДЭК' 
    });
  }
});

// Проверить доступность адреса для доставки СДЭК
router.get('/check-address', async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address || typeof address !== 'string') {
      return res.status(400).json({ 
        error: 'Адрес обязателен' 
      });
    }

    const isAvailable = await cdekServiceInstance.checkAddressAvailability(address);
    
    return res.json({
      success: true,
      available: isAvailable
    });
  } catch (error) {
    console.error('Error checking CDEK address:', error);
    return res.status(500).json({ 
      error: 'Ошибка при проверке адреса СДЭК' 
    });
  }
});

// Получить точки выдачи по адресу
router.get('/delivery-points', async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address || typeof address !== 'string') {
      return res.status(400).json({ 
        error: 'Адрес обязателен' 
      });
    }

    const points = await cdekServiceInstance.getDeliveryPoints(address);
    
    return res.json({
      success: true,
      points: points
    });
  } catch (error) {
    console.error('Error getting CDEK delivery points:', error);
    return res.status(500).json({ 
      error: 'Ошибка при получении точек выдачи СДЭК' 
    });
  }
});

// Получить список населённых пунктов (проксирование к CDEK API)
router.get('/cities', async (req, res) => {
  try {
    const axios = require('axios');
    const token = process.env.CDEK_API_TOKEN;
    if (!token) {
      return res.status(500).json({ error: 'CDEK API token not set in environment' });
    }
    const params: Record<string, any> = {};
    // Копируем все поддерживаемые параметры из query
    const allowedParams = [
      'country_codes', 'region_code', 'kladr_region_code', 'fias_region_guid',
      'kladr_code', 'fias_guid', 'postal_code', 'code', 'city',
      'payment_limit', 'size', 'page', 'lang'
    ];
    for (const key of allowedParams) {
      if (req.query[key] !== undefined) params[key] = req.query[key];
    }
    const headers = {
      Authorization: `Bearer ${token}`
    };
    const url = 'https://api.cdek.ru/v2/location/cities';
    const response = await axios.get(url, { params, headers });
    return res.json(response.data);
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
    return res.status(500).json({ error: 'Ошибка при получении списка городов', details: String(error) });
  }
});

export default router; 