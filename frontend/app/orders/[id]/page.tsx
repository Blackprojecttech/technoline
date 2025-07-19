'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, Calendar, MapPin, Phone, Mail, DollarSign, Truck, CheckCircle, Clock, XCircle } from 'lucide-react';
import OrderStatus from '@/components/OrderStatus';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
import { ordersAPI, getAuthToken } from '@/lib/api';
import { useOrderSocket } from '@/hooks/useOrderSocket';

// Используем типы из API
type Order = any; // Временно используем any для избежания конфликтов типов

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCallConfirmation, setShowCallConfirmation] = useState(false);
  const [isCallRequestLoading, setIsCallRequestLoading] = useState(false);

  const orderId = params.id as string;

  // Socket.IO для мгновенного обновления заказа
  console.log('🔌 Setting up Socket.IO for order:', orderId);
  useOrderSocket({
    orderId,
    onOrderUpdate: (data) => {
      console.log('📦 Order updated via Socket.IO:', data);
      console.log('📦 Order ID match check:', { receivedId: data.orderId, currentId: orderId });
      // Мгновенно обновляем заказ при получении события
      const token = getAuthToken();
      if (token && data.orderId === orderId) {
        console.log('📦 Refreshing order data...');
        ordersAPI.getOrderById(token, orderId).then(setOrder);
      }
    }
  });

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const token = getAuthToken();
        console.log('🔑 Токен:', token ? 'Есть' : 'Нет');
        console.log('🆔 ID заказа:', orderId);
        
        if (!token) {
          console.log('❌ Нет токена, перенаправляем на логин');
          router.push('/login');
          return;
        }

        console.log('📦 Загружаем заказ...');
        const orderData = await ordersAPI.getOrderById(token, orderId);
        console.log('✅ Заказ загружен:', orderData);
        setOrder(orderData);
      } catch (error) {
        console.error('❌ Ошибка загрузки заказа:', error);
        if (error instanceof Error) {
          if (error.message.includes('не найден')) {
            setError('Заказ не найден');
          } else if (error.message.includes('запрещен')) {
            setError('Доступ запрещен');
          } else {
            setError('Ошибка загрузки заказа');
          }
        } else {
          setError('Ошибка загрузки заказа');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId, router]);

  // Автоматическое обновление заказа каждые 15 секунд
  useEffect(() => {
    if (!orderId || isLoading) return;

    const interval = setInterval(async () => {
      try {
        const token = getAuthToken();
        if (!token) return;

        const orderData = await ordersAPI.getOrderById(token, orderId);
        setOrder(orderData);
      } catch (error) {
        console.error('Ошибка автоматического обновления заказа:', error);
      }
    }, 15000); // 15 секунд

    return () => clearInterval(interval);
  }, [orderId, isLoading]);

  const formatCurrency = (amount: number) => {
    if (amount === 0) return '0 ₽';
    return `${amount.toLocaleString('ru-RU')} ₽`;
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'delivered':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', text: '✅ Доставлен' };
      case 'shipped':
        return { icon: Truck, color: 'text-blue-600', bg: 'bg-blue-100', text: '🚚 Отправлен' };
      case 'processing':
        return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', text: '⏳ В обработке' };
      case 'confirmed':
        return { icon: CheckCircle, color: 'text-purple-600', bg: 'bg-purple-100', text: '✅ Подтвержден' };
      case 'cancelled':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', text: '❌ Отменен' };
      default:
        return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100', text: '🆕 Ожидает' };
    }
  };

  const getDeliveryMethodDisplayName = (method: any) => {
    if (!method) return '';
    
    // Если есть displayName, используем его
    if (method.displayName) {
      return method.displayName;
    }
    
    // Преобразуем техническое название в понятное
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

  const isPickup = (method: any) => {
    if (!method) return false;
    
    // Проверяем по типу доставки из админки
    return method.type === 'pickup';
  };

  const getPaymentMethodDisplayName = (method: string) => {
    if (!method) return '';
    
    // Преобразуем техническое название в понятное
    switch (method) {
      case 'cash':
        return 'Наличными при получении';
      case 'card':
        return 'Банковской картой';
      case 'online':
        return 'Онлайн оплата';
      case 'transfer':
        return 'Банковский перевод';
      case 'usdt_payment':
        return 'Оплата USDT';
      default:
        return method || 'Оплата';
    }
  };

  const getMoscowDate = (date?: Date) => {
    // Получить московскую дату (UTC+3)
    const d = date ? new Date(date) : new Date();
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

  const handleCallRequest = () => {
    setShowCallConfirmation(true);
  };

  const confirmCall = async (confirmed: boolean) => {
    if (confirmed && order) {
      setIsCallRequestLoading(true);
      try {
        console.log('🔍 Отправка запроса звонка для заказа:', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status
        });

        const token = getAuthToken();
        if (!token) {
          console.log('❌ Токен не найден');
          alert('Ошибка авторизации. Пожалуйста, войдите в систему заново.');
          setShowCallConfirmation(false);
          return;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/orders/${order._id}/call-request`, {
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
          // broadcastOrderUpdate(order._id); // мгновенная синхронизация
          
          // Принудительно обновляем заказ с небольшой задержкой
          try {
            console.log('🔄 Обновление заказа после запроса звонка...');
            
            // Небольшая задержка, чтобы сервер успел обработать изменения
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const orderData = await ordersAPI.getOrderById(token, orderId);
            console.log('✅ Заказ обновлен:', {
              callRequest: (orderData as any).callRequest,
              callStatus: (orderData as any).callStatus
            });
            setOrder(orderData);
            
            // Показываем уведомление после успешного обновления
            alert('Запрос на звонок отправлен! Мы свяжемся с вами в ближайшее время.');
          } catch (error) {
            console.error('❌ Ошибка обновления заказа после запроса звонка:', error);
            alert('Запрос на звонок отправлен! Мы свяжемся с вами в ближайшее время.');
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.log('❌ Ошибка сервера:', errorData);
          alert(`Ошибка при отправке запроса на звонок: ${errorData.message || 'Неизвестная ошибка'}`);
        }
      } catch (error) {
        console.error('❌ Ошибка при отправке запроса звонка:', error);
        alert('Ошибка сети при отправке запроса на звонок. Проверьте подключение к интернету.');
      } finally {
        setIsCallRequestLoading(false);
      }
    }
    setShowCallConfirmation(false);
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 pt-32">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Загрузка заказа</h3>
              <p className="text-gray-600">Получаем информацию о заказе...</p>
            </div>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    );
  }

  if (error || !order) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 pt-32">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ошибка</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <Link 
                href="/profile" 
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Вернуться в профиль</span>
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    );
  }

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
                    <Package className="w-8 h-8" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h1 className="text-2xl font-bold">
                      Заказ #{order.orderNumber}
                    </h1>
                    <p className="text-blue-100 flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(order.createdAt).toLocaleDateString('ru-RU', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </p>
                  </motion.div>
                </div>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Link 
                    href="/profile"
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 border border-white/30 shadow-lg"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Назад</span>
                  </Link>
                </motion.div>
              </div>
            </div>

            <div className="p-6">
              {/* Status */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mb-6"
              >
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                  <OrderStatus status={order.status} size="lg" />
                </div>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Order Items */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-4"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Товары в заказе</h2>
                  <div className="space-y-3">
                    {order.items.map((item: any, index: number) => (
                      <motion.div
                        key={item._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
                      >
                        <img 
                          src={item.productId.mainImage} 
                          alt={item.productId.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.productId.name}</p>
                          <p className="text-sm text-gray-600">Количество: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{formatCurrency(item.price * item.quantity)}</p>
                          <p className="text-sm text-gray-600">{formatCurrency(item.price)} за шт.</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Order Details */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-4"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Детали заказа</h2>
                  
                  {/* Payment Info */}
                  <div className="space-y-3">
                    {order.paymentMethod && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <DollarSign className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Способ оплаты</p>
                          <p className="text-sm text-gray-600">{getPaymentMethodDisplayName(order.paymentMethod)}</p>
                        </div>
                      </div>
                    )}

                    {order.deliveryMethod && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`p-2 ${isPickup(order.deliveryMethod) ? 'bg-orange-100' : 'bg-green-100'} rounded-lg`}>
                          <Truck className={`w-5 h-5 ${isPickup(order.deliveryMethod) ? 'text-orange-600' : 'text-green-600'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Способ доставки</p>
                          <p className="text-sm text-gray-600">{getDeliveryMethodDisplayName(order.deliveryMethod)}</p>
                        </div>
                      </div>
                    )}

                    {(order.deliveryDate || (order.cdekDeliveryDate && (order?.deliveryMethod?.name?.toLowerCase().includes('сдэк') || order?.deliveryMethod?.name?.toLowerCase().includes('cdek')))) && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`p-2 ${isPickup(order.deliveryMethod) ? 'bg-orange-100' : 'bg-purple-100'} rounded-lg`}>
                          <Calendar className={`w-5 h-5 ${isPickup(order.deliveryMethod) ? 'text-orange-600' : 'text-purple-600'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {isPickup(order.deliveryMethod) ? 'Дата самовывоза' : 'Дата доставки'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {getDeliveryDateTime(order)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Delivery Address or Pickup Address */}
                  {(order.deliveryAddress || (isPickup(order.deliveryMethod) && order.deliveryMethod?.address)) && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {isPickup(order.deliveryMethod) ? 'Адрес самовывоза' : 'Адрес доставки'}
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className={`p-2 ${isPickup(order.deliveryMethod) ? 'bg-orange-100' : 'bg-blue-100'} rounded-lg`}>
                            <MapPin className={`w-5 h-5 ${isPickup(order.deliveryMethod) ? 'text-orange-600' : 'text-blue-600'}`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {isPickup(order.deliveryMethod) ? 'Адрес самовывоза' : 'Адрес доставки'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {isPickup(order.deliveryMethod) 
                                ? (order.deliveryAddress || order.deliveryMethod?.address)
                                : order.deliveryAddress
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* СДЭК ПВЗ - показываем отдельно для СДЭК заказов */}
                  {(order.cdekPVZ || order.pvzCdek || order.cdekPvzAddress) && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-gray-900">Пункт выдачи СДЭК</h3>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <MapPin className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Пункт выдачи СДЭК</p>
                            <p className="text-sm text-gray-600">
                              {order.cdekPvzAddress || order.cdekPVZ?.address_full || order.cdekPVZ?.address || order.cdekPVZ?.name || order.pvzCdek?.address_full || order.pvzCdek?.address || order.pvzCdek?.name}
                            </p>
                            {order.cdekPVZ?.code && <p className="text-xs text-gray-500 mt-1">Код ПВЗ: {order.cdekPVZ.code}</p>}
                            {order.pvzCdek?.code && <p className="text-xs text-gray-500 mt-1">Код ПВЗ: {order.pvzCdek.code}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Order Summary */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-8 p-6 bg-gray-50 rounded-xl"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Итого по заказу</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Товары:</span>
                    <span className="font-medium">{formatCurrency(order.total)}</span>
                  </div>
                  {order.shipping > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Доставка:</span>
                      <span className="font-medium">{formatCurrency(order.shipping)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2">
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold text-gray-900">Итого:</span>
                      <span className="text-lg font-bold text-gray-900">{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {order.notes && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-6 p-4 bg-blue-50 rounded-xl"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Примечания к заказу</h3>
                  <p className="text-gray-700">{order.notes}</p>
                </motion.div>
              )}


              {/* Кнопка "Позвоните мне" - показывается если звонок не запрошен ИЛИ если звонок уже выполнен */}
              {(!order.callRequest || order.callStatus === 'completed') && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-6"
                >
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    onClick={handleCallRequest}
                    disabled={isCallRequestLoading}
                    className="w-full inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCallRequestLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Отправка...</span>
                      </>
                    ) : (
                      <>
                        <Phone className="w-5 h-5" />
                        <span>Позвоните мне</span>
                      </>
                    )}
                  </motion.button>
                </motion.div>
              )}

              {/* Показываем статус, если звонок уже запрошен */}
              {order.callRequest && order.callStatus === 'requested' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Phone className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-900">Запрос звонка отправлен</p>
                      <p className="text-sm text-green-700">Мы свяжемся с вами в ближайшее время</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

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
              {order?.shippingAddress?.phone && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-600 mb-1">Номер телефона:</p>
                  <p className="text-sm font-medium text-gray-900">{order.shippingAddress.phone}</p>
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
    </ProtectedRoute>
  );
} 