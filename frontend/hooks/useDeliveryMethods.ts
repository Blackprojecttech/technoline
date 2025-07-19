import { useState, useEffect } from 'react';

interface DeliveryMethod {
  _id: string;
  name: string;
  description: string;
  type: 'pickup' | 'courier' | 'cdek' | 'urgent';
  price: number;
  isActive: boolean;
  order: number;
  conditions?: string;
  workingHours?: string;
  address?: string;
  restrictions?: string;
  costType?: 'fixed' | 'percentage' | 'zone';
  fixedCost?: number;
  costPercentage?: number;
  // Поля для пользовательских интервалов
  customInterval1?: string;
  customInterval2?: string;
  useFlexibleIntervals?: boolean;
  earlyOrderIntervals?: string[];
  lateOrderIntervals?: string[];
  orderTransitionTime?: string;
  // Поля для проверки адреса
  requireAddressValidation?: boolean;
  addressValidationType?: 'moscow_mkad' | 'moscow_region';
  // Поле для типа интервалов (стандартные, гибкие, СДЭК)
  intervalType?: 'standard' | 'flexible' | 'cdek';
  // Добавлено для поддержки цен по зонам
  zonePrices?: Record<string, number>;
}

interface UseDeliveryMethodsReturn {
  deliveryMethods: DeliveryMethod[];
  loading: boolean;
  error: string | null;
}

export const useDeliveryMethods = (): UseDeliveryMethodsReturn => {
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeliveryMethods = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/delivery/active`);
        
        if (!response.ok) {
          throw new Error('Ошибка при загрузке способов доставки');
        }
        
        const data = await response.json();
        setDeliveryMethods(data.deliveryMethods || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
        console.error('Ошибка при загрузке способов доставки:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveryMethods();
  }, []);

  return { deliveryMethods, loading, error };
}; 