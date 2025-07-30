'use client';

// Отключаем статическую генерацию для этой страницы
export const dynamic = 'force-dynamic';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Иконка офлайн */}
        <div className="mx-auto w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-8">
          <svg 
            className="w-12 h-12 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" 
            />
          </svg>
        </div>

        {/* Заголовок */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Нет подключения к интернету
        </h1>

        {/* Описание */}
        <p className="text-gray-600 mb-8 leading-relaxed">
          Вы находитесь в офлайн режиме. Некоторые функции могут быть недоступны. 
          Проверьте подключение к интернету и попробуйте снова.
        </p>

        {/* Кнопки действий */}
        <div className="space-y-4">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            🔄 Попробовать снова
          </button>

          <button
            onClick={() => window.history.back()}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            ← Назад
          </button>

          <a
            href="/"
            className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 text-center"
          >
            🏠 На главную
          </a>
        </div>

        {/* Дополнительная информация */}
        <div className="mt-12 p-4 bg-white rounded-lg shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-2">
            💡 Что можно делать офлайн:
          </h3>
          <ul className="text-sm text-gray-600 space-y-1 text-left">
            <li>• Просматривать ранее загруженные страницы</li>
            <li>• Использовать сохраненные в кэше данные</li>
            <li>• Просматривать избранные товары</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 