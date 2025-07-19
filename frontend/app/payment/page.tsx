'use client';

import { CreditCard, Wallet, Banknote, Bitcoin, MapPin, Shield, Clock, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';

// Fallback компонент без анимаций
const FallbackCard = ({ method }: { method: any }) => (
  <div className={`relative overflow-hidden rounded-2xl border-2 ${method.borderColor} ${method.bgColor} p-8 shadow-lg hover:shadow-xl transition-all duration-300`}>
    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${method.color}`}></div>
    
    <div className="flex items-center mb-6">
      <div className={`p-3 rounded-xl bg-gradient-to-r ${method.color} text-white mr-4`}>
        <method.icon size={24} />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900">{method.title}</h3>
        <p className="text-lg font-medium text-gray-700">{method.subtitle}</p>
      </div>
    </div>

    <p className="text-gray-600 mb-6 leading-relaxed">
      {method.description}
    </p>

    <div className="space-y-3">
      {method.features.map((feature: string, index: number) => (
        <div key={index} className="flex items-start">
          <CheckCircle className="text-green-500 mt-1 mr-3 flex-shrink-0" size={18} />
          <span className="text-gray-700 leading-relaxed">{feature}</span>
        </div>
      ))}
    </div>

    {method.id === 1 && (
      <div className="mt-6 p-4 bg-green-100 rounded-lg border border-green-200">
        <div className="flex items-center text-green-800">
          <MapPin size={20} className="mr-2" />
          <span className="font-medium">Доступно для самовывоза и доставки по Москве и области</span>
        </div>
      </div>
    )}

    {method.id === 2 && (
      <div className="mt-6 p-4 bg-blue-100 rounded-lg border border-blue-200">
        <div className="flex items-center text-blue-800">
          <Shield size={20} className="mr-2" />
          <span className="font-medium">Безопасная оплата через защищенные платежные системы</span>
        </div>
      </div>
    )}

    {method.id === 3 && (
      <div className="mt-6 p-4 bg-orange-100 rounded-lg border border-orange-200">
        <div className="flex items-center text-orange-800">
          <Clock size={20} className="mr-2" />
          <span className="font-medium">Удобно для жителей регионов</span>
        </div>
      </div>
    )}

    {method.id === 4 && (
      <div className="mt-6 p-4 bg-purple-100 rounded-lg border border-purple-200">
        <div className="flex items-center text-purple-800">
          <Bitcoin size={20} className="mr-2" />
          <span className="font-medium">Современный способ оплаты криптовалютой</span>
        </div>
      </div>
    )}
  </div>
);

export default function PaymentPage() {
  const [motionLoaded, setMotionLoaded] = useState(false);

  useEffect(() => {
    // Проверяем, загрузился ли framer-motion
    const checkMotion = async () => {
      try {
        const { motion } = await import('framer-motion');
        setMotionLoaded(true);
      } catch (error) {
        console.log('Framer Motion не загружен, используем fallback');
      }
    };
    checkMotion();
  }, []);

  const paymentMethods = [
    {
      id: 1,
      title: 'Наличными',
      subtitle: 'По факту получения заказа',
      description: 'Только для самовывоза и доставок по Москве и Области',
      icon: Banknote,
      features: [
        'Заказ оплачивается наличными при получении в пункте выдачи или курьеру',
        'При оформлении заказа выберите способ оплаты "Наличными"',
        'Вместе с заказом выдается кассовый чек'
      ],
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      id: 2,
      title: 'Банковской картой',
      subtitle: 'Только при самовывозе',
      description: 'Кредитные и дебетовые карты МИР, VISA или Mastercard',
      icon: CreditCard,
      features: [
        'Оплата онлайн при получении товара в пункте выдачи',
        'Только для самовывоза на Митинском Радиорынке',
        'Необходимо иметь при себе паспорт',
        'При оплате картой взимается плата за самовывоз'
      ],
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 3,
      title: 'Перевод на карту Сбербанка',
      subtitle: 'Только для регионов',
      description: 'Перевод осуществляется на карту Сбербанка',
      icon: Wallet,
      features: [
        'При оформлении заказа выберите способ оплаты "Перевод на карту"',
        'Следуйте дальнейшим инструкциям',
        'Вместе с заказом выдается кассовый чек'
      ],
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      id: 4,
      title: 'Оплата USDT',
      subtitle: 'Криптовалюта',
      description: 'Принимаем оплату в криптовалюте USDT за технику Apple, Samsung, Xiaomi и другие бренды',
      icon: Bitcoin,
      features: [
        'Удобно, быстро и безопасно',
        'Выбирайте гаджеты и оплачивайте в цифровой валюте',
        'Работаем только с физическими лицами'
      ],
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    }
  ];

  return (
    <Layout>
      <div className="pt-16 pb-16">
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
          <div className="container mx-auto px-4">
            {/* Заголовок */}
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Способы оплаты
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Выберите удобный для вас способ оплаты. Мы работаем только с физическими лицами
              </p>
            </div>

            {/* Способы оплаты */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto">
              {paymentMethods.map((method) => (
                <FallbackCard key={method.id} method={method} />
              ))}
            </div>

            {/* Дополнительная информация */}
            <div className="mt-16 text-center">
              <div className="bg-white rounded-2xl shadow-lg p-8 max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  Важная информация
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <Shield className="text-green-600" size={24} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Безопасность</h3>
                    <p className="text-gray-600">Все платежи защищены современными технологиями</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <Clock className="text-blue-600" size={24} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Быстро</h3>
                    <p className="text-gray-600">Мгновенная обработка платежей</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="text-purple-600" size={24} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Удобно</h3>
                    <p className="text-gray-600">Выбирайте любой удобный способ оплаты</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 