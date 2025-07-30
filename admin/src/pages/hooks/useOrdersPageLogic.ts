import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { message, Form } from 'antd';
import { io, Socket } from 'socket.io-client';
import dayjs from 'dayjs';
import { useOrderStats } from '../../hooks/useOrderStats';

// Типы можно будет вынести отдельно
interface Order {
  _id: string;
  orderNumber: string;
  userId: string;
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    isPartiallyRegistered?: boolean;
  };
  items: Array<{
    productId?: string;
    name: string;
    price: number;
    costPrice?: number;
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
  deliveryMethod?: any;
  deliveryDate?: string;
  shippingAddress: any;
  trackingNumber?: string;
  estimatedDelivery?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  cdekPvzAddress?: string;
  cdekPvzCode?: string;
  cdekDeliveryDate?: string;
  deliveryInterval?: string;
  callRequest?: boolean;
  callStatus?: string;
  callAttempts?: { date: string; status: string }[];
}

interface DeliveryMethod {
  _id: string;
  name: string;
  type: string;
  costType: string;
  fixedCost?: number;
  costPercentage?: number;
  isActive: boolean;
  earlyOrderIntervals?: string[];
  lateOrderIntervals?: string[];
  orderTransitionTime?: string;
  useFlexibleIntervals?: boolean;
  intervalType?: string;
  customInterval1?: string;
  customInterval2?: string;
  allowedPaymentMethods?: string[];
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

// --- FETCH ФУНКЦИИ ---
async function fetchOrders(page: number = 1, status?: string, limit: number = 20, deliveryFilter?: string): Promise<OrdersResponse> {
  const token = localStorage.getItem('admin_token');
  if (!token) throw new Error('No auth token');
  let url = `${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/orders?page=${page}&limit=${limit}`;
  if (status) url += `&status=${status}`;
  if (deliveryFilter) url += `&deliveryFilter=${deliveryFilter}`;
  const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!response.ok) throw new Error('Failed to fetch orders');
  return response.json();
}

async function fetchDeliveryMethods(): Promise<DeliveryMethod[]> {
  const token = localStorage.getItem('admin_token');
  if (!token) throw new Error('No auth token');
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/delivery`, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!response.ok) throw new Error('Failed to fetch delivery methods');
  const data = await response.json();
  return data.deliveryMethods || [];
}

async function fetchProducts(): Promise<Product[]> {
  const token = localStorage.getItem('admin_token');
  if (!token) throw new Error('No auth token');
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/products`, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!response.ok) throw new Error('Failed to fetch products');
  const data = await response.json();
  return data.products || [];
}

async function fetchCustomers(): Promise<any[]> {
  const token = localStorage.getItem('admin_token');
  if (!token) throw new Error('No auth token');
  const apiUrl = `${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/users`;
  const response = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!response.ok) throw new Error('Failed to fetch customers');
  const data = await response.json();
  return data.users || [];
}

// --- УТИЛИТЫ ---
function formatDeliveryDate(dateStr: string | undefined): string {
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

function getDeliveryDateTime(order: Order): string {
  if (order?.cdekPvzAddress && order?.cdekDeliveryDate) {
    const cdekDate = new Date(order.cdekDeliveryDate);
    return cdekDate.toLocaleDateString('ru-RU');
  }
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

export function useOrdersPageLogic(form: any, createOrderForm: any) {
  // --- СОСТОЯНИЯ ---
  const [admins, setAdmins] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [deliveryFilter, setDeliveryFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [availableTimeIntervals, setAvailableTimeIntervals] = useState<string[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isBulkStatusModalVisible, setIsBulkStatusModalVisible] = useState(false);
  const [isBulkDeleteModalVisible, setIsBulkDeleteModalVisible] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [isCallConfirmationModalVisible, setIsCallConfirmationModalVisible] = useState(false);
  const [orderForCallConfirmation, setOrderForCallConfirmation] = useState<Order | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [selectedProductForField, setSelectedProductForField] = useState<{fieldName: number, product: Product} | null>(null);
  const [cdekLoading, setCdekLoading] = useState(false);
  const [cdekTrackingLoading, setCdekTrackingLoading] = useState(false);
  const [checkAllTrackingLoading, setCheckAllTrackingLoading] = useState(false);
  const [cdekConfirmModalVisible, setCdekConfirmModalVisible] = useState(false);
  const [cdekOrderData, setCdekOrderData] = useState<any>(null);
  const [packageData, setPackageData] = useState({ weight: 2000, length: 20, width: 20, height: 20 });
  const [isCallAttemptModalVisible, setIsCallAttemptModalVisible] = useState(false);
  const [orderForCallAttempt, setOrderForCallAttempt] = useState<Order | null>(null);
  const [callAttempts, setCallAttempts] = useState<{ date: string; status: string }[]>([]);
  const [callAttemptLoading, setCallAttemptLoading] = useState(false);
  const [sortField, setSortField] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend'>('descend');
  const [isCreateOrderModalVisible, setIsCreateOrderModalVisible] = useState(false);
  const [createOrderLoading, setCreateOrderLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [createOrderFormKey, setCreateOrderFormKey] = useState(0);
  const [customerAddresses, setCustomerAddresses] = useState<any[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<string[]>([]);
  const [changelog, setChangelog] = useState<any[]>([]);
  const [historyModal, setHistoryModal] = useState<{open: boolean, orderId: string|null}>({open: false, orderId: null});
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const [ordersData, setOrdersData] = useState<Order[]>([]);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // --- useEffect: загрузка админов ---
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

  // --- useEffect: changelog ---
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/admin/changelog`)
      .then(res => res.json())
      .then(data => setChangelog(Array.isArray(data) ? data : []));
  }, []);

  // --- useEffect: products debug ---
  // products и productsLoading должны быть получены через useQuery в компоненте или хуке (перенос позже)
  // useEffect(() => {
  //   console.log('Товары загружены:', products.length);
  //   console.log('Загрузка товаров:', productsLoading);
  //   if (products.length > 0) {
  //     console.log('Первый товар:', products[0]);
  //   }
  // }, [products, productsLoading]);

  // --- useEffect: packageData -> cdekOrderData ---
  useEffect(() => {
    if (cdekOrderData) {
      setCdekOrderData((prev: any) => ({
        ...prev,
        packages: [packageData]
      }));
    }
  }, [packageData]);

  // --- useEffect: socket.io ---
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api';
    const socketUrl = apiUrl.replace('/api', '');
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => {
      socket.emit('joinOrderRoom', 'general');
    });
    socket.on('disconnect', () => {});
    socket.on('connect_error', (error: Error) => {
      console.error('🔌 Admin Socket.IO connection error:', error);
    });
    socket.on('order-updated', (data: { orderId: string; type: string; callRequest?: boolean; callStatus?: string }) => {
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
        // refetch(); // refetch будет перенесён позже
      }
    });
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // --- useEffect: scroll to top при загрузке страницы ---
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // --- useEffect: клиенты при открытии модалки создания заказа ---
  useEffect(() => {
    if (isCreateOrderModalVisible) {
      // loadCustomers(); // обработчик будет перенесён позже
    }
  }, [isCreateOrderModalVisible]);

  // --- useEffect: фильтр "новые заказы" при первой загрузке ---
  // newOrdersData и data должны быть получены через useQuery (перенос позже)
  // useEffect(() => {
  //   if (isFirstLoad && newOrdersData) {
  //     const hasNewOrders = newOrdersData.orders && newOrdersData.orders.length > 0;
  //     if (hasNewOrders) {
  //       setDeliveryFilter('new');
  //     }
  //     setIsFirstLoad(false);
  //   }
  // }, [newOrdersData, isFirstLoad]);

  // --- useEffect: обновление ordersData при data.orders ---
  // useEffect(() => {
  //   if (data?.orders) {
  //     setOrdersData(data.orders);
  //   }
  // }, [data?.orders]);

  // --- useEffect: selectedProductForField автозаполнение полей ---
  // useEffect(() => {
  //   if (selectedProductForField && form) {
  //     // ...
  //   }
  // }, [selectedProductForField, form]);

  // --- ОБРАБОТЧИКИ ---
  const handleStatusChange = useCallback((value: string) => {
    setSelectedStatus(value);
    setCurrentPage(1);
  }, []);

  const handleDeliveryFilterChange = useCallback((filter: string) => {
    setDeliveryFilter(filter);
    setCurrentPage(1);
    if (filter === '') {
      setIsFirstLoad(false);
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedStatus('');
    setDeliveryFilter('');
    setCurrentPage(1);
  }, []);

  const handlePageSizeChange = useCallback((current: number, size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  // --- ОБРАБОТЧИКИ (ПРОДОЛЖЕНИЕ) ---
  // (Вынесены из Orders.tsx, используют состояния и функции из хука)

  // handleUpdateOrder, showUpdateModal, forceUpdate, calculateTotal, closeModal, showCallConfirmationModal, handleCallConfirmation, closeCallConfirmationModal, handleShowCallAttemptModal, handleCloseCallAttemptModal, handleSort, getSortedData, handleCallAttempt, showCreateOrderModal, closeCreateOrderModal, loadCustomers, handleCreateOrder, loadCustomerAddresses, handleSelectAddress, calculateShippingCost, handleDeliveryMethodChange, updateShippingCost, handleBulkStatusChange, handleBulkDelete, handleQuickStatusChange, handleCreateCdekOrder, handleConfirmCdekOrder, handleGetCdekTracking, handleCheckAllCdekTracking, openHistoryModal, closeHistoryModal

  // ...сюда вставить все соответствующие useCallback/функции из Orders.tsx...

  // --- ОБРАБОТЧИКИ (ПОЛНЫЙ ПЕРЕНОС) ---
  const handleUpdateOrder = useCallback(async (values: any) => {
    if (!selectedOrder) return;
    try {
      const token = localStorage.getItem('admin_token');
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
        deliveryInterval: values.deliveryInterval,
        cdekPvzAddress: values.cdekPvzAddress,
        cdekPvzCode: values.cdekPvzCode,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        address: values.address,
        city: values.city,
        state: values.state,
        zipCode: values.zipCode,
        country: values.country,
        items: values.items
      };
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
      if (response.ok) {
        const result = await response.json();
        message.success('Заказ успешно обновлен');
        if (selectedOrder) {
          const updatedOrder = {
            ...selectedOrder,
            ...result
          };
          setSelectedOrder(updatedOrder);
        }
        closeModal();
        // refetch(); // refetch должен быть передан из компонента или useQuery
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Ошибка при обновлении заказа');
      }
    } catch (error) {
      message.error('Ошибка сети');
    }
  }, [selectedOrder]);

  const showUpdateModal = useCallback((order: any) => {
    let intervals: string[] = [];
    if (order.deliveryMethod?._id) {
      // deliveryMethods должен быть получен через useQuery (перенос позже)
    }
    const formValues = {
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
      cdekPvzCode: order.cdekPvzCode || '',
      firstName: order.shippingAddress.firstName,
      lastName: order.shippingAddress.lastName,
      email: order.shippingAddress.email,
      phone: order.shippingAddress.phone,
      address: order.shippingAddress.address,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      zipCode: order.shippingAddress.zipCode,
      country: order.shippingAddress.country,
      items: order.items
    };
    setSelectedOrder(order);
    setAvailableTimeIntervals(intervals);
    setIsUpdateModalVisible(true);
    setTimeout(() => {
      form.setFieldsValue(formValues);
    }, 50);
  }, [form, normalizeDeliveryDate]);

  const forceUpdate = useCallback(() => {
    form.validateFields().then(() => {});
  }, [form]);

  const calculateTotal = useCallback((items: any[]) => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, []);

  const closeModal = useCallback(() => {
    setIsUpdateModalVisible(false);
    setSelectedOrder(null);
    form.resetFields();
  }, [form]);

  const showCallConfirmationModal = useCallback((order: any) => {
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
        // refetch();
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

  const handleShowCallAttemptModal = useCallback((order: any) => {
    setOrderForCallAttempt(order);
    setCallAttempts(order.callAttempts || []);
    setIsCallAttemptModalVisible(true);
  }, []);

  const handleCloseCallAttemptModal = useCallback(() => {
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

  const getSortedData = useCallback(() => {
    const orders = ordersData.length > 0 ? ordersData : [];
    if (!sortField) return orders;
    return [...orders].sort((a, b) => {
      let aValue: any = a[sortField as keyof typeof a];
      let bValue: any = b[sortField as keyof typeof b];
      if (sortField === 'createdAt') {
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
      }
      if (sortField === 'deliveryDate') {
        const getDeliveryDate = (order: any) => {
          if (order?.cdekPvzAddress && order?.cdekDeliveryDate) {
            return new Date(order.cdekDeliveryDate).getTime();
          }
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
          return Number.MAX_SAFE_INTEGER;
        };
        aValue = getDeliveryDate(a);
        bValue = getDeliveryDate(b);
      }
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
  }, [ordersData, sortField, sortOrder]);

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
        // refetch();
        handleCloseCallAttemptModal();
      } else {
        message.error('Ошибка при обновлении статуса звонка');
      }
    } catch (error) {
      message.error('Ошибка сети');
    } finally {
      setCallAttemptLoading(false);
    }
  }, [orderForCallAttempt, handleCloseCallAttemptModal]);

  const showCreateOrderModal = useCallback(() => {
    setIsCreateOrderModalVisible(true);
    setCreateOrderFormKey((prev: number) => prev + 1);
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
      const customersData = await fetchCustomers();
      setCustomers(customersData);
    } catch (error) {
      message.error('Ошибка загрузки клиентов');
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  const handleCreateOrder = useCallback(async (values: any) => {
    setCreateOrderLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
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
        // refetch();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Ошибка при создании заказа');
      }
    } catch (error) {
      message.error('Ошибка сети');
    } finally {
      setCreateOrderLoading(false);
    }
  }, [selectedCustomer, closeCreateOrderModal]);

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
      } else {
        setCustomerAddresses([]);
      }
    } catch (error) {
      setCustomerAddresses([]);
    } finally {
      setAddressesLoading(false);
    }
  }, []);

  const handleSelectAddress = useCallback((address: any) => {
    createOrderForm.setFieldsValue({
      address: address.address || '',
      city: address.city || '',
      state: address.state || '',
      zipCode: address.zipCode || '',
      country: address.country || 'Россия',
    });
    setIsAddressModalVisible(false);
    message.success('Адрес выбран');
  }, [createOrderForm]);

  const calculateShippingCost = useCallback((deliveryMethodId: string, subtotal: number = 0) => {
    // deliveryMethods должен быть получен через useQuery (перенос позже)
    return 0;
  }, []);

  const handleDeliveryMethodChange = useCallback((deliveryMethodId: string) => {
    const items = createOrderForm.getFieldValue('items') || [];
    const subtotal = items.reduce((sum: number, item: any) => {
      const price = item.price || 0;
      const quantity = item.quantity || 0;
      return sum + (price * quantity);
    }, 0);
    const shippingCost = calculateShippingCost(deliveryMethodId, subtotal);
    createOrderForm.setFieldsValue({
      shipping: shippingCost
    });
    const total = subtotal + shippingCost;
    // deliveryMethods должен быть получен через useQuery (перенос позже)
    setAvailablePaymentMethods([]);
  }, [createOrderForm, calculateShippingCost]);

  const updateShippingCost = useCallback(() => {
    const deliveryMethodId = createOrderForm.getFieldValue('deliveryMethod');
    if (!deliveryMethodId) return;
    const items = createOrderForm.getFieldValue('items') || [];
    const subtotal = items.reduce((sum: number, item: any) => {
      const price = item.price || 0;
      const quantity = item.quantity || 0;
      return sum + (price * quantity);
    }, 0);
    const shippingCost = calculateShippingCost(deliveryMethodId, subtotal);
    createOrderForm.setFieldsValue({
      shipping: shippingCost
    });
  }, [createOrderForm, calculateShippingCost]);

  const handleBulkStatusChange = useCallback(async () => {
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
        setSelectedRowKeys([]);
        setIsBulkStatusModalVisible(false);
        // refetch();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Ошибка при обновлении статуса');
      }
    } catch (e) {
      message.error('Ошибка сети');
    } finally {
      setIsBulkLoading(false);
    }
  }, [selectedRowKeys, bulkStatus]);

  const handleBulkDelete = useCallback(async () => {
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
        setSelectedRowKeys([]);
        setIsBulkDeleteModalVisible(false);
        // refetch();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Ошибка при удалении заказов');
      }
    } catch (e) {
      message.error('Ошибка сети');
    } finally {
      setIsBulkLoading(false);
    }
  }, [selectedRowKeys]);

  const handleQuickStatusChange = useCallback(async (orderId: string, newStatus: string) => {
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
        // refetch();
      } else {
        message.error('Ошибка при обновлении статуса');
      }
    } catch (error) {
      message.error('Ошибка сети');
    }
  }, []);

  const handleCreateCdekOrder = useCallback(async (orderId?: string) => {
    if (!orderId || !selectedOrder) return;
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
      pvz_code: selectedOrder.cdekPvzCode || null,
      packages: [{
        weight: packageData.weight || 2000,
        length: packageData.length || 20,
        width: packageData.width || 20,
        height: packageData.height || 20
      }],
      cost: selectedOrder.total,
      currency: 'RUB',
      comment: `Заказ ${selectedOrder.orderNumber}`,
      tariff_code: 1
    };
    setCdekOrderData(orderData);
    setCdekConfirmModalVisible(true);
  }, [selectedOrder, packageData]);

  const handleConfirmCdekOrder = useCallback(async () => {
    if (!selectedOrder?._id || !cdekOrderData) return;
    setCdekLoading(true);
    setCdekConfirmModalVisible(false);
    try {
      const token = localStorage.getItem('admin_token');
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
      if (response.ok) {
        const result = await response.json();
        form.setFieldsValue({
          trackingNumber: result.trackingNumber
        });
        // refetch();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Ошибка при создании СДЭК отправления');
      }
    } catch (error) {
      message.error('Ошибка сети при создании СДЭК отправления');
    } finally {
      setCdekLoading(false);
    }
  }, [selectedOrder, cdekOrderData, form]);

  const handleGetCdekTracking = useCallback(async (orderId?: string) => {
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
          form.setFieldsValue({
            trackingNumber: result.trackingNumber
          });
          // refetch();
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
  }, [form]);

  const handleCheckAllCdekTracking = useCallback(async () => {
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
        // refetch();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Ошибка при запуске проверки');
      }
    } catch (error) {
      message.error('Ошибка сети при запуске проверки');
    } finally {
      setCheckAllTrackingLoading(false);
    }
  }, []);

  const openHistoryModal = useCallback((orderId: string) => {
    setHistoryModal({open: true, orderId});
    setHistoryLoading(true);
    fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/admin/changelog`)
      .then(res => res.json())
      .then(data => {
        const entries = (Array.isArray(data) ? data : []).filter((e: any) => String(e.details?.order_id) === String(orderId));
        setHistoryEntries(entries);
        setHistoryLoading(false);
      });
  }, []);

  const closeHistoryModal = useCallback(() => setHistoryModal({open: false, orderId: null}), []);

  return {
    // fetch/утилиты
    fetchOrders,
    fetchDeliveryMethods,
    fetchProducts,
    fetchCustomers,
    formatDeliveryDate,
    getDeliveryDateTime,
    normalizeDeliveryDate,
    // состояния
    admins, setAdmins,
    selectedStatus, setSelectedStatus,
    deliveryFilter, setDeliveryFilter,
    currentPage, setCurrentPage,
    pageSize, setPageSize,
    isUpdateModalVisible, setIsUpdateModalVisible,
    selectedOrder, setSelectedOrder,
    availableTimeIntervals, setAvailableTimeIntervals,
    selectedRowKeys, setSelectedRowKeys,
    isBulkStatusModalVisible, setIsBulkStatusModalVisible,
    isBulkDeleteModalVisible, setIsBulkDeleteModalVisible,
    bulkStatus, setBulkStatus,
    isBulkLoading, setIsBulkLoading,
    isCallConfirmationModalVisible, setIsCallConfirmationModalVisible,
    orderForCallConfirmation, setOrderForCallConfirmation,
    formKey, setFormKey,
    selectedProductForField, setSelectedProductForField,
    cdekLoading, setCdekLoading,
    cdekTrackingLoading, setCdekTrackingLoading,
    checkAllTrackingLoading, setCheckAllTrackingLoading,
    cdekConfirmModalVisible, setCdekConfirmModalVisible,
    cdekOrderData, setCdekOrderData,
    packageData, setPackageData,
    isCallAttemptModalVisible, setIsCallAttemptModalVisible,
    orderForCallAttempt, setOrderForCallAttempt,
    callAttempts, setCallAttempts,
    callAttemptLoading, setCallAttemptLoading,
    sortField, setSortField,
    sortOrder, setSortOrder,
    isCreateOrderModalVisible, setIsCreateOrderModalVisible,
    createOrderLoading, setCreateOrderLoading,
    customers, setCustomers,
    customersLoading, setCustomersLoading,
    selectedCustomer, setSelectedCustomer,
    createOrderFormKey, setCreateOrderFormKey,
    customerAddresses, setCustomerAddresses,
    addressesLoading, setAddressesLoading,
    isAddressModalVisible, setIsAddressModalVisible,
    availablePaymentMethods, setAvailablePaymentMethods,
    changelog, setChangelog,
    historyModal, setHistoryModal,
    historyLoading, setHistoryLoading,
    historyEntries, setHistoryEntries,
    socketRef,
    ordersData, setOrdersData,
    isFirstLoad, setIsFirstLoad,
    // обработчики
    handleStatusChange,
    handleDeliveryFilterChange,
    handleClearFilters,
    handlePageSizeChange,
    handleUpdateOrder,
    showUpdateModal,
    forceUpdate,
    calculateTotal,
    closeModal,
    showCallConfirmationModal,
    handleCallConfirmation,
    closeCallConfirmationModal,
    handleShowCallAttemptModal,
    handleCloseCallAttemptModal,
    handleSort,
    getSortedData,
    handleCallAttempt,
    showCreateOrderModal,
    closeCreateOrderModal,
    loadCustomers,
    handleCreateOrder,
    loadCustomerAddresses,
    handleSelectAddress,
    calculateShippingCost,
    handleDeliveryMethodChange,
    updateShippingCost,
    handleBulkStatusChange,
    handleBulkDelete,
    handleQuickStatusChange,
    handleCreateCdekOrder,
    handleConfirmCdekOrder,
    handleGetCdekTracking,
    handleCheckAllCdekTracking,
    openHistoryModal,
    closeHistoryModal,
  };
} 