'use client';

import Layout from '@/components/layout/Layout';

export default function AdminContactPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Связь с администрацией</h1>
        
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4 text-red-800">Важная информация</h2>
              <p className="text-red-700 mb-4">
                Данный раздел предназначен для обращений к администрации по серьезным вопросам: 
                нарушения, жалобы на сервис, предложения по улучшению работы магазина.
              </p>
              <p className="text-red-700">
                Для обычных вопросов о заказах используйте обычную службу поддержки.
              </p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Контактная информация</h2>
              <div className="space-y-4">
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-medium mb-2">📧 Email администрации</h3>
                  <p className="text-gray-600">admin@technohubstore.net</p>
                </div>
                
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-medium mb-2">📞 Прямая линия</h3>
                  <p className="text-gray-600">+7 (800) 123-45-68</p>
                  <p className="text-sm text-gray-500">Пн-Пт: 9:00-18:00</p>
                </div>
                
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-medium mb-2">⏱️ Время ответа</h3>
                  <p className="text-gray-600">До 24 часов в рабочие дни</p>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-4">Темы для обращений</h2>
              <div className="space-y-3">
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-medium text-red-600">🚨 Жалобы на сервис</h3>
                  <p className="text-sm text-gray-600">Некачественное обслуживание, нарушения</p>
                </div>
                
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-medium text-orange-600">⚖️ Споры и конфликты</h3>
                  <p className="text-sm text-gray-600">Неразрешенные споры с поддержкой</p>
                </div>
                
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-medium text-blue-600">💡 Предложения</h3>
                  <p className="text-sm text-gray-600">Идеи по улучшению сервиса</p>
                </div>
                
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-medium text-green-600">🤝 Партнерство</h3>
                  <p className="text-sm text-gray-600">Предложения о сотрудничестве</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 bg-blue-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">Как написать эффективное обращение</h2>
            <ul className="space-y-2 text-gray-700">
              <li>• Укажите номер заказа (если применимо)</li>
              <li>• Опишите проблему подробно и по существу</li>
              <li>• Приложите скриншоты или документы при необходимости</li>
              <li>• Укажите желаемый способ решения проблемы</li>
              <li>• Оставьте контактные данные для обратной связи</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
} 