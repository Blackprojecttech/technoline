import { useState, useEffect } from 'react';

export function usePaymentMethods(selectedDeliveryMethod: any) {
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/payment-methods?deliveryMethod=${selectedDeliveryMethod || ''}`)
      .then(res => res.json())
      .then(data => {
        setPaymentMethods(data.paymentMethods || []);
        setLoading(false);
      })
      .catch(e => {
        setError('Ошибка загрузки способов оплаты');
        setLoading(false);
      });
  }, [selectedDeliveryMethod]);

  return {
    paymentMethods,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    loading,
    error,
  };
} 