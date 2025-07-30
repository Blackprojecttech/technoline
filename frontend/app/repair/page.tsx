'use client';

import Layout from '@/components/layout/Layout';

export default function RepairPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Ремонт техники</h1>
        
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Услуги ремонта</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium mb-3">Ремонт смартфонов</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Замена экранов</li>
                  <li>• Ремонт материнских плат</li>
                  <li>• Замена аккумуляторов</li>
                  <li>• Восстановление после воды</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium mb-3">Ремонт планшетов</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Замена дисплеев</li>
                  <li>• Ремонт разъемов</li>
                  <li>• Программное восстановление</li>
                  <li>• Замена стекол</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium mb-3">Ремонт ноутбуков</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Замена матриц</li>
                  <li>• Ремонт системы охлаждения</li>
                  <li>• Установка SSD</li>
                  <li>• Чистка от пыли</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium mb-3">Прошивка устройств</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Разблокировка телефонов</li>
                  <li>• Установка прошивок</li>
                  <li>• Восстановление IMEI</li>
                  <li>• Сброс паролей</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">Гарантия на ремонт</h2>
            <p className="text-gray-700 mb-4">
              Мы предоставляем гарантию на все виды ремонтных работ от 1 до 6 месяцев 
              в зависимости от сложности ремонта.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">24ч</div>
                <div className="text-sm text-gray-600">Экспресс-ремонт</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">90%</div>
                <div className="text-sm text-gray-600">Успешных ремонтов</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">3мес</div>
                <div className="text-sm text-gray-600">Средняя гарантия</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 