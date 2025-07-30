import React from 'react';

interface ProfileStatsProps {
  ordersCount: number;
  totalSpent: number;
  averageOrderValue: number;
  formatCurrency: (amount: number) => string;
}

export default function ProfileStats({ ordersCount, totalSpent, averageOrderValue, formatCurrency }: ProfileStatsProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Статистика</h2>
      <div className="w-full flex flex-wrap justify-center items-stretch gap-6 mb-8">
        <button
          type="button"
          className="flex flex-col items-center min-w-[110px] px-4 py-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl shadow hover:shadow-lg transition-all duration-200 hover:scale-105 focus:outline-none border border-blue-200"
          tabIndex={-1}
          style={{ cursor: 'default' }}
        >
          <div className="flex items-center gap-2 mb-1">
            {/* Package icon */}
            <span className="text-xl font-bold text-blue-900">{ordersCount}</span>
          </div>
          <span className="text-xs text-blue-900 text-center">Заказов</span>
        </button>
        <button
          type="button"
          className="flex flex-col items-center min-w-[110px] px-4 py-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl shadow hover:shadow-lg transition-all duration-200 hover:scale-105 focus:outline-none border border-purple-200"
          tabIndex={-1}
          style={{ cursor: 'default' }}
        >
          <div className="flex items-center gap-2 mb-1">
            {/* DollarSign icon */}
            <span className="text-xl font-bold text-purple-900">{formatCurrency(totalSpent)}</span>
          </div>
          <span className="text-xs text-purple-900 text-center">Общая сумма</span>
        </button>
        <button
          type="button"
          className="flex flex-col items-center min-w-[110px] px-4 py-3 bg-gradient-to-br from-green-100 to-green-200 rounded-xl shadow hover:shadow-lg transition-all duration-200 hover:scale-105 focus:outline-none border border-green-200"
          tabIndex={-1}
          style={{ cursor: 'default' }}
        >
          <div className="flex items-center gap-2 mb-1">
            {/* Award icon */}
            <span className="text-xl font-bold text-green-900">{formatCurrency(averageOrderValue)}</span>
          </div>
          <span className="text-xs text-green-900 text-center">Средний чек</span>
        </button>
      </div>
    </div>
  );
} 