import { useState, useEffect } from 'react';

export function useZone(formData: any, selectedDeliveryMethod: any, deliveryMethods: any) {
  const [zoneResult, setZoneResult] = useState<string | null>(null);
  const [zoneKey, setZoneKey] = useState<string | null>(null);
  const [zoneLoading, setZoneLoading] = useState(false);
  const [zoneError, setZoneError] = useState<string | null>(null);

  // Функция для запроса зоны
  const fetchZone = async () => {
    if (!formData.address || !formData.lat || !formData.lng) return;
    setZoneLoading(true);
    setZoneError(null);
    try {
      const res = await fetch('/api/delivery/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: formData.address,
          lat: formData.lat,
          lng: formData.lng,
        }),
      });
      const data = await res.json();
      setZoneResult(data.zone || null);
      setZoneKey(data.zoneKey || null);
    } catch (e) {
      setZoneError('Ошибка при определении зоны');
    } finally {
      setZoneLoading(false);
    }
  };

  // useEffect для запроса зоны при изменении адреса/координат
  useEffect(() => {
    const selectedMethod = deliveryMethods.find((m: any) => m._id === selectedDeliveryMethod);
    if (selectedMethod && selectedMethod.type === 'cdek') return;
    if (!formData.address || !formData.lat || !formData.lng) return;
    fetchZone();
    // eslint-disable-next-line
  }, [formData.address, formData.lat, formData.lng, selectedDeliveryMethod]);

  return {
    zoneResult,
    zoneKey,
    zoneLoading,
    zoneError,
    fetchZone,
    setZoneResult,
    setZoneKey,
  };
} 