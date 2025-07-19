import React, { useState, useCallback } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Table, 
  Card, 
  Typography, 
  Button, 
  Tag, 
  Select, 
  Space, 
  Modal, 
  Form, 
  Input,
  message,
  Row,
  Col,
  Statistic,
  Progress,
  Tooltip,
  Divider,
  InputNumber,
  DatePicker,
  TimePicker,
  Upload,
  Image,
  Calendar
} from 'antd';
import { 
  EyeOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  PlusOutlined, 
  SearchOutlined, 
  ExclamationCircleOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  ShoppingCartOutlined, 
  DollarOutlined, 
  UserOutlined,
  PhoneOutlined,
  HomeOutlined,
  TruckOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { useOrderStats } from '../hooks/useOrderStats';
import './Orders.css';
import { CSSTransition } from 'react-transition-group';
import dayjs from 'dayjs';
import { io, Socket } from 'socket.io-client';
import { useEffect, useRef } from 'react';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface Order {
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
  deliveryDate?: string; // 'today', 'tomorrow', 'day3' (сегодня, завтра, послезавтра)
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
  cdekPvzAddress?: string; // Добавляем поле для ПВЗ СДЭК
  cdekDeliveryDate?: string; // Ожидаемая дата доставки СДЭК
  deliveryInterval?: string; // Новый интервал доставки
  callRequest?: boolean; // Запрос звонка от клиента
  callStatus?: 'requested' | 'completed' | 'not_completed'; // Статус выполнения звонка
}

interface DeliveryMethod {
  _id: string;
  name: string;
  type: string;
  costType: 'fixed' | 'percentage' | 'zone';
  fixedCost?: number;
  costPercentage?: number;
  isActive: boolean;
  // Интервалы времени доставки
  earlyOrderIntervals?: string[];
  lateOrderIntervals?: string[];
  orderTransitionTime?: string;
  useFlexibleIntervals?: boolean;
  intervalType?: 'standard' | 'flexible' | 'cdek';
  customInterval1?: string;
  customInterval2?: string;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  sku: string;
  mainImage: string;
  stockQuantity: number;
}

interface OrdersResponse {
  orders: Order[];
  page: number;
  pages: number;
  total: number;
}

async function fetchOrders(page: number = 1, status?: string, limit: number = 20): Promise<OrdersResponse> {
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

async function fetchDeliveryMethods(): Promise<DeliveryMethod[]> {
  const token = localStorage.getItem('admin_token');
  if (!token) throw new Error('No auth token');
  
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/delivery`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch delivery methods');
  const data = await response.json();
  return data.deliveryMethods || [];
}

async function fetchProducts(): Promise<Product[]> {
  const token = localStorage.getItem('admin_token');
  if (!token) throw new Error('No auth token');
  
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/products`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch products');
  const data = await response.json();
  return data.products || [];
}

// Функция для форматирования даты доставки
function formatDeliveryDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  
  // Если дата в формате YYYY-MM-DD
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
  
  // Если today/tomorrow/day3 — преобразуем в реальную дату
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

// Функция для получения полной даты и времени доставки
function getDeliveryDateTime(order: Order): string {
  if (!order?.deliveryDate) return 'Не указано';
  
  const dateText = formatDeliveryDate(order.deliveryDate);
  
  if (order?.deliveryInterval) {
    return `${dateText} в ${order.deliveryInterval}`;
  } else {
    return dateText;
  }
}

function normalizeDeliveryDate(dateStr: string | undefined): string | undefined {
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

const Orders: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [form] = Form.useForm();
  const { data: orderStats } = useOrderStats();
  const [availableTimeIntervals, setAvailableTimeIntervals] = useState<string[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isBulkStatusModalVisible, setIsBulkStatusModalVisible] = useState(false);
  const [isBulkDeleteModalVisible, setIsBulkDeleteModalVisible] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [isCallConfirmationModalVisible, setIsCallConfirmationModalVisible] = useState(false);
  const [orderForCallConfirmation, setOrderForCallConfirmation] = useState<Order | null>(null);
  // Удаляем локальное состояние callStatuses, так как теперь используем callStatus из заказа

  // Socket.IO для мгновенного обновления заказов
  const socketRef = useRef<Socket | null>(null);
  const [ordersData, setOrdersData] = useState<Order[]>([]);
  
  useEffect(() => {
    // Создаем подключение к Socket.IO
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';
    const socketUrl = apiUrl.replace('/api', '');
    
    console.log('🔌 Admin connecting to Socket.IO:', socketUrl);
    
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    // Обработка подключения
    socket.on('connect', () => {
      console.log('🔌 Admin Socket.IO connected:', socket.id);
      
      // Подключаемся к общей комнате для получения всех обновлений заказов
      socket.emit('joinOrderRoom', 'general');
      console.log('🔌 Admin joined general room');
    });

    // Обработка отключения
    socket.on('disconnect', () => {
      console.log('🔌 Admin Socket.IO disconnected');
    });

    // Обработка ошибок
    socket.on('connect_error', (error: Error) => {
      console.error('🔌 Admin Socket.IO connection error:', error);
    });

    // Подписка на обновления заказов
    socket.on('order-updated', (data: { orderId: string; type: string; callRequest?: boolean; callStatus?: string }) => {
      console.log('📦 Admin received order update via Socket.IO:', data);
      
      // Мгновенно обновляем конкретный заказ в списке
      if (data.type === 'call-request' || data.type === 'call-status') {
        setOrdersData(prevOrders => 
          prevOrders.map(order => 
            order._id === data.orderId 
              ? { 
                  ...order, 
                  callRequest: data.callRequest !== undefined ? data.callRequest : order.callRequest,
                  callStatus: data.callStatus !== undefined ? (data.callStatus as 'requested' | 'completed' | 'not_completed') : order.callStatus
                }
              : order
          )
        );
      } else {
        // Для других типов обновлений обновляем весь список
        refetch();
      }
    });

    // Очистка при размонтировании
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Загружаем методы доставки и товары для расширенного редактора
  const { data: deliveryMethods = [] } = useQuery<DeliveryMethod[]>({
    queryKey: ['deliveryMethods'],
    queryFn: fetchDeliveryMethods,
    enabled: !!localStorage.getItem('admin_token'),
    staleTime: 5 * 60 * 1000, // 5 минут
    cacheTime: 10 * 60 * 1000, // 10 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: fetchProducts,
    enabled: !!localStorage.getItem('admin_token'),
    staleTime: 5 * 60 * 1000, // 5 минут
    cacheTime: 10 * 60 * 1000, // 10 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data, isLoading, error, refetch } = useQuery<OrdersResponse>({
    queryKey: ['adminOrders', currentPage, selectedStatus, pageSize],
    queryFn: () => fetchOrders(currentPage, selectedStatus, pageSize),
    retry: 1,
    retryDelay: 1000,
    enabled: !!localStorage.getItem('admin_token'),
    staleTime: 30 * 1000, // 30 секунд
    refetchOnWindowFocus: false,
  });

  // Обновляем локальное состояние при получении новых данных
  useEffect(() => {
    if (data?.orders) {
      setOrdersData(data.orders);
    }
  }, [data?.orders]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'confirmed': return 'blue';
      case 'processing': return 'purple';
      case 'shipped': return 'indigo';
      case 'delivered': return 'green';
      case 'cancelled': return 'red';
      default: return 'default';
    }
  }, []);

  const getStatusText = useCallback((status: string) => {
    switch (status) {
      case 'pending': return 'Ожидает подтверждения';
      case 'confirmed': return 'Подтвержден';
      case 'processing': return 'В обработке';
      case 'shipped': return 'Отправлен';
      case 'delivered': return 'Доставлен';
      case 'cancelled': return 'Отменен';
      default: return status;
    }
  }, []);

  const getPaymentMethodText = useCallback((method: string) => {
    switch (method) {
      case 'card': return 'Банковская карта';
      case 'cash': return 'Наличными при получении';
      case 'bank_transfer': return 'Банковский перевод';
      default: return method;
    }
  }, []);

  const getDeliveryDateText = useCallback((date: string | undefined, deliveryMethod?: any) => {
    if (!date) return 'Дата не указана';
    
    // Для СДЭК не показываем дату доставки
    if (deliveryMethod?.name && deliveryMethod.name.toLowerCase().includes('сдэк')) {
      return 'СДЭК';
    }
    
    switch (date) {
      case 'today': return 'Сегодня';
      case 'tomorrow': return 'Завтра';
      case 'day3': return 'Послезавтра';
      default: return date;
    }
  }, []);



  const handleStatusChange = useCallback((value: string) => {
    setSelectedStatus(value);
    setCurrentPage(1);
  }, []);

  const handlePageSizeChange = useCallback((current: number, size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const handleUpdateOrder = useCallback(async (values: any) => {
    if (!selectedOrder) return;

    try {
      const token = localStorage.getItem('admin_token');
      
      // Подготавливаем данные для отправки
      const updateData = {
        status: values.status,
        paymentStatus: values.paymentStatus,
        paymentMethod: values.paymentMethod,
        deliveryMethod: values.deliveryMethod,
        deliveryDate: values.deliveryDate ? values.deliveryDate.format('YYYY-MM-DD') : undefined,
        trackingNumber: values.trackingNumber,
        estimatedDelivery: values.estimatedDelivery,
        notes: values.notes,
        shipping: values.shipping,
        deliveryInterval: values.deliveryInterval, // Добавляем интервал доставки
        cdekPvzAddress: values.cdekPvzAddress, // Добавляем адрес ПВЗ СДЭК
        // Контактные данные
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        address: values.address,
        city: values.city,
        state: values.state,
        zipCode: values.zipCode,
        country: values.country,
        // Товары
        items: values.items
      };

      console.log('📤 Sending order update:', {
        orderId: selectedOrder._id,
        updateData: updateData,
        shippingValue: values.shipping,
        shippingType: typeof values.shipping
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/orders/${selectedOrder._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updateData)
        }
      );

      console.log('📥 Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Order updated successfully:', result);
        message.success('Заказ успешно обновлен');
        closeModal();
        refetch();
      } else {
        const errorData = await response.json();
        console.error('❌ Error updating order:', errorData);
        message.error(errorData.message || 'Ошибка при обновлении заказа');
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      message.error('Ошибка сети');
    }
  }, [selectedOrder, refetch]);

  const showUpdateModal = React.useCallback((order: Order) => {
    setSelectedOrder(order);
    
    // Определяем интервалы времени для выбранного способа доставки
    let intervals: string[] = [];
    if (order.deliveryMethod?._id) {
      const selectedMethod = deliveryMethods.find(m => m._id === order.deliveryMethod?._id);
      if (selectedMethod) {
        const methodName = selectedMethod.name.toLowerCase();
        
        if (methodName.includes('сдэк') || methodName.includes('cdek')) {
          // Для СДЭК нет интервалов времени
          intervals = [];
        } else if (methodName.includes('срочная') || methodName.includes('самовывоз')) {
          // Для срочной доставки и самовывоза используем интервалы из настроек
          if (selectedMethod.customInterval1) {
            intervals.push(selectedMethod.customInterval1);
          }
          if (selectedMethod.customInterval2) {
            intervals.push(selectedMethod.customInterval2);
          }
          // Если нет настроенных интервалов, используем стандартные интервалы
          if (intervals.length === 0) {
            intervals = ['10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00', '18:00-19:00'];
          }
        } else {
          // Для остальных типов используем настройки из БД
          if (selectedMethod.useFlexibleIntervals) {
            if (selectedMethod.earlyOrderIntervals && selectedMethod.earlyOrderIntervals.length > 0) {
              intervals = [...intervals, ...selectedMethod.earlyOrderIntervals];
            }
            if (selectedMethod.lateOrderIntervals && selectedMethod.lateOrderIntervals.length > 0) {
              intervals = [...intervals, ...selectedMethod.lateOrderIntervals];
            }
          } else {
            if (selectedMethod.customInterval1) {
              intervals.push(selectedMethod.customInterval1);
            }
            if (selectedMethod.customInterval2) {
              intervals.push(selectedMethod.customInterval2);
            }
          }
          
          if (intervals.length === 0) {
            intervals = ['13:00-17:00', '17:00-21:00'];
          }
        }
      }
    }
    setAvailableTimeIntervals(intervals);
    
    form.setFieldsValue({
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      deliveryMethod: order.deliveryMethod?._id,
      deliveryDate: order.deliveryDate ? dayjs(normalizeDeliveryDate(order.deliveryDate)) : null,
      trackingNumber: order.trackingNumber || '',
      estimatedDelivery: order.estimatedDelivery ? new Date(order.estimatedDelivery).toISOString().split('T')[0] : 
                       (order.cdekDeliveryDate ? new Date(order.cdekDeliveryDate).toISOString().split('T')[0] : ''),
      notes: order.notes || '',
      shipping: order.shipping || 0,
      deliveryInterval: order.deliveryInterval || '',
      callRequest: order.callRequest || false,
      cdekPvzAddress: order.cdekPvzAddress || '',
      // Контактные данные
      firstName: order.shippingAddress.firstName,
      lastName: order.shippingAddress.lastName,
      email: order.shippingAddress.email,
      phone: order.shippingAddress.phone,
      address: order.shippingAddress.address,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      zipCode: order.shippingAddress.zipCode,
      country: order.shippingAddress.country,
      // Товары
      items: order.items
    });
    setIsUpdateModalVisible(true);
  }, [deliveryMethods]);



  // Функция для принудительного обновления формы (для пересчета сумм)
  const forceUpdate = useCallback(() => {
    form.validateFields().then(() => {
      // Форма обновится автоматически
    });
  }, [form]);

  const calculateTotal = useCallback((items: any[]) => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, []);

  const closeModal = useCallback(() => {
    setIsUpdateModalVisible(false);
    setSelectedOrder(null);
    form.resetFields();
  }, [form]);

  // Функции для обработки звонков
  const showCallConfirmationModal = useCallback((order: Order) => {
    setOrderForCallConfirmation(order);
    setIsCallConfirmationModalVisible(true);
  }, []);

  const handleCallConfirmation = useCallback(async (called: boolean) => {
    if (!orderForCallConfirmation) return;
    
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/orders/${orderForCallConfirmation._id}/call-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ called })
      });
      
      if (response.ok) {
        // Обновляем заказ в списке после изменения статуса звонка
        refetch();
        message.success(called ? 'Звонок отмечен как выполненный' : 'Звонок отмечен как невыполненный');
      } else {
        message.error('Ошибка при обновлении статуса звонка');
      }
    } catch (error) {
      message.error('Ошибка сети');
    } finally {
      setIsCallConfirmationModalVisible(false);
      setOrderForCallConfirmation(null);
    }
  }, [orderForCallConfirmation]);

  const closeCallConfirmationModal = useCallback(() => {
    setIsCallConfirmationModalVisible(false);
    setOrderForCallConfirmation(null);
  }, []);

  // Массовое изменение статуса
  const handleBulkStatusChange = async () => {
    setIsBulkLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/orders/bulk-update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderIds: selectedRowKeys, status: bulkStatus })
      });
      if (response.ok) {
        message.success('Статус заказов успешно обновлён');
        setSelectedRowKeys([]);
        setIsBulkStatusModalVisible(false);
        refetch();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Ошибка при обновлении статуса');
      }
    } catch (e) {
      message.error('Ошибка сети');
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Массовое удаление
  const handleBulkDelete = async () => {
    setIsBulkLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/orders/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderIds: selectedRowKeys })
      });
      if (response.ok) {
        message.success('Выбранные заказы удалены');
        setSelectedRowKeys([]);
        setIsBulkDeleteModalVisible(false);
        refetch();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Ошибка при удалении заказов');
      }
    } catch (e) {
      message.error('Ошибка сети');
    } finally {
      setIsBulkLoading(false);
    }
  };

  // rowSelection для Table
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => setSelectedRowKeys(newSelectedRowKeys),
    preserveSelectedRowKeys: false,
  };

  const columns = React.useMemo(() => [
    {
      title: 'Заказ',
      key: 'order',
      render: (_: any, record: Order) => (
        <div className="space-y-1">
          <div className="font-mono font-semibold text-blue-600">
            {record.orderNumber}
          </div>
          <div className="text-xs text-gray-500">
            {new Date(record.createdAt).toLocaleDateString('ru-RU')} {new Date(record.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      )
    },
    {
      title: 'Клиент',
      key: 'customer',
      render: (_: any, record: Order) => (
        <Tooltip title={record.userId.email}>
          <div className="cursor-pointer">
            <div className="font-medium flex items-center gap-1">
              <UserOutlined className="text-gray-400" />
              {record.userId.firstName} {record.userId.lastName}
            </div>
            <div className="text-xs text-gray-500 truncate max-w-[120px]">
              {record.userId.email}
            </div>
          </div>
        </Tooltip>
      )
    },
    {
      title: 'Товары',
      key: 'items',
      render: (_: any, record: Order) => (
        <Tooltip title={record.items.map(item => item.name).join(', ')}>
          <div className="cursor-pointer">
            <div className="flex items-center gap-1">
              <ShoppingCartOutlined className="text-gray-400" />
              <span className="font-medium">{record.items.length}</span>
              <span className="text-xs text-gray-500">шт.</span>
            </div>
            <div className="text-xs text-gray-500 truncate max-w-[100px]">
              {record.items.slice(0, 1).map(item => item.name).join(', ')}
              {record.items.length > 1 && '...'}
            </div>
          </div>
        </Tooltip>
      )
    },
    {
      title: 'Сумма',
      dataIndex: 'total',
      key: 'total',
      render: (total: number, record: Order) => (
        <div>
          <div className="font-semibold text-green-600 flex items-center gap-1">
            <DollarOutlined />
            {total.toLocaleString()} ₽
          </div>
          <div className="text-xs text-gray-500">
            {record.paymentStatus === 'paid' ? 'Оплачен' : 'Не оплачен'}
          </div>
        </div>
      )
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          pending: { color: 'orange', icon: <ExclamationCircleOutlined /> },
          confirmed: { color: 'blue', icon: <CheckCircleOutlined /> },
          processing: { color: 'purple', icon: <ClockCircleOutlined /> },
          shipped: { color: 'indigo', icon: <ClockCircleOutlined /> },
          delivered: { color: 'green', icon: <CheckCircleOutlined /> },
          cancelled: { color: 'red', icon: <ExclamationCircleOutlined /> }
        };
        const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', icon: null };
        
        return (
          <Tag 
            color={config.color} 
            className={`status-tag ${status === 'pending' ? 'animate-pulse' : ''}`}
            style={{ animation: status === 'pending' ? 'pulse 2s infinite' : 'none' }}
          >
            <div className="flex items-center gap-1">
              {config.icon}
              <span className="text-xs font-medium leading-tight">{getStatusText(status)}</span>
            </div>
          </Tag>
        );
      }
    },
    {
      title: 'Доставка',
      key: 'delivery',
      render: (_: any, record: Order) => (
        <div className="space-y-1">
          <div className="text-xs font-medium">
            {record.deliveryMethod?.name || 'Не указано'}
          </div>
          <div className="text-xs text-gray-500">
            {getDeliveryDateTime(record)}
          </div>
        </div>
      )
    },
    {
      title: 'Звонок',
      key: 'callRequest',
      render: (_: any, record: Order) => (
        <div className="flex items-center justify-center">
          {record.callRequest ? (
            record.callStatus === 'completed' ? (
              <Tag color="green" icon={<CheckCircleOutlined />} className="flex items-center gap-1">
                <span className="text-xs">Звонок выполнен</span>
              </Tag>
            ) : (
              <Tooltip title="Кликните, чтобы отметить звонок как выполненный">
                <Button
                  type="text"
                  icon={<PhoneOutlined />}
                  className="phone-call-button"
                  onClick={() => showCallConfirmationModal(record)}
                />
              </Tooltip>
            )
          ) : (
            <span className="text-gray-400 text-xs">—</span>
          )}
        </div>
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Order) => (
        <Space size="small">
          <Tooltip title="Просмотр заказа">
            <Button 
              type="primary" 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => navigate(`/orders/${record._id}`)}
              className="hover:scale-105 transition-transform"
            />
          </Tooltip>
          <Tooltip title="Редактировать заказ">
            <Button 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => showUpdateModal(record)}
              className="hover:scale-105 transition-transform"
            />
          </Tooltip>
        </Space>
      )
    }
  ], [navigate, showUpdateModal, getStatusText, getDeliveryDateText, showCallConfirmationModal]);

  if (isLoading) return <div>Загрузка заказов...</div>;
  if (error) return <div>Ошибка загрузки заказов</div>;

  // Вычисляем количество заказов за сегодня, если нет в orderStats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOrders = data?.orders?.filter(order => {
    const created = new Date(order.createdAt);
    created.setHours(0, 0, 0, 0);
    return created.getTime() === today.getTime();
  }).length || 0;

  // Новый адаптивный layout и стили
  return (
    <>
      <div className="orders-page-responsive" style={{ 
        width: '100%', 
        maxWidth: 1400, 
        margin: '0 auto', 
        padding: '0', 
        background: 'none',
        paddingBottom: '20px' // Отступ для панели массовых действий
      }}>
      {/* Заголовок и подзаголовок */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, color: '#667eea', fontWeight: 700, letterSpacing: 0.5 }}>Заказы</Title>
        <div style={{ color: '#6b7280', fontSize: 16, marginTop: 4 }}>Управление заказами и отслеживание статусов</div>
      </div>

      {/* Горизонтальный блок статистики */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        <Card style={{ flex: 1, minWidth: 160, borderRadius: 12, boxShadow: '0 2px 8px rgba(102,126,234,0.08)', border: 'none', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
          <Statistic title={<span style={{ color: '#667eea', fontWeight: 500 }}>Всего заказов</span>} value={orderStats?.total || 0} prefix={<ShoppingCartOutlined />} />
        </Card>
        <Card style={{ flex: 1, minWidth: 160, borderRadius: 12, boxShadow: '0 2px 8px rgba(102,126,234,0.08)', border: 'none', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
          <Statistic title={<span style={{ color: '#10b981', fontWeight: 500 }}>В обработке</span>} value={orderStats?.processing || 0} prefix={<ClockCircleOutlined />} />
        </Card>
        <Card style={{ flex: 1, minWidth: 160, borderRadius: 12, boxShadow: '0 2px 8px rgba(102,126,234,0.08)', border: 'none', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
          <Statistic title={<span style={{ color: '#ef4444', fontWeight: 500 }}>Отменено</span>} value={orderStats?.cancelled || 0} prefix={<ExclamationCircleOutlined />} />
        </Card>
        <Card style={{ flex: 1, minWidth: 160, borderRadius: 12, boxShadow: '0 2px 8px rgba(102,126,234,0.08)', border: 'none', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
          <Statistic title={<span style={{ color: '#52c41a', fontWeight: 500 }}>Заказов сегодня</span>} value={todayOrders} prefix={<PlusOutlined />} />
        </Card>
      </div>

      {/* Финансовая статистика */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        <Card style={{ flex: 1, minWidth: 160, borderRadius: 12, boxShadow: '0 2px 8px rgba(16,185,129,0.08)', border: 'none', background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' }}>
          <Statistic 
            title={<span style={{ color: '#10b981', fontWeight: 500 }}>Прибыль за сегодня</span>} 
            value={orderStats?.todayProfit || 0} 
            prefix={<DollarOutlined />}
            suffix="₽"
            valueStyle={{ color: '#10b981' }}
          />
        </Card>
        <Card style={{ flex: 1, minWidth: 160, borderRadius: 12, boxShadow: '0 2px 8px rgba(59,130,246,0.08)', border: 'none', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' }}>
          <Statistic 
            title={<span style={{ color: '#3b82f6', fontWeight: 500 }}>Оборот за сегодня</span>} 
            value={orderStats?.todayRevenue || 0} 
            prefix={<DollarOutlined />}
            suffix="₽"
            valueStyle={{ color: '#3b82f6' }}
          />
        </Card>
        <Card style={{ flex: 1, minWidth: 160, borderRadius: 12, boxShadow: '0 2px 8px rgba(16,185,129,0.08)', border: 'none', background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' }}>
          <Statistic 
            title={<span style={{ color: '#10b981', fontWeight: 500 }}>Прибыль за месяц</span>} 
            value={orderStats?.monthProfit || 0} 
            prefix={<DollarOutlined />}
            suffix="₽"
            valueStyle={{ color: '#10b981' }}
          />
        </Card>
        <Card style={{ flex: 1, minWidth: 160, borderRadius: 12, boxShadow: '0 2px 8px rgba(59,130,246,0.08)', border: 'none', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' }}>
          <Statistic 
            title={<span style={{ color: '#3b82f6', fontWeight: 500 }}>Оборот за месяц</span>} 
            value={orderStats?.monthRevenue || 0} 
            prefix={<DollarOutlined />}
            suffix="₽"
            valueStyle={{ color: '#3b82f6' }}
          />
        </Card>
      </div>

      {/* Фильтры и кнопка */}
      <div className="orders-header-bar" style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, marginBottom: 24, padding: '0 0 16px 0', borderBottom: '1px solid #e5e7eb',
        background: 'none'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'flex-start', flex: 2 }}>
          <Select
            value={selectedStatus}
            onChange={handleStatusChange}
            placeholder="Статус заказа"
            style={{ minWidth: 160 }}
            allowClear
            size="middle"
          >
            <Option value="">Все статусы</Option>
            <Option value="pending">Ожидает подтверждения</Option>
            <Option value="confirmed">Подтвержден</Option>
            <Option value="processing">В обработке</Option>
            <Option value="shipped">Отправлен</Option>
            <Option value="delivered">Доставлен</Option>
            <Option value="cancelled">Отменен</Option>
          </Select>
          <Select
            value={pageSize}
            onChange={(value) => {
              setPageSize(value);
              setCurrentPage(1);
            }}
            style={{ minWidth: 120 }}
            size="middle"
          >
            <Option value={10}>10 на странице</Option>
            <Option value={20}>20 на странице</Option>
            <Option value={50}>50 на странице</Option>
            <Option value={100}>100 на странице</Option>
            <Option value={200}>200 на странице</Option>
          </Select>
          <Button icon={<SearchOutlined />} onClick={() => refetch()} size="middle" type="default" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(102,126,234,0.08)' }}>Поиск</Button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flex: 1, minWidth: 180 }}>
          <Button type="primary" icon={<PlusOutlined />} size="large" style={{ borderRadius: 10, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', fontWeight: 600, boxShadow: '0 2px 8px rgba(16,185,129,0.15)' }}>
            Создать заказ
          </Button>
        </div>
      </div>

      {/* Панель массовых действий - над заказами */}
      <CSSTransition
        in={selectedRowKeys.length > 0}
        timeout={200}
        classNames="bulk-panel"
        unmountOnExit
      >
        <div className="bulk-actions-panel" style={{
          background: 'rgba(255, 255, 255, 0.98)',
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(102,126,234,0.15)',
          border: '1px solid rgba(102,126,234,0.1)',
          padding: '16px 24px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          minHeight: 60,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 600, color: '#667eea', fontSize: 16 }}>Выбрано: {selectedRowKeys.length}</span>
            <span style={{ color: '#6b7280', fontSize: 14 }}>заказ(ов)</span>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button 
              type="primary" 
              onClick={() => setIsBulkStatusModalVisible(true)} 
              disabled={isBulkLoading} 
              style={{ borderRadius: 8, fontWeight: 600, minWidth: 140 }}
              icon={<EditOutlined />}
            >
              Изменить статус
            </Button>
            <Button 
              danger 
              onClick={() => setIsBulkDeleteModalVisible(true)} 
              disabled={isBulkLoading} 
              style={{ borderRadius: 8, fontWeight: 600, minWidth: 100 }}
              icon={<DeleteOutlined />}
            >
              Удалить
            </Button>
            <Button 
              onClick={() => setSelectedRowKeys([])} 
              style={{ borderRadius: 8, minWidth: 100 }}
              icon={<CloseOutlined />}
            >
              Сбросить
            </Button>
          </div>
        </div>
      </CSSTransition>

      {/* Таблица заказов */}
      <div style={{ background: 'rgba(255,255,255,0.98)', borderRadius: 16, boxShadow: '0 4px 24px rgba(102,126,234,0.08)', padding: 16, overflowX: 'auto' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#6b7280', fontSize: 14 }}>
            Показано {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, data?.total || 0)} из {data?.total || 0} заказов
            {selectedRowKeys.length > 0 && (
              <span style={{ marginLeft: 12, color: '#667eea', fontWeight: 600 }}>
                • Выбрано: {selectedRowKeys.length}
              </span>
            )}
          </div>
          <div style={{ color: '#6b7280', fontSize: 14 }}>
            Размер страницы: {pageSize}
          </div>
        </div>
        <Table
          className="orders-table"
          dataSource={ordersData.length > 0 ? ordersData : (data?.orders || [])}
          loading={isLoading}
          rowKey="_id"
          rowSelection={rowSelection}
          pagination={{
            current: currentPage,
            total: data?.total,
            pageSize: pageSize,
            onChange: setCurrentPage,
            showSizeChanger: true,
            onShowSizeChange: handlePageSizeChange,
            style: { marginTop: 24 }
          }}
          scroll={{ x: 'max-content' }}
          bordered={false}
          style={{ minWidth: 900 }}
          columns={columns}
        />
      </div>

      {/* Модальные окна */}
      <Modal
        title="Массовое изменение статуса"
        open={isBulkStatusModalVisible}
        onOk={handleBulkStatusChange}
        onCancel={() => setIsBulkStatusModalVisible(false)}
        confirmLoading={isBulkLoading}
      >
        <Select
          value={bulkStatus}
          onChange={setBulkStatus}
          placeholder="Выберите новый статус"
          style={{ width: '100%' }}
        >
          <Option value="pending">Ожидает подтверждения</Option>
          <Option value="confirmed">Подтвержден</Option>
          <Option value="processing">В обработке</Option>
          <Option value="shipped">Отправлен</Option>
          <Option value="delivered">Доставлен</Option>
          <Option value="cancelled">Отменен</Option>
        </Select>
      </Modal>

      <Modal
        title="Подтверждение удаления"
        open={isBulkDeleteModalVisible}
        onOk={handleBulkDelete}
        onCancel={() => setIsBulkDeleteModalVisible(false)}
        confirmLoading={isBulkLoading}
        okText="Удалить"
        cancelText="Отмена"
        okButtonProps={{ danger: true }}
      >
        <p>Вы уверены, что хотите удалить <b>{selectedRowKeys.length}</b> заказ(ов)? Это действие необратимо.</p>
      </Modal>

      {/* Модальное окно подтверждения звонка */}
      <Modal
        title="Подтверждение звонка"
        open={isCallConfirmationModalVisible}
        onCancel={closeCallConfirmationModal}
        onOk={() => handleCallConfirmation(true)}
        okText="Да"
        cancelText="Нет"
        confirmLoading={isBulkLoading}
      >
        <div>
          <p>Клиент запросил звонок. Вы хотите отметить этот звонок как выполненный?</p>
          {orderForCallConfirmation && (
            <p style={{ marginTop: 8, fontWeight: 600, color: '#667eea' }}>
              <strong>Номер телефона: {orderForCallConfirmation.shippingAddress.phone}</strong>
            </p>
          )}
        </div>
      </Modal>

      {/* Модальное окно редактирования заказа */}
      <Modal
        title="Редактировать заказ"
        open={isUpdateModalVisible}
        onCancel={closeModal}
        footer={null}
        width={800}
        className="order-edit-modal"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateOrder}
          className="order-edit-form"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="status"
                label="Статус заказа"
                rules={[{ required: true, message: 'Выберите статус' }]}
              >
                <Select>
                  <Option value="pending">Ожидает подтверждения</Option>
                  <Option value="confirmed">Подтвержден</Option>
                  <Option value="processing">В обработке</Option>
                  <Option value="shipped">Отправлен</Option>
                  <Option value="delivered">Доставлен</Option>
                  <Option value="cancelled">Отменен</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="paymentStatus"
                label="Статус оплаты"
                rules={[{ required: true, message: 'Выберите статус оплаты' }]}
              >
                <Select>
                  <Option value="pending">Ожидает оплаты</Option>
                  <Option value="paid">Оплачен</Option>
                  <Option value="failed">Ошибка оплаты</Option>
                  <Option value="refunded">Возврат</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="paymentMethod"
                label="Способ оплаты"
                rules={[{ required: true, message: 'Выберите способ оплаты' }]}
              >
                <Select>
                  <Option value="card">Банковская карта</Option>
                  <Option value="cash">Наличными при получении</Option>
                  <Option value="bank_transfer">Банковский перевод</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="deliveryMethod"
                label="Способ доставки"
              >
                <Select placeholder="Выберите способ доставки">
                  {deliveryMethods.map(method => (
                    <Option key={method._id} value={method._id}>
                      {method.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="deliveryDate"
                label="Дата доставки"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="deliveryInterval"
                label="Интервал доставки"
              >
                <Select placeholder="Выберите интервал">
                  {availableTimeIntervals.map(interval => (
                    <Option key={interval} value={interval}>
                      {interval}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="trackingNumber"
                label="Трек-номер"
              >
                <Input placeholder="Введите трек-номер" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="estimatedDelivery"
                label="Ожидаемая дата доставки"
              >
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="shipping"
                label="Стоимость доставки"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0"
                  min={0}
                  formatter={(value: number | string | undefined) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value: string | undefined) => value ? value.replace(/\$\s?|(,*)/g, '') : ''}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="cdekPvzAddress"
                label="Адрес ПВЗ"
              >
                <Input 
                  placeholder="Введите адрес пункта выдачи СДЭК" 
                  style={{ color: '#667eea', fontWeight: 500 }} 
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Контактные данные</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="firstName"
                label="Имя"
                rules={[{ required: true, message: 'Введите имя' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="lastName"
                label="Фамилия"
                rules={[{ required: true, message: 'Введите фамилию' }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Введите email' },
                  { type: 'email', message: 'Введите корректный email' }
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Телефон"
                rules={[{ required: true, message: 'Введите телефон' }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="address"
            label="Адрес"
            rules={[{ required: true, message: 'Введите адрес' }]}
          >
            <Input.TextArea rows={2} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="city"
                label="Город"
                rules={[{ required: true, message: 'Введите город' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="state"
                label="Область"
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="zipCode"
                label="Индекс"
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Товары</Divider>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} style={{ marginBottom: 16, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'name']}
                          label="Название товара"
                          rules={[{ required: true, message: 'Введите название товара' }]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item
                          {...restField}
                          name={[name, 'price']}
                          label="Цена"
                          rules={[{ required: true, message: 'Введите цену' }]}
                        >
                          <InputNumber
                            style={{ width: '100%' }}
                            min={0}
                            formatter={(value: number | string | undefined) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(value: string | undefined) => value ? value.replace(/\$\s?|(,*)/g, '') : ''}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item
                          {...restField}
                          name={[name, 'quantity']}
                          label="Количество"
                          rules={[{ required: true, message: 'Введите количество' }]}
                        >
                          <InputNumber
                            style={{ width: '100%' }}
                            min={1}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item
                          {...restField}
                          name={[name, 'sku']}
                          label="SKU"
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item label="Сумма">
                          <div className="item-total">
                            {(() => {
                              const price = form.getFieldValue(['items', name, 'price']) || 0;
                              const quantity = form.getFieldValue(['items', name, 'quantity']) || 0;
                              return `${(price * quantity).toLocaleString()} ₽`;
                            })()}
                          </div>
                        </Form.Item>
                      </Col>
                    </Row>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(name)}
                      className="delete-item-btn"
                    >
                      Удалить товар
                    </Button>
                  </div>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Добавить товар
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item
            name="notes"
            label="Примечания"
          >
            <Input.TextArea rows={3} placeholder="Дополнительная информация о заказе" />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Button onClick={closeModal} style={{ marginRight: 8 }}>
              Отмена
            </Button>
            <Button type="primary" htmlType="submit">
              Обновить заказ
            </Button>
          </div>
        </Form>
      </Modal>
      </div>
    </>
  );
});

export default Orders; 