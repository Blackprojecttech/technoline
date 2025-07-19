'use client';

import React, { useState } from 'react';

const TestCDEKSimplePage: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);

  const handleReady = () => {
    console.log('Виджет CDEK загружен');
    setIsLoaded(true);
    setError(null);
  };

  const handleCalculate = (tariffs: any, address: any) => {
    console.log('Расчет стоимости:', { tariffs, address });
    setCalculationResult({ tariffs, address });
  };

  const handleChoose = (deliveryMode: string, tariff: any, address: any) => {
    console.log('Выбрана доставка:', { deliveryMode, tariff, address });
    setSelectedDelivery({ deliveryMode, tariff, address });
  };

  const handleError = (error: any) => {
    console.error('Ошибка виджета:', error);
    setError(error);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Тест виджета CDEK 3.0</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Конфигурация</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>API ключ:</strong> 196c0a39-7bee-495b-b016-f2daf6b595c1
            </div>
            <div>
              <strong>Адрес отправления:</strong> Москва, ул. Тверская, д. 1
            </div>
            <div>
              <strong>Скрипт:</strong> https://cdn.jsdelivr.net/npm/@cdek-it/widget@3/dist/cdek-widget.umd.js
            </div>
            <div>
              <strong>Статус:</strong> {isLoaded ? '✅ Загружен' : error ? '❌ Ошибка' : '⏳ Загрузка...'}
            </div>
            <div>
              <strong>defaultLocation:</strong> [55.7558, 37.6176] (Москва)
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Виджет CDEK</h2>
          
          <div
            id="cdek-widget-container"
            style={{ width: '100%', height: '500px' }}
          ></div>
        </div>

        {calculationResult && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Результат расчета</h3>
            <pre className="text-sm text-blue-700 overflow-auto">
              {JSON.stringify(calculationResult, null, 2)}
            </pre>
          </div>
        )}

        {selectedDelivery && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <h3 className="text-lg font-semibold text-green-800 mb-2">Выбранная доставка</h3>
            <pre className="text-sm text-green-700 overflow-auto">
              {JSON.stringify(selectedDelivery, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Инструкции</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Виджет автоматически загружается при открытии страницы</li>
            <li>• При ошибке загрузки нажмите "Попробовать снова"</li>
            <li>• Введите адрес доставки в виджете</li>
            <li>• Выберите способ доставки и ПВЗ</li>
            <li>• Результаты отобразятся в консоли и на странице</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TestCDEKSimplePage; 