'use client';

import Layout from '@/components/layout/Layout';

export default function WholesalePage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Оптовые продажи</h1>
        
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4">Преимущества оптовых покупок</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Скидки от объема</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• От 10 шт. - скидка 5%</li>
                    <li>• От 25 шт. - скидка 10%</li>
                    <li>• От 50 шт. - скидка 15%</li>
                    <li>• От 100 шт. - индивидуальные условия</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-3">Дополнительные услуги</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Персональный менеджер</li>
                    <li>• Отсрочка платежа до 30 дней</li>
                    <li>• Бесплатная доставка</li>
                    <li>• Специальные цены на новинки</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Для кого оптовые продажи</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white border rounded-lg p-4 text-center">
                <div className="text-3xl mb-3">🏪</div>
                <h3 className="font-medium mb-2">Розничные магазины</h3>
                <p className="text-sm text-gray-600">Пополняйте ассортимент по выгодным ценам</p>
              </div>
              
              <div className="bg-white border rounded-lg p-4 text-center">
                <div className="text-3xl mb-3">🏢</div>
                <h3 className="font-medium mb-2">Компании</h3>
                <p className="text-sm text-gray-600">Корпоративные закупки для сотрудников</p>
              </div>
              
              <div className="bg-white border rounded-lg p-4 text-center">
                <div className="text-3xl mb-3">🔧</div>
                <h3 className="font-medium mb-2">Сервисные центры</h3>
                <p className="text-sm text-gray-600">Запчасти и аксессуары для ремонта</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-lg text-center">
            <h2 className="text-xl font-semibold mb-3">Начните сотрудничество</h2>
            <p className="text-gray-600 mb-4">
              Свяжитесь с нашим отделом оптовых продаж для получения персонального предложения
            </p>
            <div className="space-y-2">
              <div className="font-medium">📞 +7 (800) 123-45-67</div>
              <div className="font-medium">📧 wholesale@technohubstore.net</div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 