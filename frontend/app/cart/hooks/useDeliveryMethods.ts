import { useMemo, useState, useEffect, Dispatch, SetStateAction } from 'react';

export type UseDeliveryMethodsReturn = {
  filteredDeliveryMethods: any[];
  selectedMethod: any;
  setSelectedDeliveryMethod: (id: string) => void;
  showDeliveryMethodSelector: boolean;
  setShowDeliveryMethodSelector: (v: boolean) => void;
};

export function useDeliveryMethods(
  deliveryMethods: any[],
  zoneResult: string,
  selectedDeliveryMethod: string,
  setSelectedDeliveryMethod: (id: string) => void
): UseDeliveryMethodsReturn {
  const [showDeliveryMethodSelector, setShowDeliveryMethodSelector] = useState(true);

  // Фильтрация способов доставки по зоне
  const filteredDeliveryMethods = useMemo(() => {
    return deliveryMethods.filter((method: any) => {
      if (!zoneResult) return true;
      if (zoneResult === 'mkad') return method.addressValidationType === 'moscow_mkad';
      if (zoneResult === 'ckad') return method.addressValidationType === 'moscow_region';
      if (zoneResult === 'region') return String(method.addressValidationType) === 'region';
      return true;
    });
  }, [deliveryMethods, zoneResult]);

  // Выбранный способ доставки
  const selectedMethod = deliveryMethods.find((m: any) => m._id === selectedDeliveryMethod);

  // useEffect для авто-выбора метода
  useEffect(() => {
    if (filteredDeliveryMethods.length === 1 && !selectedDeliveryMethod) {
      setSelectedDeliveryMethod(filteredDeliveryMethods[0]._id);
      setShowDeliveryMethodSelector(false);
    }
  }, [filteredDeliveryMethods, selectedDeliveryMethod, setSelectedDeliveryMethod]);

  return {
    filteredDeliveryMethods,
    selectedMethod,
    setSelectedDeliveryMethod,
    showDeliveryMethodSelector,
    setShowDeliveryMethodSelector,
  };
} 