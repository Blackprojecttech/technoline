'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Phone, MapPin, Package, Settings, LogOut, Edit, Save, X, DollarSign, TrendingUp, Award, Calendar, Eye, Truck, CheckCircle } from 'lucide-react';
import OrderStatus from '@/components/OrderStatus';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
import ReactInputMask from 'react-input-mask';
import { useProfileSocket } from '@/hooks/useProfileSocket';

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
};

// Тип для способа оплаты
type PaymentMethod = {
  _id: string;
  name: string;
  systemCode: string;
  displayTitle?: string;
};

export default function ProfilePage() {
  const { user, orders, isLoading, logout, updateProfile, refreshOrders } = useAuth();
  const router = useRouter();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: ''
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
  let profileErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Получение справочника способов оплаты
  const [allPaymentMethods, setAllPaymentMethods] = useState<PaymentMethod[]>([]);
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/payment-methods`)
      .then(res => res.json())
      .then(data => setAllPaymentMethods(data.paymentMethods || []));
  }, []);

  const paymentMethodFallbacks: Record<string, string> = {
    cash: 'Наличными при получении',
    card: 'Банковской картой',
    online: 'Онлайн оплата',
    transfer: 'Банковский перевод',
    usdt_payment: 'Оплата USDT',
    usdt: 'Оплата USDT',
    credit: 'Купить в кредит',
    credit_purchase: 'Купить в кредит',
    bank_transfer: 'Банковский перевод',
    crypto: 'Криптовалюта',
    cash_on_delivery: 'Наложенный платёж',
    sberbank_transfer: 'Сбербанк Онлайн',
    bank_card: 'Банковской картой',
  };

  const getPaymentMethodDisplayName = (systemCode: string) => {
    const method = allPaymentMethods.find((m) => m.systemCode === systemCode);
    return method?.displayTitle || method?.name || paymentMethodFallbacks[systemCode] || systemCode;
  };

  useEffect(() => {
    if (user) {
      setEditForm({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || '',
        address: user.address || ''
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
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || '',
        address: user.address || ''
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

  const handleCallRequest = () => {
    setShowCallConfirmation(true);
  };

  const confirmCall = async (confirmed: boolean) => {
    if (confirmed) {
      setIsCallRequestLoading(true);
      try {
        // Находим последний активный заказ для отправки запроса звонка
        const activeOrder = orders?.find(order => 
          ['pending', 'confirmed', 'processing'].includes(order.status)
        );
        
        console.log('🔍 Поиск активного заказа:', {
          ordersCount: orders?.length,
          orders: orders?.map(o => ({ id: o._id, status: o.status, orderNumber: o.orderNumber }))
        });
        
        if (!activeOrder) {
          console.log('❌ Активный заказ не найден');
          alert('Не найден активный заказ для запроса звонка. Убедитесь, что у вас есть заказы со статусом "В обработке", "Подтвержден" или "В процессе".');
          setShowCallConfirmation(false);
          return;
        }

        console.log('✅ Найден активный заказ:', {
          id: activeOrder._id,
          orderNumber: activeOrder.orderNumber,
          status: activeOrder.status
        });

        const token = localStorage.getItem('authToken');
        console.log('🔑 Проверка токена:', {
          tokenExists: !!token,
          tokenLength: token?.length,
          tokenStart: token?.substring(0, 20) + '...'
        });
        
        if (!token) {
          console.log('❌ Токен не найден');
          alert('Ошибка авторизации. Пожалуйста, войдите в систему заново.');
          setShowCallConfirmation(false);
          return;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/orders/${activeOrder._id}/call-request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
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
            alert('Запрос на звонок отправлен! Мы свяжемся с вами в ближайшее время.');
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

  return (
    <ProtectedRoute>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 pt-32">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 px-6 py-8 text-white overflow-hidden">
              {/* Background decoration */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
              
              <div className="relative flex items-center justify-between">
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
                      {user?.firstName} {user?.lastName}
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
            </div>

            <div className="p-6">
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

              {upcomingOrder && (
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
                className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
              >
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Информация о профиле</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Mail className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-gray-700 font-medium">{user?.email}</span>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Phone className="w-5 h-5 text-green-600" />
                      </div>
                      {isEditing ? (
                        <ReactInputMask
                          mask="+7 (999) 999-99-99"
                          maskChar={null}
                          value={editForm.phone}
                          onChange={e => { setEditForm({ ...editForm, phone: e.target.value }); if (!phoneTouched) setPhoneTouched(true); }}
                          onBlur={() => setPhoneTouched(true)}
                        >
                          {(inputProps: any) => (
                            <input
                              {...inputProps}
                              type="tel"
                              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                              placeholder="Введите номер телефона"
                            />
                          )}
                        </ReactInputMask>
                      ) : (
                        <span className="text-gray-700 font-medium">{user?.phone || 'Не указан'}</span>
                      )}
                    </div>
                    {phoneTouched && !isPhoneValid && isEditing && (
                      <div className="flex items-center mt-1 text-red-600 text-sm animate-fade-in">
                        <span className="mr-1">⚠️</span> Пожалуйста, введите полный номер телефона
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <MapPin className="w-5 h-5 text-purple-600" />
                      </div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          placeholder="Введите адрес доставки"
                        />
                      ) : (
                        <span className="text-gray-700 font-medium">{user?.address || 'Не указан'}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Статистика</h2>
                  
                  <div className="w-full flex flex-wrap justify-center items-stretch gap-6 mb-8">
                    <button
                      type="button"
                      className="flex flex-col items-center min-w-[110px] px-4 py-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl shadow hover:shadow-lg transition-all duration-200 hover:scale-105 focus:outline-none border border-blue-200"
                      tabIndex={-1}
                      style={{ cursor: 'default' }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-5 h-5 text-blue-600" />
                        <span className="text-xl font-bold text-blue-900">{orders?.length || 0}</span>
                      </div>
                      <span className="text-xs text-blue-900 text-center">Заказов</span>
                    </button>
                    <button
                      type="button"
                      className="flex flex-col items-center min-w-[110px] px-4 py-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl shadow hover:shadow-lg transition-all duration-200 hover:scale-105 focus:outline-none border border-purple-200"
                      tabIndex={-1}
                      style={{ cursor: 'default' }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-5 h-5 text-purple-600" />
                        <span className="text-xl font-bold text-purple-900">{formatCurrency(totalSpent)}</span>
                      </div>
                      <span className="text-xs text-purple-900 text-center">Общая сумма</span>
                    </button>
                    <button
                      type="button"
                      className="flex flex-col items-center min-w-[110px] px-4 py-3 bg-gradient-to-br from-green-100 to-green-200 rounded-xl shadow hover:shadow-lg transition-all duration-200 hover:scale-105 focus:outline-none border border-green-200"
                      tabIndex={-1}
                      style={{ cursor: 'default' }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Award className="w-5 h-5 text-green-600" />
                        <span className="text-xl font-bold text-green-900">{formatCurrency(averageOrderValue)}</span>
                      </div>
                      <span className="text-xs text-green-900 text-center">Средний чек</span>
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Orders */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-4">История заказов</h2>
                
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
                ) : orders && orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.map((order, index) => {
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
                        className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-blue-100 rounded-lg">
                              <Package className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 text-lg">
                                Заказ #{order.orderNumber}
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
                          <div className="text-right">
                            <p className="font-bold text-gray-900 text-xl">
                              {formatCurrency(order.total)}
                            </p>
                            <OrderStatus status={order.status} size="sm" />
                          </div>
                        </div>
                        
                        {/* Кнопки действий */}
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                          <div className="flex items-center justify-between">
                            <Link 
                              href={`/orders/${order._id}`}
                              className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
                            >
                              <Eye className="w-4 h-4" />
                              <span>Перейти в заказ</span>
                            </Link>
                            
                            {order?.deliveryMethod && (
                              <button
                                onClick={() => showDeliveryAddress(order)}
                                className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
                              >
                                <MapPin className="w-4 h-4" />
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
                              onClick={handleCallRequest}
                              disabled={isCallRequestLoading}
                              className="w-full inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isCallRequestLoading ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>Отправка...</span>
                                </>
                              ) : (
                                <>
                                  <Phone className="w-4 h-4" />
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
                              className={`w-full inline-flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium ${
                                order.callStatus === 'completed' 
                                  ? 'bg-green-100 text-green-700' 
                                  : order.callStatus === 'not_completed'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              <Phone className="w-4 h-4" />
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
                      Заказов пока нет
                    </h3>
                    <p className="text-gray-600 max-w-md mx-auto mb-6">
                      Когда вы сделаете первый заказ, он появится здесь. 
                      Перейдите в каталог, чтобы начать покупки!
                    </p>
                    <Link 
                      href="/catalog" 
                      className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <span>Перейти к покупкам</span>
                      <TrendingUp className="w-4 h-4" />
                    </Link>
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
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
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
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
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

      <Footer />
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
    </ProtectedRoute>
  );
} 