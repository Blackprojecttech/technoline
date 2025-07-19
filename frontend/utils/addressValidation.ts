// Утилита для проверки адресов доставки

// Список районов Москвы в пределах МКАД
const MOSCOW_MKAD_DISTRICTS = [
  'Центральный', 'Северный', 'Северо-Восточный', 'Восточный', 
  'Юго-Восточный', 'Южный', 'Юго-Западный', 'Западный', 
  'Северо-Западный', 'Зеленоградский'
];

// Список городов Подмосковья
const MOSCOW_REGION_CITIES = [
  'Балашиха', 'Подольск', 'Химки', 'Королёв', 'Мытищи', 'Люберцы',
  'Электросталь', 'Красногорск', 'Одинцово', 'Серпухов', 'Щёлково',
  'Домодедово', 'Раменское', 'Орехово-Зуево', 'Долгопрудный',
  'Реутов', 'Жуковский', 'Пушкино', 'Сергиев Посад', 'Видное',
  'Истра', 'Наро-Фоминск', 'Фрязино', 'Лобня', 'Дмитров',
  'Чехов', 'Солнечногорск', 'Воскресенск', 'Коломна', 'Егорьевск'
];

// Улицы и районы, которые точно находятся в пределах МКАД
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

// Улицы и районы, которые точно находятся за пределами МКАД
const DEFINITE_REGION_STREETS = [
  'пятницкое шоссе', 'новорижское шоссе', 'рублевское шоссе',
  'минское шоссе', 'киевское шоссе', 'калужское шоссе', 'воронежское шоссе',
  'рязанский проспект', 'волгоградский проспект', 'шоссе энтузиастов',
  'измайловское шоссе', 'щёлковское шоссе', 'открытое шоссе',
  'алтуфьевское шоссе', 'дмитровское шоссе', 'ленинградское шоссе',
  'волоколамское шоссе', 'новорижское шоссе', 'рублевское шоссе',
  'минское шоссе', 'киевское шоссе', 'калужское шоссе', 'воронежское шоссе'
];

// Ключевые слова для определения адреса в пределах МКАД
const MKAD_KEYWORDS = [
  'мкад', 'мкада', 'внутри мкад', 'в пределах мкад', 'москва',
  'г. москва', 'город москва', 'ул.', 'улица', 'проспект',
  'проезд', 'переулок', 'набережная', 'шоссе', 'площадь',
  'центр', 'центральный район', 'внутри города'
];

// Ключевые слова для определения адреса за пределами МКАД
const REGION_KEYWORDS = [
  'область', 'московская область', 'подмосковье', 'за мкад',
  'за пределами мкад', 'г.', 'город', 'поселок', 'деревня',
  'село', 'дачный поселок', 'садовое товарищество', 'за городом',
  'подмосковье', 'область'
];

// Районы Москвы, которые находятся за пределами МКАД
const MOSCOW_REGION_DISTRICTS = [
  'новомосковский', 'троицкий', 'зеленоградский'
];

// --- Новый способ: определение по координатам ---
// Заготовка для полигонов МКАД и ЦКАД (координаты нужно будет заполнить)
const MKAD_POLYGON: [number, number][] = [
  [37.429135296547685, 55.87768879249495],
  [37.39811630102855, 55.86086944668534],
  [37.374063456139396, 55.78784261046073],
  [37.37713854237478, 55.72591442065581],
  [37.42013171638146, 55.68308385976371],
  [37.48916611044842, 55.61601896961733],
  [37.59016048777903, 55.57806010602485],
  [37.69619926251991, 55.57465059212177],
  [37.84133779515, 55.65653889541778],
  [37.83136278573093, 55.69602916226603],
  [37.840329988900095, 55.77321267711292],
  [37.83426787252131, 55.82718609924706],
  [37.714245882220666, 55.888404717132204],
  [37.61918454922102, 55.90072514825661],
  [37.543148258082766, 55.90964021323887],
  [37.456142855388464, 55.882167572530165],
  [37.43213456805347, 55.87825163588144],
  [37.429135296547685, 55.87768879249495] // замыкаем полигон
];

export const CKAD_POLYGON: [number, number][] = [
  [37.618584012361794, 56.14105296598431],
  [37.55047688973808, 56.13917002590203],
  [37.48304543027079, 56.13353988954438],
  [37.41695800294135, 56.12421840658823],
  [37.352868491382836, 56.111297989400626],
  [37.29140930622912, 56.094906617388176],
  [37.233184696649076, 56.07520646281467],
  [37.178764449692764, 56.05239215723871],
  [37.12867805714836, 56.026688722395264],
  [37.08340941914049, 55.998349193468975],
  [37.04339214209341, 55.9676519662023],
  [37.00900547636059, 55.934897902103096],
  [36.9805709262145, 55.90040722813588],
  [36.958349552406716, 55.86451626869879],
  [36.94253997552165, 55.82757404842588],
  [36.93327707717931, 55.78993880445164],
  [36.930631386053506, 55.751974446288514],
  [36.93460912685282, 55.714047000467794],
  [36.9451529029868, 55.676521075654904],
  [36.9621429776611, 55.639756382152754],
  [36.985399113609134, 55.60410433763221],
  [37.014682928509934, 55.569904788653055],
  [37.04970072125928, 55.53748287513575],
  [37.090106723511106, 55.507146062475734],
  [37.13550673112649, 55.47918136351536],
  [37.185462071176914, 55.45385277014748],
  [37.239493861764345, 55.43139891195483],
  [37.29708752395826, 55.41203095701699],
  [37.35769750743507, 55.39593076785544],
  [37.42075219377554, 55.38324932344723],
  [37.48565894368536, 55.374105416315594],
  [37.55180925652512, 55.36858463189597],
  [37.618584012361794, 55.36673861566574],
  [37.68535876819846, 55.36858463189597],
  [37.75150908103823, 55.374105416315594],
  [37.816415830948046, 55.38324932344723],
  [37.87947051728851, 55.39593076785544],
  [37.940080500765326, 55.41203095701699],
  [37.99767416295924, 55.43139891195483],
  [38.051705953546666, 55.45385277014748],
  [38.10166129359709, 55.47918136351536],
  [38.14706130121248, 55.507146062475734],
  [38.18746730346431, 55.53748287513575],
  [38.22248509621365, 55.569904788653055],
  [38.251768911114446, 55.60410433763221],
  [38.27502504706248, 55.639756382152754],
  [38.29201512173679, 55.676521075654904],
  [38.30255889787076, 55.714047000467794],
  [38.30653663867008, 55.751974446288514],
  [38.30389094754427, 55.78993880445164],
  [38.29462804920194, 55.82757404842588],
  [38.278818472316864, 55.86451626869879],
  [38.25659709850908, 55.90040722813588],
  [38.228162548362995, 55.934897902103096],
  [38.19377588263018, 55.9676519662023],
  [38.1537586055831, 55.998349193468975],
  [38.108489967575224, 56.026688722395264],
  [38.05840357503082, 56.05239215723871],
  [38.00398332807451, 56.07520646281467],
  [37.94575871849446, 56.094906617388176],
  [37.884299533340744, 56.111297989400626],
  [37.82021002178224, 56.12421840658823],
  [37.754122594452795, 56.13353988954438],
  [37.68669113498551, 56.13917002590203],
  [37.618584012361794, 56.14105296598431]
];

// Проверка, находится ли точка внутри полигона
function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  let x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    let xi = polygon[i][0], yi = polygon[i][1];
    let xj = polygon[j][0], yj = polygon[j][1];
    let intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi + 0.0000001) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Получение координат через Dadata (пример асинхронной функции)
export async function getCoordsByAddress(address: string): Promise<[number, number] | null> {
  const resp = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': 'Token ecb97bfa1e55c60cd6b89567e51fee54a8747af3'
    },
    body: JSON.stringify({ query: address, count: 1 })
  });
  const data = await resp.json();
  if (data.suggestions && data.suggestions[0] && data.suggestions[0].data.geo_lat && data.suggestions[0].data.geo_lon) {
    // Исправлено: возвращаем [долгота, широта]
    return [parseFloat(data.suggestions[0].data.geo_lon), parseFloat(data.suggestions[0].data.geo_lat)];
  }
  return null;
}

// Основная функция: определяет зону по координатам
export async function getDeliveryZoneByAddress(address: string): Promise<'mkad' | 'ckad' | 'region' | 'unknown'> {
  const coords = await getCoordsByAddress(address);
  if (!coords) return 'unknown';
  if (isPointInPolygon(coords, MKAD_POLYGON)) return 'mkad';
  if (isPointInPolygon(coords, CKAD_POLYGON)) return 'ckad';
  return 'region';
}

export interface AddressValidationResult {
  isValid: boolean;
  type: 'moscow_mkad' | 'moscow_region' | 'unknown';
  message: string;
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
  
  // Проверяем районы Москвы
  if (MOSCOW_REGION_DISTRICTS.some(district => normalizedAddress.includes(district))) {
    return 'moscow_region';
  }
  
  return 'unknown';
}

/**
 * Проверяет адрес на соответствие типу доставки
 */
export function validateDeliveryAddress(
  address: string, 
  city: string = '',
  state: string = '',
  validationType: 'moscow_mkad' | 'moscow_region'
): AddressValidationResult {
  if (!address || address.trim().length === 0) {
    return {
      isValid: false,
      type: 'unknown',
      message: 'Адрес не может быть пустым'
    };
  }

  const normalizedAddress = address.toLowerCase().trim();
  const normalizedCity = city.toLowerCase().trim();
  const normalizedState = state.toLowerCase().trim();

  // Сначала проверяем конкретное расположение адреса
  const addressLocation = checkAddressLocation(address);
  
  if (addressLocation !== 'unknown') {
    if (validationType === 'moscow_mkad') {
      if (addressLocation === 'moscow_region') {
        return {
          isValid: false,
          type: 'moscow_region',
          message: 'Этот адрес находится за пределами МКАД. Выберите метод доставки "За пределами МКАД"'
        };
      } else {
        return {
          isValid: true,
          type: 'moscow_mkad',
          message: 'Адрес подходит для доставки в пределах МКАД'
        };
      }
    } else {
      if (addressLocation === 'moscow_mkad') {
        return {
          isValid: false,
          type: 'moscow_mkad',
          message: 'Этот адрес находится в пределах МКАД. Выберите метод доставки "В пределах МКАД"'
        };
      } else {
        return {
          isValid: true,
          type: 'moscow_region',
          message: 'Адрес подходит для доставки за пределами МКАД'
        };
      }
    }
  }

  // Если не удалось определить по адресу, проверяем город и область
  const isMoscowCity = normalizedCity.includes('москва') || normalizedCity === 'москва';
  const isMoscowRegion = normalizedState.includes('московская') || 
                         normalizedState.includes('область') || 
                         normalizedState.includes('подмосковье');

  // Проверяем ключевые слова в адресе
  const hasMkadKeywords = MKAD_KEYWORDS.some(keyword => 
    normalizedAddress.includes(keyword)
  );
  
  const hasRegionKeywords = REGION_KEYWORDS.some(keyword => 
    normalizedAddress.includes(keyword)
  );

  // Проверяем районы Москвы
  const hasMoscowDistrict = MOSCOW_MKAD_DISTRICTS.some(district => 
    normalizedAddress.includes(district.toLowerCase())
  );

  // Проверяем города Подмосковья
  const hasRegionCity = MOSCOW_REGION_CITIES.some(city => 
    normalizedAddress.includes(city.toLowerCase()) || 
    normalizedCity.includes(city.toLowerCase())
  );

  // Определяем тип адреса на основе всех данных
  let addressType: 'moscow_mkad' | 'moscow_region' | 'unknown' = 'unknown';

  // Если указан город Москва или есть ключевые слова МКАД
  if (isMoscowCity || hasMkadKeywords || hasMoscowDistrict) {
    addressType = 'moscow_mkad';
  }
  // Если указана Московская область или город Подмосковья
  else if (isMoscowRegion || hasRegionCity || hasRegionKeywords) {
    addressType = 'moscow_region';
  }
  // Удалено: else if (hasM... и всё, что идёт после
  // Возвращаем корректный объект результата
      return {
    isValid: addressType !== 'unknown',
    type: addressType,
    message: addressType === 'moscow_mkad'
      ? 'Адрес подходит для доставки в пределах МКАД'
      : addressType === 'moscow_region'
        ? 'Адрес подходит для доставки за пределами МКАД'
        : 'Не удалось определить тип адреса'
    };
} 