import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface CdekPVZSelectorProps {
  cdekPVZList: any[];
  cdekPVZLoading: boolean;
  cdekPVZError: string | null;
  selectedCdekPVZ: any | null;
  onSelect: (pvz: any) => void;
  cdekPVZRadius: number | null;
  onAddressChange?: (address: string) => void;
}

const CdekPVZSelector: React.FC<CdekPVZSelectorProps> = ({
  cdekPVZList,
  cdekPVZLoading,
  cdekPVZError,
  selectedCdekPVZ,
  onSelect,
  cdekPVZRadius,
  onAddressChange,
}) => {
  // --- Новый стейт для хранения дат доставки по каждому ПВЗ ---
  const [pvzDeliveryDates, setPvzDeliveryDates] = useState<{ [code: string]: string }>({});
  const [loadingDates, setLoadingDates] = useState<{ [code: string]: boolean }>({});
  // --- Новый стейт для поиска ---
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Для каждого ПВЗ делаем запрос на расчет дат доставки
    if (!cdekPVZList || cdekPVZList.length === 0) return;
    cdekPVZList.forEach((pvz) => {
      if (pvzDeliveryDates[pvz.code] || loadingDates[pvz.code]) return;
      setLoadingDates((prev) => ({ ...prev, [pvz.code]: true }));
      const params = new URLSearchParams();
      params.append('from_address', 'Москва, Митино');
      params.append('address', pvz.location.city || ''); // только город!
      params.append('region', pvz.location.region || pvz.region || '');
      params.append('city', pvz.location.city || pvz.city || '');
      params.append('tariff_code', '136');
      // Надёжно достаём city_code и fias_guid из разных вариантов структуры
      const cityCode = pvz.location?.city_code || pvz.city_code || pvz.code || '';
      const fiasGuid = pvz.location?.fias_guid || pvz.fias_guid || '';
      if (cityCode) params.append('city_code', String(cityCode));
      if (fiasGuid) params.append('fias_guid', String(fiasGuid));
      console.log('DEBUG CDEK params:', { cityCode, fiasGuid, region: pvz.location.region || pvz.region || '', city: pvz.location.city || pvz.city || '', pvz });
      const url = `/api/cdek/delivery-dates?${params.toString()}`;
      console.log('CDEK delivery-dates FINAL URL:', url);
      // alert('CDEK delivery-dates FINAL URL: ' + url); // временно для наглядности
      fetch(url)
        .then(res => res.json())
        .then(data => {
          console.log('CDEK delivery-dates RESPONSE:', data);
          let deliveryText = '';
          if (data && data.periods && data.periods.length > 0) {
            const min = data.periods[0].period_min;
            const max = data.periods[0].period_max;
            let avg;
            if (typeof min === 'number' && typeof max === 'number') {
              if (min === max) {
                avg = min;
              } else {
                avg = Math.round((min + max) / 2);
              }
              deliveryText = `Примерная дата доставки: ${avg} дней`;
            } else if (typeof min === 'number') {
              avg = min;
              deliveryText = `Примерная дата доставки: ${min} дней`;
            } else if (typeof max === 'number') {
              avg = max;
              deliveryText = `Примерная дата доставки: ${max} дней`;
            } else {
              avg = undefined;
              deliveryText = 'Нет данных';
            }
            console.log(`CDEK срок доставки для ПВЗ ${pvz.code}: period_min=${min}, period_max=${max}, avg=${avg}`);
          } else {
            deliveryText = 'Нет данных';
            console.log(`CDEK срок доставки для ПВЗ ${pvz.code}: Нет данных`);
          }
          setPvzDeliveryDates((prev) => ({ ...prev, [pvz.code]: deliveryText }));
        })
        .catch(() => {
          setPvzDeliveryDates((prev) => ({ ...prev, [pvz.code]: 'Ошибка' }));
        })
        .finally(() => {
          setLoadingDates((prev) => ({ ...prev, [pvz.code]: false }));
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cdekPVZList]);

  // --- Фильтрация ПВЗ по поиску ---
  function normalize(str: string) {
    return (str || '')
      .toLowerCase()
      .replace(/[\s.,\-–—]+/g, '') // убираем пробелы, точки, запятые, дефисы и т.д.
      .replace(/ё/g, 'е')
      .trim();
  }

  let filteredPVZList = selectedCdekPVZ
    ? cdekPVZList.filter((pvz) => pvz.code === selectedCdekPVZ.code)
    : search.trim().length > 0
      ? cdekPVZList.filter((pvz) => {
          const q = search.trim().toLowerCase();
          return (
            (pvz.name && pvz.name.toLowerCase().includes(q)) ||
            (pvz.address_full && pvz.address_full.toLowerCase().includes(q)) ||
            (pvz.address && pvz.address.toLowerCase().includes(q)) ||
            (pvz.location?.city && pvz.location.city.toLowerCase().includes(q))
          );
        })
      : cdekPVZList;

  // Если в поиске введён текст и найден ровно один ПВЗ с точным совпадением по адресу, адресу full или коду (с нормализацией) — показываем только его
  if (!selectedCdekPVZ && search.trim().length > 0 && filteredPVZList.length > 1) {
    const qNorm = normalize(search);
    const exact = cdekPVZList.find(
      pvz =>
        (pvz.address_full && normalize(pvz.address_full) === qNorm) ||
        (pvz.address && normalize(pvz.address) === qNorm) ||
        (pvz.code && normalize(pvz.code) === qNorm)
    );
    if (exact) filteredPVZList = [exact];
  }

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-2">Выберите пункт выдачи СДЭК</h3>
      {/* Поле поиска */}
      {!selectedCdekPVZ && (
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по адресу, городу или названию ПВЗ"
          className="mb-2 w-full px-3 py-2 border border-gray-300 rounded"
        />
      )}
      {cdekPVZLoading && (
        <div className="flex items-center space-x-2 animate-pulse">
          <div className="w-6 h-6 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Идёт поиск пунктов выдачи...</span>
        </div>
      )}
      {cdekPVZError && (
        <div className="text-red-500 mt-2">{cdekPVZError}</div>
      )}
      {!cdekPVZLoading && !cdekPVZError && filteredPVZList.length > 0 && (
        <ul className="space-y-2 mt-2">
          {filteredPVZList.map((pvz) => (
            <motion.li
              key={pvz.code}
              layout
              whileHover={{ scale: 1.03 }}
              className={`p-4 border rounded-lg transition-all ${selectedCdekPVZ?.code === pvz.code ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}
              // onClick убираем, чтобы клик по карточке ничего не делал
            >
              <div className="font-semibold">{pvz.name}</div>
              <div className="text-sm text-gray-600">{pvz.address_full || pvz.address}</div>
              <div className="text-xs text-gray-400 mt-1">{pvz.work_time}</div>
              {pvz.note && <div className="text-xs text-gray-500 mt-1">{pvz.note}</div>}
              <div className="text-xs mt-1">{pvz._distance ? `${(pvz._distance * 1000).toFixed(0)} метров` : ''}</div>
              <div className="text-xs mt-2 text-blue-700">
                {loadingDates[pvz.code] ? 'Рассчитываем сроки...' : pvzDeliveryDates[pvz.code] ? pvzDeliveryDates[pvz.code] : ''}
              </div>
              <button
                className={`mt-2 px-4 py-2 rounded bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition-all ${selectedCdekPVZ?.code === pvz.code ? '' : ''}`}
                onClick={() => {
                  if (!selectedCdekPVZ || selectedCdekPVZ.code !== pvz.code) {
                    setSearch(pvz.code);
                    onSelect({
                      address: pvz.location.city || '',
                      city: pvz.location?.city || pvz.city || '',
                      region: pvz.location?.region || pvz.region || '',
                      postalCode: pvz.location?.postal_code || pvz.postal_code || '',
                      code: pvz.code,
                    });
                    if (onAddressChange) onAddressChange('');
                  }
                }}
                type="button"
              >
                {selectedCdekPVZ?.code === pvz.code ? 'Выбран' : 'Выбрать'}
              </button>
              {/* ...если выбран, показываем дату доставки... */}
              {selectedCdekPVZ?.code === pvz.code && pvzDeliveryDates[pvz.code] && (
                <div className="mt-2 text-blue-700 font-medium">{pvzDeliveryDates[pvz.code]}</div>
              )}
            </motion.li>
          ))}
        </ul>
      )}
      {selectedCdekPVZ && (
        <div className="mt-4 p-3 rounded border border-blue-400 bg-blue-50">
          <div className="font-semibold">Выбран ПВЗ: {selectedCdekPVZ.name}</div>
          <div className="text-sm text-gray-600">{selectedCdekPVZ.address_full || selectedCdekPVZ.address}</div>
        </div>
      )}
      {cdekPVZList.length > 0 && (
        <div className="mb-2 text-sm text-gray-500">Показаны пункты выдачи в радиусе {cdekPVZRadius ? `${(cdekPVZRadius/1000).toFixed(0)} км` : ''}</div>
      )}
    </div>
  );
};

export default CdekPVZSelector; 