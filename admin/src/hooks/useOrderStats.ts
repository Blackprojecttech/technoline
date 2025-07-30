import { useQuery } from 'react-query';

interface OrderStats {
  total: number;
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  // Финансовая статистика
  todayRevenue: number;
  todayProfit: number;
  monthRevenue: number;
  monthProfit: number;
  // Уведомления
  callRequests: number;
  newOrders: number;
}

async function fetchOrderStats(): Promise<OrderStats> {
  const token = localStorage.getItem('admin_token');
  if (!token) throw new Error('No auth token');
  
  const response = await fetch(
    `${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/orders/stats`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  if (!response.ok) throw new Error('Failed to fetch order stats');
  return response.json();
}

export const useOrderStats = () => {
  return useQuery<OrderStats>({
    queryKey: ['orderStats'],
    queryFn: fetchOrderStats,
    retry: 1,
    retryDelay: 1000,
    enabled: !!localStorage.getItem('admin_token'),
    staleTime: 60 * 1000, // 1 минута
    cacheTime: 5 * 60 * 1000, // 5 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // refetchInterval: 30 * 1000, // отключено
  });
}; 