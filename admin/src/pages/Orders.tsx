import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from 'react-query';
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
  Calendar,
  AutoComplete
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
  CloseOutlined,
  SyncOutlined,
  PhoneTwoTone,
  HistoryOutlined,
  InboxOutlined
} from '@ant-design/icons';
import { useOrderStats } from '../hooks/useOrderStats';
import CustomerCell from '../components/CustomerCell';
import SearchInput from '../components/SearchInput';
import './Orders.css';
import { CSSTransition } from 'react-transition-group';
import dayjs from 'dayjs';
import { io, Socket } from 'socket.io-client';
import { useEffect, useRef } from 'react';
import debounce from 'lodash.debounce';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface Order {
  _id: string;
  orderNumber: string;
  userId?: string;
  deliveredOrdersCount?: number;
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    isPartiallyRegistered?: boolean;
  };
  items: Array<{
    productId?: string; // ID товара из базы данных (опционально)
    name: string;
    price: number;
    costPrice?: number; // Себестоимость товара на момент заказа
    quantity: number;
    image: string;
    sku: string;
  }>;
  subtotal: number;
  shipping: number;
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'with_courier';
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
  cdekPvzCode?: string; // Код ПВЗ СДЭК
  cdekDeliveryDate?: string; // Ожидаемая дата доставки СДЭК
  deliveryInterval?: string; // Новый интервал доставки
  callRequest?: boolean; // Запрос звонка от клиента
  callStatus?: 'requested' | 'completed' | 'not_completed'; // Статус выполнения звонка
  callAttempts?: { date: string; status: string }[]; // История неудачных попыток дозвона
}

interface DeliveryMethod {
  _id: string;
  name: string;
  type: string;
  costType: 'fixed' | 'percentage' | 'zone' | 'fixed_plus_percentage';
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
  allowedPaymentMethods?: string[]; // Добавляем новое поле
}

interface Product {
  _id: string;
  name: string;
  price: number;
  costPrice?: number;
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

async function fetchOrders(page: number = 1, status?: string, limit: number = 20, deliveryFilter?: string, search?: string): Promise<OrdersResponse> {
  const token = localStorage.getItem('admin_token');
  if (!token) throw new Error('No auth token');
  
  let url = `${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/orders?page=${page}&limit=${limit}`;
  if (status) url += `&status=${status}`;
  if (deliveryFilter) url += `&deliveryFilter=${deliveryFilter}`;
  if (search) url += `&search=${search}`;
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch orders');
  return response.json();
}

async function fetchDeliveryMethods(): Promise<DeliveryMethod[]> {
  const token = localStorage.getItem('admin_token');
  if (!token) throw new Error('No auth token');
  
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/delivery`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch delivery methods');
  const data = await response.json();
  return data.deliveryMethods || [];
}

async function fetchProducts(): Promise<Product[]> {
  const token = localStorage.getItem('admin_token');
  if (!token) throw new Error('No auth token');
  
  console.log('Загружаем товары...');
  
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/products`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) {
    console.error('Ошибка загрузки товаров:', response.status, response.statusText);
    throw new Error('Failed to fetch products');
  }
  
  const data = await response.json();
  console.log('Получены товары:', data.products?.length || 0);
  
  if (data.products && data.products.length > 0) {
    console.log('Первый товар:', data.products[0]);
  }
  
  return data.products || [];
}

async function fetchCustomers(): Promise<any[]> {
  const token = localStorage.getItem('admin_token');
  if (!token) throw new Error('No auth token');
  
  const apiUrl = `${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/users`;
  console.log('🌐 Запрос к API:', apiUrl);
  
  const response = await fetch(apiUrl, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  console.log('📡 Ответ сервера:', response.status, response.statusText);
  
  if (!response.ok) {
    console.error('❌ Ошибка API:', response.status, response.statusText);
    throw new Error('Failed to fetch customers');
  }
  
  const data = await response.json();
  console.log('📦 Данные клиентов:', data);
  return data.users || [];
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
  // Для СДЭК используем ожидаемую дату доставки
  if (order?.cdekPvzAddress && order?.cdekDeliveryDate) {
    const cdekDate = new Date(order.cdekDeliveryDate);
    return cdekDate.toLocaleDateString('ru-RU');
  }
  
  // Для обычной доставки
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
  const queryClient = useQueryClient();
  
  // --- ХУКИ ДЛЯ АДМИНОВ (ДОЛЖНЫ БЫТЬ САМЫЕ ПЕРВЫЕ!) ---
  const [admins, setAdmins] = useState<any[]>([]);
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(users => {
        setAdmins(Array.isArray(users) ? users.filter((u: any) => u.role === 'admin') : []);
      })
      .catch(() => setAdmins([]));
  }, []);

  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [deliveryFilter, setDeliveryFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState('');
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [form] = Form.useForm();
  const { data: orderStats, refetch: refetchStats } = useOrderStats();
  const [availableTimeIntervals, setAvailableTimeIntervals] = useState<string[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isBulkStatusModalVisible, setIsBulkStatusModalVisible] = useState(false);
  const [isBulkDeleteModalVisible, setIsBulkDeleteModalVisible] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [isCallConfirmationModalVisible, setIsCallConfirmationModalVisible] = useState(false);
  const [orderForCallConfirmation, setOrderForCallConfirmation] = useState<Order | null>(null);
  const [formKey, setFormKey] = useState(0); // Ключ для принудительного обновления формы
  const [selectedProductForField, setSelectedProductForField] = useState<{fieldName: number, product: Product} | null>(null);
  const [cdekLoading, setCdekLoading] = useState(false);
  const [cdekTrackingLoading, setCdekTrackingLoading] = useState(false);
  const [checkAllTrackingLoading, setCheckAllTrackingLoading] = useState(false);
  const [cdekConfirmModalVisible, setCdekConfirmModalVisible] = useState(false);
  const [cdekOrderData, setCdekOrderData] = useState<any>(null);
  const [packageData, setPackageData] = useState({
    weight: 2000,
    length: 20,
    width: 20,
    height: 20
  });
  const [isCallAttemptModalVisible, setIsCallAttemptModalVisible] = useState(false);
  const [orderForCallAttempt, setOrderForCallAttempt] = useState<Order | null>(null);
  const [callAttempts, setCallAttempts] = useState<{ date: string; status: string }[]>([]);
  const [callAttemptLoading, setCallAttemptLoading] = useState(false);
  
  // Состояния для сортировки
  const [sortField, setSortField] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend'>('descend');

  // Состояния для создания заказа
  const [isCreateOrderModalVisible, setIsCreateOrderModalVisible] = useState(false);
  const [createOrderForm] = Form.useForm();
  const [createOrderLoading, setCreateOrderLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [createOrderFormKey, setCreateOrderFormKey] = useState(0);
  const [customerAddresses, setCustomerAddresses] = useState<any[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<string[]>([]);

  // --- ХУКИ ИСТОРИИ ЗАКАЗОВ ---
  const [changelog, setChangelog] = useState<any[]>([]);
  const [historyModal, setHistoryModal] = useState<{open: boolean, orderId: string|null}>({open: false, orderId: null});
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<any[]>([]);
  const [arrivalModal, setArrivalModal] = useState<{open: boolean, order: Order|null}>({open: false, order: null});
  const [arrivalForm] = Form.useForm();
  const [arrivalItems, setArrivalItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  
  // Загрузка поставщиков из API
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        if (!token) return;
        
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/suppliers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          const activeSuppliers = data.filter((supplier: any) => supplier.status === 'active');
          setSuppliers(activeSuppliers);
        }
      } catch (error) {
        console.error('Error loading suppliers:', error);
        message.error('Ошибка при загрузке поставщиков');
      }
    };

    loadSuppliers();
  }, []);
  
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/admin/changelog`)
      .then(res => res.json())
      .then(data => setChangelog(Array.isArray(data) ? data : []));
  }, []);
  // --- КОНЕЦ ХУКОВ ИСТОРИИ ---

  // Обновляем данные упаковки в cdekOrderData при изменении packageData
  useEffect(() => {
    if (cdekOrderData) {
      setCdekOrderData((prev: any) => ({
        ...prev,
        packages: [packageData]
      }));
    }
  }, [packageData]);

  // Удаляем локальное состояние callStatuses, так как теперь используем callStatus из заказа

  // Socket.IO для мгновенного обновления заказов
  const socketRef = useRef<Socket | null>(null);
  const [ordersData, setOrdersData] = useState<Order[]>([]);

  // Автоматическая прокрутка вверх при загрузке страницы
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  
  useEffect(() => {
    // Создаем подключение к Socket.IO
    const apiUrl = import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api';
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
        // Для других типов обновлений обновляем весь список и статистику
        refetch();
        refetchStats(); // Обновляем статистику
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

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: fetchProducts,
    enabled: !!localStorage.getItem('admin_token'),
    staleTime: 5 * 60 * 1000, // 5 минут
    cacheTime: 10 * 60 * 1000, // 10 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Отладочная информация для товаров
  useEffect(() => {
    console.log('Товары загружены:', products.length);
    console.log('Загрузка товаров:', productsLoading);
    if (products.length > 0) {
      console.log('Первый товар:', products[0]);
    }
  }, [products, productsLoading]);

  // Используем хук useQuery для получения данных
  const { data, isLoading, error, refetch } = useQuery(
    ['orders', currentPage, selectedStatus, pageSize, deliveryFilter, searchText],
    () => fetchOrders(currentPage, selectedStatus, pageSize, deliveryFilter, searchText),
    {
      keepPreviousData: true,
      retry: 1,
      retryDelay: 1000,
      enabled: !!localStorage.getItem('admin_token'),
      staleTime: 10 * 1000, // 10 секунд для быстрого обновления фильтров
      refetchOnWindowFocus: true, // Обновляем при фокусе для актуальности данных
      refetchInterval: 30 * 1000 // Автообновление каждые 30 секунд
    }
  );

  // Флаг для отслеживания первой загрузки
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Проверяем наличие новых заказов при загрузке страницы
  const { data: newOrdersData } = useQuery<OrdersResponse>({
    queryKey: ['new-orders-check'],
    queryFn: () => fetchOrders(1, '', 1, 'new'),
    enabled: isFirstLoad && !!localStorage.getItem('admin_token'),
    staleTime: 5 * 60 * 1000, // 5 минут
    refetchOnWindowFocus: false,
  });

  // Устанавливаем фильтр по умолчанию на основе наличия новых заказов только при первой загрузке
  useEffect(() => {
    if (isFirstLoad && newOrdersData) {
      setIsFirstLoad(false);
    }
  }, [newOrdersData, isFirstLoad]);

  // Обновляем локальное состояние при получении новых данных
  useEffect(() => {
    if (data?.orders) {
      setOrdersData(data.orders);
    }
  }, [data?.orders]);

  // Обрабатываем выбранный товар для автоматического заполнения полей
  useEffect(() => {
    if (selectedProductForField && form) {
      const { fieldName, product } = selectedProductForField;
      
      console.log('Автоматически заполняем поля для товара:', product);
      console.log('Индекс поля в useEffect:', fieldName);
      
      // Устанавливаем значения полей
      const fieldsToSet = [
        {
          name: [`items.${fieldName}.name`],
          value: product.name
        },
        {
          name: [`items.${fieldName}.price`],
          value: product.price
        },
        {
          name: [`items.${fieldName}.sku`],
          value: product.sku
        },
        {
          name: [`items.${fieldName}.productId`],
          value: product._id
        },
        {
          name: [`items.${fieldName}.quantity`],
          value: 1
        },
        {
          name: [`items.${fieldName}.image`],
          value: product.mainImage
        }
      ];
      
      console.log('Устанавливаем поля в useEffect:', fieldsToSet);
      form.setFields(fieldsToSet);
      
      // Очищаем состояние
      setSelectedProductForField(null);
      
      // Принудительно обновляем компонент
      setFormKey(prev => prev + 1);
      
      // Проверяем значения после установки
      setTimeout(() => {
        console.log('Поля после установки в useEffect:', {
          name: form.getFieldValue([`items.${fieldName}.name`]),
          price: form.getFieldValue([`items.${fieldName}.price`]),
          sku: form.getFieldValue([`items.${fieldName}.sku`]),
          quantity: form.getFieldValue([`items.${fieldName}.quantity`])
        });
      }, 100);
    }
  }, [selectedProductForField, form]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'confirmed': return 'blue';
      case 'processing': return 'purple';
      case 'shipped': return 'indigo';
      case 'delivered': return 'green';
      case 'cancelled': return 'red';
      case 'with_courier': return 'cyan';
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
      case 'with_courier': return 'Передан курьеру';
      default: return status;
    }
  }, []);

  const getPaymentMethodText = useCallback((method: string) => {
    switch (method) {
      case 'cash_on_delivery': return 'Наличными при получении';
      case 'bank_card': return 'Банковской картой';
      case 'sberbank_transfer': return 'Перевод на Карту Сбербанка';
      case 'credit_purchase': return 'Купить в кредит';
      case 'usdt_payment': return 'Оплата USDT';
      default: return method;
    }
  }, []);

  // Функция для получения правильного значения paymentMethod для формы
  const getPaymentMethodValue = useCallback((method: string) => {
    console.log('🔍 getPaymentMethodValue input:', method);
    
    // Проверяем, является ли значение уже правильным ключом
    const validKeys = ['bank_card', 'cash_on_delivery', 'sberbank_transfer', 'credit_purchase', 'usdt_payment'];
    if (validKeys.includes(method)) {
      console.log('✅ Valid key found:', method);
      return method;
    }
    
    // Если это русский текст, конвертируем в ключ
    switch (method) {
      case 'Банковской картой': return 'bank_card';
      case 'Наличными при получении': return 'cash_on_delivery';
      case 'Перевод на Карту Сбербанка': return 'sberbank_transfer';
      case 'Купить в кредит': return 'credit_purchase';
      case 'Оплата USDT': return 'usdt_payment';
      default: 
        console.log('⚠️ Unknown payment method:', method);
        return method;
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

  const handleDeliveryFilterChange = useCallback((filter: string) => {
    setDeliveryFilter(filter);
    setCurrentPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedStatus('');
    setDeliveryFilter('');
    setCurrentPage(1);
    setSearchText('');
  }, []);

  // Функция для выполнения поиска с задержкой
  // Состояние для мгновенного ввода
  const [inputValue, setInputValue] = useState('');

  // Отложенный поиск
  const debouncedSearch = useRef(
    debounce((value: string) => {
      setSearchText(value);
      setCurrentPage(1);
      refetch();
    }, 2000)
  ).current;

  // Обработчик изменения ввода
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value); // Мгновенное обновление поля ввода
    debouncedSearch(value); // Отложенный поиск
  };



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
        cdekPvzCode: values.cdekPvzCode, // Добавляем код ПВЗ СДЭК
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
        deliveryDateDetails: {
          original: values.deliveryDate,
          formatted: values.deliveryDate ? values.deliveryDate.format('YYYY-MM-DD') : undefined,
          oldValue: selectedOrder.deliveryDate
        },
        shippingValue: values.shipping,
        shippingType: typeof values.shipping,
        trackingNumber: values.trackingNumber
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/orders/${selectedOrder._id}`,
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
        
        // Обновляем selectedOrder с новыми данными
        if (selectedOrder) {
          const updatedOrder = {
            ...selectedOrder,
            ...result
          };
                  console.log('🔄 Обновляем selectedOrder:', updatedOrder);
        console.log('📦 Трек-номер в ответе сервера:', result.trackingNumber);
        console.log('📦 Трек-номер в обновленном заказе:', updatedOrder.trackingNumber);
        console.log('📦 Полный ответ сервера:', JSON.stringify(result, null, 2));
          setSelectedOrder(updatedOrder);
        }
        
        closeModal();
        
        // Инвалидируем все связанные кэши для мгновенного обновления
        queryClient.invalidateQueries(['orders']);
        queryClient.invalidateQueries(['new-orders-check']);
        
        // Также вызываем refetch для текущего запроса
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
    console.log('🔍 Открываем модальное окно для редактирования заказа:', order._id);
    console.log('📦 Данные заказа для редактирования:', {
      deliveryMethod: order.deliveryMethod,
      deliveryMethodId: order.deliveryMethod?._id,
      deliveryDate: order.deliveryDate
    });
    
    // Подготавливаем все данные заранее
    let intervals: string[] = [];
    if (order.deliveryMethod?._id) {
      const selectedMethod = deliveryMethods.find(m => m._id === order.deliveryMethod?._id);
      if (selectedMethod) {
        const methodName = selectedMethod.name.toLowerCase();
        
        if (methodName.includes('сдэк') || methodName.includes('cdek')) {
          intervals = [];
        } else if (methodName.includes('срочная') || methodName.includes('самовывоз')) {
          if (selectedMethod.customInterval1) {
            intervals.push(selectedMethod.customInterval1);
          }
          if (selectedMethod.customInterval2) {
            intervals.push(selectedMethod.customInterval2);
          }
          if (intervals.length === 0) {
            intervals = ['10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00', '18:00-19:00'];
          }
        } else {
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
    
    const formValues = {
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: getPaymentMethodValue(order.paymentMethod),
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
      cdekPvzCode: order.cdekPvzCode || '',
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
    };
    
    // Устанавливаем все состояния одновременно
    setSelectedOrder(order);
    setAvailableTimeIntervals(intervals);
    setIsUpdateModalVisible(true);
    
    // Устанавливаем значения формы после открытия модального окна
    setTimeout(() => {
      console.log('📝 Устанавливаем начальные значения формы:', formValues);
    console.log('🎯 Значение deliveryMethod для формы:', formValues.deliveryMethod);
    form.setFieldsValue(formValues);
    }, 50);
  }, [deliveryMethods, form, getPaymentMethodValue, normalizeDeliveryDate]);



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
    console.log('📞 showCallConfirmationModal вызван для заказа:', order._id);
    setOrderForCallConfirmation(order);
    setIsCallConfirmationModalVisible(true);
  }, []);

  const handleCallConfirmation = useCallback(async (called: boolean) => {
    if (!orderForCallConfirmation) return;
    
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/orders/${orderForCallConfirmation._id}/call-status`, {
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
    console.log('📞 closeCallConfirmationModal вызван');
    setIsCallConfirmationModalVisible(false);
    setOrderForCallConfirmation(null);
  }, []);

  // Функции для обработки попыток дозвона
  const handleShowCallAttemptModal = useCallback((order: Order) => {
    console.log('📞 handleShowCallAttemptModal вызван для заказа:', order._id);
    setOrderForCallAttempt(order);
    setCallAttempts(order.callAttempts || []);
    setIsCallAttemptModalVisible(true);
  }, []);

  const handleCloseCallAttemptModal = useCallback(() => {
    console.log('📞 handleCloseCallAttemptModal вызван');
    setIsCallAttemptModalVisible(false);
    setOrderForCallAttempt(null);
    setCallAttempts([]);
  }, []);

  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'ascend' ? 'descend' : 'ascend');
    } else {
      setSortField(field);
      setSortOrder('descend');
    }
  }, [sortField, sortOrder]);

  // Функция для сортировки данных
  const getSortedData = useCallback(() => {
    const orders = ordersData.length > 0 ? ordersData : (data?.orders || []);
    
    if (!sortField) return orders;
    
    return [...orders].sort((a, b) => {
      let aValue: any = a[sortField as keyof Order];
      let bValue: any = b[sortField as keyof Order];
      
      // Для даты создания
      if (sortField === 'createdAt') {
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
      }
      
      // Для даты доставки
      if (sortField === 'deliveryDate') {
        // Получаем дату доставки из функции getDeliveryDateTime
        const getDeliveryDate = (order: Order) => {
          // Для СДЭК используем ожидаемую дату доставки
          if (order?.cdekPvzAddress && order?.cdekDeliveryDate) {
            return new Date(order.cdekDeliveryDate).getTime();
          }
          
          // Для обычной доставки
          if (order.deliveryDate) {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const day3 = new Date(today);
            day3.setDate(day3.getDate() + 2);
            
            if (order.deliveryDate === 'today') {
              return today.getTime();
            } else if (order.deliveryDate === 'tomorrow') {
              return tomorrow.getTime();
            } else if (order.deliveryDate === 'day3') {
              return day3.getTime();
            }
          }
          // Если нет даты доставки, используем максимальное значение
          return Number.MAX_SAFE_INTEGER;
        };
        
        aValue = getDeliveryDate(a);
        bValue = getDeliveryDate(b);
      }
      
      // Для звонков
      if (sortField === 'callRequest') {
        aValue = a.callRequest ? 1 : 0;
        bValue = b.callRequest ? 1 : 0;
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'ascend' ? aValue - bValue : bValue - aValue;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'ascend' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return 0;
    });
  }, [ordersData, data?.orders, sortField, sortOrder]);

  const handleCallAttempt = useCallback(async (status: 'success' | 'failed') => {
    if (!orderForCallAttempt) return;
    
    setCallAttemptLoading(true);
    
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/orders/${orderForCallAttempt._id}/call-attempt`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status,
          date: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        message.success(status === 'success' ? 'Звонок отмечен как успешный' : 'Попытка дозвона отмечена как неудачная');
        refetch();
        handleCloseCallAttemptModal();
      } else {
        message.error('Ошибка при обновлении статуса звонка');
      }
    } catch (error) {
      message.error('Ошибка сети');
    } finally {
      setCallAttemptLoading(false);
    }
  }, [orderForCallAttempt, refetch]);

  // Функции для создания заказа
  const showCreateOrderModal = useCallback(() => {
    setIsCreateOrderModalVisible(true);
    setCreateOrderFormKey(prev => prev + 1);
    createOrderForm.resetFields();
    setSelectedCustomer(null);
  }, [createOrderForm]);

  const closeCreateOrderModal = useCallback(() => {
    setIsCreateOrderModalVisible(false);
    setSelectedCustomer(null);
    createOrderForm.resetFields();
  }, [createOrderForm]);

  const loadCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      console.log('🔄 Загружаем клиентов...');
      const customersData = await fetchCustomers();
      console.log('✅ Получены клиенты:', customersData);
      setCustomers(customersData);
    } catch (error) {
      console.error('❌ Ошибка загрузки клиентов:', error);
      message.error('Ошибка загрузки клиентов');
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  const handleCreateOrder = useCallback(async (values: any) => {
    setCreateOrderLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      // Собираем shippingAddress из полей формы
      const {
        firstName, lastName, email, phone, address, city, state, zipCode, country, ...rest
      } = values;
      const orderData = {
        ...rest,
        userId: selectedCustomer?._id || null,
        status: 'pending',
        paymentStatus: 'pending',
        items: values.items || [],
        subtotal: values.items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0,
        total: (values.items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0) + (values.shipping || 0),
        callRequest: false,
        shippingAddress: {
          firstName,
          lastName,
          email,
          phone,
          address,
          city,
          state,
          zipCode,
          country: country || 'Россия',
        }
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        message.success('Заказ успешно создан');
        closeCreateOrderModal();
        refetch();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Ошибка при создании заказа');
      }
    } catch (error) {
      message.error('Ошибка сети');
    } finally {
      setCreateOrderLoading(false);
    }
  }, [selectedCustomer, refetch, closeCreateOrderModal]);

  // Функция для загрузки адресов клиента
  const loadCustomerAddresses = useCallback(async (customerId: string) => {
    if (!customerId) return;
    
    setAddressesLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/users/${customerId}/addresses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCustomerAddresses(data.addresses || []);
        console.log('📍 Загружены адреса клиента:', data.addresses);
      } else {
        console.error('❌ Ошибка загрузки адресов:', response.status);
        setCustomerAddresses([]);
      }
    } catch (error) {
      console.error('❌ Ошибка сети при загрузке адресов:', error);
      setCustomerAddresses([]);
    } finally {
      setAddressesLoading(false);
    }
  }, []);

  // Функция для выбора адреса
  const handleSelectAddress = useCallback((address: any) => {
    createOrderForm.setFieldsValue({
      address: address.address || '',
      city: address.city || '',
      state: address.state || '',
      zipCode: address.zipCode || '',
      country: address.country || 'Россия', // <-- подставляем страну
    });
    setIsAddressModalVisible(false);
    message.success('Адрес выбран');
  }, [createOrderForm]);

  // Функция для расчета стоимости доставки
  const calculateShippingCost = useCallback((deliveryMethodId: string, subtotal: number = 0) => {
    const method = deliveryMethods.find(m => m._id === deliveryMethodId);
    if (!method) return 0;

    console.log('🚚 Расчет стоимости доставки для метода:', method.name);
    console.log('💰 Тип стоимости:', method.costType);
    console.log('📦 Сумма товаров:', subtotal);

    switch (method.costType) {
      case 'fixed':
        const fixedCost = method.fixedCost || 0;
        console.log('💵 Фиксированная стоимость:', fixedCost);
        return fixedCost;
      
      case 'percentage':
        const percentage = method.costPercentage || 0;
        const percentageCost = (subtotal * percentage) / 100;
        console.log('📊 Процентная стоимость:', percentage, '% =', percentageCost);
        return percentageCost;
      
      case 'zone':
        // Для зональной доставки пока возвращаем фиксированную стоимость
        const zoneCost = method.fixedCost || 0;
        console.log('🗺️ Зональная стоимость:', zoneCost);
        return zoneCost;
      
      default:
        console.log('❓ Неизвестный тип стоимости, возвращаем 0');
        return 0;
    }
  }, [deliveryMethods]);

  // Функция для обновления стоимости доставки при изменении способа доставки
  const handleDeliveryMethodChange = useCallback((deliveryMethodId: string) => {
    console.log('🔄 Изменен способ доставки:', deliveryMethodId);
    
    // Получаем текущую сумму товаров
    const items = createOrderForm.getFieldValue('items') || [];
    const subtotal = items.reduce((sum: number, item: any) => {
      const price = item.price || 0;
      const quantity = item.quantity || 0;
      return sum + (price * quantity);
    }, 0);
    
    console.log('📦 Текущая сумма товаров:', subtotal);
    
    // Рассчитываем стоимость доставки
    const shippingCost = calculateShippingCost(deliveryMethodId, subtotal);
    console.log('🚚 Рассчитанная стоимость доставки:', shippingCost);
    
    // Обновляем поле стоимости доставки
    createOrderForm.setFieldsValue({
      shipping: shippingCost
    });
    
    // Обновляем общую сумму
    const total = subtotal + shippingCost;
    console.log('💰 Общая сумма:', total);
    
    const method = deliveryMethods.find(m => m._id === deliveryMethodId);
    setAvailablePaymentMethods(method?.allowedPaymentMethods || []);
  }, [createOrderForm, calculateShippingCost, deliveryMethods]);

  // Функция для обновления стоимости доставки при изменении товаров
  const updateShippingCost = useCallback(() => {
    const deliveryMethodId = createOrderForm.getFieldValue('deliveryMethod');
    if (!deliveryMethodId) return;
    
    // Получаем текущую сумму товаров
    const items = createOrderForm.getFieldValue('items') || [];
    const subtotal = items.reduce((sum: number, item: any) => {
      const price = item.price || 0;
      const quantity = item.quantity || 0;
      return sum + (price * quantity);
    }, 0);
    
    console.log('📦 Обновление стоимости доставки, сумма товаров:', subtotal);
    
    // Рассчитываем стоимость доставки
    const shippingCost = calculateShippingCost(deliveryMethodId, subtotal);
    console.log('🚚 Новая стоимость доставки:', shippingCost);
    
    // Обновляем поле стоимости доставки
    createOrderForm.setFieldsValue({
      shipping: shippingCost
    });
    
  }, [createOrderForm, calculateShippingCost]);

  // Загружаем клиентов при открытии модального окна создания заказа
  useEffect(() => {
    if (isCreateOrderModalVisible) {
      console.log('🚀 Открыто модальное окно создания заказа, загружаем клиентов...');
      loadCustomers();
    }
  }, [isCreateOrderModalVisible, loadCustomers]);

  // Массовое изменение статуса
  const handleBulkStatusChange = async () => {
    setIsBulkLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/orders/bulk-update-status`, {
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
        refetchStats(); // Обновляем статистику
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/orders/bulk-delete`, {
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
        refetchStats(); // Обновляем статистику
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

  // Функция для быстрого изменения статуса заказа
  const handleQuickStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        message.success('Статус заказа обновлен');
        
        // Инвалидируем все связанные кэши для мгновенного обновления
        queryClient.invalidateQueries(['orders']);
        queryClient.invalidateQueries(['new-orders-check']);
        
        refetch();
        refetchStats(); // Обновляем статистику
      } else {
        message.error('Ошибка при обновлении статуса');
      }
    } catch (error) {
      message.error('Ошибка сети');
    }
  };

  // Функция для создания СДЭК отправления
  const handleCreateCdekOrder = async (orderId?: string) => {
    if (!orderId || !selectedOrder) return;

    // Подготавливаем данные для отправления
    const orderData = {
      sender: {
        name: 'Руслан Зейналов',
        phones: [{ number: '89067101379' }]
      },
      recipient: {
        name: `${selectedOrder.shippingAddress.firstName} ${selectedOrder.shippingAddress.lastName}`,
        phones: [{ number: selectedOrder.shippingAddress.phone }],
        email: selectedOrder.shippingAddress.email
      },
      from_location: {
        address: 'Москва, Митино, ул. Митинская, д. 1',
        code: '44',
        fias_guid: 'c2deb16a-0330-4f05-821f-1d09c93331e6',
        postal_code: '125222'
      },
      to_location: {
        address: selectedOrder.cdekPvzAddress || selectedOrder.shippingAddress.address,
        code: '44',
        fias_guid: 'c2deb16a-0330-4f05-821f-1d09c93331e6',
        postal_code: selectedOrder.shippingAddress.zipCode || '125222'
      },
      // Добавляем код ПВЗ для использования в backend
      pvz_code: selectedOrder.cdekPvzCode || null,
      packages: [{
        weight: packageData.weight || 2000,
        length: packageData.length || 20,
        width: packageData.width || 20,
        height: packageData.height || 20
      }],
      // Добавляем обязательные поля согласно документации СДЭК
      cost: selectedOrder.total,
      currency: 'RUB',
      comment: `Заказ ${selectedOrder.orderNumber}`,
      // Добавляем правильный тариф для доставки на адрес
      tariff_code: 1
    };

    // Показываем модальное окно подтверждения
    setCdekOrderData(orderData);
    setCdekConfirmModalVisible(true);
  };

  const handleConfirmCdekOrder = async () => {
    if (!selectedOrder?._id || !cdekOrderData) return;

    setCdekLoading(true);
    setCdekConfirmModalVisible(false);
    
    try {
      const token = localStorage.getItem('admin_token');
      
      console.log('📦 Отправляем данные СДЭК:', cdekOrderData);
      console.log('📦 ID заказа:', selectedOrder._id);
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/orders/${selectedOrder._id}/create-cdek-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(cdekOrderData)
        }
      );

      console.log('📦 Ответ сервера:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ СДЭК отправление создано:', result);
        message.success('СДЭК отправление создано успешно');
        // Обновляем форму с новым трек-номером
        form.setFieldsValue({
          trackingNumber: result.trackingNumber
        });
        // Обновляем список заказов
        refetch();
      } else {
        const errorData = await response.json();
        console.error('❌ Ошибка создания СДЭК:', errorData);
        message.error(errorData.message || 'Ошибка при создании СДЭК отправления');
      }
    } catch (error) {
      console.error('❌ Ошибка сети при создании СДЭК:', error);
      message.error('Ошибка сети при создании СДЭК отправления');
    } finally {
      setCdekLoading(false);
    }
  };

  const handleGetCdekTracking = async (orderId?: string) => {
    if (!orderId) return;

    setCdekTrackingLoading(true);
    
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/orders/${orderId}/get-cdek-tracking`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          message.success(`Трек-номер получен: ${result.trackingNumber}`);
          // Обновляем форму с настоящим трек-номером
          form.setFieldsValue({
            trackingNumber: result.trackingNumber
          });
          // Обновляем список заказов
          refetch();
        } else {
          message.info(result.message || 'Трек-номер еще не доступен');
        }
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Ошибка при получении трек-номера');
      }
    } catch (error) {
      message.error('Ошибка сети при получении трек-номера');
    } finally {
      setCdekTrackingLoading(false);
    }
  };

  const handleCheckAllCdekTracking = async () => {
    setCheckAllTrackingLoading(true);
    
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/orders/check-cdek-tracking`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        message.success(result.message || 'Проверка трек-номеров запущена');
        // Обновляем список заказов через 10 секунд
        setTimeout(() => {
          refetch();
        }, 10000);
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Ошибка при запуске проверки');
      }
    } catch (error) {
      message.error('Ошибка сети при запуске проверки');
    } finally {
      setCheckAllTrackingLoading(false);
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
      title: '',
      key: 'history',
      width: 96,
      render: (_: any, record: Order) => (
        <Space size="small">
          <Tooltip title="История изменений заказа">
            <Button
              icon={<HistoryOutlined />}
              size="small"
              onClick={e => { e.stopPropagation(); openHistoryModal(record._id); }}
            />
          </Tooltip>
          <Tooltip title="Создать приход товара">
            <Button
              icon={<InboxOutlined />}
              size="small"
              onClick={e => { e.stopPropagation(); handleCreateArrivalFromOrder(record); }}
              style={{ color: '#52c41a', borderColor: '#52c41a' }}
            />
          </Tooltip>
        </Space>
      )
    },
    {
      title: 'Заказ',
      key: 'order',
      sorter: true,
      sortOrder: sortField === 'createdAt' ? sortOrder : null,
      onHeaderCell: () => ({
        onClick: () => handleSort('createdAt'),
      }),
      render: (_: any, record: Order) => (
        <div className="space-y-1">
          <Tooltip title={`Кликните, чтобы открыть редактор заказа: ${record.orderNumber}`}>
            <div 
              style={{
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
                border: '1px solid transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#eff6ff';
                e.currentTarget.style.borderColor = '#3b82f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
              }}
              onClick={() => showUpdateModal(record)}
            >
              <div className="font-mono font-semibold" style={{ color: '#2563eb' }}>
                {record.orderNumber}
              </div>
            </div>
          </Tooltip>
          <div className="text-xs text-gray-500">
            {new Date(record.createdAt).toLocaleDateString('ru-RU')} {new Date(record.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      )
    },
    {
      title: 'Звонок',
      key: 'callRequest',
      sorter: true,
      sortOrder: sortField === 'callRequest' ? sortOrder : null,
      onHeaderCell: () => ({
        onClick: () => handleSort('callRequest'),
      }),
      render: (_: any, record: Order) => (
        <div className="flex items-center justify-center gap-2">
          {record.callRequest ? (
            record.callStatus === 'completed' ? (
              <Tag color="green" icon={<CheckCircleOutlined />} className="flex items-center gap-1">
                <span className="text-xs">Звонок выполнен</span>
              </Tag>
            ) : (
              <>
                <Tooltip title="Кликните, чтобы отметить звонок как выполненный">
                  <Button
                    type="text"
                    icon={<PhoneOutlined />}
                    className="phone-call-button"
                    onClick={() => showCallConfirmationModal(record)}
                  />
                </Tooltip>
                <Tooltip title="Не дозвонились?">
                  <Button
                    type="text"
                    icon={<PhoneOutlined style={{ textDecoration: 'line-through', color: 'black' }} />}
                    className="phone-call-failed-button"
                    onClick={() => handleShowCallAttemptModal(record)}
                  />
                </Tooltip>
                {((record.callAttempts || []).some(a => a.status === 'failed')) && (
                  <Tag color="default" icon={<CloseOutlined />} className="ml-1">Не дозвонились</Tag>
                )}
              </>
            )
          ) : (
            <span className="text-gray-400 text-xs">—</span>
          )}
        </div>
      )
    },
    {
      title: 'Клиент',
      key: 'customer',
      render: (_: any, record: Order) => (
        <CustomerCell 
          user={record.user} 
          userId={record.userId}
          deliveredOrdersCount={record.deliveredOrdersCount}
          shippingAddress={record.shippingAddress}
        />
      )
    },
    {
      title: 'Артикул',
      key: 'sku',
      render: (_: any, record: Order) => (
        <div>
          {record.items.map((item, index) => {
            const article = item.sku ? item.sku.slice(-6) : 'N/A';
            return (
              <div key={index} style={{ borderBottom: index < record.items.length - 1 ? '2px solid #9ca3af' : 'none', paddingBottom: '8px', marginBottom: '8px' }}>
                <div className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded">{article}</div>
              </div>
            );
          })}
        </div>
      )
    },
    {
      title: 'Товары',
      key: 'items',
      render: (_: any, record: Order) => (
        <div>
          {record.items.map((item, index) => {
            return (
              <div key={index} style={{ borderBottom: index < record.items.length - 1 ? '2px solid #9ca3af' : 'none', paddingBottom: '8px', marginBottom: '8px' }}>
                <div className="text-xs text-gray-600">
                  <span>{item.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      )
    },
    {
      title: 'Количество',
      key: 'quantity',
      render: (_: any, record: Order) => (
        <div>
          {record.items.map((item, index) => {
            return (
              <div key={index} style={{ borderBottom: index < record.items.length - 1 ? '2px solid #9ca3af' : 'none', paddingBottom: '8px', marginBottom: '8px' }}>
                <div className="flex justify-center">
                  <Tag color="blue" className="text-xs font-medium">{item.quantity} шт</Tag>
                </div>
              </div>
            );
          })}
        </div>
      )
    },
    {
      title: 'Цена',
      key: 'price',
      render: (_: any, record: Order) => (
        <div>
          {record.items.map((item, index) => {
            return (
              <div key={index} style={{ borderBottom: index < record.items.length - 1 ? '2px solid #9ca3af' : 'none', paddingBottom: '8px', marginBottom: '8px' }}>
                <div className="text-xs text-gray-600 text-right">
                  {item.price.toLocaleString()} ₽
                </div>
              </div>
            );
          })}
        </div>
      )
    },
    {
      title: 'Закупка',
      key: 'purchase',
      render: (_: any, record: Order) => {
        const totalPurchase = record.items.reduce((sum, item) => {
          // Используем себестоимость товара, сохраненную в заказе
          const purchasePrice = item.costPrice || item.price * 0.7; // fallback на 70% если costPrice не указан
          return sum + (purchasePrice * item.quantity);
        }, 0);
        
        return (
          <div>
            <div className="font-semibold text-blue-600 flex items-center gap-1">
              <DollarOutlined />
              {totalPurchase.toLocaleString()} ₽
            </div>
          </div>
        );
      }
    },
    {
      title: 'Прибыль',
      key: 'profit',
      render: (_: any, record: Order) => {
        const totalProfit = record.items.reduce((sum, item) => {
          const purchasePrice = item.costPrice || 0;
          return sum + ((item.price - purchasePrice) * item.quantity);
        }, 0);
        return (
          <div>
            <div className="font-semibold text-green-600 flex items-center gap-1">
              <DollarOutlined />
              {totalProfit.toLocaleString()} ₽
            </div>
          </div>
        );
      }
    },
    {
      title: 'Сумма',
      dataIndex: 'total',
      key: 'total',
      sorter: true,
      sortOrder: sortField === 'total' ? sortOrder : null,
      onHeaderCell: () => ({
        onClick: () => handleSort('total'),
      }),
      render: (_: any, record: Order) => {
        const itemsTotal = record.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return (
          <div>
            <div className="font-semibold text-green-600 flex items-center gap-1">
              <DollarOutlined />
              {itemsTotal.toLocaleString()} ₽
            </div>
            <div className="text-xs text-gray-500">
              {record.paymentStatus === 'paid' ? 'Оплачен' : 'Не оплачен'}
            </div>
          </div>
        );
      }
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: Order) => {
        const statusConfig = {
          pending: { color: 'orange', icon: <ExclamationCircleOutlined /> },
          confirmed: { color: 'blue', icon: <CheckCircleOutlined /> },
          processing: { color: 'purple', icon: <ClockCircleOutlined /> },
          shipped: { color: 'indigo', icon: <ClockCircleOutlined /> },
          delivered: { color: 'green', icon: <CheckCircleOutlined /> },
          cancelled: { color: 'red', icon: <ExclamationCircleOutlined /> },
          with_courier: { color: 'cyan', icon: <UserOutlined /> }
        };
        const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', icon: null };
        
        return (
          <Select
            value={status}
            onChange={(newStatus) => handleQuickStatusChange(record._id, newStatus)}
            style={{ minWidth: 140 }}
            size="small"
            dropdownStyle={{ zIndex: 1000 }}
            className="status-select"
          >
            <Option value="pending">
              <div className="flex items-center gap-2">
                <ExclamationCircleOutlined style={{ color: '#fa8c16' }} />
                <span>Ожидает подтверждения</span>
              </div>
            </Option>
            <Option value="confirmed">
              <div className="flex items-center gap-2">
                <CheckCircleOutlined style={{ color: '#1890ff' }} />
                <span>Подтвержден</span>
              </div>
            </Option>
            <Option value="processing">
              <div className="flex items-center gap-2">
                <ClockCircleOutlined style={{ color: '#722ed1' }} />
                <span>В обработке</span>
              </div>
            </Option>
            <Option value="shipped">
              <div className="flex items-center gap-2">
                <ClockCircleOutlined style={{ color: '#531dab' }} />
                <span>Отправлен</span>
              </div>
            </Option>
            <Option value="delivered">
              <div className="flex items-center gap-2">
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span>Доставлен</span>
              </div>
            </Option>
            <Option value="cancelled">
              <div className="flex items-center gap-2">
                <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                <span>Отменен</span>
              </div>
            </Option>
            <Option value="with_courier">
              <div className="flex items-center gap-2">
                <UserOutlined style={{ color: '#13c2c2' }} />
                <span>Передан курьеру</span>
              </div>
            </Option>
          </Select>
        );
      }
    },
    {
      title: 'Доставка',
      key: 'delivery',
      sorter: true,
      sortOrder: sortField === 'deliveryDate' ? sortOrder : null,
      onHeaderCell: () => ({
        onClick: () => handleSort('deliveryDate'),
      }),
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
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Order) => (
        <Space size="small">
          <Tooltip title="Просмотр заказа">
            <Button 
              type="primary" 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => navigate(`/admin/orders/${record._id}`)}
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
  ], [navigate, showUpdateModal, getStatusText, getDeliveryDateText, showCallConfirmationModal, handleQuickStatusChange, handleShowCallAttemptModal, handleCloseCallAttemptModal, handleCallAttempt, sortField, sortOrder, handleSort]);

  if (isLoading) return <div>Загрузка заказов...</div>;
  if (error) return <div>Ошибка загрузки заказов: {(error as Error).message}</div>;

  // Вычисляем количество заказов за сегодня, если нет в orderStats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOrders = data?.orders?.filter(order => {
    const created = new Date(order.createdAt);
    created.setHours(0, 0, 0, 0);
    return created.getTime() === today.getTime();
  }).length || 0;

  // === ИСПОЛЬЗУЕМ СТАТИСТИКУ С СЕРВЕРА ===
  // Статистика приходит из orderStats и содержит данные по всем заказам в базе
  const todayRevenue = orderStats?.todayRevenue || 0;
  const todayProfit = orderStats?.todayProfit || 0;
  const monthRevenue = orderStats?.monthRevenue || 0;
  const monthProfit = orderStats?.monthProfit || 0;
  // === КОНЕЦ ДОБАВЛЕНИЯ ===

  const openHistoryModal = (orderId: string) => {
    setHistoryModal({open: true, orderId});
    setHistoryLoading(true);
    fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/admin/changelog`)
      .then(res => res.json())
      .then(data => {
        const entries = (Array.isArray(data) ? data : []).filter(e => String(e.details?.order_id) === String(orderId));
        setHistoryEntries(entries);
        setHistoryLoading(false);
      });
  };
  const closeHistoryModal = () => setHistoryModal({open: false, orderId: null});



  // Функция для создания прихода из заказа
  const handleCreateArrivalFromOrder = (order: Order) => {
    // Создаем массив товаров с начальными значениями
    const items = order.items.map((item, index) => ({
      id: `arrival_item_${index}`,
      name: item.name,
      quantity: item.quantity,
      price: item.price || 0,
      costPrice: item.costPrice || (item.price ? Math.round(item.price * 0.7) : 0), // Автоматически устанавливаем 70% от цены как закупочную
      serialNumbers: [''],
      supplierId: '',
      supplierName: '',
      isAccessory: false // Определяем на основе типа товара
    }));
    
    setArrivalItems(items);
    setArrivalModal({open: true, order});
    
    // Устанавливаем начальные значения в форме
    arrivalForm.setFieldsValue({
      notes: `Приход товара по заказу #${order.orderNumber}`
    });
  };

  const closeArrivalModal = () => {
    setArrivalModal({open: false, order: null});
    setArrivalItems([]);
    arrivalForm.resetFields();
  };

  // Функция создания прихода из заказа
  const createArrivalFromOrder = async (formValues: any, items: any[]) => {
    try {
      // Группируем товары по поставщикам
      const itemsBySupplier = new Map();
      
      items.forEach(item => {
        const supplierId = item.supplierId;
        if (!itemsBySupplier.has(supplierId)) {
          itemsBySupplier.set(supplierId, []);
        }
        
        // Преобразуем товар в формат прихода
        const arrivalItem = {
          productId: item.id || `product_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          productName: item.name,
          quantity: item.isAccessory ? item.quantity : item.serialNumbers.filter((sn: string) => sn.trim()).length,
          serialNumbers: item.isAccessory ? [] : item.serialNumbers.filter((sn: string) => sn.trim()),
          barcode: item.barcode || undefined,
          price: item.price,
          costPrice: item.costPrice,
          isAccessory: item.isAccessory,
          isService: false
        };
        
        itemsBySupplier.get(supplierId).push(arrivalItem);
      });

      // Создаем отдельный приход для каждого поставщика
      const token = localStorage.getItem('admin_token');
      
      for (const [supplierId, supplierItems] of itemsBySupplier.entries()) {
        const supplier = suppliers.find(s => s._id === supplierId);
        if (!supplier) continue;

        // Рассчитываем итоговые значения
        const totalQuantity = supplierItems.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);
        const totalValue = supplierItems.reduce((sum: number, item: { price: number; quantity: number }) => sum + (item.price * item.quantity), 0);

        const arrivalData = {
          date: new Date().toISOString(),
          supplierId: supplierId,
          supplierName: supplier.name,
          notes: formValues.notes || '',
          items: supplierItems,
          totalQuantity,
          totalValue
        };

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/arrivals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(arrivalData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Ошибка при создании прихода');
        }
      }

      message.success('Приход успешно создан');
    } catch (error) {
      console.error('Error creating arrival:', error);
      message.error(error instanceof Error ? error.message : 'Ошибка при создании прихода');
    }
  };

  // Функция для перевода статусов на русский
  const translateStatus = (status: string): string => {
    const statusTranslations: Record<string, string> = {
      'pending': 'Ожидает подтверждения',
      'confirmed': 'Подтвержден',
      'processing': 'В обработке',
      'shipped': 'Отправлен',
      'delivered': 'Доставлен',
      'cancelled': 'Отменен',
      'with_courier': 'У курьера'
    };
    return statusTranslations[status] || status;
  };

  // Словарь для отображения русских названий полей в истории изменений
  const FIELD_LABELS: Record<string, string> = {
    'estimatedDelivery': 'Ожидаемая дата доставки',
    'shippingAddress.firstName': 'Имя',
    'shippingAddress.lastName': 'Фамилия',
    'shippingAddress.email': 'Email',
    'shippingAddress.phone': 'Телефон',
    'shippingAddress.address': 'Адрес',
    'shippingAddress.city': 'Город',
    'shippingAddress.state': 'Область',
    'shippingAddress.zipCode': 'Индекс',
    'status': 'Статус',
    'paymentStatus': 'Статус оплаты',
    'paymentMethod': 'Способ оплаты',
    'deliveryMethod': 'Способ доставки',
    'deliveryDate': 'Дата доставки',
    'trackingNumber': 'Трек-номер',
    'notes': 'Примечания',
    'shipping': 'Стоимость доставки',
    'deliveryInterval': 'Интервал доставки',
    'cdekPvzAddress': 'Адрес ПВЗ',
    'cdekPvzCode': 'Код ПВЗ',
    'items': 'Товары',
  };

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
            value={todayProfit} 
            prefix={<DollarOutlined />}
            suffix="₽"
            valueStyle={{ color: '#10b981' }}
          />
        </Card>
        <Card style={{ flex: 1, minWidth: 160, borderRadius: 12, boxShadow: '0 2px 8px rgba(59,130,246,0.08)', border: 'none', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' }}>
          <Statistic 
            title={<span style={{ color: '#3b82f6', fontWeight: 500 }}>Оборот за сегодня</span>} 
            value={todayRevenue} 
            prefix={<DollarOutlined />}
            suffix="₽"
            valueStyle={{ color: '#3b82f6' }}
          />
        </Card>
        <Card style={{ flex: 1, minWidth: 160, borderRadius: 12, boxShadow: '0 2px 8px rgba(16,185,129,0.08)', border: 'none', background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' }}>
          <Statistic 
            title={<span style={{ color: '#10b981', fontWeight: 500 }}>Прибыль за месяц</span>} 
            value={monthProfit} 
            prefix={<DollarOutlined />}
            suffix="₽"
            valueStyle={{ color: '#10b981' }}
          />
        </Card>
        <Card style={{ flex: 1, minWidth: 160, borderRadius: 12, boxShadow: '0 2px 8px rgba(59,130,246,0.08)', border: 'none', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' }}>
          <Statistic 
            title={<span style={{ color: '#3b82f6', fontWeight: 500 }}>Оборот за месяц</span>} 
            value={monthRevenue} 
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
          {/* Поиск */}
          <SearchInput
            placeholder="Поиск по номеру заказа, телефону, email, QR коду..."
            onSearch={(value) => {
              setSearchText(value);
              setCurrentPage(1);
              refetch();
            }}
            style={{ width: 400 }}
          />

          {/* Кнопки фильтрации по доставке */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button 
              type={deliveryFilter === '' ? 'primary' : 'default'}
              onClick={() => handleDeliveryFilterChange('')}
              size="middle"
              style={{ 
                borderRadius: 8, 
                fontWeight: 600,
                background: deliveryFilter === '' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : undefined,
                border: deliveryFilter === '' ? 'none' : undefined,
                color: deliveryFilter === '' ? 'white' : undefined
              }}
            >
              Все
            </Button>
            <Button 
              type={deliveryFilter === 'pickup_today' ? 'primary' : 'default'}
              onClick={() => handleDeliveryFilterChange('pickup_today')}
              size="middle"
              style={{ 
                borderRadius: 8, 
                fontWeight: 600,
                background: deliveryFilter === 'pickup_today' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : undefined,
                border: deliveryFilter === 'pickup_today' ? 'none' : undefined,
                color: deliveryFilter === 'pickup_today' ? 'white' : undefined
              }}
            >
              Самовывозы сегодня
            </Button>
            <Button 
              type={deliveryFilter === 'delivery_today' ? 'primary' : 'default'}
              onClick={() => handleDeliveryFilterChange('delivery_today')}
              size="middle"
              style={{ 
                borderRadius: 8, 
                fontWeight: 600,
                background: deliveryFilter === 'delivery_today' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : undefined,
                border: deliveryFilter === 'delivery_today' ? 'none' : undefined,
                color: deliveryFilter === 'delivery_today' ? 'white' : undefined
              }}
            >
              Доставки сегодня
            </Button>
            <Button 
              type={deliveryFilter === 'delivery_tomorrow' ? 'primary' : 'default'}
              onClick={() => handleDeliveryFilterChange('delivery_tomorrow')}
              size="middle"
              style={{ 
                borderRadius: 8, 
                fontWeight: 600,
                background: deliveryFilter === 'delivery_tomorrow' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : undefined,
                border: deliveryFilter === 'delivery_tomorrow' ? 'none' : undefined,
                color: deliveryFilter === 'delivery_tomorrow' ? 'white' : undefined
              }}
            >
              Доставки завтра
            </Button>
            <Button 
              type={deliveryFilter === 'new' ? 'primary' : 'default'}
              onClick={() => handleDeliveryFilterChange('new')}
              size="middle"
              style={{ 
                borderRadius: 8, 
                fontWeight: 600,
                background: deliveryFilter === 'new' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : undefined,
                border: deliveryFilter === 'new' ? 'none' : undefined,
                color: deliveryFilter === 'new' ? 'white' : undefined
              }}
            >
              Новые
            </Button>
            <Button 
              type={deliveryFilter === 'with_courier' ? 'primary' : 'default'}
              onClick={() => handleDeliveryFilterChange('with_courier')}
              size="middle"
              style={{ 
                borderRadius: 8, 
                fontWeight: 600,
                background: deliveryFilter === 'with_courier' ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' : undefined,
                border: deliveryFilter === 'with_courier' ? 'none' : undefined,
                color: deliveryFilter === 'with_courier' ? 'white' : undefined
              }}
            >
              У курьера
            </Button>
          </div>

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
            <Option value="with_courier">Передан курьеру</Option>
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
            <Option value={10}>10 заказов</Option>
            <Option value={20}>20 заказов</Option>
            <Option value={50}>50 заказов</Option>
            <Option value={100}>100 заказов</Option>
          </Select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flex: 1, minWidth: 180 }}>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            size="large" 
            onClick={showCreateOrderModal}
            style={{ borderRadius: 10, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', fontWeight: 600, boxShadow: '0 2px 8px rgba(16,185,129,0.15)' }}
          >
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
          dataSource={getSortedData()}
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
          <Option value="with_courier">Передан курьеру</Option>
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
        onCancel={(e) => {
          console.log('📞 Модалка звонка - onCancel вызван');
          console.log('📞 onCancel - время вызова:', new Date().toISOString());
          // Предотвращаем автоматическое закрытие
          if (e) {
            e.preventDefault();
            e.stopPropagation();
          }
          // Закрываем только если модалка была открыта
          if (isCallConfirmationModalVisible) {
            closeCallConfirmationModal();
          }
        }}
        onOk={() => handleCallConfirmation(true)}
        okText="Да"
        cancelText="Нет"
        confirmLoading={isBulkLoading}
        maskClosable={false}
        keyboard={false}
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
        destroyOnClose={false}
        maskClosable={false}
        keyboard={false}
      >
        <Form
          key={formKey}
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
                  <Option value="with_courier">Передан курьеру</Option>
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
                  <Option value="bank_card">Банковская карта</Option>
                  <Option value="cash_on_delivery">Наличными при получении</Option>
                  <Option value="sberbank_transfer">Банковский перевод</Option>
                  <Option value="credit_purchase">Покупка в кредит</Option>
                  <Option value="usdt_payment">Оплата USDT</Option>
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
                <Input 
                  id="trackingNumber"
                  placeholder="Введите трек-номер" 
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="estimatedDelivery"
                label="Ожидаемая дата доставки"
              >
                <Input id="estimatedDelivery" type="date" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Button 
                type="primary" 
                icon={<TruckOutlined />}
                onClick={() => handleCreateCdekOrder(selectedOrder?._id)}
                loading={cdekLoading}
                style={{ width: '100%' }}
              >
                Создать СДЭК
              </Button>
            </Col>
            <Col span={12}>
              <Button 
                type="default" 
                icon={<SearchOutlined />}
                onClick={() => handleGetCdekTracking(selectedOrder?._id)}
                loading={cdekTrackingLoading}
                style={{ width: '100%' }}
              >
                Получить трек-номер
              </Button>
            </Col>
          </Row>
          
          <Row gutter={16} style={{ marginTop: '8px' }}>
            <Col span={24}>
              <Button 
                type="dashed" 
                icon={<SyncOutlined />}
                onClick={handleCheckAllCdekTracking}
                loading={checkAllTrackingLoading}
                style={{ width: '100%' }}
              >
                Проверить все трек-номера СДЭК
              </Button>
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
                  id="cdekPvzAddress"
                  placeholder="Введите адрес пункта выдачи СДЭК" 
                  style={{ color: '#667eea', fontWeight: 500 }} 
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="cdekPvzCode"
                label="Код ПВЗ СДЭК"
              >
                <Input 
                  id="cdekPvzCode"
                  placeholder="Введите код ПВЗ (например: RVD3)" 
                  style={{ color: '#1890ff', fontWeight: 500 }} 
                />
              </Form.Item>
            </Col>
          </Row>

          {/* КНОПКА ОТПРАВКИ КУРЬЕРУ */}
          <Form.Item>
            <Button 
              type="primary"
              style={{ width: '100%', marginBottom: 16 }}
              onClick={async () => {
                try {
                  const values = form.getFieldsValue();
                  const fields: string[] = [];

                  // Формируем красивое сообщение
                  let messageText = `🚚 <b>НОВЫЙ ЗАКАЗ ДЛЯ КУРЬЕРА</b> 🚚\n\n`;
                  
                  // Номер заказа
                  if (selectedOrder?.orderNumber) {
                    messageText += `📋 <b>Номер заказа:</b> <code>${selectedOrder.orderNumber}</code>\n\n`;
                  }
                  
                  // Контактные данные
                  messageText += `👤 <b>КЛИЕНТ:</b>\n`;
                  if (values.firstName || values.lastName) {
                    messageText += `   Имя: ${[values.firstName, values.lastName].filter(Boolean).join(' ')}\n`;
                  }
                  if (values.phone) {
                    messageText += `   📞 Телефон: <code>${values.phone}</code>\n`;
                  }
                  messageText += `\n`;
                  
                  // Адрес доставки
                  if (values.address || values.city || values.state || values.zipCode || values.country) {
                    const addressParts = [values.address, values.city, values.state, values.zipCode, values.country].filter(Boolean).join(', ');
                    if (addressParts) {
                      messageText += `📍 <b>АДРЕС ДОСТАВКИ:</b>\n   ${addressParts}\n\n`;
                    }
                  }
                  
                  // ПВЗ информация
                  if (values.cdekPvzAddress || values.cdekPvzCode) {
                    messageText += `🏪 <b>ПВЗ:</b>\n`;
                    if (values.cdekPvzAddress) {
                      messageText += `   Адрес: ${values.cdekPvzAddress}\n`;
                    }
                    if (values.cdekPvzCode) {
                      messageText += `   Код: <code>${values.cdekPvzCode}</code>\n`;
                    }
                    messageText += `\n`;
                  }
                  
                  // Товары
                  if (values.items && values.items.length > 0) {
                    messageText += `📦 <b>ТОВАРЫ:</b>\n`;
                    values.items.forEach((item: any, idx: number) => {
                      const itemTotal = Number(item.price) * Number(item.quantity);
                      messageText += `   ${idx + 1}. ${item.name}\n`;
                      messageText += `      ${item.quantity} шт. × ${item.price}₽ = ${itemTotal}₽\n`;
                    });
                    messageText += `\n`;
                  }
                  
                  // Время доставки
                  if (values.deliveryDate) {
                    let deliveryText = '';
                    
                    if (values.deliveryDate === 'today') {
                      deliveryText = 'Сегодня';
                    } else if (values.deliveryDate === 'tomorrow') {
                      deliveryText = 'Завтра';
                    } else if (values.deliveryDate === 'day3') {
                      deliveryText = 'Послезавтра';
                                         } else {
                       // Если это дата в формате ISO, конвертируем в русский формат
                       try {
                         const date = new Date(values.deliveryDate);
                         const options: Intl.DateTimeFormatOptions = { 
                           day: 'numeric', 
                           month: 'long', 
                           year: 'numeric'
                         };
                         deliveryText = date.toLocaleDateString('ru-RU', options);
                       } catch (e) {
                         deliveryText = values.deliveryDate;
                       }
                     }
                    
                    // Добавляем интервал доставки, если есть
                    if (values.deliveryInterval) {
                      deliveryText += ` (${values.deliveryInterval})`;
                    }
                    
                    messageText += `📅 <b>ВРЕМЯ ДОСТАВКИ:</b> ${deliveryText}\n\n`;
                  }
                  
                  // Комментарий
                  if (values.notes) {
                    messageText += `💬 <b>КОММЕНТАРИЙ:</b>\n   ${values.notes}\n\n`;
                  }
                  
                  // Итоговая сумма
                  let total = 0;
                  if (values.items && values.items.length > 0) {
                    total = values.items.reduce((sum: number, item: any) => sum + (Number(item.price) * Number(item.quantity)), 0);
                  }
                  
                  messageText += `💰 <b>ИТОГО:</b>\n`;
                  if (values.shipping) {
                    messageText += `   Товары: ${total.toLocaleString()}₽\n`;
                    messageText += `   Доставка: ${Number(values.shipping).toLocaleString()}₽\n`;
                    total += Number(values.shipping);
                  }
                  messageText += `   <b>К ОПЛАТЕ: ${total.toLocaleString()}₽</b>`;
                  const telegramToken = '7838214378:AAGhAoArjQMTarjD7Gg5t7Y7z7tJrCBjdMU';
                  const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
                  
                  // Отправляем в канал
                  const channelChatId = '-1002834214294'; // ID канала для курьеров
                  const personalChatId = '5591980101'; // chat_id курьера
                  
                  let channelSuccess = false;
                  let personalSuccess = false;
                  
                  // Отправка в канал
                  try {
                    const channelRes = await fetch(url, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        chat_id: channelChatId,
                        text: messageText,
                        parse_mode: 'HTML'
                      })
                    });
                    const channelData = await channelRes.json();
                    console.log('Ответ Telegram (канал):', channelData);
                    channelSuccess = channelData.ok;
                  } catch (e) {
                    console.error('Ошибка отправки в канал:', e);
                  }
                  
                  // Отправка в личный чат
                  try {
                    const personalRes = await fetch(url, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        chat_id: personalChatId,
                        text: messageText,
                        parse_mode: 'HTML'
                      })
                    });
                    const personalData = await personalRes.json();
                    console.log('Ответ Telegram (личный чат):', personalData);
                    personalSuccess = personalData.ok;
                  } catch (e) {
                    console.error('Ошибка отправки в личный чат:', e);
                  }
                  
                  if (channelSuccess || personalSuccess) {
                    message.success('Информация успешно отправлена курьеру!');
                    
                    // Автоматически меняем статус заказа на "передан курьеру"
                    if (selectedOrder?._id) {
                      try {
                        console.log('🔄 Изменение статуса заказа на with_courier:', selectedOrder._id);
                        const token = localStorage.getItem('admin_token');
                        const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/orders/${selectedOrder._id}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({ status: 'with_courier' })
                        });
                        
                        console.log('📡 Ответ сервера:', response.status, response.statusText);
                        
                        if (response.ok) {
                          const result = await response.json();
                          console.log('✅ Результат обновления:', result);
                          message.success('Статус заказа изменен на "Передан курьеру"');
                          refetch(); // Обновляем список заказов
                          refetchStats(); // Обновляем статистику
                        } else {
                          const errorData = await response.json().catch(() => ({}));
                          console.error('❌ Ошибка обновления статуса:', response.status, errorData);
                          message.warning(`Информация отправлена курьеру, но не удалось изменить статус заказа (${response.status})`);
                        }
                      } catch (statusError) {
                        console.error('❌ Исключение при обновлении статуса:', statusError);
                        message.warning('Информация отправлена курьеру, но не удалось изменить статус заказа');
                      }
                    }
                  } else {
                    const errorMessage = [];
                    if (!channelSuccess) errorMessage.push('канал');
                    if (!personalSuccess) errorMessage.push('личный чат');
                    message.error(`Ошибка отправки в Telegram: ${errorMessage.join(', ')}`);
                  }
                } catch (e) {
                  message.error('Ошибка отправки в Telegram');
                }
              }}
            >
              Отправить информацию курьеру
            </Button>
          </Form.Item>

          <Divider orientation="left">Контактные данные</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="firstName"
                label="Имя"
                rules={[{ required: true, message: 'Введите имя' }]}
              >
                <Input id="firstName" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="lastName"
                label="Фамилия"
                rules={[{ required: true, message: 'Введите фамилию' }]}
              >
                <Input id="lastName" />
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
                <Input id="email" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Телефон"
                rules={[{ required: true, message: 'Введите телефон' }]}
              >
                <Input id="phone" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="address"
            label="Адрес"
            rules={[{ required: true, message: 'Введите адрес' }]}
          >
            <Input.TextArea id="address" rows={2} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="city"
                label="Город"
                rules={[{ required: true, message: 'Введите город' }]}
              >
                <Input id="city" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="state"
                label="Область"
              >
                <Input id="state" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="zipCode"
                label="Индекс"
              >
                <Input id="zipCode" />
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
                          <AutoComplete
                            key={`autocomplete-${name}-${formKey}`}
                            placeholder={productsLoading ? "Загрузка товаров..." : "Начните вводить название товара"}
                            options={products.map(product => ({
                                value: product.name,
                                label: (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <img 
                                      src={product.mainImage} 
                                      alt={product.name}
                                      style={{ width: '24px', height: '24px', objectFit: 'cover', borderRadius: '4px' }}
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1 }}>
                                      <span>{product.name}</span>
                                      <span style={{ color: '#666', fontSize: '12px' }}>
                                        {product.price.toLocaleString()} ₽
                                      </span>
                                    </div>
                                  </div>
                                ),
                                product: product
                              }))}
                            onSelect={(value, option) => {
                              const selectedProduct = option.product as Product;
                              if (selectedProduct) {
                                // Получаем текущий массив items
                                const items = form.getFieldValue('items') || [];
                                items[name] = {
                                  ...(items[name] || {}),
                                  name: selectedProduct.name,
                                  price: selectedProduct.price,
                                  costPrice: selectedProduct.costPrice || 0,
                                  sku: selectedProduct.sku,
                                  productId: selectedProduct._id,
                                  quantity: 1,
                                  image: selectedProduct.mainImage,
                                };
                                form.setFieldsValue({ items });
                                setFormKey(prev => prev + 1);
                              }
                            }}
                            filterOption={(inputValue, option) => {
                              if (!option?.value) return false;
                              return option.value.toLowerCase().includes(inputValue.toLowerCase());
                            }}
                            onSearch={(value) => {
                              // Если пользователь вводит текст вручную, очищаем связанные поля
                              if (!value) {
                                form.setFields([
                                  {
                                    name: [`items.${name}.price`],
                                    value: undefined
                                  },
                                  {
                                    name: [`items.${name}.costPrice`],
                                    value: undefined
                                  },
                                  {
                                    name: [`items.${name}.sku`],
                                    value: undefined
                                  },
                                  {
                                    name: [`items.${name}.productId`],
                                    value: undefined
                                  },
                                  {
                                    name: [`items.${name}.image`],
                                    value: undefined
                                  }
                                ]);
                              }
                            }}
                            showSearch
                            allowClear
                          />
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
                            key={`price-${name}-${formKey}`}
                            style={{ width: '100%' }}
                            min={0}
                            formatter={(value: number | string | undefined) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(value: string | undefined) => value ? value.replace(/\$\s?|(,*)/g, '') : ''}
                            onChange={(value) => {
                              // Принудительно обновляем компонент для пересчета суммы
                              setTimeout(() => {
                                setFormKey(prev => prev + 1);
                              }, 100);
                            }}
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
                            key={`quantity-${name}-${formKey}`}
                            style={{ width: '100%' }}
                            min={1}
                            onChange={(value) => {
                              // Принудительно обновляем компонент для пересчета суммы
                              setTimeout(() => {
                                setFormKey(prev => prev + 1);
                              }, 100);
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item
                          {...restField}
                          name={[name, 'sku']}
                          label="SKU"
                        >
                          <Input 
                            id={`sku-${name}`}
                            key={`sku-${name}-${formKey}`}
                            onChange={(e) => {
                              // Принудительно обновляем компонент
                              setTimeout(() => {
                                setFormKey(prev => prev + 1);
                              }, 100);
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item
                          {...restField}
                          name={[name, 'costPrice']}
                          label="Закупка"
                        >
                          <InputNumber
                            key={`costPrice-${name}-${formKey}`}
                            style={{ width: '100%' }}
                            min={0}
                            placeholder="0"
                            formatter={(value: number | string | undefined) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(value: string | undefined) => value ? value.replace(/\$\s?|(,*)/g, '') : ''}
                            onChange={(value) => {
                              // Принудительно обновляем компонент для пересчета суммы
                              setTimeout(() => {
                                setFormKey(prev => prev + 1);
                              }, 100);
                            }}
                          />
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
                      onClick={() => {
                        remove(name);
                        setTimeout(() => updateShippingCost(), 100);
                      }}
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
            <Input.TextArea id="notes" rows={3} placeholder="Дополнительная информация о заказе" />
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

      {/* Модальное окно подтверждения создания СДЭК отправления */}
      <Modal
        title="Подтверждение создания СДЭК отправления"
        open={cdekConfirmModalVisible}
        onCancel={() => setCdekConfirmModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setCdekConfirmModalVisible(false)}>
            Отмена
          </Button>,
          <Button 
            key="confirm" 
            type="primary" 
            loading={cdekLoading}
            onClick={handleConfirmCdekOrder}
          >
            Создать отправление
          </Button>
        ]}
        width={700}
      >
        {cdekOrderData && (
          <div>
            <h4>Данные отправления:</h4>
            
            <Divider orientation="left">Отправитель</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <strong>Имя:</strong> {cdekOrderData.sender.name}
              </Col>
              <Col span={12}>
                <strong>Телефон:</strong> {cdekOrderData.sender.phones[0].number}
              </Col>
            </Row>

            <Divider orientation="left">Получатель</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <strong>Имя:</strong> {cdekOrderData.recipient.name}
              </Col>
              <Col span={12}>
                <strong>Телефон:</strong> {cdekOrderData.recipient.phones[0].number}
              </Col>
              <Col span={24}>
                <strong>Email:</strong> {cdekOrderData.recipient.email}
              </Col>
            </Row>

            <Divider orientation="left">Адрес отправления</Divider>
            <Row gutter={16}>
              <Col span={24}>
                <strong>Адрес:</strong> {cdekOrderData.from_location.address}
              </Col>
              <Col span={8}>
                <strong>Код города:</strong> {cdekOrderData.from_location.code}
              </Col>
              <Col span={8}>
                <strong>Почтовый индекс:</strong> {cdekOrderData.from_location.postal_code}
              </Col>
            </Row>

            <Divider orientation="left">Адрес доставки</Divider>
            <Row gutter={16}>
              <Col span={24}>
                <strong>Адрес:</strong> {cdekOrderData.to_location.address}
              </Col>
              <Col span={8}>
                <strong>Код города:</strong> {cdekOrderData.to_location.code}
              </Col>
              <Col span={8}>
                <strong>Почтовый индекс:</strong> {cdekOrderData.to_location.postal_code}
              </Col>
            </Row>

            <Divider orientation="left">Упаковка</Divider>
            <Row gutter={16}>
              <Col span={6}>
                <strong>Номер упаковки:</strong>
                <div style={{ marginTop: 4, padding: '4px 8px', backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                  PKG1
                </div>
              </Col>
              <Col span={6}>
                <strong>Вес (г):</strong>
                <InputNumber
                  value={packageData.weight}
                  onChange={(value) => setPackageData(prev => ({ ...prev, weight: value || 2000 }))}
                  min={1}
                  max={30000}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </Col>
              <Col span={6}>
                <strong>Длина (см):</strong>
                <InputNumber
                  value={packageData.length}
                  onChange={(value) => setPackageData(prev => ({ ...prev, length: value || 20 }))}
                  min={1}
                  max={150}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </Col>
              <Col span={6}>
                <strong>Ширина (см):</strong>
                <InputNumber
                  value={packageData.width}
                  onChange={(value) => setPackageData(prev => ({ ...prev, width: value || 20 }))}
                  min={1}
                  max={150}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 8 }}>
              <Col span={6}>
                <strong>Высота (см):</strong>
                <InputNumber
                  value={packageData.height}
                  onChange={(value) => setPackageData(prev => ({ ...prev, height: value || 20 }))}
                  min={1}
                  max={150}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </Col>
              <Col span={18}>
                <strong>Товары в упаковке:</strong>
                <div style={{ marginTop: 4, maxHeight: '120px', overflowY: 'auto' }}>
                  {selectedOrder?.items?.map((item: any, index: number) => (
                    <div key={index} style={{ 
                      padding: '4px 8px', 
                      backgroundColor: '#f5f5f5', 
                      borderRadius: 4, 
                      marginBottom: '4px',
                      fontSize: '12px'
                    }}>
                      {item.name || 'Товар'} ({item.quantity} шт.) - {selectedOrder?.total || 0} ₽
                      {item.productId?.sku && (
                        <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                          Артикул: {item.productId.sku}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ 
                  marginTop: 4, 
                  padding: '4px 8px', 
                  backgroundColor: '#e6f7ff', 
                  borderRadius: 4,
                  fontWeight: 'bold'
                }}>
                  Итого: {selectedOrder?.total || 0} ₽
                </div>
              </Col>
            </Row>

            <Divider orientation="left">Проблемные поля</Divider>
            <div style={{ color: '#ff4d4f' }}>
              {cdekOrderData.to_location.postal_code === 'Самовывоз' && (
                <p>⚠️ <strong>Почтовый индекс:</strong> Указан "Самовывоз" вместо реального индекса</p>
              )}
              {!cdekOrderData.to_location.address || cdekOrderData.to_location.address === 'Самовывоз' && (
                <p>⚠️ <strong>Адрес доставки:</strong> Указан "Самовывоз" вместо реального адреса</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={isCallAttemptModalVisible}
        onCancel={handleCloseCallAttemptModal}
        title="Попытка дозвона"
        footer={null}
        centered
        destroyOnClose={false}
        maskClosable={false}
        keyboard={false}
      >
        {orderForCallAttempt && (
          <div>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>Телефон клиента: <span style={{ color: '#222' }}>{orderForCallAttempt.shippingAddress.phone}</span></div>
            <div style={{ marginBottom: 12 }}>Вы дозвонились?</div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <Button type="primary" loading={callAttemptLoading} onClick={() => handleCallAttempt('success')}>Да</Button>
              <Button danger loading={callAttemptLoading} onClick={() => handleCallAttempt('failed')}>Нет</Button>
            </div>
            {((callAttempts || []).filter(a => a.status === 'failed').length > 0) && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 500, marginBottom: 6 }}>История неудачных попыток:</div>
                <ul style={{ paddingLeft: 18 }}>
                  {(callAttempts || []).filter(a => a.status === 'failed').map((a, idx) => (
                    <li key={idx} style={{ color: '#444', fontSize: 13 }}>
                      {new Date(a.date).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Модальное окно создания заказа */}
      <Modal
        title="Создать новый заказ"
        open={isCreateOrderModalVisible}
        onCancel={closeCreateOrderModal}
        footer={null}
        width={1000}
        className="create-order-modal"
        destroyOnClose={false}
        maskClosable={false}
        keyboard={false}
      >
        <Form
          key={createOrderFormKey}
          form={createOrderForm}
          layout="vertical"
          onFinish={handleCreateOrder}
          className="create-order-form"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="customer"
                label="Клиент"
              >
                <Select
                  placeholder="Выберите клиента или создайте без клиента"
                  loading={customersLoading}
                  allowClear
                  showSearch
                  filterOption={(input, option) => {
                    const label = option?.label?.toString() || '';
                    const searchText = input.toLowerCase();
                    return label.toLowerCase().includes(searchText);
                  }}
                  onChange={(value) => {
                    console.log('👤 Выбран клиент:', value);
                    const customer = customers.find(c => c._id === value);
                    setSelectedCustomer(customer);
                    if (customer) {
                      console.log('✅ Найден клиент:', customer);
                      createOrderForm.setFieldsValue({
                        firstName: customer.firstName,
                        lastName: customer.lastName,
                        email: customer.email,
                        phone: customer.phone,
                        address: customer.address || '',
                        city: customer.city || '',
                        state: customer.state || '',
                        zipCode: customer.zipCode || '',
                        country: customer.country || 'Россия'
                      });
                      // Загружаем адреса клиента
                      loadCustomerAddresses(customer._id);
                    } else if (value === '') {
                      console.log('❌ Клиент не выбран');
                      // Очищаем поля при выборе "Без клиента"
                      createOrderForm.setFieldsValue({
                        firstName: '',
                        lastName: '',
                        email: '',
                        phone: '',
                        address: '',
                        city: '',
                        state: '',
                        zipCode: '',
                        country: ''
                      });
                      setCustomerAddresses([]);
                    }
                  }}
                  options={[
                    { value: '', label: 'Без клиента' },
                    ...(customers.length > 0 ? customers.map(customer => ({
                      value: customer._id,
                      label: `${customer.firstName} ${customer.lastName} (${customer.email})`
                    })) : [])
                  ]}
                  notFoundContent={customersLoading ? 'Загрузка...' : 'Клиенты не найдены'}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="paymentMethod"
                label="Способ оплаты"
                rules={[{ required: true, message: 'Выберите способ оплаты' }]}
              >
                <Select>
                  {((availablePaymentMethods.length === 0) || availablePaymentMethods.includes('bank_card')) && (
                    <Option value="bank_card">Банковская карта</Option>
                  )}
                  {((availablePaymentMethods.length === 0) || availablePaymentMethods.includes('cash_on_delivery')) && (
                    <Option value="cash_on_delivery">Наличными при получении</Option>
                  )}
                  {((availablePaymentMethods.length === 0) || availablePaymentMethods.includes('sberbank_transfer')) && (
                    <Option value="sberbank_transfer">Банковский перевод</Option>
                  )}
                  {((availablePaymentMethods.length === 0) || availablePaymentMethods.includes('credit_purchase')) && (
                    <Option value="credit_purchase">Покупка в кредит</Option>
                  )}
                  {((availablePaymentMethods.length === 0) || availablePaymentMethods.includes('usdt_payment')) && (
                    <Option value="usdt_payment">Оплата USDT</Option>
                  )}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="deliveryMethod"
                label="Способ доставки"
              >
                <Select 
                  placeholder="Выберите способ доставки"
                  onChange={handleDeliveryMethodChange}
                >
                  {deliveryMethods.map(method => (
                    <Option key={method._id} value={method._id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{method.name}</span>
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          {method.costType === 'fixed' && method.fixedCost ? `${method.fixedCost} ₽` : ''}
                          {method.costType === 'percentage' && method.costPercentage ? `${method.costPercentage}%` : ''}
                          {method.costType === 'fixed_plus_percentage' && method.fixedCost && method.costPercentage ? `${method.fixedCost} ₽ + ${method.costPercentage}%` : ''}
                          {method.costType === 'zone' ? 'Зональная' : ''}
                        </span>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
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
          </Row>

          <Divider orientation="left">Контактные данные</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="firstName"
                label="Имя"
                rules={[{ required: true, message: 'Введите имя' }]}
              >
                <Input id="create-firstName" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="lastName"
                label="Фамилия"
                rules={[{ required: true, message: 'Введите фамилию' }]}
              >
                <Input id="create-lastName" />
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
                <Input id="create-email" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Телефон"
                rules={[{ required: true, message: 'Введите телефон' }]}
              >
                <Input id="create-phone" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="address"
            label={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Адрес</span>
                {selectedCustomer && (
                  <Button
                    type="link"
                    size="small"
                    icon={<HomeOutlined />}
                    onClick={() => {
                      if (customerAddresses.length > 0) {
                        setIsAddressModalVisible(true);
                      } else {
                        message.info('У выбранного клиента нет сохраненных адресов');
                      }
                    }}
                    disabled={addressesLoading}
                    style={{ padding: 0, height: 'auto' }}
                  >
                    Выбрать из профиля
                  </Button>
                )}
              </div>
            }
            rules={[{ required: true, message: 'Введите адрес' }]}
          >
            <Input.TextArea id="create-address" rows={2} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                name="city"
                label="Город"
                rules={[{ required: true, message: 'Введите город' }]}
              >
                <Input id="create-city" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="state"
                label="Область"
              >
                <Input id="create-state" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="zipCode"
                label="Индекс"
              >
                <Input id="create-zipCode" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="country"
                label="Страна"
                rules={[{ required: true, message: 'Введите страну' }]}
                initialValue="Россия"
              >
                <Input id="create-country" />
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
                          <AutoComplete
                            key={`create-autocomplete-${name}-${createOrderFormKey}`}
                            placeholder={productsLoading ? "Загрузка товаров..." : "Начните вводить название товара"}
                            options={products.map(product => ({
                                value: product.name,
                                label: (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <img 
                                      src={product.mainImage} 
                                      alt={product.name}
                                      style={{ width: '24px', height: '24px', objectFit: 'cover', borderRadius: '4px' }}
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1 }}>
                                      <span>{product.name}</span>
                                      <span style={{ color: '#666', fontSize: '12px' }}>
                                        {product.price.toLocaleString()} ₽
                                      </span>
                                    </div>
                                  </div>
                                ),
                                product: product
                              }))}
                            onSelect={(value, option) => {
                              const selectedProduct = option.product as Product;
                              if (selectedProduct) {
                                const items = createOrderForm.getFieldValue('items') || [];
                                items[name] = {
                                  ...(items[name] || {}),
                                  name: selectedProduct.name,
                                  price: selectedProduct.price,
                                  costPrice: selectedProduct.costPrice || 0,
                                  sku: selectedProduct.sku,
                                  productId: selectedProduct._id,
                                  quantity: 1,
                                  image: selectedProduct.mainImage,
                                };
                                createOrderForm.setFieldsValue({ items });
                                setCreateOrderFormKey(prev => prev + 1);
                                
                                // Обновляем стоимость доставки после добавления товара
                                setTimeout(() => updateShippingCost(), 100);
                              }
                            }}
                            filterOption={(inputValue, option) => {
                              if (!option?.value) return false;
                              return option.value.toLowerCase().includes(inputValue.toLowerCase());
                            }}
                            showSearch
                            allowClear
                          />
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
                            key={`create-price-${name}-${createOrderFormKey}`}
                            style={{ width: '100%' }}
                            min={0}
                            formatter={(value: number | string | undefined) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(value: string | undefined) => value ? value.replace(/\$\s?|(,*)/g, '') : ''}
                            onChange={() => setTimeout(() => updateShippingCost(), 100)}
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
                            key={`create-quantity-${name}-${createOrderFormKey}`}
                            style={{ width: '100%' }}
                            min={1}
                            onChange={() => setTimeout(() => updateShippingCost(), 100)}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item
                          {...restField}
                          name={[name, 'sku']}
                          label="SKU"
                        >
                          <Input 
                            id={`create-sku-${name}`}
                            key={`create-sku-${name}-${createOrderFormKey}`}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item
                          {...restField}
                          name={[name, 'costPrice']}
                          label="Закупка"
                        >
                          <InputNumber
                            key={`create-costPrice-${name}-${createOrderFormKey}`}
                            style={{ width: '100%' }}
                            min={0}
                            placeholder="0"
                            formatter={(value: number | string | undefined) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(value: string | undefined) => value ? value.replace(/\$\s?|(,*)/g, '') : ''}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={2}>
                        <Form.Item label="Сумма">
                          <div className="item-total">
                            {(() => {
                              const price = createOrderForm.getFieldValue(['items', name, 'price']) || 0;
                              const quantity = createOrderForm.getFieldValue(['items', name, 'quantity']) || 0;
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
            <Input.TextArea id="create-notes" rows={3} placeholder="Дополнительная информация о заказе" />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Button onClick={closeCreateOrderModal} style={{ marginRight: 8 }}>
              Отмена
            </Button>
            <Button type="primary" htmlType="submit" loading={createOrderLoading}>
              Создать заказ
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Модальное окно выбора адреса */}
      <Modal
        title="Выберите адрес из профиля клиента"
        open={isAddressModalVisible}
        onCancel={() => setIsAddressModalVisible(false)}
        footer={null}
        width={600}
        centered
        destroyOnClose={false}
        maskClosable={false}
        keyboard={false}
        className="address-selection-modal"
      >
        {addressesLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div>Загрузка адресов...</div>
          </div>
        ) : customerAddresses.length > 0 ? (
          <div>
            <div style={{ marginBottom: 16, color: '#666' }}>
              Выберите один из сохраненных адресов клиента:
            </div>
            {customerAddresses.map((address, index) => (
              <div
                key={index}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: '#fafafa'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fafafa';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
                onClick={() => handleSelectAddress(address)}
              >
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  Адрес {index + 1}
                  {address.isDefault && (
                    <Tag color="blue" style={{ marginLeft: 8 }}>Основной</Tag>
                  )}
                </div>
                <div style={{ color: '#374151', lineHeight: 1.5 }}>
                  <div>{address.address}</div>
                  <div>
                    {address.city}{address.state ? `, ${address.state}` : ''}{address.zipCode ? `, ${address.zipCode}` : ''}
                  </div>
                  {address.country && <div>{address.country}</div>}
                </div>
                <div style={{ marginTop: 8, color: '#6b7280', fontSize: '12px' }}>
                  Нажмите для выбора этого адреса
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <HomeOutlined style={{ fontSize: '48px', color: '#d1d5db', marginBottom: 16 }} />
            <div>У клиента нет сохраненных адресов</div>
            <div style={{ fontSize: '14px', marginTop: 8 }}>
              Введите адрес вручную
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={historyModal.open}
        onCancel={closeHistoryModal}
        footer={null}
        title="История действий по заказу"
        width={600}
      >
        {historyLoading ? (
          <div>Загрузка...</div>
        ) : historyEntries.length === 0 ? (
          <div style={{ color: '#888', textAlign: 'center', padding: 24 }}>Нет записей истории для этого заказа</div>
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {[...historyEntries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((entry, idx) => {
              const d = entry.details || {};
              const date = new Date(entry.timestamp).toLocaleString('ru-RU');
              let main = '';
              // Человеко-ориентированные подписи
              if (entry.order_action === 'order_created') main = `Создан заказ (статус: ${translateStatus(d.status)}, сумма: ${d.total})`;
              else if (entry.order_action === 'order_updated') main = `Изменён заказ (статус: ${translateStatus(d.status || '')})`;
              else if (entry.order_action === 'call_status_update') main = `Звонок: ${d.call_status === 'completed' ? 'выполнен' : (d.call_status === 'not_completed' ? 'не выполнен' : d.call_status)}`;
              else if (entry.order_action === 'call_attempt_added') main = `Неудачная попытка звонка №${d.total_attempts || ''}`;
              else if (entry.order_action === 'call_request') main = `Клиент запросил звонок`;
              else main = entry.order_action;
              return (
                <div key={entry.timestamp + idx} style={{ borderBottom: '1px solid #f0f0f0', padding: '12px 0' }}>
                  <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>{date}</div>
                  <div style={{ fontWeight: 500, color: '#222', marginBottom: 2 }}>{main}</div>
                  {(d.admin_user_name || d.admin_user_id) && (
                    <div style={{ fontSize: 12, color: '#3b82f6', marginBottom: 2 }}>
                      Администратор: {d.admin_user_name || (() => {
                        const admin = admins.find((a: any) => a._id === d.admin_user_id);
                        return admin ? `${admin.firstName} ${admin.lastName}` : d.admin_user_id;
                      })()}
                    </div>
                  )}
                  {d.changed_fields && Object.keys(d.changed_fields).length > 0 && (
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>
                      {Object.entries(d.changed_fields).map(([field, value]) => {
                        const v = value as { from: any, to: any };
                        const label = FIELD_LABELS[field] || field;
                        // Особая обработка для поля items
                        if (field === 'items') {
                          const compareItems = (fromItems: any[], toItems: any[]) => {
                            if (!Array.isArray(fromItems) || !Array.isArray(toItems)) {
                              return { added: [], removed: [], changed: [] };
                            }

                            // Создаем ключи для сравнения товаров (имя + количество)
                            const fromMap = new Map();
                            const toMap = new Map();

                            fromItems.forEach(item => {
                              if (item && item.name) {
                                const key = `${item.name}_${item.quantity || 1}`;
                                fromMap.set(key, item);
                              }
                            });

                            toItems.forEach(item => {
                              if (item && item.name) {
                                const key = `${item.name}_${item.quantity || 1}`;
                                toMap.set(key, item);
                              }
                            });

                            const added: any[] = [];
                            const removed: any[] = [];
                            const changed: any[] = [];

                            // Находим добавленные товары
                            toMap.forEach((item, key) => {
                              if (!fromMap.has(key)) {
                                added.push(item);
                              }
                            });

                            // Находим удаленные товары
                            fromMap.forEach((item, key) => {
                              if (!toMap.has(key)) {
                                removed.push(item);
                              }
                            });

                            return { added, removed, changed };
                          };

                          const formatItem = (item: any) => {
                            if (!item || !item.name) return '';
                            return `${item.name}${item.quantity && item.quantity > 1 ? ` (${item.quantity} шт.)` : ''}`;
                          };

                          const { added, removed } = compareItems(v.from || [], v.to || []);
                          
                          if (added.length > 0 || removed.length > 0) {
                            return (
                              <div key={field}>
                                {added.length > 0 && (
                                  <span style={{color: '#38a169'}}>+ Добавлено: {added.map(formatItem).join(', ')}</span>
                                )}
                                {removed.length > 0 && (
                                  <span style={{color: '#e53e3e'}}>- Удалено: {removed.map(formatItem).join(', ')}</span>
                                )}
                              </div>
                            );
                          } else {
                            // Если нет изменений, не показываем ничего для товаров
                            return null;
                          }
                        }
                        // Обычный рендер для остальных полей
                        return (
                          <div key={field}>
                            {label}: <span style={{color: '#e53e3e'}}>{field === 'status' ? translateStatus(String(v.from)) : String(v.from)}</span> → <span style={{color: '#38a169'}}>{field === 'status' ? translateStatus(String(v.to)) : String(v.to)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {entry.description && <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{entry.description}</div>}
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* Модальное окно создания прихода из заказа */}
      <Modal
        title={`Создать приход из заказа ${arrivalModal.order?.orderNumber || ''}`}
        open={arrivalModal.open}
        destroyOnHidden={true}
        onCancel={closeArrivalModal}
        onOk={() => {
          // Валидация: проверяем что для каждого товара выбран поставщик
          const hasErrors = arrivalItems.some(item => !item.supplierId);
          if (hasErrors) {
            message.error('Выберите поставщика для каждого товара');
            return;
          }

          // Валидация серийных номеров для не-аксессуаров
          const serialNumberErrors = arrivalItems.some(item => 
            !item.isAccessory && item.serialNumbers.filter((sn: string) => sn.trim()).length === 0
          );
          if (serialNumberErrors) {
            message.error('Добавьте серийные номера для техники');
            return;
          }

          arrivalForm.validateFields().then(values => {
            // Создаем приход в localStorage
            createArrivalFromOrder(values, arrivalItems);
            closeArrivalModal();
          });
        }}
        width={900}
        okText="Создать приход"
        cancelText="Отмена"
        style={{ top: 20 }}
      >
        <Form 
          form={arrivalForm} 
          layout="vertical"
        >
          <Form.Item
            name="notes"
            label="Примечания"
          >
            <Input.TextArea rows={2} placeholder="Дополнительная информация" />
          </Form.Item>

          <div>
            <h4>Товары для прихода:</h4>
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {arrivalItems.map((item, index) => (
                <div key={item.id} style={{ 
                  marginBottom: '16px', 
                  padding: '16px', 
                  background: '#f8f9fa', 
                  border: '1px solid #e9ecef', 
                  borderRadius: '8px' 
                }}>
                                     <Row gutter={16}>
                     <Col span={8}>
                       <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{item.name}</div>
                       <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                         Количество: {item.quantity}
                       </div>
                     </Col>
                     <Col span={5}>
                       <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>Поставщик:</div>
                       <Select
                         value={item.supplierId}
                         onChange={(supplierId) => {
                           const supplier = suppliers.find(s => s._id === supplierId);
                           const newItems = [...arrivalItems];
                           newItems[index] = {
                             ...newItems[index],
                             supplierId,
                             supplierName: supplier?.name || ''
                           };
                           setArrivalItems(newItems);
                         }}
                         placeholder="Выберите поставщика"
                         style={{ width: '100%' }}
                         size="small"
                       >
                         {suppliers.filter(s => s.status === 'active').map(supplier => (
                           <Option key={supplier._id} value={supplier._id}>
                             {supplier.name}
                           </Option>
                         ))}
                       </Select>
                     </Col>
                     <Col span={5}>
                       <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>Цена продажи:</div>
                       <InputNumber
                         value={item.price}
                         onChange={(value) => {
                           const newItems = [...arrivalItems];
                           newItems[index] = {
                             ...newItems[index],
                             price: value || 0
                           };
                           setArrivalItems(newItems);
                         }}
                         placeholder="0"
                         style={{ width: '100%' }}
                         size="small"
                         min={0}
                         formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                       />
                     </Col>
                     <Col span={6}>
                       <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>Закупочная цена:</div>
                       <InputNumber
                         value={item.costPrice}
                         onChange={(value) => {
                           const newItems = [...arrivalItems];
                           newItems[index] = {
                             ...newItems[index],
                             costPrice: value || 0
                           };
                           setArrivalItems(newItems);
                         }}
                         placeholder="0"
                         style={{ width: '100%' }}
                         size="small"
                         min={0}
                         formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                       />
                     </Col>
                   </Row>
                  
                  <Row gutter={16} style={{ marginTop: '12px' }}>
                    <Col span={8}>
                      <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>Тип товара:</div>
                      <Select
                        value={item.isAccessory ? 'accessory' : 'tech'}
                        onChange={(value) => {
                          const newItems = [...arrivalItems];
                          newItems[index] = {
                            ...newItems[index],
                            isAccessory: value === 'accessory',
                            serialNumbers: value === 'accessory' ? [] : ['']
                          };
                          setArrivalItems(newItems);
                        }}
                        style={{ width: '100%' }}
                        size="small"
                      >
                        <Option value="tech">🔧 Техника</Option>
                        <Option value="accessory">📦 Аксессуар</Option>
                      </Select>
                    </Col>
                    <Col span={16}>
                      {!item.isAccessory && (
                        <div>
                          <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
                            Серийные номера (количество = {item.serialNumbers.filter((sn: string) => sn.trim()).length}):
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {item.serialNumbers.map((sn: string, i: number) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Input
                                  value={sn}
                                  onChange={(e) => {
                                    const newItems = [...arrivalItems];
                                    newItems[index].serialNumbers[i] = e.target.value;
                                    setArrivalItems(newItems);
                                  }}
                                  placeholder={`S/N ${i + 1}`}
                                  size="small"
                                  style={{ width: '150px' }}
                                />
                                <Button
                                  size="small"
                                  icon={<CloseOutlined />}
                                  onClick={() => {
                                    const newItems = [...arrivalItems];
                                    newItems[index].serialNumbers = newItems[index].serialNumbers.filter((_: string, idx: number) => idx !== i);
                                    if (newItems[index].serialNumbers.length === 0) {
                                      newItems[index].serialNumbers = [''];
                                    }
                                    setArrivalItems(newItems);
                                  }}
                                  disabled={item.serialNumbers.length === 1}
                                />
                              </div>
                            ))}
                          </div>
                          <Button
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => {
                              const newItems = [...arrivalItems];
                              newItems[index].serialNumbers = [...newItems[index].serialNumbers, ''];
                              setArrivalItems(newItems);
                            }}
                            style={{ marginTop: '8px' }}
                          >
                            Добавить S/N
                          </Button>
                        </div>
                      )}
                      {item.isAccessory && (
                        <div>
                          <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>Штрихкод (опционально):</div>
                          <Input
                            value={item.barcode || ''}
                            onChange={(e) => {
                              const newItems = [...arrivalItems];
                              newItems[index] = {
                                ...newItems[index],
                                barcode: e.target.value
                              };
                              setArrivalItems(newItems);
                            }}
                            placeholder="Введите штрихкод"
                            size="small"
                          />
                        </div>
                      )}
                    </Col>
                  </Row>
                </div>
              ))}
            </div>
          </div>
        </Form>
      </Modal>
      </div>
    </>
  );
});

export default Orders; 