'use client';

import Layout from '@/components/layout/Layout';

export default function WarrantyPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Гарантийное обслуживание</h1>
        
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Условия гарантии</h2>
            <div className="bg-white border rounded-lg p-6 shadow-sm">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Гарантийные сроки</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Смартфоны - 12 месяцев</li>
                    <li>• Планшеты - 12 месяцев</li>
                    <li>• Аксессуары - 6 месяцев</li>
                    <li>• Наушники - 12 месяцев</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-3">Что покрывает гарантия</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Заводские дефекты</li>
                    <li>• Неисправности ПО</li>
                    <li>• Проблемы с аккумулятором</li>
                    <li>• Дефекты дисплея</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Процедура обращения</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600 mb-2">1</div>
                <h3 className="font-medium mb-2">Обращение</h3>
                <p className="text-sm text-gray-600">Свяжитесь с нами любым удобным способом</p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600 mb-2">2</div>
                <h3 className="font-medium mb-2">Диагностика</h3>
                <p className="text-sm text-gray-600">Проводим диагностику устройства</p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600 mb-2">3</div>
                <h3 className="font-medium mb-2">Ремонт/Замена</h3>
                <p className="text-sm text-gray-600">Ремонтируем или заменяем устройство</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-3 text-yellow-800">Важная информация</h2>
            <ul className="space-y-2 text-yellow-700">
              <li>• Сохраняйте чек и гарантийный талон</li>
              <li>• Гарантия не распространяется на механические повреждения</li>
              <li>• Попадание влаги не покрывается гарантией</li>
              <li>• Самостоятельный ремонт отменяет гарантию</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
} 