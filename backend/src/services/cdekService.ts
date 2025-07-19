import axios from 'axios';
import { getDistance } from '../utils/geoZones';
import { DeliveryPoint } from '../models/DeliveryPoint';
import fetch from 'node-fetch';

const CDEK_CLIENT_ID = 'jZ7qr1atawrqnq3v2YCM92RR3FPODAgu';
const CDEK_CLIENT_SECRET = 'LE4Om92voA0P2hLOQRgP8Fnf7xfFV1Kf';
const CDEK_API_BASE_URL = 'https://api.cdek.ru/v2';

let cdekToken: string = '';
let cdekTokenExpiresAt: number = 0;

export async function getCDEKToken(): Promise<string> {
  if (cdekToken && Date.now() < cdekTokenExpiresAt - 60 * 1000) return cdekToken;
  const resp = await axios.post(`${CDEK_API_BASE_URL}/oauth/token`, null, {
    params: {
      grant_type: 'client_credentials',
      client_id: CDEK_CLIENT_ID,
      client_secret: CDEK_CLIENT_SECRET,
    },
  });
  cdekToken = resp.data.access_token;
  cdekTokenExpiresAt = Date.now() + (resp.data.expires_in || 3600) * 1000;
  return cdekToken;
}

export async function getPVZListFromCDEK({city, region, address}: {city: string, region?: string, address?: string}) {
  const token = await getCDEKToken();
  // Формируем параметры для поиска ПВЗ
  const params: any = {
    type: 'PVZ',
    city,
  };
  if (region) params.region = region;
  if (address) params.address = address;
  console.log('[CDEK] getPVZListFromCDEK params:', params);
  const resp = await axios.get(`${CDEK_API_BASE_URL}/deliverypoints`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  console.log('[CDEK] getPVZListFromCDEK response:', resp.data);
  const pvzList = resp.data.map((pvz: any) => {
    const region = pvz.location?.region;
    if (region) {
      console.log(`[CDEK] ПВЗ ${pvz.code} область: ${region}`);
    }
    return {
      ...pvz,
      region: region || undefined
    };
  });
  return pvzList;
}

interface CDEKDeliveryPoint {
  code: string;
  name: string;
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  work_time: string;
  phones: string[];
  email: string;
  note: string;
  type: string;
  owner_name: string;
  take_only: boolean;
  is_dressing_room: boolean;
  have_cashless: boolean;
  have_cash: boolean;
  allowed_cod: boolean;
  nearest_station: string;
  metro_station: string;
  url: string;
  office_image_list: string[];
  work_time_list: Array<{
    day: number;
    periods: Array<{
      time_begin: string;
      time_end: string;
    }>;
  }>;
  weight_min: number;
  weight_max: number;
}

interface CDEKDeliveryCalculation {
  delivery_sum: number;
  period_min: number;
  period_max: number;
  calendar_min: string;
  calendar_max: string;
}

interface CDEKDeliveryPointResponse {
  delivery_points: CDEKDeliveryPoint[];
}

interface CDEKCalculationResponse {
  delivery_sum: number;
  period_min: number;
  period_max: number;
  calendar_min: string;
  calendar_max: string;
}

interface CDEKCity {
  code: string;
  city: string;
  region: string;
  country_code: string;
  region_code: string;
  latitude: number;
  longitude: number;
  kladr_code: string;
  fias_guid: string;
  payment_limit: number;
}

// Фильтрация ПВЗ по радиусам (вне класса)
function filterPVZByRadius(
  addressCoords: { lat: number, lon: number },
  pvzList: CDEKDeliveryPoint[],
  radius: number
): CDEKDeliveryPoint[] {
  console.log(`[CDEK] Поиск ПВЗ в радиусе ${radius} км для координат:`, addressCoords);

  if (pvzList.length === 0) {
    console.log(`[CDEK] Список ПВЗ пуст`);
    return [];
  }

  // Фильтруем только валидные ПВЗ с координатами
  let validPVZ = pvzList.filter(pvz => pvz && pvz.location && typeof pvz.location.latitude === 'number' && typeof pvz.location.longitude === 'number');
  console.log(`[CDEK] После фильтрации по координатам осталось ПВЗ: ${validPVZ.length}`);
  if (validPVZ.length === 0) {
    console.log(`[CDEK] Нет ПВЗ с координатами`);
    return [];
  }

  // Вычисляем расстояния для всех ПВЗ
  const withDist = validPVZ
    .map(pvz => ({
      pvz,
      dist: getDistance(addressCoords.lat, addressCoords.lon, pvz.location.latitude, pvz.location.longitude)
    }));

  // Логируем все расстояния для текущего радиуса
  withDist.forEach(item => {
    console.log(`[CDEK DEBUG] ПВЗ ${item.pvz.code} | ${item.pvz.location.address} | (${item.pvz.location.latitude}, ${item.pvz.location.longitude}) | расстояние: ${item.dist.toFixed(2)} км`);
  });

  // Фильтруем по радиусу и сортируем по расстоянию
  const filtered = withDist
    .filter(item => item.dist <= radius)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 10); // Ограничиваем 10 ближайшими

  if (filtered.length > 0) {
    console.log(`[CDEK] Найдено ПВЗ в радиусе ${radius} км: ${filtered.length}`);
    console.log(`[CDEK] Минимальное расстояние: ${filtered[0].dist.toFixed(2)} км`);
    console.log(`[CDEK] Ближайшие ПВЗ:`);
    filtered.forEach(item => {
      console.log(`  ${item.pvz.code} | ${item.pvz.location.address} | ${item.dist.toFixed(2)} км`);
    });
    return filtered.map(item => item.pvz);
  } else {
    console.log(`[CDEK] В радиусе ${radius} км не найдено ПВЗ`);
    return [];
  }
}

// --- Кэш для кода города, fias_guid и postal_code Митино (Москва) ---
const MITINO_FROM_CACHE = {
  code: '44', // Код Москвы в СДЭК (или '137', если требуется другой)
  fias_guid: 'c2deb16a-0330-4f05-821f-1d09c93331e6', // FIAS Москвы
  postal_code: '125222', // Почтовый индекс Митино
  address: 'Москва, Митино',
};

class CDEKService {
  // Экземпляр класса для получения токена
  private prodToken: string | null = null;
  private prodTokenExpiresAt: number = 0;

  // Получить production-токен (и кэшировать его до истечения)
  public async getProdToken(): Promise<string> {
    const now = Date.now();
    if (this.prodToken && this.prodTokenExpiresAt > now + 60000) {
      if (!this.prodToken) throw new Error('CDEK prodToken is unexpectedly null');
      return this.prodToken;
    }
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', CDEK_CLIENT_ID);
      params.append('client_secret', CDEK_CLIENT_SECRET);
      const response = await axios.post(
        'https://api.cdek.ru/v2/oauth/token',
        params,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      if (response.data.access_token) {
        this.prodToken = response.data.access_token;
        this.prodTokenExpiresAt = now + (response.data.expires_in || 3600) * 1000;
        if (!this.prodToken) throw new Error('CDEK prodToken is unexpectedly null after token request');
        return this.prodToken;
      }
      throw new Error('Не удалось получить access_token CDEK');
    } catch (error: any) {
      console.error('Ошибка получения production токена CDEK:', error.response?.data || error.message);
      throw new Error('Ошибка получения production токена CDEK');
    }
  }

  private async makeRequest(endpoint: string, params: any = {}, useTestApi: boolean = false): Promise<any> {
    try {
      const baseUrl = useTestApi ? CDEK_API_BASE_URL : CDEK_API_BASE_URL;
      let token: string = '';
      token = await this.getProdToken();
      if (!token) throw new Error('CDEK API token is missing');
      const response = await axios.get(`${baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params
      });
      return response.data;
    } catch (error: any) {
      console.error('CDEK API Error:', error.response?.status, error.response?.data);
      // Возвращаем пустой результат при ошибках API
      if (endpoint === '/deliverypoints') {
        return { delivery_points: [] };
      }
      return null;
    }
  }

  // Получить код города по названию
  async getCityCode(cityName: string, postcode?: string): Promise<string | null> {
    try {
      console.log('[CDEK] Получаем код города для:', cityName, postcode);

      let region: string | undefined = undefined;
      let postalCode: string | undefined = postcode;
      let city: string = cityName;

      // Всегда пробуем получить город, регион и индекс через Dadata, если есть ключ
      const DADATA_API_KEY = process.env.DADATA_API_KEY;
      if (DADATA_API_KEY) {
        try {
          const response = await axios.post(
            'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address',
            { query: cityName, count: 5 }, // увеличиваем count для большего количества вариантов
            {
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Token ${DADATA_API_KEY}`
              }
            }
          );

          const suggestions = response.data.suggestions;
          let data = suggestions[0]?.data;
          if (region && suggestions && suggestions.length > 1) {
            // Фильтруем по региону, если он явно указан
            const found = suggestions.find((s: any) => s.data.region_with_type && s.data.region_with_type.includes(region));
            if (found) data = found.data;
          }
          city = data.city || data.settlement_with_type || data.settlement || data.city_with_type || city;
          region = data.region_with_type || region;
          postalCode = data.postal_code || postalCode;
          console.log('[CDEK] Извлечены из адреса:', { city, region, postalCode });
          // --- ДОБАВЛЕНО: сохраняем регион для дальнейшей передачи ---
          (global as any)._lastExtractedRegion = region;
        } catch (dadataError) {
          console.error('[CDEK] Ошибка при получении города/региона через Dadata:', dadataError);
        }
      }

      // Пробуем основной API CDEK с уточнением региона и индекса
      const params: any = { city };
      if (region) params.region = region;
      if (postalCode) params.postal_code = postalCode;
      let cities = await this.makeRequest('/location/cities', params);
      if (cities && cities.length > 0) {
        const cityCode = cities[0].code;
        console.log('[CDEK] Найден код города через основной API:', cityCode, '| Регион:', region, '| Индекс:', postalCode);
        return cityCode;
      }

      // Fallback коды городов для демонстрации
      const fallbackCities: { [key: string]: string } = {
        'москва': '44',
        'санкт-петербург': '78',
        'новосибирск': '54',
        'екатеринбург': '66',
        'казань': '16',
        'нижний новгород': '52',
        'челябинск': '74',
        'самара': '63',
        'ростов-на-дону': '61',
        'уфа': '02',
        'павловский посад': '488'
      };

      const normalizedCityName = cityName.toLowerCase().trim();
      const fallbackCode = fallbackCities[normalizedCityName];

      if (fallbackCode) {
        console.log('[CDEK] Используем fallback код города:', fallbackCode);
        return fallbackCode;
      }

      console.log('[CDEK] Город не найден, используем код Москвы по умолчанию');
      return '44'; // Код Москвы по умолчанию
    } catch (error) {
      console.error('[CDEK] Ошибка получения кода города:', error);

      // Fallback код Москвы при ошибке
      return '44';
    }
  }

  // Новый метод: получить city_code по отдельным полям
  async getCityCodeByFields(city: string, region?: string, postcode?: string): Promise<string | null> {
    try {
      const params: any = { city };
      if (region) params.region = region;
      if (postcode) params.postal_code = postcode;
      const cities = await this.makeRequest('/location/cities', params);
      if (cities && cities.length > 0) {
        return cities[0].code;
      }
      // Fallback как раньше
      const fallbackCities: { [key: string]: string } = {
        'москва': '44',
        'санкт-петербург': '78',
        'новосибирск': '54',
        'екатеринбург': '66',
        'казань': '16',
        'нижний новгород': '52',
        'челябинск': '74',
        'самара': '63',
        'ростов-на-дону': '61',
        'уфа': '02'
      };
      const normalizedCityName = city.toLowerCase().trim();
      const fallbackCode = fallbackCities[normalizedCityName];
      if (fallbackCode) {
        return fallbackCode;
      }
      return '44'; // Москва по умолчанию
    } catch (e) {
      return '44';
    }
  }

  // Получить точки выдачи по коду города
  async getDeliveryPointsByCityCode(cityCode: string): Promise<CDEKDeliveryPoint[]> {
    try {
      console.log('Getting CDEK delivery points for city code:', cityCode);
      const response = await this.makeRequest('/deliverypoints', {
        city_code: cityCode,
        type: 'PVZ'
      });
      let pvzList: CDEKDeliveryPoint[] = [];
      if (response && Array.isArray(response)) {
        pvzList = response;
        // Сохраняем/обновляем ПВЗ в базе
        for (const pvz of pvzList) {
          let latitude = pvz.location.latitude;
          let longitude = pvz.location.longitude;
          // Если координаты невалидны — получаем через Dadata
          if (!latitude || !longitude) {
            const coords = await this.getCoordinatesByAddress(pvz.location.address);
            if (coords) {
              latitude = coords.lat;
              longitude = coords.lon;
            }
          }
          await DeliveryPoint.findOneAndUpdate(
            { code: pvz.code },
            {
              code: pvz.code,
              name: pvz.name,
              address: pvz.location.address,
              city: (pvz.location as any).city || '',
              region: (pvz.location as any).region || '',
              fias_guid: (pvz.location as any).fias_guid || '',
              city_code: (pvz.location as any).city_code || '',
              latitude,
              longitude,
              type: pvz.type,
              owner_code: (pvz as any).owner_code || pvz.owner_name || '',
              is_handout: typeof (pvz as any).is_handout !== 'undefined' ? (pvz as any).is_handout : false,
              is_reception: typeof (pvz as any).is_reception !== 'undefined' ? (pvz as any).is_reception : false,
              is_dressing_room: typeof pvz.is_dressing_room !== 'undefined' ? pvz.is_dressing_room : false,
              have_cashless: typeof pvz.have_cashless !== 'undefined' ? pvz.have_cashless : false,
              have_cash: typeof pvz.have_cash !== 'undefined' ? pvz.have_cash : false,
              allowed_cod: typeof pvz.allowed_cod !== 'undefined' ? pvz.allowed_cod : false,
              work_time: pvz.work_time || '',
              phones: Array.isArray(pvz.phones)
                ? (pvz.phones as any[]).map(p => typeof p === 'object' && p && 'number' in p ? p.number : String(p))
                : [],
              email: pvz.email || '',
              note: pvz.note || '',
              updatedAt: new Date()
            },
            { upsert: true, new: true }
          );
        }
      }
      return pvzList;
    } catch (error) {
      console.error('Error getting CDEK delivery points by city code:', error);
      return [];
    }
  }

  // Модифицируем getDeliveryPoints: теперь принимает либо строку, либо объект с полями
  async getDeliveryPoints(addressOrFields: string | { city: string, region?: string, postcode?: string }): Promise<CDEKDeliveryPoint[]> {
    try {
      let cityCode: string | null = null;
      let address = '';
      if (typeof addressOrFields === 'string') {
        address = addressOrFields;
        // Парсим через DaData для получения города, области, индекса
        const DADATA_API_KEY = process.env.DADATA_API_KEY;
        if (DADATA_API_KEY) {
          const response = await axios.post(
            'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address',
            { query: address, count: 1 },
            {
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Token ${DADATA_API_KEY}`
              }
            }
          );
          const suggestions = response.data.suggestions;
          if (suggestions && suggestions.length > 0) {
            const data = suggestions[0].data;
            const city = data.city || data.settlement_with_type || data.settlement || data.city_with_type || '';
            const region = data.region_with_type || '';
            const postcode = data.postal_code || '';
            cityCode = await this.getCityCodeByFields(city, region, postcode);
          } else {
            cityCode = await this.getCityCode(address);
          }
        } else {
          cityCode = await this.getCityCode(address);
        }
      } else {
        // Если пришёл объект с полями
        const { city, region, postcode } = addressOrFields;
        cityCode = await this.getCityCodeByFields(city, region, postcode);
        address = `${region ? region + ', ' : ''}${city}${postcode ? ', ' + postcode : ''}`;
      }
      if (!cityCode) {
        return [];
      }
      // Получаем точки выдачи по коду города
      const deliveryPoints = await this.getDeliveryPointsByCityCode(cityCode);
      return deliveryPoints;
    } catch (error) {
      return [];
    }
  }

  // async calculateDelivery(address: string, weight: number = 1): Promise<CDEKCalculationResponse | null> {
  //   // Сначала получаем точки выдачи
  //   const deliveryPoints = await this.getDeliveryPoints(address);

  //   if (deliveryPoints.length === 0) {
  //     return null;
  //   }

  //   // Берем первую доступную точку для расчета
  //   const nearestPoint = deliveryPoints[0];

  //   // Рассчитываем примерные сроки доставки
  //   const today = new Date();
  //   const tomorrow = new Date(today);
  //   tomorrow.setDate(tomorrow.getDate() + 1);

  //   const dayAfterTomorrow = new Date(today);
  //   dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  //   return {
  //     delivery_sum: 300, // Примерная стоимость доставки
  //     period_min: 1, // Минимальный срок в днях
  //     period_max: 3, // Максимальный срок в днях
  //     calendar_min: tomorrow.toISOString().split('T')[0], // Дата минимальной доставки
  //     calendar_max: dayAfterTomorrow.toISOString().split('T')[0] // Дата максимальной доставки
  //   };
  // }

  // Получить доступные даты доставки
  async getAvailableDeliveryDates(address: string): Promise<{
    dates: string[];
    intervals: string[];
  }> {
    try {
      // Получаем точки выдачи для определения доступности
      const deliveryPoints = await this.getDeliveryPoints(address);

      if (deliveryPoints.length === 0) {
        return { dates: [], intervals: [] };
      }

      // Генерируем даты доставки на основе доступности ПВЗ
      const dates: string[] = [];
      const intervals: string[] = ['09:00-18:00', '18:00-21:00'];

      // Получаем даты на ближайшие 7 дней
      const today = new Date();
      for (let i = 1; i <= 7; i++) {
        const deliveryDate = new Date(today);
        deliveryDate.setDate(today.getDate() + i);

        const dayOfWeek = deliveryDate.getDay();
        // Исключаем воскресенье (0) - ПВЗ обычно не работают
        if (dayOfWeek !== 0) {
          dates.push(deliveryDate.toISOString().split('T')[0]);
        }
      }

      return { dates, intervals };
    } catch (error) {
      console.error('Error getting available delivery dates:', error);
      return { dates: [], intervals: [] };
    }
  }

  // Получить доступные даты доставки из API СДЭК
  async getCDEKDeliveryDates(address: string): Promise<{
    dates: string[];
    intervals: string[];
  }> {
    try {
      console.log('Getting CDEK delivery dates for address:', address);

      // Получаем точки выдачи для определения доступности
      const deliveryPoints = await this.getDeliveryPoints(address);

      if (deliveryPoints.length === 0) {
        console.log('No delivery points found for address:', address);
        return { dates: [], intervals: [] };
      }

      // В реальном проекте здесь будет вызов API СДЭК для получения дат доставки
      // Пока генерируем даты на основе работы ПВЗ

      const dates: string[] = [];
      const intervals: string[] = ['09:00-18:00', '18:00-21:00'];

      // Генерируем даты на основе работы ПВЗ
      const today = new Date();
      for (let i = 1; i <= 5; i++) {
        const deliveryDate = new Date(today);
        deliveryDate.setDate(today.getDate() + i);

        const dayOfWeek = deliveryDate.getDay();
        // ПВЗ работают с понедельника по субботу
        if (dayOfWeek >= 1 && dayOfWeek <= 6) {
          dates.push(deliveryDate.toISOString().split('T')[0]);
        }
      }

      console.log('Generated delivery dates:', dates);
      return { dates, intervals };
    } catch (error) {
      console.error('Error getting CDEK delivery dates:', error);
      return { dates: [], intervals: [] };
    }
  }

  // Проверить доступность адреса для доставки СДЭК
  async checkAddressAvailability(address: string): Promise<boolean> {
    try {
      const deliveryPoints = await this.getDeliveryPoints(address);
      return deliveryPoints.length > 0;
    } catch (error) {
      console.error('Error checking address availability:', error);
      return false;
    }
  }

  // Получить список ПВЗ для выбора
  async getPVZList(address: string, options?: { city?: string, region?: string, postalCode?: string, country?: string, street?: string, house?: string }): Promise<{ pvzList: CDEKDeliveryPoint[], debugReason: { code: string, details: string, address?: string, coords?: { lat: number, lon: number }, geocoderInput?: string, geocoderResult?: string, geocoderCoords?: { lat: number, lon: number }, steps?: string[], geocodedPVZ?: string[], usedCoordsPVZ?: string[], city_code?: string, fias_guid?: string, pvzCount?: number } }> {
    const steps: string[] = [];
    let debugReason: { code: string, details: string, address?: string, coords?: { lat: number, lon: number }, geocoderInput?: string, geocoderResult?: string, geocoderCoords?: { lat: number, lon: number }, steps?: string[], geocodedPVZ?: string[], usedCoordsPVZ?: string[], city_code?: string, fias_guid?: string, pvzCount?: number } = { code: '', details: '' };
    let fullAddress = address;
    if (options) {
      const parts = [options.country, options.region, options.city, options.street, options.house, options.postalCode];
      fullAddress = parts.filter(Boolean).join(', ');
    }
    // 1. Получаем город, регион, индекс через Dadata
    let city = options?.city || '';
    let region = options?.region || '';
    let postalCode = options?.postalCode || '';
    let fiasGuid = '';
    try {
      const DADATA_API_KEY = process.env.DADATA_API_KEY;
      if (DADATA_API_KEY) {
        const response = await require('axios').post(
          'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address',
          { query: fullAddress, count: 1 },
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Token ${DADATA_API_KEY}`
            }
          }
        );
        const suggestions = response.data.suggestions;
        if (suggestions && suggestions.length > 0) {
          const data = suggestions[0].data;
          city = data.city || data.settlement_with_type || data.settlement || data.city_with_type || city;
          region = data.region_with_type || region;
          postalCode = data.postal_code || postalCode;
          fiasGuid = data.city_fias_id || data.fias_id || '';
        }
      }
    } catch (e) {
      steps.push('Ошибка при получении города/региона через Dadata');
    }
    // 2. Получаем city_code
    let cityCode = await this.getCityCodeByFields(city, region, postalCode) || undefined;
    debugReason.city_code = cityCode;
    debugReason.fias_guid = fiasGuid;
    steps.push(`city_code: ${cityCode}, fias_guid: ${fiasGuid}`);
    // 2.1 Если fias_guid не найден, пробуем получить через API СДЭК
    if (!fiasGuid && city && region) {
      try {
        const token = await this.getProdToken();
        const resp = await require('axios').get('https://api.cdek.ru/v2/location/cities', {
          headers: { Authorization: `Bearer ${token}` },
          params: { country_codes: 'RU', region: region, city: city }
        });
        if (resp.data && Array.isArray(resp.data) && resp.data.length > 0) {
          fiasGuid = resp.data[0].fias_guid || '';
          debugReason.fias_guid = fiasGuid;
          steps.push(`fias_guid найден через API СДЭК: ${fiasGuid}`);
        }
      } catch (e) {
        steps.push('Ошибка при поиске fias_guid через API СДЭК');
      }
    }
    let pvzList: CDEKDeliveryPoint[] = [];
    // 3. Если city_code найден — ищем ПВЗ только по нему и fias_guid (если есть)
    if (cityCode) {
      try {
        pvzList = await this.getPVZListByCityCode(cityCode, fiasGuid);
        steps.push(`Найдено ПВЗ по city_code: ${pvzList.length}`);
      } catch (e) {
        steps.push('Ошибка при поиске ПВЗ по city_code');
      }
    }
    // 4. Если не найдено — fallback на поиск по адресу
    if ((!pvzList || pvzList.length === 0) && fullAddress) {
      try {
        const response = await this.makeRequest('/deliverypoints', { address: fullAddress, type: 'PVZ' });
        if (response && Array.isArray(response) && response.length > 0) {
          pvzList = response;
          steps.push(`Найдено ПВЗ по адресу через API СДЭК: ${pvzList.length}`);
        } else {
          steps.push('ПВЗ по адресу через API СДЭК не найдено');
        }
      } catch (e) {
        steps.push('Ошибка при поиске ПВЗ по адресу через API СДЭК');
      }
    }
    if (!pvzList || pvzList.length === 0) {
      debugReason.code = 'NO_PVZ';
      debugReason.details = 'ПВЗ не найдены ни по city_code, ни по адресу';
      debugReason.steps = steps;
      return { pvzList: [], debugReason };
    }
    // 5. Для каждого ПВЗ ищем/дополняем координаты
    for (const pvz of pvzList) {
      if (!pvz.location.latitude || !pvz.location.longitude) {
        // ищем координаты в базе
        const dp = await DeliveryPoint.findOne({ code: pvz.code, latitude: { $ne: null }, longitude: { $ne: null } });
        if (dp) {
          pvz.location.latitude = dp.latitude;
          pvz.location.longitude = dp.longitude;
        } else {
          // ищем координаты через Dadata
          const coords = await this.getCoordinatesByAddress(pvz.location.address);
          if (coords) {
            pvz.location.latitude = coords.lat;
            pvz.location.longitude = coords.lon;
            // сохраняем в базу
            await DeliveryPoint.findOneAndUpdate(
              { code: pvz.code },
              { latitude: coords.lat, longitude: coords.lon },
              { upsert: true }
            );
          }
        }
      }
    }
    // 6. Получаем координаты введённого адреса
    let coords: { lat: number, lon: number } | null = null;
    coords = await this.getCoordinatesByAddress(fullAddress);
    debugReason.geocoderInput = fullAddress;
    debugReason.geocoderCoords = coords || undefined;
    // 7. Фильтруем ближайшие ПВЗ по радиусу
    let pvzByCoords10: CDEKDeliveryPoint[] = [];
    let pvzByCoords50: CDEKDeliveryPoint[] = [];
    if (coords) {
      pvzByCoords10 = filterPVZByRadius(coords, pvzList, 10);
      steps.push(`Найдено ПВЗ по координатам (10 км): ${pvzByCoords10.length}`);
      if (pvzByCoords10.length === 0) {
        pvzByCoords50 = filterPVZByRadius(coords, pvzList, 50);
        steps.push(`Найдено ПВЗ по координатам (50 км): ${pvzByCoords50.length}`);
      }
    } else {
      steps.push('Не удалось получить координаты введённого адреса');
    }
    // --- После фильтрации по радиусу ---
    // Выбираем ближайший массив ПВЗ (10 км, потом 50 км, иначе пустой)
    let nearestPVZ: CDEKDeliveryPoint[] = [];
    if (pvzByCoords10 && pvzByCoords10.length > 0) {
      nearestPVZ = pvzByCoords10;
    } else if (pvzByCoords50 && pvzByCoords50.length > 0) {
      nearestPVZ = pvzByCoords50;
    }
    return {
      pvzList: nearestPVZ,
      debugReason: {
        address: fullAddress,
        coords: coords ? coords : undefined,
        city_code: cityCode,
        fias_guid: fiasGuid,
        steps,
        pvzCount: nearestPVZ.length,
        details: nearestPVZ.length > 0 ? 'ПВЗ найдены по радиусу' : 'ПВЗ не найдены',
        code: nearestPVZ.length > 0 ? 'OK' : 'NO_PVZ'
      }
    };
  }

  // Получить информацию о конкретном ПВЗ по коду
  async getPVZByCode(code: string): Promise<CDEKDeliveryPoint | null> {
    try {
      console.log('Getting CDEK PVZ by code:', code);

      const response = await this.makeRequest('/deliverypoints', {
        code: code
      });

      if (response && Array.isArray(response) && response.length > 0) {
        return response[0];
      }

      return null;
    } catch (error) {
      console.error('Error getting CDEK PVZ by code:', error);
      return null;
    }
  }

  // Получение подсказок по городам (V2)
  async suggestCities(name: string, country_code?: string) {
    const token = await this.getProdToken();
    const params: any = { name };
    if (country_code) params.country_code = country_code;
    const response = await axios.get('https://api.cdek.ru/v2/location/suggest/cities', {
      headers: { Authorization: `Bearer ${token}` },
      params
    });
    return response.data;
  }

  // Оформление заказа (V2, с новыми полями)
  async createOrder(orderData: any) {
    const token = await this.getProdToken();
    const response = await axios.post('https://api.cdek.ru/v2/orders', orderData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }

  // Получить список ПВЗ по city_code и fias_guid
  async getPVZListByCityCode(cityCode: string, fiasGuid: string): Promise<CDEKDeliveryPoint[]> {
    try {
      // Формируем параметры запроса только с определёнными значениями
      const params: any = { type: 'PVZ' };
      if (cityCode) params.city_code = cityCode;
      if (fiasGuid && typeof fiasGuid === 'string' && fiasGuid.length > 0) params.fias_guid = fiasGuid;
      console.log('[CDEK DEBUG] getPVZListByCityCode params:', params);
      // Запрос к CDEK API с фильтрацией по city_code и fias_guid
      const response = await this.makeRequest('/deliverypoints', params);
      let pvzList: CDEKDeliveryPoint[] = [];
      if (response && Array.isArray(response)) {
        pvzList = response;
      }
      console.log('[CDEK DEBUG] getPVZListByCityCode result:', pvzList.length);
      return pvzList;
    } catch (error) {
      console.error('Error getting PVZ list by city_code/fias_guid:', error);
      return [];
    }
  }

  // Получить даты доставки по city_code и fias_guid
  async getCDEKDeliveryDatesByCityCode(cityCode: string, fiasGuid: string): Promise<{ dates: string[]; intervals: string[] }> {
    try {
      // Получаем ПВЗ для города
      const pvzList = await this.getPVZListByCityCode(cityCode, fiasGuid);
      if (!pvzList || pvzList.length === 0) {
        return { dates: [], intervals: [] };
      }
      // Генерируем даты доставки на ближайшие 5 дней (пример)
      const dates: string[] = [];
      const intervals: string[] = ['09:00-18:00', '18:00-21:00'];
      const today = new Date();
      for (let i = 1; i <= 5; i++) {
        const deliveryDate = new Date(today);
        deliveryDate.setDate(today.getDate() + i);
        const dayOfWeek = deliveryDate.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 6) {
          dates.push(deliveryDate.toISOString().split('T')[0]);
        }
      }
      return { dates, intervals };
    } catch (error) {
      console.error('Error getting delivery dates by city_code/fias_guid:', error);
      return { dates: [], intervals: [] };
    }
  }

  // Получить fias_guid через Dadata
  async getFiasGuid(address: string): Promise<string | undefined> {
    try {
      const DADATA_API_KEY = process.env.DADATA_API_KEY;
      if (!DADATA_API_KEY) {
        console.log('[CDEK] DADATA_API_KEY не настроен, пропускаем получение fias_guid');
        return undefined;
      }

      const response = await axios.post(
        'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address',
        { query: address, count: 1 },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Token ${DADATA_API_KEY}`
          }
        }
      );

      const suggestions = response.data.suggestions;
      if (suggestions && suggestions.length > 0) {
        const fiasGuid = suggestions[0].data.fias_id;
        console.log('[CDEK] Получен fias_guid:', fiasGuid);
        return fiasGuid;
      }

      return undefined;
    } catch (error) {
      console.error('[CDEK] Ошибка получения fias_guid:', error);
      return undefined;
    }
  }

  // Получить реальные сроки доставки от СДЭК
  async getCDEKDeliveryPeriods(address: string, fromAddress?: string, tariffCode?: number, options?: { postalCode?: string, city?: string, region?: string, code?: string, fias_guid?: string }): Promise<{
    periods: Array<{
      period_min: number;
      period_max: number;
      description: string;
    }>;
    intervals: string[];
  }> {
    fromAddress = fromAddress || 'Москва, Митино';
    tariffCode = tariffCode || 136;
    options = options || {};
    function extractCityName(addr: string): string {
      // Пример адреса: '677027, Россия, Республика Саха (Якутия), Якутск, ул. Короленко, 25'
      // Ищем город после региона, либо 3-4 элемент после split по запятой
      if (!addr) return '';
      const parts = addr.split(',').map(s => s.trim());
      // Ищем часть, которая не содержит "Россия", "Республика", "область", "край", "ул.", "просп.", "пер.", "д.", "корп.", "дом", "улица", "шоссе", "пр-т", "пл.", "г." и похожие
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (
          p &&
          !/^\d+$/.test(p) &&
          !/россия|республика|область|край|ул\.|улица|просп\.|пер\.|д\.|корп\.|дом|шоссе|пр-т|пл\.|г\./i.test(p) &&
          p.length > 2
        ) {
          // Если следующая часть начинается с 'ул.' — это точно город
          if (parts[i + 1] && /ул\.|улица|просп\.|шоссе|пл\.|пр-т/i.test(parts[i + 1])) {
            return p;
          }
          // Если это 3-4 элемент и он не похож на регион — тоже вероятно город
          if (i >= 2 && i <= 4) return p;
        }
      }
      // Фолбэк: берём 3-4 элемент
      return parts[3] || parts[2] || '';
    }
    function extractPostalCode(addr: string): string | undefined {
      if (!addr) return undefined;
      const match = addr.match(/^(\d{5,6})/);
      return match ? match[1] : undefined;
    }
    try {
      console.log('Getting CDEK delivery periods for address:', address);

      // Получаем координаты адреса
      const coords = await this.getCoordinatesByAddress(address);
      console.log('Coordinates result:', coords);
      if (!coords) {
        console.log('Could not get coordinates for address:', address);
        // Если нет ни code, ни fias_guid, ни postalCode — только тогда fallback
        if (!options.code && !options.fias_guid && !options.postalCode) {
          return {
            periods: [
              { period_min: 3, period_max: 5, description: '3-5 дней' },
              { period_min: 5, period_max: 7, description: '5-7 дней' },
              { period_min: 7, period_max: 10, description: '7-10 дней' }
            ],
            intervals: ['09:00-18:00', '18:00-21:00']
          };
        }
        // иначе продолжаем — делаем запрос к СДЭК
      }

      // Формируем строку для поиска: 'город, область' если оба есть для назначения
      const city = options.city;
      const region = options.region;
      // Получаем код города назначения
      const toCityCode = options.code || (city ? await this.getCityCode(city, region) : null);
      if (toCityCode) console.log('[CDEK] Найден code через API:', toCityCode);
      // Получаем fias_guid назначения
      let toFiasGuid = options.fias_guid;
      if (!toFiasGuid && city) {
        toFiasGuid = await this.getFiasGuid(region ? `${region}, ${city}` : city);
        if (toFiasGuid) console.log('[CDEK] Найден fias_guid через API:', toFiasGuid);
      }
      // Формируем строку для поиска: 'город, область' если оба есть для отправления
      let fromCity: string | undefined = undefined, fromRegion: string | undefined = undefined;
      let fromCityRegionString: string;
      if (fromAddress && typeof fromAddress === 'object') {
        const fa = fromAddress as any;
        fromCity = fa.city;
        fromRegion = fa.region;
        if (fromCity && fromRegion) {
          fromCityRegionString = `${fromCity}, ${fromRegion}`;
          console.log(`[CDEK] Поиск кода города отправления по строке: ${fromCityRegionString}`);
        } else {
          fromCityRegionString = fromCity || '';
        }
      } else {
        fromCityRegionString = String(fromAddress);
      }
      // Получаем код города отправления и назначения
      let fromCityCode = await this.getCityCode(fromCityRegionString);
      let fromFiasGuid = await this.getFiasGuid(fromCityRegionString);
      let fromPostalCode = extractPostalCode(String(fromAddress));
      const useMitino = fromCityRegionString.toLowerCase().includes('митино');
      if (useMitino) {
        fromCityCode = MITINO_FROM_CACHE.code;
        fromFiasGuid = MITINO_FROM_CACHE.fias_guid;
        fromPostalCode = MITINO_FROM_CACHE.postal_code;
        fromCityRegionString = MITINO_FROM_CACHE.address;
        console.log('[CDEK] Используем кэшированные значения для Митино:', MITINO_FROM_CACHE);
      } else {
        fromCityCode = await this.getCityCode(fromCityRegionString);
        if (fromCityCode) console.log('[CDEK] Найден код города отправления через API:', fromCityCode);
        fromFiasGuid = await this.getFiasGuid(fromCityRegionString);
        if (fromFiasGuid) console.log('[CDEK] Найден fias_guid отправления через API:', fromFiasGuid);
        fromPostalCode = extractPostalCode(String(fromAddress));
      }
      // Явно логируем итоговые значения для from_location
      console.log('[CDEK] Итоговые значения from_location:', {
        code: fromCityCode,
        fias_guid: fromFiasGuid,
        postal_code: fromPostalCode,
        address: fromCityRegionString
      });

      let fromKladrCode: string | undefined = undefined;
      let toKladrCode: string | undefined = undefined;
      try {
        const DADATA_API_KEY = process.env.DADATA_API_KEY;
        if (DADATA_API_KEY) {
          const axiosConfig = {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Token ${DADATA_API_KEY}`
            }
          };
          const fromResp = await axios.post('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', { query: String(fromAddress), count: 1 }, axiosConfig);
          if (fromResp.data.suggestions && fromResp.data.suggestions[0]?.data?.kladr_id) {
            fromKladrCode = fromResp.data.suggestions[0].data.kladr_id;
          }
          const toResp = await axios.post('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', { query: String(address), count: 1 }, axiosConfig);
          if (toResp.data.suggestions && toResp.data.suggestions[0]?.data?.kladr_id) {
            toKladrCode = toResp.data.suggestions[0].data.kladr_id;
          }
        }
      } catch (e) {
        console.error('Ошибка получения kladr_code через Dadata:', e);
      }

      console.log('From city code:', fromCityCode, 'To city code:', toCityCode, 'fromFiasGuid:', fromFiasGuid, 'toFiasGuid:', toFiasGuid, 'fromKladrCode:', fromKladrCode, 'toKladrCode:', toKladrCode);
      if (!fromCityCode || !toCityCode) {
        console.log('Could not get city codes for delivery');
        return {
          periods: [
            { period_min: 3, period_max: 5, description: '3-5 дней' },
            { period_min: 5, period_max: 7, description: '5-7 дней' },
            { period_min: 7, period_max: 10, description: '7-10 дней' }
          ],
          intervals: ['09:00-18:00', '18:00-21:00']
        };
      }

      console.log('CDEK getCDEKDeliveryPeriods options:', options);
      // --- Формируем from_location строго по документации ---
      let fromLocation;
      if (fromAddress && fromAddress.toLowerCase().includes('митино')) {
        fromLocation = {
          code: MITINO_FROM_CACHE.code,
          fias_guid: MITINO_FROM_CACHE.fias_guid,
          postal_code: MITINO_FROM_CACHE.postal_code,
          address: MITINO_FROM_CACHE.address,
        };
        console.log('[CDEK] from_location (Митино):', fromLocation);
      } else {
        // fallback: обычная логика для других городов
        fromLocation = {
          code: fromCityCode,
          fias_guid: fromFiasGuid,
          postal_code: fromPostalCode,
          address: fromCityRegionString,
        };
        console.log('[CDEK] from_location (fallback):', fromLocation);
      }

      // --- Формируем to_location строго по документации ---
      const toLocation = {
        code: toCityCode,
        fias_guid: toFiasGuid,
        postal_code: options?.postalCode,
        address: address,
      };
      console.log('[CDEK] to_location:', toLocation);

      // --- Запрос к API СДЭК ---
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 19) + '+0300';
      const developerKey = process.env.CDEK_DEVELOPER_KEY || 'ВАШ_КЛЮЧ';
      const tariffType = 1;
      const currency = 1;
      const lang = 'rus';
      const packages = [
        {
          weight: 1000, // 1 кг (заменить на реальный вес при необходимости)
          length: 20,
          width: 20,
          height: 10
        }
      ];
      console.log('[CDEK][DEBUG] Запрос к калькулятору тарифа СДЭК:', {
        url: `${CDEK_API_BASE_URL}/calculator/tariff`,
        body: {
          date: dateStr,
          type: tariffType,
          currency,
          lang,
          tariff_code: tariffCode,
          from_location: fromLocation,
          to_location: toLocation,
          services: [],
          packages,
          additional_order_types: [],
          developer_key: developerKey
        }
      });
      const token = await this.getProdToken();
      console.log('[CDEK][DEBUG] Получен токен:', !!token);
      const calculationResponse = await axios.post(`${CDEK_API_BASE_URL}/calculator/tariff`, {
        date: dateStr,
        type: tariffType,
        currency,
        lang,
        tariff_code: tariffCode,
        from_location: fromLocation,
        to_location: toLocation,
        services: [],
        packages,
        additional_order_types: [],
        developer_key: developerKey
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      console.log('[CDEK][DEBUG] Ответ от калькулятора тарифа СДЭК:', calculationResponse.data);

      if (calculationResponse.data && calculationResponse.data.delivery_sum) {
        // Прибавляем 2 дня к сроку доставки
        let { period_min, period_max } = calculationResponse.data;
        period_min = typeof period_min === 'number' ? period_min + 2 : period_min;
        period_max = typeof period_max === 'number' ? period_max + 2 : period_max;

        // Формируем описания периодов
        const periods = [];

        if (period_min === period_max) {
          periods.push({
            period_min,
            period_max,
            description: `${period_min} ${this.getDayWord(period_min)}`
          });
        } else {
          periods.push({
            period_min,
            period_max,
            description: `${period_min}-${period_max} ${this.getDayWord(period_max)}`
          });
        }

        // УДАЛЕНО: ручное добавление "экспресс"
        // if (period_min > 1) {
        //   periods.push({
        //     period_min: period_min - 1,
        //     period_max: period_min - 1,
        //     description: `Экспресс: ${period_min - 1} ${this.getDayWord(period_min - 1)}`
        //   });
        // }

        const intervals = ['09:00-18:00', '18:00-21:00'];

        console.log('CDEK delivery periods:', periods);
        console.log('[CDEK][DEBUG] Итоговые значения period_min, period_max, description:', periods);
        return { periods, intervals };
      }
      // Если есть массив periods, но нет delivery_sum — возвращаем средний период
      if (calculationResponse.data && calculationResponse.data.periods && Array.isArray(calculationResponse.data.periods) && calculationResponse.data.periods.length > 0) {
        const periodsArr = calculationResponse.data.periods;
        const midIdx = Math.floor(periodsArr.length / 2);
        const midPeriod = periodsArr[midIdx];
        return {
          periods: [midPeriod],
          intervals: calculationResponse.data.intervals || ['09:00-18:00', '18:00-21:00']
        };
      }

      // Fallback: если API не ответил, возвращаем стандартные сроки
      console.log('CDEK API did not respond, using fallback periods');
      return {
        periods: [
          { period_min: 3, period_max: 5, description: '3-5 дней' },
          { period_min: 5, period_max: 7, description: '5-7 дней' },
          { period_min: 7, period_max: 10, description: '7-10 дней' }
        ],
        intervals: ['09:00-18:00', '18:00-21:00']
      };

    } catch (error) {
      console.error('Error getting CDEK delivery periods:', error);

      // Fallback при ошибке
      return {
        periods: [
          { period_min: 3, period_max: 5, description: '3-5 дней' },
          { period_min: 5, period_max: 7, description: '5-7 дней' },
          { period_min: 7, period_max: 10, description: '7-10 дней' }
        ],
        intervals: ['09:00-18:00', '18:00-21:00']
      };
    }
  }

  // Вспомогательный метод для склонения слова "день"
  private getDayWord(days: number): string {
    if (days === 1) return 'день';
    if (days >= 2 && days <= 4) return 'дня';
    return 'дней';
  }

  // Получить координаты по адресу через Dadata (теперь как метод класса)
  public async getCoordinatesByAddress(address: string): Promise<{ lat: number, lon: number } | null> {
    try {
      const DADATA_API_KEY = process.env.DADATA_API_KEY;
      if (!DADATA_API_KEY) throw new Error('DADATA_API_KEY is not set');
      const response = await axios.post(
        'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address',
        { query: address, count: 1 },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Token ${DADATA_API_KEY}`
          }
        }
      );
      const suggestions = response.data.suggestions;
      if (suggestions && suggestions.length > 0) {
        const data = suggestions[0].data;
        if (data.geo_lat && data.geo_lon) {
          return { lat: parseFloat(data.geo_lat), lon: parseFloat(data.geo_lon) };
        }
      }
      return null;
    } catch (error) {
      console.error('Dadata geocode error:', error);
      return null;
    }
  }

  // Геокодирование адреса
  private async geocode(address: string): Promise<{ coords: { lat: number, lon: number }, address: string } | null> {
    try {
      const DADATA_API_KEY = process.env.DADATA_API_KEY;
      if (!DADATA_API_KEY) {
        console.log('[CDEK] DADATA_API_KEY не настроен, пропускаем геокодирование');
        return null;
      }
      const response = await axios.post(
        'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address',
        { query: address, count: 1 },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Token ${DADATA_API_KEY}`
          }
        }
      );
      const suggestions = response.data.suggestions;
      if (suggestions && suggestions.length > 0) {
        const data = suggestions[0].data;
        if (data.geo_lat && data.geo_lon) {
          return { coords: { lat: parseFloat(data.geo_lat), lon: parseFloat(data.geo_lon) }, address: data.address.value };
        }
      }
      return null;
    } catch (error) {
      console.error('Dadata geocode error:', error);
      return null;
    }
  }

  /**
   * Получить идентификатор города СДЭК по КЛАДР-коду через DaData
   * @param kladrId КЛАДР-код города (например, '5400000100000')
   * @returns cdek_id или null
   */
  public async getCdekCityIdByKladr(kladrId: string): Promise<string | null> {
    try {
      const DADATA_API_KEY = process.env.DADATA_API_KEY;
      if (!DADATA_API_KEY) throw new Error('DADATA_API_KEY is not set');
      const response = await axios.post(
        'https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/delivery',
        { query: kladrId },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Token ${DADATA_API_KEY}`
          }
        }
      );
      const suggestion = response.data.suggestions?.[0];
      return suggestion?.data?.cdek_id || null;
    } catch (error) {
      console.error('[CDEK] Ошибка получения cdek_id по КЛАДР:', error);
      return null;
    }
  }
}

const dadataToken = 'ecb97bfa1e55c60cd6b89567e51fee54a8747af3';
const coordsCache = new Map<string, { lat: number, lon: number }>();

export async function getCoordsByAddressDadata(address: string): Promise<{ lat: number, lon: number } | null> {
  if (coordsCache.has(address)) return coordsCache.get(address)!;
  const response = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Token ${dadataToken}`
    },
    body: JSON.stringify({ query: address, count: 1 })
  });
  const data = await response.json();
  if (data.suggestions && data.suggestions.length > 0) {
    const geo = data.suggestions[0].data.geo_lat && data.suggestions[0].data.geo_lon
      ? { lat: parseFloat(data.suggestions[0].data.geo_lat), lon: parseFloat(data.suggestions[0].data.geo_lon) }
      : null;
    if (geo) coordsCache.set(address, geo);
    return geo;
  }
  return null;
}

// Экземпляр класса для получения токена
const cdekServiceInstance = new CDEKService();

export { filterPVZByRadius, cdekServiceInstance };

// Тестовый запуск для проверки возврата периода доставки Москва — Новосибирск
if (require.main === module) {
  (async () => {
    const res = await (new CDEKService()).getCDEKDeliveryPeriods('630099, Россия, Новосибирск, ул. Ленина, 3', 'Москва, Митино', 137);
    console.log('Тест: Москва — Новосибирск:', res);
  })();
}