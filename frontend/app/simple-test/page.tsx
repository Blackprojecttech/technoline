export default function SimpleTestPage() {
  return (
    <div className="min-h-screen bg-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-900 mb-8">
          Простой тест
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Проверка стилей
          </h2>
          <p className="text-gray-600 mb-4">
            Если вы видите этот текст с правильными стилями, значит CSS работает корректно.
          </p>
          <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Тестовая кнопка
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Карточка 1</h3>
            <p className="text-gray-600">Содержимое карточки</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Карточка 2</h3>
            <p className="text-gray-600">Содержимое карточки</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Карточка 3</h3>
            <p className="text-gray-600">Содержимое карточки</p>
          </div>
        </div>
      </div>
    </div>
  );
} 