import dayjs from 'dayjs';

export interface Order {
  _id: string;
  orderNumber: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
    sku: string;
  }>;
  subtotal: number;
  shipping: number;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  deliveryMethod?: {
    _id: string;
    name: string;
    type: string;
    price: number;
  };
  deliveryDate?: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  trackingNumber?: string;
  estimatedDelivery?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  cdekPvzAddress?: string;
  cdekDeliveryDate?: string;
  deliveryInterval?: string;
  callRequest?: boolean;
  callStatus?: 'requested' | 'completed' | 'not_completed';
}

export interface DeliveryMethod {
  _id: string;
  name: string;
  type: string;
  costType: 'fixed' | 'percentage' | 'zone';
  fixedCost?: number;
  costPercentage?: number;
  isActive: boolean;
  earlyOrderIntervals?: string[];
  lateOrderIntervals?: string[];
  orderTransitionTime?: string;
  useFlexibleIntervals?: boolean;
  intervalType?: 'standard' | 'flexible' | 'cdek';
  customInterval1?: string;
  customInterval2?: string;
}

export interface Product {
  _id: string;
  name: string;
  price: number;
  sku: string;
  mainImage: string;
  stockQuantity: number;
}

export interface OrdersResponse {
  orders: Order[];
  page: number;
  pages: number;
  total: number;
}

export async function fetchOrders(page: number = 1, status?: string, limit: number = 20): Promise<OrdersResponse> {
  const token = localStorage.getItem('admin_token');
  if (!token) throw new Error('No auth token');
  
  let url = `${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/orders?page=${page}&limit=${limit}`;
  if (status) url += `&status=${status}`;
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch orders');
  return response.json();
}

export async function fetchDeliveryMethods(): Promise<DeliveryMethod[]> {
  const token = localStorage.getItem('admin_token');
  if (!token) throw new Error('No auth token');
  
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/delivery`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch delivery methods');
  const data = await response.json();
  return data.deliveryMethods || [];
}

export async function fetchProducts(): Promise<Product[]> {
  const token = localStorage.getItem('admin_token');
  if (!token) throw new Error('No auth token');
  
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/products`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch products');
  const data = await response.json();
  return data.products || [];
}

export function formatDeliveryDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const deliveryDate = new Date(Number(year), Number(month) - 1, Number(day));
    
    if (deliveryDate.getTime() === today.getTime()) {
      return `Сегодня, ${dateObj.toLocaleDateString('ru-RU', { month: 'long', day: 'numeric' })}`;
    } else if (deliveryDate.getTime() === tomorrow.getTime()) {
      return `Завтра, ${dateObj.toLocaleDateString('ru-RU', { month: 'long', day: 'numeric' })}`;
    } else {
      return dateObj.toLocaleDateString('ru-RU', { month: 'long', day: 'numeric' });
    }
  }
  
  const now = new Date();
  if (dateStr === 'today') {
    return `Сегодня, ${now.toLocaleDateString('ru-RU', { month: 'long', day: 'numeric' })}`;
  }
  if (dateStr === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return `Завтра, ${tomorrow.toLocaleDateString('ru-RU', { month: 'long', day: 'numeric' })}`;
  }
  if (dateStr === 'day3') {
    const day3 = new Date(now);
    day3.setDate(now.getDate() + 2);
    return `Послезавтра, ${day3.toLocaleDateString('ru-RU', { month: 'long', day: 'numeric' })}`;
  }
  return dateStr;
}

export function getDeliveryDateTime(order: Order): string {
  if (!order?.deliveryDate) return 'Не указано';
  
  const dateText = formatDeliveryDate(order.deliveryDate);
  
  if (order?.deliveryInterval) {
    return `${dateText} в ${order.deliveryInterval}`;
  } else {
    return dateText;
  }
}

export function normalizeDeliveryDate(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined;
  const now = new Date();
  if (dateStr === 'today') {
    return now.toISOString().slice(0, 10);
  }
  if (dateStr === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  }
  if (dateStr === 'day3') {
    const day3 = new Date(now);
    day3.setDate(now.getDate() + 2);
    return day3.toISOString().slice(0, 10);
  }
  return dateStr;
}