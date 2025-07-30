'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Phone, MapPin, Package, Settings, LogOut, Edit, Save, X, DollarSign, TrendingUp, Award, Calendar, Eye, Truck, CheckCircle, UserCheck, MessageCircle, Bell, ArrowLeft, ArrowRight, Users } from 'lucide-react';
import OrderStatus from '@/components/OrderStatus';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileNavigation from '@/components/layout/MobileNavigation';
import Link from 'next/link';
import { IMaskInput } from 'react-imask';
import { useProfileSocket } from '@/hooks/useProfileSocket';
import { fixImageUrl } from '@/utils/imageUrl';
import { clearInvalidToken } from '@/utils/tokenValidator';
import ProfileQRCode from '@/components/ProfileQRCode';
import PushNotificationManager from '@/components/PushNotificationManager';

// Тип для заказа
type Order = {
  _id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  deliveryMethod?: {
    name?: string;
    displayName?: string;
  };
  deliveryDate?: string;
  deliveryTime?: string;
  deliveryInterval?: string;
  deliveryAddress?: string;
  paymentMethod?: string;
  callRequest?: boolean;
  callStatus?: 'requested' | 'completed' | 'not_completed';
  cdekPvzAddress?: string; // Адрес пункта выдачи СДЭК
  cdekDeliveryDate?: string; // Ожидаемая дата доставки СДЭК
  items: any[];
};

// Тип для способа оплаты
type PaymentMethod = {
  _id: string;
  name: string;
  systemCode: string;
  displayTitle?: string;
};

// Тип для адреса доставки
type DeliveryAddress = {
  id: string;
  name: string;
  address: string;
  isDefault: boolean;
  createdAt: string;
  city?: string;
  state?: string;
  zipCode?: string;
  apartment?: string;
  entrance?: string;
  floor?: string;
  comment?: string;
};

// --- DaData Address Suggest ---
type DaDataSuggestion = {
  value: string;
  data: any;
};

// Для корректного расширения window
export {};
declare global {
  interface Window {
    openNotificationDrawer?: () => void;
  }
}
// ... существующий код ...

export default function ProfilePage() {
  const { user, orders, isLoading, logout, updateProfile, refreshOrders } = useAuth();
  const router = useRouter();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    phone: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showCallConfirmation, setShowCallConfirmation] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [isCallRequestLoading, setIsCallRequestLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [showProfileError, setShowProfileError] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'all' | 'in_transit' | 'completed'>('all');
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [showAddressesModal, setShowAddressesModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DeliveryAddress | null>(null);
  // 1. Расширить addressForm:
  const [addressForm, setAddressForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    apartment: '',
    entrance: '',
    floor: '',
    comment: '',
    isDefault: false
  });
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  let profileErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Получение справочника способов оплаты
  const [allPaymentMethods, setAllPaymentMethods] = useState<PaymentMethod[]>([]);
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.log('ℹ️ Нет токена для загрузки способов оплаты');
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://technoline-api.loca.lt/api'}/payment-methods`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (res.ok) {
          return res.json();
                 } else if (res.status === 401) {
           console.log('🔐 Токен недействителен при загрузке способов оплаты');
           clearInvalidToken();
           throw new Error('Unauthorized');
        } else {
          throw new Error('Network error');
        }
      })
      .then(data => setAllPaymentMethods(data.paymentMethods || []))
      .catch(error => {
        console.error('❌ Ошибка загрузки способов оплаты:', error);
        setAllPaymentMethods([]);
      });
  }, []);

  const paymentMethodFallbacks: Record<string, string> = {
    cash_on_delivery: 'Наличными при получении',
    credit_purchase: 'Покупка в кредит',
    usdt_payment: 'Оплата USDT',
    bank_card: 'Банковская карта',
    sberbank_transfer: 'Перевод на Сбербанк',
    yookassa: 'ЮKassa',
    qiwi: 'QIWI',
    paypal: 'PayPal',
    apple_pay: 'Apple Pay',
    google_pay: 'Google Pay',
    // Добавьте другие коды и переводы по необходимости
  };

  const getPaymentMethodDisplayName = (systemCode: string) => {
    const method = allPaymentMethods.find(m => m.systemCode === systemCode);
    return method?.displayTitle || method?.name || paymentMethodFallbacks[systemCode] || systemCode;
  };

  useEffect(() => {
    if (user) {
      setEditForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        middleName: user.middleName || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  const handleEdit = () => {
    setIsEditing(true);
    setError('');
  };

  const isPhoneValid = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/.test(editForm.phone);

  const showProfileErrorToast = (msg: string) => {
    setProfileError(msg);
    setShowProfileError(true);
    if (profileErrorTimeoutRef.current) clearTimeout(profileErrorTimeoutRef.current);
    profileErrorTimeoutRef.current = setTimeout(() => setShowProfileError(false), 3000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccessMessage('');
    if (!isPhoneValid) {
      showProfileErrorToast('Пожалуйста, введите корректный номер телефона');
      setIsSaving(false);
      return;
    }
    try {
      await updateProfile(editForm);
      setIsEditing(false);
      setSuccessMessage('Профиль успешно обновлен!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setError(error.message || 'Ошибка сохранения');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    setSuccessMessage('');
    if (user) {
      setEditForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        middleName: user.middleName || '',
        phone: user.phone || ''
      });
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const showDeliveryAddress = (order: Order) => {
    setSelectedOrder(order);
    setShowAddressModal(true);
  };

  const handleCallRequest = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowCallConfirmation(true);
  };

  const confirmCall = async (confirmed: boolean) => {
    if (confirmed && selectedOrderId) {
      setIsCallRequestLoading(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/orders/${selectedOrderId}/call-request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({ callRequest: true })
        });

        console.log('📡 Ответ сервера:', {
          status: response.status,
          ok: response.ok
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Успешный ответ:', result);
          
          // Обновляем заказы с небольшой задержкой
          try {
            console.log('🔄 Обновление заказов после запроса звонка...');
            
            // Небольшая задержка, чтобы сервер успел обработать изменения
            await new Promise(resolve => setTimeout(resolve, 500));
            
            await refreshOrders();
            console.log('✅ Заказы обновлены после запроса звонка');
            
            // Показываем уведомление после успешного обновления
            alert('Запрос на звонок отправлен! Мы свяжемся с вами в ближайшее время.');
          } catch (error) {
            console.error('❌ Ошибка обновления заказов после запроса звонка:', error);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.log('❌ Ошибка сервера:', errorData);
          alert(`Ошибка при отправке запроса звонка: ${errorData.message || 'Неизвестная ошибка'}`);
        }
      } catch (error) {
        console.error('❌ Ошибка при отправке запроса звонка:', error);
        alert('Ошибка при отправке запроса звонка. Проверьте подключение к интернету.');
      } finally {
        setIsCallRequestLoading(false);
      }
    }
    setShowCallConfirmation(false);
  };

  // Подсчёт общей суммы покупок
  const totalSpent = useMemo(() => {
    if (!orders || orders.length === 0) return 0;
    return orders.reduce((total, order) => total + order.total, 0);
  }, [orders]);

  // Подсчёт средней суммы заказа
  const averageOrderValue = useMemo(() => {
    if (!orders || orders.length === 0) return 0;
    return Math.round(totalSpent / orders.length);
  }, [orders, totalSpent]);

  // Форматирование суммы для отображения
  const formatCurrency = (amount: number) => {
    if (amount === 0) return '0 ₽';
    return `${amount.toLocaleString('ru-RU')} ₽`;
  };

  // Получение отображаемого названия способа доставки
  const getDeliveryMethodDisplayName = (method: any) => {
    if (!method) return '';
    
    if (method.displayName) {
      return method.displayName;
    }
    
    switch (method.name) {
      case 'cdek_pickup':
        return 'Доставка в пункт выдачи СДЭК';
      case 'cdek_courier':
        return 'Доставка курьером СДЭК';
      case 'pickup':
        return 'Самовывоз';
      case 'courier':
        return 'Курьерская доставка';
      case 'post':
        return 'Почтовая доставка';
      default:
        return method.name || 'Доставка';
    }
  };

  // Проверка, является ли способ доставки самовывозом
  const isPickup = (method: any) => {
    if (!method) return false;
    
    // Проверяем по типу доставки из админки
    return method.type === 'pickup';
  };

  // Поиск ближайшего заказа (включая самовывозы)
  const upcomingOrder = useMemo(() => {
    if (!orders) return null;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const dayAfterTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    
    // Фильтруем активные заказы с датой доставки
    const activeOrders = orders.filter(order => {
      if (!order.deliveryDate || !['pending', 'confirmed', 'processing'].includes(order.status)) return false;
      
      // Проверяем дату доставки
      if (['today', 'tomorrow', 'day3'].includes(order.deliveryDate)) return true;
      
      if (/^\d{4}-\d{2}-\d{2}$/.test(order.deliveryDate)) {
        const [year, month, day] = order.deliveryDate.split('-');
        const deliveryDate = new Date(Number(year), Number(month) - 1, Number(day));
        return deliveryDate >= today;
      }
      
      return false;
    });
    
    if (activeOrders.length === 0) return null;
    
    // Сортируем заказы по приоритету: сегодня > завтра > послезавтра, самовывоз > доставка
    activeOrders.sort((a, b) => {
      // Получаем даты доставки
      const getDeliveryDate = (order: any) => {
        if (order.deliveryDate === 'today') return today;
        if (order.deliveryDate === 'tomorrow') return tomorrow;
        if (order.deliveryDate === 'day3') return dayAfterTomorrow;
        if (/^\d{4}-\d{2}-\d{2}$/.test(order.deliveryDate)) {
          const [year, month, day] = order.deliveryDate.split('-');
          return new Date(Number(year), Number(month) - 1, Number(day));
        }
        return new Date(0); // Очень старая дата для сортировки
      };
      
      const dateA = getDeliveryDate(a);
      const dateB = getDeliveryDate(b);
      
      // Сначала сортируем по дате
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      
      // Если даты одинаковые, приоритет самовывозу
      const isPickupA = isPickup(a.deliveryMethod);
      const isPickupB = isPickup(b.deliveryMethod);
      
      if (isPickupA && !isPickupB) return -1;
      if (!isPickupA && isPickupB) return 1;
      
      // Если тип одинаковый, сортируем по времени создания (новые первыми)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return activeOrders[0];
  }, [orders]);

  // Проверяем наличие заказа со статусом "Передан курьеру"
  const courierOrder = useMemo(() => {
    if (!orders || orders.length === 0) return null;
    return orders.find(order => order.status === 'with_courier');
  }, [orders]);

  // Получение адреса доставки
  const getDeliveryAddress = (order: any) => {
    if (!order?.deliveryMethod) return '';
    
    // Проверяем, является ли это СДЭК
    const isCdek = order?.deliveryMethod?.name?.toLowerCase().includes('сдэк') || 
                   order?.deliveryMethod?.name?.toLowerCase().includes('cdek');
    
    if (isCdek && order?.cdekPvzAddress) {
      // Для СДЭК отображаем адрес ПВЗ
      return order.cdekPvzAddress;
    }
    
    if (isPickup(order?.deliveryMethod)) {
      // Для самовывоза используем адрес из способа доставки или запасной вариант
      return order?.deliveryMethod?.address || 'Москва, Пятницкое шоссе, 18, Павильон 73. 1 этаж';
    }
    
    // Для курьера и других способов — ищем адрес в разных полях
    return (
      order?.deliveryAddress ||
      order?.shippingAddress?.address ||
      (typeof order?.shippingAddress === 'string' ? order.shippingAddress : '') ||
      ''
    );
  };

  // Получение названия поля адреса в зависимости от способа доставки
  const getAddressFieldName = (order: any) => {
    if (!order?.deliveryMethod) return 'Адрес доставки';
    
    // Проверяем, является ли это СДЭК
    const isCdek = order?.deliveryMethod?.name?.toLowerCase().includes('сдэк') || 
                   order?.deliveryMethod?.name?.toLowerCase().includes('cdek');
    
    if (isCdek) {
      return 'Пункт выдачи СДЭК';
    }
    
    if (isPickup(order?.deliveryMethod)) {
      return 'Адрес самовывоза';
    }
    
    return 'Адрес доставки';
  };

  const getMoscowDate = (date?: Date) => {
    // Получить московскую дату (UTC+3)
    const d = date ? new Date(date) : new Date();
    // Переводим в миллисекундах на +3 часа
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset() + 180);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const formatDeliveryDate = (dateString: string) => {
    if (!dateString) return 'Не указано';
    
    // Обрабатываем строки today/tomorrow/day3
    if (dateString === 'today') {
      const today = getMoscowDate();
      return `Сегодня, ${today.toLocaleDateString('ru-RU', { month: 'long', day: 'numeric' })}`;
    }
    
    if (dateString === 'tomorrow') {
      const tomorrow = getMoscowDate();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return `Завтра, ${tomorrow.toLocaleDateString('ru-RU', { month: 'long', day: 'numeric' })}`;
    }
    
    if (dateString === 'day3') {
      const day3 = getMoscowDate();
      day3.setDate(day3.getDate() + 2);
      return day3.toLocaleDateString('ru-RU', { month: 'long', day: 'numeric' });
    }
    
    // Обрабатываем дату в формате YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const date = new Date(dateString);
      const moscowNow = getMoscowDate();
      const moscowTomorrow = getMoscowDate();
      moscowTomorrow.setDate(moscowTomorrow.getDate() + 1);
      const moscowDelivery = getMoscowDate(date);

      if (moscowDelivery.getTime() === moscowNow.getTime()) {
        return `Сегодня, ${date.toLocaleDateString('ru-RU', { month: 'long', day: 'numeric' })}`;
      } else if (moscowDelivery.getTime() === moscowTomorrow.getTime()) {
        return `Завтра, ${date.toLocaleDateString('ru-RU', { month: 'long', day: 'numeric' })}`;
      } else {
        return date.toLocaleDateString('ru-RU', { month: 'long', day: 'numeric' });
      }
    }
    
    // Если неизвестный формат, возвращаем как есть
    return dateString;
  };

  const getDeliveryDateTime = (order: any) => {
    // Проверяем, является ли это СДЭК
    const isCdek = order?.deliveryMethod?.name?.toLowerCase().includes('сдэк') || 
                   order?.deliveryMethod?.name?.toLowerCase().includes('cdek');
    
    // Для СДЭК проверяем наличие ожидаемой даты доставки
    if (isCdek && order?.cdekDeliveryDate) {
      const cdekDate = new Date(order.cdekDeliveryDate);
      const formattedDate = cdekDate.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      return `Ожидаемая дата доставки: ${formattedDate}`;
    }
    
    // Для остальных способов доставки используем стандартную логику
    if (!order?.deliveryDate) return 'Не указано';
    
    const dateText = formatDeliveryDate(order.deliveryDate);
    
    if (order?.deliveryInterval) {
      return `${dateText} в ${order.deliveryInterval}`;
    } else {
      return dateText;
    }
  };

  // Socket.IO для мгновенного обновления заказов
  console.log('🔌 Setting up Socket.IO in profile...');
  const orderIds = orders?.map(order => order._id) || [];
  useProfileSocket({
    orderIds,
    onOrderUpdate: (data) => {
      console.log('📦 Order updated via Socket.IO in profile:', data);
      console.log('📦 Refreshing orders in profile...');
      // Мгновенно обновляем список заказов при получении события
      refreshOrders();
      console.log('📦 Orders refreshed via Socket.IO');
    }
  });

  // Принудительное обновление при изменении заказов
  useEffect(() => {
    console.log('📦 Orders changed in profile, count:', orders?.length);
  }, [orders]);

  // Фильтрация заказов по статусу
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    
    switch (orderFilter) {
      case 'in_transit':
        // Заказы в пути: отправлены или переданы курьеру
        return orders.filter(order => 
          ['shipped', 'with_courier'].includes(order.status)
        );
      case 'completed':
        // Завершенные заказы: доставлены
        return orders.filter(order => 
          order.status === 'delivered'
        );
      default:
        // Все заказы
        return orders;
    }
  }, [orders, orderFilter]);

  // Подсчет заказов по категориям
  const orderCounts = useMemo(() => {
    if (!orders) return { all: 0, in_transit: 0, completed: 0 };
    
    return {
      all: orders.length,
      in_transit: orders.filter(order => ['shipped', 'with_courier'].includes(order.status)).length,
      completed: orders.filter(order => order.status === 'delivered').length
    };
  }, [orders]);

  // Загрузка адресов пользователя
  const loadAddresses = async () => {
    if (!user?._id) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/users/${user._id}/addresses`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAddresses(data.addresses || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки адресов:', error);
    }
  };

  // Загрузка адресов при загрузке профиля
  useEffect(() => {
    loadAddresses();
  }, [user?._id]);

  // Добавление нового адреса
  const addAddress = async () => {
    if (!user?._id || !addressForm.name || !addressForm.address) return;
    
    setIsAddressLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/users/${user._id}/addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(addressForm)
      });
      
      if (response.ok) {
        await loadAddresses();
        setAddressForm(emptyAddressForm);
        setShowAddressesModal(false);
        setEditingAddress(null);
      }
    } catch (error) {
      console.error('Ошибка добавления адреса:', error);
    } finally {
      setIsAddressLoading(false);
    }
  };

  // Обновление адреса
  const updateAddress = async () => {
    if (!editingAddress || !addressForm.name || !addressForm.address) return;
    setIsAddressLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/addresses/user/${editingAddress.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(addressForm)
      });
      if (response.ok) {
        await loadAddresses();
        setAddressForm(emptyAddressForm);
        setShowAddressesModal(false);
        setEditingAddress(null);
      }
    } catch (error) {
      console.error('Ошибка обновления адреса:', error);
    } finally {
      setIsAddressLoading(false);
    }
  };

  // Удаление адреса
  const deleteAddress = async (addressId: string) => {
    if (!user?._id) return;
    
    if (!confirm('Вы уверены, что хотите удалить этот адрес?')) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/users/${user._id}/addresses/${addressId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        await loadAddresses();
      }
    } catch (error) {
      console.error('Ошибка удаления адреса:', error);
    }
  };

  // Установка адреса по умолчанию
  const setDefaultAddress = async (addressId: string) => {
    if (!user?._id) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/users/${user._id}/addresses/${addressId}/default`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        await loadAddresses();
      }
    } catch (error) {
      console.error('Ошибка установки адреса по умолчанию:', error);
    }
  };

  // Открытие модального окна для добавления адреса
  const openAddAddressModal = () => {
    setAddressForm(emptyAddressForm);
    setEditingAddress(null);
    setShowAddressesModal(true);
  };

  // Открытие модального окна для редактирования адреса
  const openEditAddressModal = (address: DeliveryAddress) => {
    setAddressForm({
      name: address.name || '',
      address: address.address || '',
      city: address.city || '',
      state: address.state || '',
      zipCode: address.zipCode || '',
      apartment: address.apartment || '',
      entrance: address.entrance || '',
      floor: address.floor || '',
      comment: address.comment || '',
      isDefault: address.isDefault || false
    });
    setEditingAddress(address);
    setShowAddressesModal(true);
  };

  // --- DaData Address Suggest ---
  const [addressSuggestions, setAddressSuggestions] = useState<DaDataSuggestion[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);

  // --- Функция для получения подсказок Dadata ---
  const fetchAddressSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setAddressSuggestions([]);
      return;
    }
    try {
      const encodedQuery = encodeURIComponent(query);
      const res = await fetch(`/api/addresses/search?q=${encodedQuery}`);
      const data = await res.json();
      setAddressSuggestions(data.suggestions || []);
    } catch (e) {
      setAddressSuggestions([]);
    }
  };

  const handleAddressInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddressForm(prev => ({ ...prev, address: value }));
    if (value.length >= 3) {
      setAddressLoading(true);
      await fetchAddressSuggestions(value);
      setShowAddressSuggestions(true);
      setAddressLoading(false);
    } else {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: DaDataSuggestion) => {
    setAddressForm(prev => ({ ...prev, address: suggestion.value }));
    setShowAddressSuggestions(false);
  };

  // После блока с DaData Address Suggest:
  const handleAddressSuggestionClick = (suggestion: DaDataSuggestion) => {
    setAddressForm(prev => ({
      ...prev,
      address: suggestion.value || '',
      city: suggestion.data?.city || '',
      state: suggestion.data?.region_with_type || '',
      zipCode: suggestion.data?.postal_code || '',
    }));
    setShowAddressSuggestions(false);
  };

  // В начале компонента:
  const emptyAddressForm = {
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    apartment: '',
    entrance: '',
    floor: '',
    comment: '',
    isDefault: false
  };

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Загрузка отзывов пользователя
  const loadUserReviews = async () => {
    if (!user?._id) return;
    setReviewsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/reviews?userId=${user._id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setUserReviews(data.filter((r: any) => r.user?._id === user._id || r.user === user._id));
      }
    } catch (e) {
      setUserReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (showReviewsModal) loadUserReviews();
    // eslint-disable-next-line
  }, [showReviewsModal]);

  // Используем глобальный NotificationDrawer через context или props
  // Для примера: window.openNotificationDrawer() — этот метод должен быть реализован глобально

  // 1. В начале компонента:
  const [imageModal, setImageModal] = useState<{visible: boolean, images: string[], index: number}>({visible: false, images: [], index: 0});

  // Функция для форматирования ФИО
  function formatFullName(user: any) {
    return [user?.lastName, user?.firstName, user?.middleName].filter(Boolean).join(' ');
  }

  return (
    <ProtectedRoute>
      <Header onNotificationClick={() => window.openNotificationDrawer?.()} />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 pt-20 pb-24 md:pt-32 md:pb-0">
        <div className="max-w-4xl mx-auto px-3 py-4 md:px-4 md:py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl md:rounded-2xl shadow-lg overflow-hidden"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 px-3 md:px-6 py-4 md:py-8 text-white overflow-hidden">
              {/* Background decoration */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
              
              {/* Мобильная версия */}
              <div className="relative md:hidden">
                {/* Профиль и основная информация */}
                <div className="flex items-center space-x-2 mb-3">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 shadow-lg flex-shrink-0"
                  >
                    <User className="w-5 h-5" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex-1 min-w-0"
                  >
                    <h1 className="text-base font-bold truncate">
                      {formatFullName(user) || 'Пользователь'}
                    </h1>
                    <p className="text-blue-100 flex items-center space-x-1 text-xs truncate">
                      <Mail className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{user?.email}</span>
                    </p>
                  </motion.div>
                </div>
                
                {/* Кнопки управления - оптимизированная раскладка */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-1.5"
                >
                  {/* Первая строка - иконки быстрого доступа */}
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined' && typeof window.openNotificationDrawer === 'function') {
                          window.openNotificationDrawer();
                        }
                      }}
                      className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-2 py-2 rounded-lg flex items-center justify-center transition-all duration-200 border border-white/30 shadow-lg"
                      title="Уведомления"
                    >
                      <Bell className="w-3.5 h-3.5" />
                    </button>
                    <Link href="/referrals" className="block">
                      <button
                        className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm px-2 py-2 rounded-lg flex items-center justify-center transition-all duration-200 border border-white/30 shadow-lg"
                        title="Реферальная программа"
                      >
                        <Users className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                    <button
                      onClick={() => setShowReviewsModal(true)}
                      className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-2 py-2 rounded-lg flex items-center justify-center transition-all duration-200 border border-white/30 shadow-lg"
                      title="Мои отзывы"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleLogout}
                      className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-2 py-2 rounded-lg flex items-center justify-center transition-all duration-200 border border-white/30 shadow-lg"
                      title="Выйти"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  {/* Реферальная программа */}
                  <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-lg border border-white/30 shadow-lg">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold">Реферальная программа</h3>
                      <Link href="/referrals">
                        <button className="text-xs bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded transition-colors">
                          Перейти
                        </button>
                      </Link>
                    </div>
                  </div>

                  {/* Кнопки управления */}
                  <div className="flex">
                    {!isEditing ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleEdit}
                        className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3 py-2.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all duration-200 border border-white/30 shadow-lg"
                      >
                        <Edit className="w-4 h-4" />
                        <span className="text-sm font-medium">Редактировать</span>
                      </motion.button>
                    ) : (
                      <div className="flex space-x-1.5 w-full">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleSave}
                          disabled={isSaving}
                          className="flex-1 bg-green-500 hover:bg-green-600 px-2 py-2.5 rounded-lg flex items-center justify-center space-x-1 transition-all duration-200 shadow-lg disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">{isSaving ? 'Сохранение...' : 'Сохранить'}</span>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleCancel}
                          className="flex-1 bg-red-500 hover:bg-red-600 px-2 py-2.5 rounded-lg flex items-center justify-center space-x-1 transition-all duration-200 shadow-lg"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">Отмена</span>
                        </motion.button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Десктопная версия */}
              <div className="relative hidden md:flex flex-col space-y-4">
                {/* Верхняя часть с информацией о пользователе */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 shadow-lg"
                    >
                      <User className="w-8 h-8" />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <h1 className="text-2xl font-bold">
                        {formatFullName(user) || 'Пользователь'}
                      </h1>
                      <p className="text-blue-100 flex items-center space-x-2">
                        <Mail className="w-4 h-4" />
                        <span>{user?.email}</span>
                      </p>
                    </motion.div>
                  </div>
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex space-x-2"
                  >
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined' && typeof window.openNotificationDrawer === 'function') {
                          window.openNotificationDrawer();
                        }
                      }}
                      className="relative bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 border border-white/30 shadow-lg"
                    >
                      <Bell className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowReviewsModal(true)}
                      className="relative bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 border border-white/30 shadow-lg"
                      title="Мои отзывы"
                    >
                      <MessageCircle className="w-4 h-4 text-white" />
                    </button>
                    {!isEditing ? (
                      <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleEdit}
                        className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 border border-white/30 shadow-lg"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Редактировать</span>
                      </motion.button>
                    ) : (
                      <div className="flex space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleSave}
                          disabled={isSaving}
                          className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-lg disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" />
                          <span>{isSaving ? 'Сохранение...' : 'Сохранить'}</span>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleCancel}
                          className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-lg"
                        >
                          <X className="w-4 h-4" />
                          <span>Отмена</span>
                        </motion.button>
                      </div>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleLogout}
                      className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 border border-white/30 shadow-lg"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Выйти</span>
                    </motion.button>
                  </motion.div>
                </div>

                {/* Реферальная программа */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white/20 backdrop-blur-sm p-4 rounded-lg border border-white/30 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Реферальная программа</h3>
                    <Link href="/referrals">
                      <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm">
                        Перейти
                      </button>
                    </Link>
                  </div>
                </motion.div>
              </div>
            </div>

            <div className="p-3 md:p-6">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-6 shadow-lg"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="font-medium">{error}</span>
                  </div>
                </motion.div>
              )}

              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-4 text-green-700 text-sm mb-6 shadow-lg"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-medium">{successMessage}</span>
                  </div>
                </motion.div>
              )}

              {courierOrder && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-6 flex items-center gap-4 bg-gradient-to-r from-cyan-50/90 to-cyan-100/90 backdrop-blur-sm border border-cyan-200/80 rounded-xl p-4 shadow-lg"
                >
                  <motion.div
                    animate={{ 
                      x: [0, 5, 0],
                      y: [0, -2, 0]
                    }}
                    transition={{ 
                      duration: 1.5, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                  >
                    <UserCheck className="w-10 h-10 text-cyan-600" />
                  </motion.div>
                  <div>
                    <div className="font-bold text-lg text-cyan-900">
                      Курьер в пути!
                    </div>
                    <div className="text-cyan-800 text-sm mt-1">
                      Ваш заказ передан курьеру
                    </div>
                    <div className="text-cyan-700 text-xs mt-1">
                      Ожидайте звонка от курьера для уточнения времени доставки.
                    </div>
                  </div>
                </motion.div>
              )}

              {upcomingOrder && !courierOrder && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-6 flex items-center gap-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 shadow-lg"
                >
                  <div className="animate-bounce">
                    {isPickup(upcomingOrder?.deliveryMethod) ? (
                      <Package className="w-10 h-10 text-purple-600" />
                    ) : (
                      <Truck className="w-10 h-10 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-lg text-blue-900">
                      {isPickup(upcomingOrder?.deliveryMethod)
                        ? 'Не пропустите самовывоз!'
                        : 'Не пропустите доставку!'}
                    </div>
                    <div className="text-blue-800 text-sm mt-1">
                      {getDeliveryDateTime(upcomingOrder)}
                    </div>
                    <div className="text-blue-700 text-xs mt-1">
                      {isPickup(upcomingOrder?.deliveryMethod)
                        ? 'Заберите ваш заказ в магазине.'
                        : 'Ожидайте курьера по вашему адресу.'}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Profile Info */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8"
              >
                <div className="space-y-4">
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">Информация о профиле</h2>
                  
                                      <div className="space-y-3 md:space-y-4">
                      <div className="flex items-center space-x-2 md:space-x-3 p-2.5 md:p-3 bg-gray-50 rounded-lg">
                        <div className="p-1.5 md:p-2 bg-blue-100 rounded-lg">
                          <Mail className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                        </div>
                        <span className="text-sm md:text-base text-gray-700 font-medium truncate">{user?.email}</span>
                      </div>
                    {/* Блок с привязками соцсетей и способом регистрации полностью удалён */}
                                          <div className="flex items-center space-x-2 md:space-x-3 p-2.5 md:p-3 bg-gray-50 rounded-lg">
                        <div className="p-1.5 md:p-2 bg-green-100 rounded-lg">
                          <Phone className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                        </div>
                        {isEditing ? (
                          <IMaskInput
                            mask="+7 (000) 000-00-00"
                            value={editForm.phone}
                            onAccept={(value: string) => setEditForm(prev => ({ ...prev, phone: value }))}
                            onBlur={() => setPhoneTouched(true)}
                            className="flex-1 border border-gray-300 rounded-lg px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            placeholder="Введите номер телефона"
                            required
                          />
                        ) : (
                          <span className="text-sm md:text-base text-gray-700 font-medium">{user?.phone || 'Не указан'}</span>
                        )}
                      </div>
                    {phoneTouched && !isPhoneValid && isEditing && (
                      <div className="flex items-center mt-1 text-red-600 text-sm animate-fade-in">
                        <span className="mr-1">⚠️</span> Пожалуйста, введите полный номер телефона
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 md:space-x-3">
                          <div className="p-1.5 md:p-2 bg-purple-100 rounded-lg">
                            <MapPin className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
                          </div>
                          <span className="text-sm md:text-base text-gray-700 font-medium">Адреса доставки</span>
                        </div>
                        <button
                          onClick={openAddAddressModal}
                          className="px-2 md:px-3 py-1 bg-blue-600 text-white text-xs md:text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          + Добавить
                        </button>
                      </div>
                      
                      {addresses.length > 0 ? (
                        <div className="space-y-2">
                          {addresses.map((address) => (
                            <div key={address.id} className={`relative p-3 md:p-4 bg-white rounded-lg md:rounded-xl border ${address.isDefault ? 'border-green-400 shadow-green-100 shadow' : 'border-gray-200'} shadow-sm transition-all`}> 
                            <div className="flex items-start gap-2 md:gap-3 mb-2 md:mb-0">
                              <div className={`p-1.5 md:p-2 rounded-full ${address.isDefault ? 'bg-green-100' : 'bg-blue-100'}`}>
                                <MapPin className={`w-3.5 h-3.5 md:w-5 md:h-5 ${address.isDefault ? 'text-green-600' : 'text-blue-600'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 md:gap-2 mb-1">
                                  <span className="text-sm md:text-base font-semibold text-gray-900 truncate">{address.name}</span>
                                  {address.isDefault && (
                                    <span className="inline-flex items-center gap-0.5 md:gap-1 px-1.5 md:px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                      <CheckCircle className="w-3 h-3 md:w-4 md:h-4" /> 
                                      <span className="hidden md:inline">По умолчанию</span>
                                      <span className="md:hidden">Основной</span>
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs md:text-sm text-gray-600 break-words mb-2">{address.address}</p>
                              </div>
                            </div>
                            
                            {/* Кнопки действий - мобильная раскладка */}
                            <div className="flex flex-wrap gap-1.5 md:hidden">
                              {!address.isDefault && (
                                <button
                                  onClick={() => setDefaultAddress(address.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition-colors font-medium"
                                >
                                  <CheckCircle className="w-3 h-3" /> Основной
                                </button>
                              )}
                              <button
                                onClick={() => openEditAddressModal(address)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors font-medium"
                              >
                                <Edit className="w-3 h-3" /> Изменить
                              </button>
                              <button
                                onClick={() => deleteAddress(address.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 transition-colors font-medium"
                              >
                                <X className="w-3 h-3" /> Удалить
                              </button>
                            </div>
                            
                            {/* Кнопки действий - десктопная раскладка */}
                            <div className="hidden md:flex md:flex-col gap-2 items-end absolute top-3 right-3">
                              {!address.isDefault && (
                                <button
                                  onClick={() => setDefaultAddress(address.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors font-medium"
                                >
                                  <CheckCircle className="w-4 h-4" /> По умолчанию
                                </button>
                              )}
                              <button
                                onClick={() => openEditAddressModal(address)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                              >
                                <Edit className="w-4 h-4" /> Изменить
                              </button>
                              <button
                                onClick={() => deleteAddress(address.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium"
                              >
                                <X className="w-4 h-4" /> Удалить
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <p>Адреса доставки не добавлены</p>
                        <p className="text-sm">Добавьте адрес для быстрого оформления заказов</p>
                      </div>
                    )}
                  </div>
                </div>
                </div>

                <div className="space-y-3 md:space-y-4">
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">Статистика</h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
                    <div className="flex flex-col items-center px-3 py-2.5 md:px-4 md:py-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg md:rounded-xl shadow hover:shadow-lg transition-all duration-200 border border-blue-200">
                      <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
                        <Package className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                        <span className="text-lg md:text-xl font-bold text-blue-900">{orders?.length || 0}</span>
                      </div>
                      <span className="text-xs text-blue-900 text-center">Заказов</span>
                    </div>
                    <div className="flex flex-col items-center px-3 py-2.5 md:px-4 md:py-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg md:rounded-xl shadow hover:shadow-lg transition-all duration-200 border border-purple-200">
                      <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
                        <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
                        <span className="text-sm md:text-lg font-bold text-purple-900">{formatCurrency(totalSpent)}</span>
                      </div>
                      <span className="text-xs text-purple-900 text-center">Общая сумма</span>
                    </div>
                    <div className="flex flex-col items-center px-3 py-2.5 md:px-4 md:py-3 bg-gradient-to-br from-green-100 to-green-200 rounded-lg md:rounded-xl shadow hover:shadow-lg transition-all duration-200 border border-green-200">
                      <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
                        <Award className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                        <span className="text-sm md:text-lg font-bold text-green-900">{formatCurrency(averageOrderValue)}</span>
                      </div>
                      <span className="text-xs text-green-900 text-center">Средний чек</span>
                    </div>
                  </div>

                  {/* Добавляем QR-код профиля */}
                  {user?._id && (
                    <div className="flex justify-center mt-4">
                      <ProfileQRCode userId={user._id} size="sm" />
                    </div>
                  )}

                  {/* Push-уведомления */}
                  <div className="mt-6">
                    <PushNotificationManager />
                  </div>
                </div>
              </motion.div>

              {/* Orders */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="mb-4">
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">История заказов</h2>
                  
                  {/* Кнопки фильтрации */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setOrderFilter('all')}
                      className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 ${
                        orderFilter === 'all'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Все ({orderCounts.all})
                    </button>
                    <button
                      onClick={() => setOrderFilter('in_transit')}
                      className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 ${
                        orderFilter === 'in_transit'
                          ? 'bg-orange-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      В пути ({orderCounts.in_transit})
                    </button>
                    <button
                      onClick={() => setOrderFilter('completed')}
                      className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 ${
                        orderFilter === 'completed'
                          ? 'bg-green-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Завершенные ({orderCounts.completed})
                    </button>
                  </div>
                </div>
                
                {isLoading ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Загрузка заказов
                    </h3>
                    <p className="text-gray-600">
                      Получаем информацию о ваших покупках...
                    </p>
                  </motion.div>
                ) : filteredOrders && filteredOrders.length > 0 ? (
                  <div className="space-y-3 md:space-y-4">
                    {filteredOrders.map((order, index) => {
                  console.log('📋 Рендер заказа:', {
                    id: order._id,
                    orderNumber: order.orderNumber,
                    callRequest: order.callRequest,
                    callStatus: order.callStatus,
                    showCallButton: (!order.callRequest || order.callStatus === 'completed'),
                    showStatus: order.callRequest && order.callStatus === 'requested'
                  });
                  
                  return (
                      <motion.div
                        key={order._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                        whileHover={{ y: -2, scale: 1.01 }}
                        className="bg-white border border-gray-200 rounded-lg md:rounded-xl p-3 md:p-6 hover:shadow-lg transition-all duration-200"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                          <div className="flex items-center space-x-2 md:space-x-4">
                            {/* Миниатюры товаров заказа */}
                            <div className="flex items-center -space-x-2">
                              {order.items.slice(0, 4).map((item, idx) => {
                                let imgSrcProfile = '/placeholder-product.svg';
                                let nameProfile = '';
                                if (item.productId && item.productId.mainImage) {
                                  imgSrcProfile = fixImageUrl(item.productId.mainImage);
                                  nameProfile = item.productId.name || '';
                                }
                                return item.productId ? (
                                  <img
                                    key={String(item.productId._id) + String(idx)}
                                    src={imgSrcProfile}
                                    alt={nameProfile}
                                    title={nameProfile}
                                    className="w-7 h-7 md:w-9 md:h-9 rounded-full border-2 border-white shadow object-cover bg-gray-100"
                                    style={{ zIndex: 10 - idx }}
                                    onError={(e) => {
                                      console.log('❌ Ошибка загрузки изображения в профиле:', item.productId?.mainImage, '→', imgSrcProfile);
                                      e.currentTarget.src = '/placeholder-product.svg';
                                    }}
                                  />
                                ) : null;
                              })}
                              {order.items.length > 4 && (
                                <div
                                  className="w-7 h-7 md:w-9 md:h-9 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 shadow"
                                  style={{ zIndex: 5 }}
                                  title={`+${order.items.length - 4} товаров`}
                                >
                                  +{order.items.length - 4}
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 text-base md:text-lg">
                                <Link href={`/orders/${order._id}`} className="hover:underline text-blue-700">
                                  Заказ #{order.orderNumber}
                                </Link>
                              </p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <p className="text-sm text-gray-600">
                                  {new Date(order.createdAt).toLocaleDateString('ru-RU', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                              {order?.deliveryMethod && (
                                <div className="flex items-center space-x-2 mt-2">
                                  <Truck className="w-4 h-4 text-gray-400" />
                                  <p className="text-sm text-gray-600">
                                    {getDeliveryMethodDisplayName(order?.deliveryMethod)}
                                  </p>
                                </div>
                              )}
                              {order?.paymentMethod && (
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="text-sm text-gray-500">Способ оплаты:</span>
                                  <span className="text-sm text-gray-900 font-medium">{getPaymentMethodDisplayName(order?.paymentMethod)}</span>
                                </div>
                              )}
                              {getDeliveryDateTime(order) && (
                                <div className="flex items-center space-x-2 mt-1">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <p className="text-sm text-gray-600">
                                    {getDeliveryDateTime(order)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-left md:text-right">
                            <p className="font-bold text-gray-900 text-lg md:text-xl">
                              {formatCurrency(order.total)}
                            </p>
                            <OrderStatus status={order.status} size="sm" />
                          </div>
                        </div>
                        
                        {/* Кнопки действий */}
                        <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-100 space-y-2 md:space-y-3">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0 gap-2">
                            <Link 
                              href={`/orders/${order._id}`}
                              className="inline-flex items-center justify-center space-x-1.5 md:space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 md:px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl text-xs md:text-sm"
                            >
                              <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              <span>Перейти в заказ</span>
                            </Link>
                            
                            {order?.deliveryMethod && (
                              <button
                                onClick={() => showDeliveryAddress(order)}
                                className="inline-flex items-center justify-center space-x-1.5 md:space-x-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-3 md:px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl text-xs md:text-sm"
                              >
                                <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                <span>
                                  {isPickup(order?.deliveryMethod) ? 'Адрес самовывоза' : 'Адрес доставки'}
                                </span>
                              </button>
                            )}
                          </div>
                          
                          {/* Кнопка "Позвоните мне" - показывается если звонок не запрошен или уже обработан */}
                          {(!order.callRequest || (order.callStatus === 'completed' || order.callStatus === 'not_completed')) && (
                            <motion.button
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                              onClick={() => handleCallRequest(order._id)}
                              disabled={isCallRequestLoading && selectedOrderId === order._id}
                              className="w-full inline-flex items-center justify-center space-x-1.5 md:space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 md:px-4 py-2.5 md:py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl text-xs md:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isCallRequestLoading ? (
                                <>
                                  <div className="w-3.5 h-3.5 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>Отправка...</span>
                                </>
                              ) : (
                                <>
                                  <Phone className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                  <span>Позвоните мне</span>
                                </>
                              )}
                            </motion.button>
                          )}

                          {/* Статус запроса звонка - показывается если звонок запрошен */}
                          {order.callRequest && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                              className={`w-full inline-flex items-center justify-center space-x-1.5 md:space-x-2 px-3 md:px-4 py-2.5 md:py-3 rounded-lg text-xs md:text-sm font-medium ${
                                order.callStatus === 'completed' 
                                  ? 'bg-green-100 text-green-700' 
                                  : order.callStatus === 'not_completed'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              <Phone className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              <span>
                                {order.callStatus === 'completed' 
                                  ? 'Звонок выполнен' 
                                  : order.callStatus === 'not_completed'
                                  ? 'Звонок не выполнен'
                                  : 'Запрос звонка отправлен'
                                }
                              </span>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Package className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {orders && orders.length > 0 
                        ? 'Заказов в этой категории нет'
                        : 'Заказов пока нет'
                      }
                    </h3>
                    <p className="text-gray-600 max-w-md mx-auto mb-6">
                      {orders && orders.length > 0
                        ? 'Попробуйте выбрать другую категорию или дождитесь обновления статуса заказов.'
                        : 'Когда вы сделаете первый заказ, он появится здесь. Перейдите в каталог, чтобы начать покупки!'
                      }
                    </p>
                    {(!orders || orders.length === 0) && (
                    <Link 
                      href="/catalog" 
                      className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <span>Перейти к покупкам</span>
                      <TrendingUp className="w-4 h-4" />
                    </Link>
                    )}
                  </motion.div>
                )}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Модальное окно с адресом доставки */}
      {showAddressModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl overflow-y-auto max-h-screen min-h-[300px]"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {isPickup(selectedOrder?.deliveryMethod) ? 'Адрес самовывоза' : 'Адрес доставки'}
              </h3>
              <button
                onClick={() => setShowAddressModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Truck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Способ доставки</p>
                  <p className="text-sm text-gray-600">
                    {getDeliveryMethodDisplayName(selectedOrder?.deliveryMethod)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{getAddressFieldName(selectedOrder)}</p>
                  <p className="text-sm text-gray-600">
                    {getDeliveryAddress(selectedOrder)}
                  </p>
                </div>
              </div>
              
              {getDeliveryDateTime(selectedOrder) && (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Дата и время доставки</p>
                    <p className="text-sm text-gray-600">
                      {getDeliveryDateTime(selectedOrder)}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowAddressModal(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Закрыть
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Модальное окно подтверждения звонка */}
      {showCallConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl overflow-y-auto max-h-screen min-h-[300px]"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Позвонить вам?
              </h3>
              <p className="text-gray-600 mb-4">
                Точно хотите, чтобы вам позвонили?
              </p>
              {user?.phone && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-600 mb-1">Номер телефона:</p>
                  <p className="text-sm font-medium text-gray-900">{user.phone}</p>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => confirmCall(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition-colors"
              >
                Нет
              </button>
              <button
                onClick={() => confirmCall(true)}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg transition-colors"
              >
                Да
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Модальное окно для управления адресами */}
      {showAddressesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl overflow-y-auto max-h-screen min-h-[300px]"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingAddress ? 'Редактировать адрес' : 'Добавить новый адрес'}
              </h3>
              <button
                onClick={() => setShowAddressesModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название адреса
                </label>
                <input
                  type="text"
                  value={addressForm.name}
                  onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Например: Дом, Работа, Дача"
                />
              </div>
              
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Адрес доставки
                </label>
                <input
                  ref={addressInputRef}
                  type="text"
                  value={addressForm.address}
                  onChange={handleAddressInput}
                  onFocus={() => setShowAddressSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 200)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Введите адрес доставки"
                  autoComplete="off"
                />
                {showAddressSuggestions && addressSuggestions.length > 0 && (
                  <ul className="absolute z-10 bg-white border border-gray-300 rounded w-full max-h-60 overflow-y-auto shadow">
                    {addressSuggestions.map((s, idx) => (
                      <li
                        key={s.value + idx}
                        className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                        onMouseDown={() => handleAddressSuggestionClick(s)}
                      >
                        {s.value}
                      </li>
                    ))}
                  </ul>
                )}
                {addressLoading && <div className="absolute right-2 top-2 text-gray-400 text-xs">Поиск...</div>}
              </div>
              
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Город
                </label>
                <input
                  type="text"
                  name="city"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Например: Москва"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Область/Регион
                </label>
                <input
                  type="text"
                  name="state"
                  value={addressForm.state}
                  onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Например: Московская область"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Индекс
                </label>
                <input
                  type="text"
                  name="zipCode"
                  value={addressForm.zipCode}
                  onChange={(e) => setAddressForm({ ...addressForm, zipCode: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Например: 123456"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Квартира
                </label>
                <input
                  type="text"
                  name="apartment"
                  value={addressForm.apartment}
                  onChange={(e) => setAddressForm({ ...addressForm, apartment: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Например: 123"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Подъезд
                </label>
                <input
                  type="text"
                  name="entrance"
                  value={addressForm.entrance}
                  onChange={(e) => setAddressForm({ ...addressForm, entrance: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Например: 1"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Этаж
                </label>
                <input
                  type="text"
                  name="floor"
                  value={addressForm.floor}
                  onChange={(e) => setAddressForm({ ...addressForm, floor: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Например: 1"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Комментарий
                </label>
                <textarea
                  name="comment"
                  value={addressForm.comment}
                  onChange={(e) => setAddressForm({ ...addressForm, comment: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Например: Вход со двора"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-900">
                  Использовать как адрес по умолчанию
                </label>
              </div>
            </div>
            
            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => setShowAddressesModal(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={editingAddress ? updateAddress : addAddress}
                disabled={isAddressLoading || !addressForm.name || !addressForm.address}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddressLoading ? 'Сохранение...' : (editingAddress ? 'Обновить' : 'Добавить')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Футер - скрыт на мобильных */}
      <div className="hidden md:block">
        <Footer />
      </div>
      
      <MobileNavigation />
      
      <AnimatePresence>
        {showProfileError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%' }}
            exit={{ opacity: 0, scale: 0.9, y: '-50%' }}
            transition={{ duration: 0.3 }}
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 px-6 py-4 rounded-xl bg-red-100 text-red-700 font-semibold shadow-xl text-center"
            style={{ pointerEvents: 'none' }}
          >
            {profileError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Модальное окно с отзывами пользователя */}
      {showReviewsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-screen min-h-[300px]"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Мои отзывы</h3>
              <button
                onClick={() => setShowReviewsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {reviewsLoading ? (
              <div className="text-center py-8 text-gray-500">Загрузка отзывов...</div>
            ) : userReviews.length === 0 ? (
              <div className="text-center py-8 text-gray-500">У вас пока нет отзывов</div>
            ) : (
              <div className="space-y-4">
                {userReviews.map((review) => (
                  <div key={review._id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-blue-700">{review.product?.name || 'Товар'}</span>
                      {review.status === 'hidden' ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Скрыт</span>
                      ) : !review.isApproved ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">На модерации</span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Опубликован</span>
                      )}
                    </div>
                    {Array.isArray(review.images) && review.images.length > 0 && (
                      <div className="flex gap-2 mb-2 flex-wrap">
                        {review.images.map((img: string, idx: number) => (
                          <button
                            key={img + idx}
                            type="button"
                            onClick={() => setImageModal({ visible: true, images: review.images, index: idx })}
                            className="block"
                            style={{ lineHeight: 0 }}
                          >
                            <img
                              src={img}
                              alt={`Фото отзыва ${idx + 1}`}
                              className="w-16 h-16 object-cover rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:scale-105 transition-transform duration-200"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="text-gray-800 mb-2 whitespace-pre-line">{review.text}</div>
                    {review.answer && (
                      <div className="text-green-700 text-sm mb-2">Ответ магазина: {review.answer}</div>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{new Date(review.createdAt).toLocaleDateString('ru-RU')}</span>
                      {review.product?.slug && (
                        <Link href={`/product/${review.product.slug}`} className="text-blue-600 hover:underline">Перейти к товару</Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {imageModal.visible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setImageModal({visible: false, images: [], index: 0})}>
          <div className="relative bg-transparent" style={{ maxWidth: '90vw', width: '100%' }} onClick={e => e.stopPropagation()}>
            <button
              className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white z-10"
              onClick={() => setImageModal({visible: false, images: [], index: 0})}
              aria-label="Закрыть"
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>
            <img
              src={imageModal.images[imageModal.index]}
              alt="Фото отзыва"
              className="mx-auto rounded-xl"
              style={{ maxWidth: '90vw', maxHeight: '80vh', display: 'block', margin: '0 auto' }}
            />
            {imageModal.images.length > 1 && (
              <>
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white"
                  disabled={imageModal.index === 0}
                  onClick={() => setImageModal(im => ({...im, index: Math.max(0, im.index - 1)}))}
                  aria-label="Предыдущее фото"
                  style={{ zIndex: 10 }}
                >
                  <ArrowLeft className="w-6 h-6 text-gray-700" />
                </button>
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white"
                  disabled={imageModal.index === imageModal.images.length - 1}
                  onClick={() => setImageModal(im => ({...im, index: Math.min(im.images.length - 1, im.index + 1)}))}
                  aria-label="Следующее фото"
                  style={{ zIndex: 10 }}
                >
                  <ArrowRight className="w-6 h-6 text-gray-700" />
                </button>
              </>
            )}
            <div className="text-center text-gray-300 mt-2 text-xs select-none">
              {imageModal.index + 1} / {imageModal.images.length}
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
} 