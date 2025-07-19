import Layout from '@/components/layout/Layout';

export default function AboutPage() {
  return (
    <Layout>
      <div className="pt-32 pb-16">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">О компании TechnoLine</h1>
              <p className="text-xl text-gray-600">
                Ваш надежный партнер в мире технологий
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 mb-12">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Наша миссия</h2>
                <p className="text-gray-600 leading-relaxed">
                  Мы стремимся предоставить нашим клиентам доступ к самым современным технологиям 
                  и инновационным решениям. Наша цель - сделать технологии доступными для каждого, 
                  обеспечивая высокое качество продукции и отличный сервис.
                </p>
              </div>
              
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Наши ценности</h2>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">✓</span>
                    Качество продукции и сервиса
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">✓</span>
                    Инновации и современные технологии
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">✓</span>
                    Клиентоориентированность
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">✓</span>
                    Надежность и доверие
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-8 mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Почему выбирают нас</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🚀</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Быстрая доставка</h3>
                  <p className="text-gray-600 text-sm">
                    Доставляем заказы по всей России в кратчайшие сроки
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🛡️</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Гарантия качества</h3>
                  <p className="text-gray-600 text-sm">
                    Все товары имеют официальную гарантию производителя
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">💬</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Поддержка 24/7</h3>
                  <p className="text-gray-600 text-sm">
                    Наша служба поддержки всегда готова помочь
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Свяжитесь с нами</h2>
              <p className="text-gray-600 mb-6">
                У вас есть вопросы? Мы всегда рады помочь!
              </p>
              <div className="flex justify-center space-x-4">
                <button className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors duration-200">
                  Написать нам
                </button>
                <button className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors duration-200">
                  Позвонить
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 