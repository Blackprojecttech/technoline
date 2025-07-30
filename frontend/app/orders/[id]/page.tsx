'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, Calendar, MapPin, Phone, Mail, DollarSign, Truck, CheckCircle, Clock, XCircle, User } from 'lucide-react';
import OrderStatus from '@/components/OrderStatus';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileNavigation from '@/components/layout/MobileNavigation';
import Link from 'next/link';
import { ordersAPI, getAuthToken } from '@/lib/api';
import TrackingInfo from '@/components/TrackingInfo';
import { fixImageUrl } from '@/utils/imageUrl';
import { io } from 'socket.io-client';
import OrderQRCode from '@/components/OrderQRCode';

// Используем типы из API
type Order = any; // Временно используем any для избежания конфликтов типов

// Функция форматирования даты доставки
const formatDeliveryDate = (date: string) => {
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];

  // Если это "today" или "tomorrow"
  if (date.toLowerCase() === 'today') {
    const today = new Date();
    return `Сегодня, ${today.getDate()} ${months[today.getMonth()]}`;
  }
  if (date.toLowerCase() === 'tomorrow') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return `Завтра, ${tomorrow.getDate()} ${months[tomorrow.getMonth()]}`;
  }

  // Если это дата в формате YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number);
    return `${day} ${months[month - 1]} ${year}`;
  }

  // Если это уже отформатированная дата, возвращаем как есть
  return date;
};

const OrderPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCallRequestLoading, setIsCallRequestLoading] = useState(false);
  const orderId = params.id as string;

  // Инициализируем WebSocket только для авторизованных пользователей
  useEffect(() => {
    if (!isAuthenticated) return;

    console.log('🔌 Setting up Socket.IO for order:', orderId);
    const socket = io(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002'}`, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('🔌 Socket.IO connected:', socket.id);
      socket.emit('join_order_room', `order_${orderId}`);
      console.log('🔌 Joining order room:', `order_${orderId}`);
    });

    socket.on('joined_order_room', (room) => {
      console.log('🔌 Joined order room:', room);
    });

    socket.on('order_updated', (updatedOrder) => {
      console.log('📦 Order updated:', updatedOrder);
      setOrder(updatedOrder);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket.IO disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId, isAuthenticated]);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        console.log('🆔 ID заказа:', orderId);
        console.log('📦 Загружаем заказ...');
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/orders/${orderId}`);
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки заказа');
        }
        
        const orderData = await response.json();
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
  }, [orderId]);

  // Функция для запроса звонка - доступна только авторизованным пользователям
  const handleCallRequest = async () => {
    if (!isAuthenticated) {
      // Вместо прямого редиректа сохраняем текущий URL для возврата
      router.push(`/auth/login?redirect=/orders/${orderId}`);
      return;
    }

    setIsCallRequestLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/orders/${orderId}/call-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка при запросе звонка');
      }

      const updatedOrder = await response.json();
      setOrder(updatedOrder);
    } catch (error) {
      console.error('Ошибка при запросе звонка:', error);
    } finally {
      setIsCallRequestLoading(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Header onNotificationClick={() => window.openNotificationDrawer?.()} />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 pt-32">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex justify-center items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header onNotificationClick={() => window.openNotificationDrawer?.()} />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 pt-32">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">{error}</h1>
              <button
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Вернуться назад
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Header onNotificationClick={() => window.openNotificationDrawer?.()} />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 pt-32 pb-24 md:pb-0">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Заказ не найден</h1>
              <button
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Вернуться назад
              </button>
            </div>
          </div>
        </div>
        {/* Футер - скрыт на мобильных */}
        <div className="hidden md:block">
          <Footer />
        </div>
        
        <MobileNavigation />
      </>
    );
  }

  // Основной рендер страницы
  return (
    <>
      <Header onNotificationClick={() => window.openNotificationDrawer?.()} />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 pt-32 pb-24 md:pb-0">
        <div className="max-w-4xl mx-auto px-4 py-4 md:py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl shadow-xl p-4 md:p-8"
          >
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-800 transition-colors flex-shrink-0 p-2 -ml-2 touch-manipulation"
                style={{ touchAction: 'manipulation' }}
              >
                <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
              </button>
              <h1 className="text-lg md:text-2xl font-bold text-center flex-1 mx-2 truncate">
                Заказ #{order.orderNumber || order._id}
              </h1>
              <div className="w-9 flex-shrink-0"></div> {/* Балансирующий элемент */}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-lg font-semibold mb-4">Информация о заказе</h2>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Package className="w-5 h-5 text-blue-600 mt-1" />
                    <div>
                      <p className="font-medium">Статус заказа</p>
                      <OrderStatus status={order.status} />
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Calendar className="w-5 h-5 text-blue-600 mt-1" />
                    <div>
                      <p className="font-medium">Дата заказа</p>
                      <p className="text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString('ru-RU', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-blue-600 mt-1" />
                    <div>
                      <p className="font-medium">Адрес доставки</p>
                      <p className="text-gray-600">
                        {order.shippingAddress.address}, {order.shippingAddress.city}
                      </p>
                    </div>
                  </div>

                  {/* Показываем контактные данные только для авторизованных пользователей */}
                  {isAuthenticated && (
                    <>
                      <div className="flex items-start space-x-3">
                        <Phone className="w-5 h-5 text-blue-600 mt-1" />
                        <div>
                          <p className="font-medium">Телефон</p>
                          <p className="text-gray-600">{order.shippingAddress.phone}</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Mail className="w-5 h-5 text-blue-600 mt-1" />
                        <div>
                          <p className="font-medium">Email</p>
                          <p className="text-gray-600">{order.shippingAddress.email}</p>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex items-start space-x-3">
                    <DollarSign className="w-5 h-5 text-blue-600 mt-1" />
                    <div>
                      <p className="font-medium">Сумма заказа</p>
                      <p className="text-gray-600">{order.total.toLocaleString()} ₽</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Truck className="w-5 h-5 text-blue-600 mt-1" />
                    <div>
                      <p className="font-medium">Способ доставки</p>
                      <p className="text-gray-600">{order.deliveryMethod?.name || 'Не указан'}</p>
                    </div>
                  </div>

                  {/* Дата и время доставки/самовывоза */}
                  {(order.deliveryDate || order.deliveryInterval) && (
                    <div className="flex items-start space-x-3">
                      <Calendar className="w-5 h-5 text-blue-600 mt-1" />
                      <div>
                        <p className="font-medium">
                          {order.deliveryMethod?.name?.toLowerCase().includes('самовывоз') 
                            ? 'Дата самовывоза'
                            : 'Дата доставки'
                          }
                        </p>
                        <p className="text-gray-600">
                          {formatDeliveryDate(order.deliveryDate)}
                          {order.deliveryInterval && ` в ${order.deliveryInterval}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">Товары в заказе</h2>
                <div className="space-y-4">
                  {order.items.map((item: any) => (
                    <motion.div
                      key={item._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="w-16 h-16 relative">
                        <img
                          src={fixImageUrl(item.image)}
                          alt={item.name}
                          className="w-full h-full object-contain rounded-lg block"
                          loading="eager"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            console.log('❌ Ошибка загрузки изображения:', item.image, '→', fixImageUrl(item.image));
                            e.currentTarget.src = '/placeholder-product.svg';
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        {item.productId?.slug ? (
                          <Link href={`/product/${item.productId.slug}`}>
                            <h3 className="font-medium hover:text-blue-600 transition-colors cursor-pointer">{item.name}</h3>
                          </Link>
                        ) : (
                          <h3 className="font-medium">{item.name}</h3>
                        )}
                        <p className="text-sm text-gray-600">
                          {item.quantity} шт. × {item.price.toLocaleString()} ₽
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {(item.quantity * item.price).toLocaleString()} ₽
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* QR код для получения заказа */}
            <div className="mt-8">
              <OrderQRCode
                orderNumber={order.orderNumber}
                orderId={order._id}
              />
            </div>

            {/* Показываем блок авторизации только для неавторизованных пользователей */}
            {!isAuthenticated && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">Войдите в систему</p>
                    <p className="text-sm text-blue-700">Чтобы получить доступ к дополнительным функциям: отслеживание статуса заказа, запрос звонка менеджера и просмотр контактных данных</p>
                  </div>
                </div>
                <div className="mt-4 flex space-x-4">
                  <Link
                    href={`/auth/login?redirect=/orders/${orderId}`}
                    className="flex-1 bg-blue-600 text-white text-center py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Войти
                  </Link>
                  <Link
                    href={`/auth/register?redirect=/orders/${orderId}`}
                    className="flex-1 bg-purple-600 text-white text-center py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Регистрация
                  </Link>
                </div>
              </motion.div>
            )}

            {/* Кнопка "Позвоните мне" только для авторизованных пользователей */}
            {isAuthenticated && (!order.callRequest || order.callStatus === 'completed') && (
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

            {/* Статус звонка только для авторизованных пользователей */}
            {isAuthenticated && order.callRequest && order.callStatus === 'requested' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-900">Запрос на звонок отправлен</p>
                    <p className="text-sm text-green-700">Наш менеджер свяжется с вами в ближайшее время</p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
      {/* Футер - скрыт на мобильных */}
      <div className="hidden md:block">
        <Footer />
      </div>
      
      <MobileNavigation />
    </>
  );
};

export default OrderPage; 