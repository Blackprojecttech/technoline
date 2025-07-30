'use client';

import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/layout/Layout';
import { Truck, MapPin, Clock, Info, ArrowRight, Circle, Package, AlertCircle, Calculator, Store, Navigation, Phone } from 'lucide-react';
import { useDeliveryMethods } from '@/hooks/useDeliveryMethods';
import { getDeliveryZoneByAddress } from '@/utils/addressValidation';

interface DeliveryCalculation {
  zone: 'mkad' | 'ckad' | 'region' | 'unknown';
  deliveryMethods: any[];
  totalCost: number;
  estimatedTime: string;
  zoneName?: string; // Добавляем для отображения названия зоны
  zoneKey?: string; // Добавляем для отображения ключа зоны
  cdekPVZList?: any[]; // <--- Добавлено для поддержки списка ПВЗ СДЭК
  cdekDeliveryDates?: string[]; // <--- Добавлено для поддержки дат доставки СДЭК
}

async function getCdekExpectedDeliveryDate(pvzData: any): Promise<string | null> {
  try {
    const region = pvzData.region || pvzData.location?.region;
    const city = pvzData.city || pvzData.location?.city;
    const city_code = pvzData.city_code || pvzData.location?.city_code;
    const fias_guid = pvzData.fias_guid || pvzData.location?.fias_guid;
    const address = pvzData.address_full || pvzData.address || pvzData.location?.address;
    if (!region || !city || !city_code) return null;
    const params = new URLSearchParams();
    params.append('region', region);
    params.append('city', city);
    params.append('city_code', String(city_code));
    if (fias_guid) params.append('fias_guid', fias_guid);
    params.append('address', address);
    params.append('from_address', 'Москва, Митино, ул. Митинская, д. 1');
    params.append('from_city_code', '44');
    params.append('from_fias_guid', 'c2deb16a-0330-4f05-821f-1d09c93331e6');
    params.append('from_postal_code', '125222');
    params.append('tariff_code', '136');
    const res = await fetch(`/api/cdek/delivery-dates?${params.toString()}`);
    const data = await res.json();
    if (data && data.periods && data.periods.length > 0 && data.periods[0].period_min) {
      const days = Number(data.periods[0].period_min) + 2;
      const today = new Date();
      today.setDate(today.getDate() + days);
      return today.toISOString().split('T')[0];
    } else if (data && data.dates && data.dates.length > 0) {
      return data.dates[0];
    } else {
      return null;
    }
  } catch (e) {
    return null;
  }
}

export default function DeliveryPage() {
  const { deliveryMethods, loading: methodsLoading } = useDeliveryMethods();
  const [address, setAddress] = useState('');
  const [orderValue, setOrderValue] = useState('');
  const [calculation, setCalculation] = useState<DeliveryCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addressZone, setAddressZone] = useState<'mkad' | 'ckad' | 'region' | 'unknown' | null>(null);
  
  // Состояние для подсказок Dadata
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);

  // Новое состояние для выбранного варианта и интервала доставки
  const [selectedMethodIndex, setSelectedMethodIndex] = useState<number | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<string>('');

  // Новое состояние для выбранного ПВЗ и даты для СДЭК
  const [selectedCdekPVZ, setSelectedCdekPVZ] = useState<any>(null);
  const [cdekPVZList, setCdekPVZList] = useState<any[]>([]);
  const [cdekPVZLoading, setCdekPVZLoading] = useState(false);
  const [cdekDeliveryDate, setCdekDeliveryDate] = useState<string>('');
  const [cdekPVZError, setCdekPVZError] = useState<string | null>(null);
  const cdekPVZRequestRef = useRef(0);

  // Новое состояние для координат адреса
  const [addressCoords, setAddressCoords] = useState<{ lat: number, lng: number } | null>(null);

  // Удаляем mkadIntervals, теперь интервалы только из метода доставки

  // Функция для получения подсказок Dadata
  const fetchAddressSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setAddressSuggestions([]);
      return;
    }
    try {
      const encodedQuery = encodeURIComponent(query);
      const res = await fetch(`/api/addresses/search?q=${encodedQuery}`);
      const data = await res.json();
      return data.suggestions || [];
    } catch (e) {
      console.error('Ошибка получения подсказок Dadata:', e);
      return [];
    }
  };

  // Обработчик ввода адреса с подсказками
  const handleAddressInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddress(value);
    
    if (value.length === 0) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      setAddressZone(null);
      setCalculation(null); // Сбрасываем расчет при очистке адреса
      return;
    }
    
    if (value.length >= 3) {
      setAddressLoading(true);
      try {
        const suggestions = await fetchAddressSuggestions(value);
        setAddressSuggestions(suggestions || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
        setAddressSuggestions([]);
      } finally {
        setAddressLoading(false);
      }
    } else {
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Обработчик клика по подсказке
  const handleSuggestionClick = (suggestion: any) => {
    setAddress(suggestion.value || '');
    setShowSuggestions(false);
    setCalculation(null); // Сбрасываем расчет при выборе нового адреса
  };

  // Определяем зону при вводе адреса
  useEffect(() => {
    const determineZone = async () => {
      if (address.length > 10) {
        const zone = await getDeliveryZoneByAddress(address);
        setAddressZone(zone);
        setCalculation(null); // Сбрасываем расчет при изменении зоны
      } else {
        setAddressZone(null);
      }
    };

    const timeoutId = setTimeout(determineZone, 1000);
    return () => clearTimeout(timeoutId);
  }, [address]);

  // Проверяем, нужна ли стоимость заказа для расчета
  const needsOrderValue = addressZone === 'region' || addressZone === 'unknown';

  const handleCalculate = async () => {
    if (!address.trim()) {
      setError('Введите адрес доставки');
      return;
    }

    // Проверяем стоимость заказа только для СДЭК
    if (needsOrderValue && (!orderValue || parseFloat(orderValue) <= 0)) {
      setError('Для расчета доставки СДЭК необходимо указать стоимость заказа');
      return;
    }

    setError('');
    setLoading(true);
    setCalculation(null);
    setSelectedCdekPVZ(null);

    try {
      // Получаем координаты адреса
      const coordsResponse = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Token ecb97bfa1e55c60cd6b89567e51fee54a8747af3'
        },
        body: JSON.stringify({ query: address, count: 1 })
      });

      const coordsData = await coordsResponse.json();
      if (!coordsData.suggestions || !coordsData.suggestions[0]) {
        throw new Error('Не удалось определить координаты адреса');
      }

      const suggestion = coordsData.suggestions[0];
      const lat = parseFloat(suggestion.data.geo_lat);
      const lng = parseFloat(suggestion.data.geo_lon);
      
      // Определяем зону доставки
      const zone = await getDeliveryZoneByAddress(address);
      setAddressZone(zone);
      
      if (zone !== 'mkad') {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/delivery/calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            address, 
            lat, 
            lng,
            orderValue: needsOrderValue ? parseFloat(orderValue) : undefined
          })
        });
      
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Ошибка при расчете доставки');
        }
      
        // Фильтруем методы по addressValidationType
        let availableMethods = data.deliveryMethods?.filter((method: any) => {
          if (method.type === 'cdek' || method.name.toLowerCase().includes('сдэк')) {
            return zone === 'region';
          }
          if (zone === 'ckad') {
            return method.addressValidationType === 'moscow_region' && method.available;
          }
          if (zone === 'region') {
            return method.addressValidationType === 'region' && method.available;
          }
          if (zone === 'unknown') {
            return method.available;
          }
          return false;
        }) || [];
      
        // Стоимость для каждого метода — zonePrices[zoneKey]
        const totalCost = availableMethods.reduce((sum: number, method: any) => {
          if (method.zonePrices && data.zoneKey) {
            if (method.zonePrices[data.zoneKey] !== undefined) {
              return sum + method.zonePrices[data.zoneKey];
            } else {
              setError('Ошибка: нет цены для этой зоны (' + data.zoneKey + ') в методе ' + method.name);
              return sum;
            }
          }
          // Для не-зональных методов (например, СДЭК)
          return sum + (method.fixedCost ?? method.price ?? 0);
        }, 0);
      
        setCalculation({
          zone: data.zone || zone,
          deliveryMethods: availableMethods,
          totalCost,
          estimatedTime: zone === 'ckad' ? '2-4 часа' : '1-3 дня',
          zoneName: data.zoneName || '',
          zoneKey: data.zoneKey || '',
          cdekPVZList: data.cdekPVZList || [],
          cdekDeliveryDates: data.cdekDeliveryDates || [],
        });
        setLoading(false);
        return;
      }
      
      // Для mkad — фильтруем только по addressValidationType === 'moscow_mkad'
      const filteredMethods = deliveryMethods.filter((method: any) => method.addressValidationType === 'moscow_mkad');
      setCalculation({
        zone,
        deliveryMethods: filteredMethods,
        totalCost: 0,
        estimatedTime: '1-2 часа',
        zoneName: '',
        zoneKey: '',
      });
      setLoading(false);
      return;

      // --- Только для region делаем запрос на /delivery/calculate и ПВЗ ---
      if (zone !== 'region') {
        setCalculation({
          zone,
          deliveryMethods: [],
          totalCost: 0,
          estimatedTime: zone === 'mkad' ? '1-2 часа' : zone === 'ckad' ? '2-4 часа' : '1-3 дня',
          zoneName: '',
          zoneKey: '',
        });
        setLoading(false);
        return;
      }

      // Рассчитываем доставку и ПВЗ только для region
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/delivery/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          address, 
          lat, 
          lng,
          orderValue: needsOrderValue ? parseFloat(orderValue) : undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Ошибка при расчете доставки');
      }

      // Фильтруем методы доставки по зоне
      const availableMethods = data.deliveryMethods?.filter((method: any) => {
        if (method.type === 'cdek' || method.name.toLowerCase().includes('сдэк')) {
          return zone === 'region';
        }
        return method.available;
      }) || [];

      const totalCost = availableMethods.reduce((sum: number, method: any) => {
        if (method.zonePrices && data.zoneKey) {
          return sum + (method.zonePrices[data.zoneKey] || 0);
        }
        return sum + (method.fixedCost || 0);
      }, 0);

      setCalculation({
        zone: data.zone || 'unknown',
        deliveryMethods: availableMethods,
        totalCost,
        estimatedTime: '1-3 дня',
        zoneName: data.zoneName || '',
        zoneKey: data.zoneKey || '',
        cdekPVZList: data.cdekPVZList || [],
        cdekDeliveryDates: data.cdekDeliveryDates || [],
      });
    } catch (err: any) {
      setError(err.message || 'Ошибка при расчете доставки');
    } finally {
      setLoading(false);
    }
  };

  // Реальный поиск ПВЗ СДЭК через backend
  const fetchCdekPVZ = async (address: string, coords?: { lat: number, lng: number }) => {
    setCdekPVZLoading(true);
    setCdekPVZList([]);
    setSelectedCdekPVZ(null);
    setCdekDeliveryDate('');
    setCdekPVZError(null);
    cdekPVZRequestRef.current += 1;
    const thisRequest = cdekPVZRequestRef.current;
    try {
      // Формируем параметры для запроса
      const params = new URLSearchParams();
      params.append('address', address);
      if (coords) {
        params.append('lat', String(coords.lat));
        params.append('lng', String(coords.lng));
      }
      // Можно попытаться извлечь город/регион из адреса (или использовать Dadata)
      // Для простоты пока только address
      const res = await fetch(`/api/cdek/pvz-list?${params.toString()}`);
      const data = await res.json();
      if (thisRequest !== cdekPVZRequestRef.current) return; // отменяем устаревший запрос
      let pvzList = Array.isArray(data.pvzList) ? data.pvzList : (Array.isArray(data) ? data : []);
      setCdekPVZList(pvzList);
      setCdekPVZError((pvzList.length === 0) ? 'Пункты выдачи не найдены.' : null);
    } catch (e: any) {
      setCdekPVZError(e.message || 'Ошибка поиска ПВЗ');
    } finally {
      setCdekPVZLoading(false);
    }
  };

  // После выбора ПВЗ — получаем сроки доставки через backend
  const fetchCdekDeliveryDate = async (pvz: any) => {
    setCdekDeliveryDate('');
    if (!pvz) return;
    try {
      const params = new URLSearchParams();
      params.append('address', pvz.city || pvz.location?.city || '');
      params.append('from_address', 'Москва, Митино');
      params.append('tariff_code', '136');
      if (pvz.city_code) params.append('city_code', String(pvz.city_code));
      if (pvz.fias_guid) params.append('fias_guid', pvz.fias_guid);
      if (pvz.region) params.append('region', pvz.region);
      const res = await fetch(`/api/cdek/delivery-dates?${params.toString()}`);
      const data = await res.json();
      if (data && data.dates && data.dates.length > 0) {
        setCdekDeliveryDate(data.dates[0]);
      } else if (data && data.periods && data.periods.length > 0) {
        const minPeriod = data.periods[0];
        if (minPeriod && minPeriod.period_min) {
          const today = new Date();
          today.setDate(today.getDate() + minPeriod.period_min);
          setCdekDeliveryDate(today.toISOString().split('T')[0]);
        }
      } else {
        setCdekDeliveryDate('');
      }
    } catch (e) {
      setCdekDeliveryDate('');
    }
  };

  // Новый useEffect: при выборе ПВЗ делаем запрос к /api/cdek/delivery-dates
  useEffect(() => {
    const fetchDeliveryDateForPVZ = async () => {
      if (!selectedCdekPVZ) return;
      // Определяем параметры для запроса
      const region = selectedCdekPVZ.region || selectedCdekPVZ.location?.region;
      const city = selectedCdekPVZ.city || selectedCdekPVZ.location?.city;
      const city_code = selectedCdekPVZ.city_code || selectedCdekPVZ.location?.city_code;
      const fias_guid = selectedCdekPVZ.fias_guid || selectedCdekPVZ.location?.fias_guid;
      const address = selectedCdekPVZ.address || selectedCdekPVZ.location?.address;
      if (!region || !city || !city_code) return;
      const params = new URLSearchParams();
      params.append('region', region);
      params.append('city', city);
      params.append('city_code', String(city_code));
      if (fias_guid) params.append('fias_guid', fias_guid);
      params.append('address', address);
      // --- Вшиваем параметры отправления как в форме заказа ---
      params.append('from_address', 'Москва, Митино, ул. Митинская, д. 1');
      params.append('from_city_code', '44');
      params.append('from_fias_guid', 'c2deb16a-0330-4f05-821f-1d09c93331e6');
      params.append('from_postal_code', '125222');
      params.append('tariff_code', '136');
      try {
        const res = await fetch(`/api/cdek/delivery-dates?${params.toString()}`);
        const data = await res.json();
        let deliveryDate = '';
        if (data && data.periods && data.periods.length > 0 && data.periods[0].period_min) {
          const days = Number(data.periods[0].period_min) + 2;
          const today = new Date();
          today.setDate(today.getDate() + days);
          deliveryDate = today.toISOString().split('T')[0];
        }
        // Обновляем selectedCdekPVZ с новой датой
        setSelectedCdekPVZ((prev: any) => prev ? { ...prev, deliveryDate } : prev);
      } catch (e) {
        // Не удалось получить дату
        setSelectedCdekPVZ((prev: any) => prev ? { ...prev, deliveryDate: '' } : prev);
      }
    };
    fetchDeliveryDateForPVZ();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCdekPVZ?.code]);

  const getZoneInfo = (zone: string) => {
    switch (zone) {
      case 'mkad':
        return { name: 'В пределах МКАД', color: 'text-green-600', bg: 'bg-green-50' };
      case 'ckad':
        return { name: 'Между МКАД и ЦКАД', color: 'text-blue-600', bg: 'bg-blue-50' };
      case 'region':
        return { name: 'За пределами ЦКАД', color: 'text-orange-600', bg: 'bg-orange-50' };
      default:
        return { name: 'Не определено', color: 'text-gray-600', bg: 'bg-gray-50' };
    }
  };

  // --- Вынесенные блоки ---
  const PickupBlock = (
    <div className="mt-12 bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
      {/* Самовывоз из магазина */}
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Store className="w-6 h-6 text-primary-600" />
        Самовывоз из магазина
      </h2>
      
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Адрес и контакты */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Наш пункт самовывоза</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Москва, Пятницкое шоссе, 18</p>
                <p className="text-gray-600">Павильон 73, 1 этаж, 3 вход, прямо до конца, возле Mix Bar</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Телефон</p>
                <p className="text-gray-600">+7 (499) 322-33-86</p>
                <button
                  className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow hover:bg-primary-700 transition-all"
                  onClick={() => window.open && window.open('tel:+74993223386')}
                >
                  Перезвоните мне
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Время работы</p>
                <div className="text-gray-600">
                  <p>Ежедневно: 10:00 - 19:00</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Как добраться */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Как добраться</h3>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                На метро
              </h4>
              <p className="text-blue-700 text-sm">
                Станция метро <b>Волоколамская</b> (Арбатско-Покровская линия). 
                Выход к Пятницкому шоссе. Далее 3 минуты пешком до входа №3, пройти прямо до конца, павильон 73, рядом с Mix Bar.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                <Truck className="w-4 h-4" />
                На автомобиле
              </h4>
              <p className="text-green-700 text-sm">
                Заезд с Пятницкого шоссе, парковка на территории рынка бесплатная. Ориентир — вход №3, павильон 73.
              </p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                На автобусе
              </h4>
              <p className="text-orange-700 text-sm">
                Автобусы № 400, 400т, 210, 210к до остановки "Волоколамская" или "Пятницкое шоссе, 18".
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Преимущества самовывоза */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Преимущества самовывоза</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary-600 mb-2">0 ₽</div>
            <p className="text-sm text-gray-600">Бесплатно</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary-600 mb-2">Сразу</div>
            <p className="text-sm text-gray-600">Получите заказ сразу</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary-600 mb-2">Проверка</div>
            <p className="text-sm text-gray-600">Проверьте товар при получении</p>
          </div>
        </div>
      </div>
    </div>
  );
  const CdekBlock = (
    <div className="mt-8 bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
      {/* Доставка СДЭК */}
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Package className="w-6 h-6 text-primary-600" />
        Доставка СДЭК
      </h2>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Когда используется СДЭК</h3>
          <div className="space-y-3 text-gray-600">
            <div className="flex items-start gap-3">
              <Circle className="w-2 h-2 mt-2 text-primary-600 flex-shrink-0" />
              <p>Только для адресов <strong>за пределами МКАД и ЦКАД</strong></p>
            </div>
            <div className="flex items-start gap-3">
              <Circle className="w-2 h-2 mt-2 text-primary-600 flex-shrink-0" />
              <p>Доставка по всей России</p>
            </div>
            <div className="flex items-start gap-3">
              <Circle className="w-2 h-2 mt-2 text-primary-600 flex-shrink-0" />
              <p>Стоимость зависит от веса и стоимости заказа</p>
            </div>
            <div className="flex items-start gap-3">
              <Circle className="w-2 h-2 mt-2 text-primary-600 flex-shrink-0" />
              <p>Срок доставки: 1-3 дня</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ограничения по габаритам</h3>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-yellow-800 mb-2">Стандартные габариты:</p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Вес: до 2 кг</li>
                  <li>• Размеры: 20×20×20 см</li>
                </ul>
                <p className="text-sm text-yellow-700 mt-2">
                  <strong>Если ваш заказ превышает эти параметры, свяжитесь с оператором для уточнения стоимости.</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  const ZonesBlock = (
    <div className="mt-8 bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
      {/* Зоны доставки */}
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <MapPin className="w-6 h-6 text-primary-600" />
        Зоны доставки
      </h2>
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-2">В пределах МКАД</h3>
          <p className="text-green-700 text-sm">Быстрая доставка курьером по Москве в пределах МКАД</p>
          <p className="text-green-600 text-xs mt-2">Срок: 1-2 часа</p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Между МКАД и ЦКАД</h3>
          <p className="text-blue-700 text-sm">Доставка в ближайшее Подмосковье между МКАД и ЦКАД</p>
          <p className="text-blue-600 text-xs mt-2">Срок: 2-4 часа</p>
        </div>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-orange-800 mb-2">За пределами ЦКАД</h3>
          <p className="text-orange-700 text-sm">Доставка СДЭК по всей России за пределами ЦКАД</p>
          <p className="text-orange-600 text-xs mt-2">Срок: 1-3 дня</p>
        </div>
      </div>
    </div>
  );
  function renderBlocks() {
    if (!calculation) {
      // --- Исправлено: всегда показываем Самовывоз при первом заходе ---
      return (<>{PickupBlock}</>);
    }
    if (calculation.zone === 'mkad') {
      return (<>{PickupBlock}{CdekBlock}{ZonesBlock}</>);
    }
    // Для регионов и ckad
    return (<>{CdekBlock}{PickupBlock}{ZonesBlock}</>);
  }

  // --- Информационный блок Самовывоз, всегда внизу страницы ---
  const PickupInfoBlock = (
    <div className="mt-12 bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Store className="w-6 h-6 text-primary-600" />
        Самовывоз из магазина
      </h2>
      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Наш пункт самовывоза</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Москва, Пятницкое шоссе, 18</p>
                <p className="text-gray-600">Павильон 73, 1 этаж, 3 вход, прямо до конца, возле Mix Bar</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Телефон</p>
                <p className="text-gray-600">+7 (499) 322-33-86</p>
                <button
                  className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow hover:bg-primary-700 transition-all"
                  onClick={() => window.open && window.open('tel:+74993223386')}
                >
                  Перезвоните мне
                </button>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Время работы</p>
                <div className="text-gray-600">
                  <p>Ежедневно: 10:00 - 19:00</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Как добраться</h3>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                На метро
              </h4>
              <p className="text-blue-700 text-sm">
                Станция метро <b>Волоколамская</b> (Арбатско-Покровская линия). 
                Выход к Пятницкому шоссе. Далее 3 минуты пешком до входа №3, пройти прямо до конца, павильон 73, рядом с Mix Bar.
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                <Truck className="w-4 h-4" />
                На автомобиле
              </h4>
              <p className="text-green-700 text-sm">
                Заезд с Пятницкого шоссе, парковка на территории рынка бесплатная. Ориентир — вход №3, павильон 73.
              </p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                На автобусе
              </h4>
              <p className="text-orange-700 text-sm">
                Автобусы № 400, 400т, 210, 210к до остановки "Волоколамская" или "Пятницкое шоссе, 18".
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Преимущества самовывоза</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary-600 mb-2">0 ₽</div>
            <p className="text-sm text-gray-600">Бесплатно</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary-600 mb-2">Сразу</div>
            <p className="text-sm text-gray-600">Получите заказ сразу</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary-600 mb-2">Проверка</div>
            <p className="text-sm text-gray-600">Проверьте товар при получении</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50">
        <div className="container mx-auto px-4 py-8 pt-32">
          <div className="max-w-4xl mx-auto">
            {/* Заголовок */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Калькулятор доставки
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Рассчитайте стоимость и сроки доставки вашего заказа. 
                Мы доставляем по Москве, Московской области и всей России.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Форма расчета */}
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Calculator className="w-6 h-6 text-primary-600" />
                  Расчет доставки
                </h2>

                <div className="space-y-6">
                  {/* Адрес */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Адрес доставки *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={address}
                        onChange={handleAddressInput}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder="Введите полный адрес доставки"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      {addressLoading && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                        </div>
                      )}
                      
                      {/* Подсказки Dadata */}
                      {showSuggestions && addressSuggestions.length > 0 && (
                        <ul className="absolute z-10 bg-white border border-gray-300 rounded-lg w-full max-h-60 overflow-y-auto shadow-lg mt-1">
                          {addressSuggestions.map((suggestion, idx) => (
                            <li
                              key={suggestion.value + idx}
                              className="px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                              onMouseDown={() => handleSuggestionClick(suggestion)}
                            >
                              <div className="font-medium text-gray-900">{suggestion.value}</div>
                              {suggestion.data?.city && (
                                <div className="text-sm text-gray-500 mt-1">
                                  {suggestion.data.city}, {suggestion.data.region_with_type}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {addressZone && (
                      <div className={`mt-2 px-3 py-2 rounded-lg text-sm font-medium ${getZoneInfo(addressZone).bg} ${getZoneInfo(addressZone).color}`}>
                        Зона: {getZoneInfo(addressZone).name}
                      </div>
                    )}
                  </div>

                  {/* Стоимость заказа - только для СДЭК */}
                  {needsOrderValue && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Стоимость заказа (₽) * <span className="text-orange-600">(только для СДЭК)</span>
                      </label>
                      <div className="relative">
                        <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="number"
                          value={orderValue}
                          onChange={(e) => setOrderValue(e.target.value)}
                          placeholder="Введите стоимость заказа для расчета СДЭК"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Стоимость заказа необходима для расчета доставки СДЭК за пределами МКАД/ЦКАД
                      </p>
                    </div>
                  )}

                  {/* Кнопка расчета */}
                  <button
                    onClick={handleCalculate}
                    disabled={loading || !address.trim() || (needsOrderValue && !orderValue)}
                    className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 font-semibold flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Рассчитываем...
                      </>
                    ) : (
                      <>
                        <Calculator className="w-5 h-5" />
                        Рассчитать доставку
                      </>
                    )}
                  </button>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      {error}
                    </div>
                  )}
                </div>
              </div>

              {/* Результат расчета или приглашение рассчитать */}
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 min-h-[350px] flex flex-col">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Truck className="w-6 h-6 text-primary-600" />
                  Результат расчета
                </h2>

                {/* Если нет расчета — приглашение рассчитать */}
                {!calculation ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                    <Truck className="w-16 h-16 mb-4 text-gray-300" />
                    <p className="text-lg">Нажмите кнопку рассчитать</p>
                  </div>
                ) : (
                  <>
                    {/* Универсальный выбор варианта и интервала для всех зон */}
                    {calculation.deliveryMethods.filter(m => m.name !== 'Оплата Картой при самовывозе').length > 0 ? (
                      <>
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Выберите способ доставки</h3>
                          <div className="flex flex-col gap-3">
                            {calculation.deliveryMethods.filter(m => m.name !== 'Оплата Картой при самовывозе').map((method, idx) => {
                              const isCDEK = method.type === 'cdek' || (method.name && method.name.toLowerCase().includes('сдэк'));
                              const isZonal = method.zonePrices && calculation.zoneKey;
                              const zoneName = isZonal ? (calculation.zoneName || calculation.zoneKey || calculation.zone || '') : '';
                              // --- Главное: для СДЭК используем cdekCost, если есть ---
                              let price: string | number =
                                isCDEK && typeof method.cdekCost === 'number'
                                  ? method.cdekCost
                                  : (isZonal && calculation.zoneKey
                                      ? (method.zonePrices[calculation.zoneKey] ?? 'Рассчитывается')
                                      : (method.fixedCost ?? 0));
                              // DEMO: если zoneKey === 'magadan' и метод СДЭК, возвращаем 2500
                              if (isZonal && calculation.zoneKey === 'magadan' && isCDEK) {
                                price = 2500;
                              }
                              return (
                                <div key={idx}>
                                  <button
                                    className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all duration-150 ${selectedMethodIndex === idx ? 'border-primary-600 bg-primary-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                                    onClick={() => {
                                      setSelectedMethodIndex(idx);
                                      setSelectedInterval('');
                                      // Для CDEK: ничего не делаем, ПВЗ уже приходят с backend
                                      setSelectedCdekPVZ(null);
                                      setCdekDeliveryDate('');
                                    }}
                                  >
                                    <span className="font-medium text-gray-900">{method.name}</span>
                                    <span className="flex items-center gap-2">
                                      <span className="text-lg font-bold text-primary-600">{price} ₽</span>
                                    </span>
                                  </button>
                                  {/* --- Для СДЭК: сразу под кнопкой показываем список ПВЗ, если выбрана эта доставка --- */}
                                  {isCDEK && selectedMethodIndex === idx && calculation.zone === 'region' && calculation.cdekPVZList && (() => {
                                    // Отладка: выводим calculation.cdekPVZList
                                    console.log('ПВЗ для выбора:', calculation.cdekPVZList);
                                    // Фильтруем ПВЗ по радиусу 5 км (distance на верхнем уровне или внутри location) и ограничиваем 3 ближайшими
                                    const pvz5km = calculation.cdekPVZList.filter((pvz: any) => {
                                      const d = Number(String(pvz.distance ?? pvz.location?.distance).replace(/[^\d.]/g, ''));
                                      return d > 0 && d <= 5000;
                                    }).slice(0, 3);
                                    if (pvz5km.length === 0) {
                                      return <div className="mb-6 text-red-600 font-semibold">ПВЗ не найдены в радиусе 5 км</div>;
                                    }
                                    return (
                                      <div className="mb-6 mt-2">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Выберите пункт выдачи СДЭК (3 ближайших)</h3>
                                        <div className="space-y-2">
                                          {pvz5km.map((pvz: any) => (
                                            <button
                                              key={pvz.code}
                                              className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-150 ${selectedCdekPVZ?.code === pvz.code ? 'border-primary-600 bg-primary-50' : 'border-gray-200 bg-white hover:bg-primary-50'}`}
                                              onClick={() => setSelectedCdekPVZ(pvz)}
                                            >
                                              <div className="font-medium text-gray-900">{pvz.name}</div>
                                              <div className="text-sm text-gray-600">{pvz.address}</div>
                                              <div className="text-xs text-gray-500 mt-1">Время работы: {pvz.work_time}</div>
                                              {(pvz.distance !== undefined || pvz.location?.distance !== undefined) && (
                                                <div className="text-xs text-blue-600 mt-1">Расстояние: {(() => {
                                                  const d = Number(String(pvz.distance ?? pvz.location?.distance).replace(/[^\d.]/g, ''));
                                                  return (d / 1000).toFixed(2);
                                                })()} км</div>
                                              )}
                                              {pvz.deliveryDate && (
                                                <div className="text-xs text-green-600 mt-1">Ожидаемая дата доставки: {new Date(pvz.deliveryDate).toLocaleDateString('ru-RU')}</div>
                                              )}
                                            </button>
                                          ))}
                                        </div>
                                        {/* После выбора ПВЗ показываем детали */}
                                                                        {selectedCdekPVZ && (
                                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="text-sm text-blue-800">ПВЗ: <b>{selectedCdekPVZ.name}</b></div>
                                    <div className="text-sm text-blue-800 mt-1">Адрес: <b>{selectedCdekPVZ.address}</b></div>
                                    <div className="text-sm text-blue-800 mt-1">Время работы: <b>{selectedCdekPVZ.work_time}</b></div>
                                    {selectedCdekPVZ.deliveryDate && (
                                      <div className="text-sm text-green-800 mt-1">Ожидаемая дата доставки: <b>{new Date(selectedCdekPVZ.deliveryDate).toLocaleDateString('ru-RU')}</b></div>
                                    )}
                                    {(selectedCdekPVZ.distance !== undefined || selectedCdekPVZ.location?.distance !== undefined) && (
                                      <div className="text-sm text-blue-800 mt-1">Расстояние: <b>{(() => {
                                        const d = Number(String(selectedCdekPVZ.distance ?? selectedCdekPVZ.location?.distance).replace(/[^\d.]/g, ''));
                                        return (d / 1000).toFixed(2);
                                      })()} км</b></div>
                                    )}
                                    <div className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded border">
                                      <div className="font-medium text-gray-700 mb-1">Стандартные габариты:</div>
                                      <div>• Вес: до 2 кг</div>
                                      <div>• Размеры: 20×20×20 см</div>
                                      <div className="text-xs text-gray-500 mt-1">Если ваш заказ превышает эти параметры, свяжитесь с оператором для уточнения стоимости.</div>
                                    </div>
                                  </div>
                                )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {selectedMethodIndex !== null && (() => {
                          const method = calculation.deliveryMethods[selectedMethodIndex];
                          let intervals: string[] = [];
                          if (Array.isArray(method.earlyOrderIntervals) && method.earlyOrderIntervals.length > 0) {
                            intervals = intervals.concat(method.earlyOrderIntervals);
                          }
                          if (Array.isArray(method.lateOrderIntervals) && method.lateOrderIntervals.length > 0) {
                            intervals = intervals.concat(method.lateOrderIntervals);
                          }
                          if (method.customInterval1) intervals.push(method.customInterval1);
                          if (method.customInterval2) intervals.push(method.customInterval2);
                          intervals = intervals.filter(Boolean);
                                                    // --- Для CDEK не показываем ПВЗ здесь, они уже показаны выше ---
                          const isCDEK = method.type === 'cdek' || (method.name && method.name.toLowerCase().includes('сдэк'));
                          if (isCDEK) {
                            return null; // ПВЗ уже показаны в первом блоке
                          }
                          if (intervals.length === 0) return null;
                          return (
                            <div className="mb-6">
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">Выберите интервал доставки</h3>
                              <div className="flex flex-wrap gap-2">
                                {intervals.map(interval => (
                                  <button
                                    key={interval}
                                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-150 ${selectedInterval === interval ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-primary-50'}`}
                                    onClick={() => setSelectedInterval(interval)}
                                  >
                                    {interval}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                        {/* Итоговый блок выбора */}
                        {selectedMethodIndex !== null && ((() => {
                          const method = calculation.deliveryMethods[selectedMethodIndex];
                          const isCDEK = method.type === 'cdek' || (method.name && method.name.toLowerCase().includes('сдэк'));
                          const isZonal = method.zonePrices && calculation.zoneKey;
                          const zoneName = isZonal ? (calculation.zoneName || calculation.zoneKey || calculation.zone || '') : '';
                          let price =
                          (method.zonePrices && calculation.zoneKey && method.zonePrices[calculation.zoneKey] !== undefined)
                            ? method.zonePrices[calculation.zoneKey]
                            : (method.fixedCost ?? method.price ?? 0);
                          if (isZonal && calculation.zoneKey === 'magadan' && isCDEK) {
                            price = 2500;
                          }
                          // --- Для СДЭК: ПВЗ уже показаны в первом блоке ---
                          if (isCDEK) {
                            // Ничего не показываем, ПВЗ уже отображены выше
                          }
                          // --- Итоговый блок "Вы выбрали" для СДЭК только если выбран ПВЗ ---
                          if (isCDEK) {
                            return selectedCdekPVZ && price !== 'Рассчитывается' ? (
                              <div className="mt-4 p-4 bg-primary-50 rounded-lg border border-primary-200">
                                <div className="text-lg font-semibold text-primary-700 mb-2">Вы выбрали:</div>
                                <div className="flex flex-col gap-1">
                                  <div>Способ доставки: <span className="font-medium text-gray-900">{method.name}</span></div>
                                  <div>ПВЗ: <span className="font-medium text-gray-900">{selectedCdekPVZ.name}</span></div>
                                  <div>Адрес: <span className="font-medium text-gray-900">{selectedCdekPVZ.address}</span></div>
                                  <div>Время работы: <span className="font-medium text-gray-900">{selectedCdekPVZ.work_time}</span></div>
                                  {selectedCdekPVZ.deliveryDate && (
                                    <div>Ожидаемая дата доставки: <span className="font-bold text-primary-700">{new Date(selectedCdekPVZ.deliveryDate).toLocaleDateString('ru-RU')}</span></div>
                                  )}
                                  <div>Стоимость: <span className="font-bold text-primary-700">{price} ₽</span></div>
                                  {isZonal && zoneName && (
                                    <div className="text-sm text-gray-500 mt-1">Зона доставки: <b>{zoneName}</b></div>
                                  )}
                                  <div className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded border">
                                    <div className="font-medium text-gray-700 mb-1">Стандартные габариты:</div>
                                    <div>• Вес: до 2 кг</div>
                                    <div>• Размеры: 20×20×20 см</div>
                                    <div className="text-xs text-gray-500 mt-1">Если ваш заказ превышает эти параметры, свяжитесь с оператором для уточнения стоимости.</div>
                                  </div>
                                </div>
                              </div>
                            ) : null;
                          }
                          // Для остальных — если выбран интервал или просто выбран способ
                          return selectedInterval || method.type === 'zone' ? (
                            <div className="mt-4 p-4 bg-primary-50 rounded-lg border border-primary-200">
                              <div className="text-lg font-semibold text-primary-700 mb-2">Вы выбрали:</div>
                              <div className="flex flex-col gap-1">
                                <div>Способ доставки: <span className="font-medium text-gray-900">{method.name}</span></div>
                                {selectedInterval && <div>Интервал: <span className="font-medium text-gray-900">{selectedInterval}</span></div>}
                                <div>Стоимость: <span className="font-bold text-primary-700">{price} ₽</span></div>
                                {isZonal && zoneName && (
                                  <div className="text-sm text-gray-500 mt-1">Зона доставки: <b>{zoneName}</b></div>
                                )}
                              </div>
                            </div>
                          ) : null;
                        })())}
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Для данного адреса нет доступных способов доставки</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Информация о самовывозе */}
            {calculation && calculation.zone === 'mkad' && (
              <div className="mt-12 bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Store className="w-6 h-6 text-primary-600" />
                  Самовывоз из магазина
                </h2>
                
                <div className="grid lg:grid-cols-2 gap-8">
                  {/* Адрес и контакты */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Наш пункт самовывоза</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">Москва, Пятницкое шоссе, 18</p>
                          <p className="text-gray-600">Павильон 73, 1 этаж, 3 вход, прямо до конца, возле Mix Bar</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">Телефон</p>
                          <p className="text-gray-600">+7 (499) 322-33-86</p>
                          <button
                            className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow hover:bg-primary-700 transition-all"
                            onClick={() => window.open && window.open('tel:+74993223386')}
                          >
                            Перезвоните мне
                          </button>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">Время работы</p>
                          <div className="text-gray-600">
                            <p>Ежедневно: 10:00 - 19:00</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Как добраться */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Как добраться</h3>
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                          <Navigation className="w-4 h-4" />
                          На метро
                        </h4>
                        <p className="text-blue-700 text-sm">
                          Станция метро <b>Волоколамская</b> (Арбатско-Покровская линия). 
                          Выход к Пятницкому шоссе. Далее 3 минуты пешком до входа №3, пройти прямо до конца, павильон 73, рядом с Mix Bar.
                        </p>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          На автомобиле
                        </h4>
                        <p className="text-green-700 text-sm">
                          Заезд с Пятницкого шоссе, парковка на территории рынка бесплатная. Ориентир — вход №3, павильон 73.
                        </p>
                      </div>

                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h4 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          На автобусе
                        </h4>
                        <p className="text-orange-700 text-sm">
                          Автобусы № 400, 400т, 210, 210к до остановки "Волоколамская" или "Пятницкое шоссе, 18".
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Преимущества самовывоза */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Преимущества самовывоза</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-primary-600 mb-2">0 ₽</div>
                      <p className="text-sm text-gray-600">Бесплатно</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-primary-600 mb-2">Сразу</div>
                      <p className="text-sm text-gray-600">Получите заказ сразу</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-primary-600 mb-2">Проверка</div>
                      <p className="text-sm text-gray-600">Проверьте товар при получении</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Информация о СДЭК */}
            <div className="mt-8 bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Package className="w-6 h-6 text-primary-600" />
                Доставка СДЭК
              </h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Когда используется СДЭК</h3>
                  <div className="space-y-3 text-gray-600">
                    <div className="flex items-start gap-3">
                      <Circle className="w-2 h-2 mt-2 text-primary-600 flex-shrink-0" />
                      <p>Только для адресов <strong>за пределами МКАД и ЦКАД</strong></p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Circle className="w-2 h-2 mt-2 text-primary-600 flex-shrink-0" />
                      <p>Доставка по всей России</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Circle className="w-2 h-2 mt-2 text-primary-600 flex-shrink-0" />
                      <p>Стоимость зависит от веса и стоимости заказа</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Circle className="w-2 h-2 mt-2 text-primary-600 flex-shrink-0" />
                      <p>Срок доставки: 1-3 дня</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Ограничения по габаритам</h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-yellow-800 mb-2">Стандартные габариты:</p>
                        <ul className="text-sm text-yellow-700 space-y-1">
                          <li>• Вес: до 2 кг</li>
                          <li>• Размеры: 20×20×20 см</li>
                        </ul>
                        <p className="text-sm text-yellow-700 mt-2">
                          <strong>Если ваш заказ превышает эти параметры, свяжитесь с оператором для уточнения стоимости.</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Информация о зонах доставки */}
            <div className="mt-8 bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-primary-600" />
                Зоны доставки
              </h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-800 mb-2">В пределах МКАД</h3>
                  <p className="text-green-700 text-sm">Быстрая доставка курьером по Москве в пределах МКАД</p>
                  <p className="text-green-600 text-xs mt-2">Срок: 1-2 часа</p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">Между МКАД и ЦКАД</h3>
                  <p className="text-blue-700 text-sm">Доставка в ближайшее Подмосковье между МКАД и ЦКАД</p>
                  <p className="text-blue-600 text-xs mt-2">Срок: 2-4 часа</p>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-orange-800 mb-2">За пределами ЦКАД</h3>
                  <p className="text-orange-700 text-sm">Доставка СДЭК по всей России за пределами ЦКАД</p>
                  <p className="text-orange-600 text-xs mt-2">Срок: 1-3 дня</p>
                </div>
              </div>
            </div>
            {PickupInfoBlock}
          </div>
        </div>
      </div>
    </Layout>
  );
} 