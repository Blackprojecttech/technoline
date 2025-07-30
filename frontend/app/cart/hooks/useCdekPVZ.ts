import { useState } from 'react';

export function useCdekPVZ(formData: any, setFormData: any) {
  const [cdekPVZLoading, setCdekPVZLoading] = useState(false);
  const [cdekPVZList, setCdekPVZList] = useState<any[]>([]);
  const [cdekPVZError, setCdekPVZError] = useState<string | null>(null);
  const [selectedCdekPVZ, setSelectedCdekPVZ] = useState<any | null>(null);
  const [cdekDeliveryDate, setCdekDeliveryDate] = useState<string | null>(null);

  // Функция для получения списка ПВЗ
  const fetchCdekPVZ = async () => {
    setCdekPVZLoading(true);
    setCdekPVZError(null);
    setCdekPVZList([]);
    try {
      const fullAddress = [formData.country, formData.state, formData.city, formData.address, formData.zipCode].filter(Boolean).join(', ');
      const params = new URLSearchParams();
      params.append('address', fullAddress);
      if (formData.city) params.append('city', formData.city);
      if (formData.state) params.append('region', formData.state);
      if (formData.zipCode) params.append('postalCode', formData.zipCode);
      if (formData.country) params.append('country', formData.country);
      if (formData.address) params.append('street', formData.address);
      const res = await fetch(`/api/cdek/pvz-list?${params.toString()}`);
      const data = await res.json();
      let pvzList = Array.isArray(data.pvzList) ? data.pvzList : (Array.isArray(data) ? data : []);
      setCdekPVZList(pvzList);
      setCdekPVZError((pvzList.length === 0) ? 'Пункты выдачи не найдены в радиусе 100 км.' : null);
    } catch (e: any) {
      setCdekPVZError(e.message || 'Ошибка поиска ПВЗ');
    } finally {
      setCdekPVZLoading(false);
    }
  };

  // Функция для выбора ПВЗ
  const handleCdekPVZSelect = async (pvzData: any) => {
    setFormData((prev: any) => ({
      ...prev,
      city: pvzData.city || '',
      state: pvzData.region || '',
      zipCode: pvzData.postalCode || '',
      pvzCdek: pvzData,
      cdekPvzAddress: pvzData.address_full || pvzData.address || '',
      cdekPvzCode: pvzData.code || '',
    }));
    setSelectedCdekPVZ(pvzData);
    // --- Автоматический расчет даты доставки через API СДЭК ---
    try {
      const fromAddress = 'Митино';
      const toCity = pvzData.city || '';
      if (toCity.length > 1) {
        const params = new URLSearchParams();
        params.append('address', toCity);
        params.append('from_address', fromAddress);
        params.append('tariff_code', '136');
        if (pvzData.city_code) params.append('city_code', String(pvzData.city_code));
        if (pvzData.fias_guid) params.append('fias_guid', pvzData.fias_guid);
        if (pvzData.region) params.append('region', pvzData.region);
        const res = await fetch(`/api/cdek/delivery-dates?${params.toString()}`);
        const data = await res.json();
        if (data && data.periods && data.periods.length > 0) {
          const minPeriod = data.periods[0];
          if (minPeriod && minPeriod.period_min) {
            const today = new Date();
            today.setDate(today.getDate() + minPeriod.period_min);
            setCdekDeliveryDate(today.toISOString().split('T')[0]);
          }
        } else if (data && data.dates && data.dates.length > 0) {
          setCdekDeliveryDate(data.dates[0]);
        } else {
          setCdekDeliveryDate(null);
        }
      }
    } catch (e) {
      setCdekDeliveryDate(null);
    }
  };

  // Функция для поиска ПВЗ (можно расширить логику)
  const searchCdekPVZ = fetchCdekPVZ;

  return {
    cdekPVZLoading,
    cdekPVZList,
    cdekPVZError,
    selectedCdekPVZ,
    setSelectedCdekPVZ,
    cdekDeliveryDate,
    setCdekDeliveryDate,
    fetchCdekPVZ,
    handleCdekPVZSelect,
    searchCdekPVZ,
  };
} 