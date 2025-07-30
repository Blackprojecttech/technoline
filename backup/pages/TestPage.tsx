import React from 'react';

const TestPage: React.FC = () => {
  return (
    <div className="p-8">
      <div className="bg-gradient-to-r from-red-500 to-blue-500 text-white p-6 rounded-xl">
        <h1 className="text-3xl font-bold">ТЕСТОВАЯ СТРАНИЦА</h1>
        <p className="text-xl">Если вы видите этот градиент, значит Vite работает правильно!</p>
      </div>
    </div>
  );
};

export default TestPage; 