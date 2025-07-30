'use client';

import Layout from '@/components/layout/Layout';

export default function ReviewsPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Отзывы клиентов</h1>
        
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-6">
            <div className="bg-white border rounded-lg p-6 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">
                  {'★'.repeat(5)}
                </div>
                <div className="ml-3">
                  <div className="font-medium">Алексей М.</div>
                  <div className="text-sm text-gray-500">15 дней назад</div>
                </div>
              </div>
              <p className="text-gray-700">
                Отличный магазин! Купил iPhone 15 Pro, цена была лучшая в городе. 
                Быстрая доставка и качественное обслуживание. Рекомендую!
              </p>
            </div>
            
            <div className="bg-white border rounded-lg p-6 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">
                  {'★'.repeat(5)}
                </div>
                <div className="ml-3">
                  <div className="font-medium">Мария К.</div>
                  <div className="text-sm text-gray-500">1 месяц назад</div>
                </div>
              </div>
              <p className="text-gray-700">
                Заказывала AirPods, все пришло быстро и в отличном состоянии. 
                Менеджеры очень вежливые, помогли с выбором. Спасибо!
              </p>
            </div>
            
            <div className="bg-white border rounded-lg p-6 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">
                  {'★'.repeat(4)}
                </div>
                <div className="ml-3">
                  <div className="font-medium">Дмитрий С.</div>
                  <div className="text-sm text-gray-500">2 месяца назад</div>
                </div>
              </div>
              <p className="text-gray-700">
                Хороший магазин с большим выбором техники. Цены адекватные, 
                доставка работает хорошо. Планирую покупать еще.
              </p>
            </div>
            
            <div className="bg-blue-50 p-6 rounded-lg text-center">
              <h2 className="text-xl font-semibold mb-3">Оставьте свой отзыв</h2>
              <p className="text-gray-600 mb-4">
                Ваше мнение важно для нас! Поделитесь опытом покупки в нашем магазине.
              </p>
              <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                Написать отзыв
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 