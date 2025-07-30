import { useQuery } from 'react-query';

interface CustomerOrdersResponse {
  orderCount: number;
  orders: Array<{
    _id: string;
    orderNumber: string;
    createdAt: string;
  }>;
}

async function fetchCustomerOrders(userId: string): Promise<CustomerOrdersResponse> {
  const token = localStorage.getItem('admin_token');
  if (!token) throw new Error('No auth token');
  
  const response = await fetch(
    `${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/orders/customer/${userId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch customer orders');
  }
  
  return response.json();
}

export function useCustomerOrders(userId: string) {
  return useQuery<CustomerOrdersResponse>({
    queryKey: ['customerOrders', userId],
    queryFn: () => fetchCustomerOrders(userId),
    enabled: !!userId && !!localStorage.getItem('admin_token'),
    staleTime: 5 * 60 * 1000, // 5 минут
    cacheTime: 10 * 60 * 1000, // 10 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
} 