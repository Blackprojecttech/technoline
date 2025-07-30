'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Layout from '../../components/layout/Layout';

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  sku: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
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
  createdAt: string;
  updatedAt: string;
}

const OrdersPage: React.FC = () => {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/orders/my-orders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        console.error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-purple-100 text-purple-800';
      case 'shipped': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'with_courier': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
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
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash_on_delivery': return 'Наличными при получении';
      case 'bank_card': return 'Банковской картой';
      case 'sberbank_transfer': return 'Перевод на Карту Сбербанка';
      case 'credit_purchase': return 'Купить в кредит';
      case 'usdt_payment': return 'Оплата USDT';
      default: return method;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 pt-32 pb-48">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Загрузка заказов...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pt-32 pb-48">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center mb-8">
            <button 
              onClick={() => router.back()}
              className="mr-4 p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ← Назад
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Мои заказы</h1>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl text-gray-300 mb-4">📦</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">У вас пока нет заказов</h2>
              <p className="text-gray-600 mb-8">Оформите первый заказ в нашем магазине</p>
              <button
                onClick={() => router.push('/catalog')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Перейти к каталогу
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div key={order._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Заказ #{order.orderNumber}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                        <p className="text-lg font-bold text-gray-900 mt-2">
                          {order.total.toLocaleString()} ₽
                        </p>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Товары в заказе:</h4>
                      <div className="space-y-3">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex items-center space-x-4">
                            <div className="flex-shrink-0 w-16 h-16">
                              <Image
                                src={item.image}
                                alt={item.name}
                                width={64}
                                height={64}
                                className="rounded-lg object-cover"
                                style={{ width: 'auto', height: 'auto' }}
                              />
                            </div>
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">{item.name}</h5>
                              <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">{item.quantity} шт.</p>
                              <p className="font-medium text-gray-900">{item.price.toLocaleString()} ₽</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Адрес доставки:</h4>
                          <div className="text-sm text-gray-600">
                            <p>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                            <p>{order.shippingAddress.address}</p>
                            <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
                            <p>{order.shippingAddress.country}</p>
                            <p className="mt-2">📧 {order.shippingAddress.email}</p>
                            <p>📞 {order.shippingAddress.phone}</p>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Информация о заказе:</h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><span className="font-medium">Способ оплаты:</span> {getPaymentMethodText(order.paymentMethod)}</p>
                            <p><span className="font-medium">Статус оплаты:</span> {order.paymentStatus}</p>
                            {order.trackingNumber && (
                              <p><span className="font-medium">Трек-номер:</span> {order.trackingNumber}</p>
                            )}
                            <p><span className="font-medium">Подытог:</span> {order.subtotal.toLocaleString()} ₽</p>
                            <p><span className="font-medium">Доставка:</span> {order.shipping === 0 ? 'Бесплатно' : `${order.shipping.toLocaleString()} ₽`}</p>
                            <p className="font-bold text-lg"><span className="font-medium">Итого:</span> {order.total.toLocaleString()} ₽</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <button
                        onClick={() => router.push(`/orders/${order._id}`)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Подробнее о заказе
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default OrdersPage; 