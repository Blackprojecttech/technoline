import { useState, useEffect } from 'react';

interface PaymentMethod {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  deliveryTypes: string[];
  systemCode: string;
  // Новые поля для красивого отображения
  displayTitle?: string;
  displayDescription?: string;
  features?: string[];
  icon?: string;
  color?: string;
  specialNote?: string;
  noteType?: 'info' | 'warning' | 'success';
}

export const usePaymentMethods = (deliveryMethodId?: string) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deliveryMethodId) {
      setPaymentMethods([]);
      return;
    }

    const fetchPaymentMethods = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'https://technoline-api.loca.lt/api'}/payment-methods/by-delivery/${deliveryMethodId}`
        );
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки способов оплаты');
        }
        
        const data = await response.json();
        setPaymentMethods(data.paymentMethods || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка сети');
        setPaymentMethods([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentMethods();
  }, [deliveryMethodId]);

  return { paymentMethods, loading, error };
}; 