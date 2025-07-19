import React from 'react';

const DeliveryTest: React.FC = () => {
  return (
    <div className="p-8">
      <div className="bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 text-white p-8 rounded-2xl shadow-2xl">
        <h1 className="text-4xl font-bold mb-4">🎉 ТЕСТОВАЯ СТРАНИЦА ДОСТАВКИ 🎉</h1>
        <p className="text-xl mb-6">Если вы видите этот яркий градиент, значит Vite работает правильно!</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 border border-white/30">
            <h3 className="text-2xl font-bold mb-2">🚚 Доставка</h3>
            <p className="text-white/90">Быстрая доставка по городу</p>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 border border-white/30">
            <h3 className="text-2xl font-bold mb-2">🏪 Самовывоз</h3>
            <p className="text-white/90">Заберите товар сами</p>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 border border-white/30">
            <h3 className="text-2xl font-bold mb-2">📦 Курьер</h3>
            <p className="text-white/90">Доставка до двери</p>
          </div>
        </div>
        
        <button className="mt-8 bg-white text-purple-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg">
          ✨ КРАСИВАЯ КНОПКА ✨
        </button>
      </div>
    </div>
  );
};

export default DeliveryTest; 