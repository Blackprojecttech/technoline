'use client';

import { useState } from 'react';
import { Mail, Send, Gift, Bell } from 'lucide-react';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubscribed(true);
      setIsLoading(false);
      setEmail('');
    }, 1000);
  };

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-light-50 to-accent-50"></div>
      
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-accent-200 rounded-full opacity-25 animate-bounce"></div>
        <div className="absolute bottom-40 left-1/4 w-16 h-16 bg-success-200 rounded-full opacity-20 animate-ping"></div>
        <div className="absolute top-1/2 right-1/3 w-20 h-20 bg-warning-200 rounded-full opacity-20 animate-spin"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl mb-6 shadow-lg">
              <Mail className="text-white" size={32} />
            </div>
            
            <h2 className="text-4xl lg:text-5xl font-bold text-secondary-800 mb-4">
              Подпишитесь на рассылку
            </h2>
            
            <p className="text-xl text-secondary-600 max-w-2xl mx-auto mb-8">
              Получайте первыми информацию о новых товарах, скидках и эксклюзивных предложениях
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Benefits */}
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Gift className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-secondary-800 mb-2">
                    Эксклюзивные предложения
                  </h3>
                  <p className="text-secondary-600">
                    Специальные скидки и акции только для подписчиков
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-success-500 to-primary-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Bell className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-secondary-800 mb-2">
                    Новинки первыми
                  </h3>
                  <p className="text-secondary-600">
                    Узнавайте о новых поступлениях раньше всех
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-warning-500 to-accent-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Send className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-secondary-800 mb-2">
                    Полезные советы
                  </h3>
                  <p className="text-secondary-600">
                    Советы по выбору техники и уходу за ней
                  </p>
                </div>
              </div>
            </div>

            {/* Subscribe form */}
            <div className="bg-white border border-light-200 rounded-2xl p-8 shadow-xl">
              {!isSubscribed ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-secondary-800 font-semibold mb-2">
                      Ваш email адрес
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@email.com"
                        className="w-full px-4 py-4 pl-12 bg-white border border-light-300 rounded-xl text-secondary-700 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all duration-300 shadow-sm"
                        required
                      />
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-secondary-400" size={20} />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !email}
                    className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg flex items-center justify-center space-x-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Подписка...</span>
                      </>
                    ) : (
                      <>
                        <Send size={20} />
                        <span>Подписаться</span>
                      </>
                    )}
                  </button>

                  <p className="text-sm text-secondary-500 text-center">
                    Отписывайтесь в любое время. Мы не спамим.
                  </p>
                </form>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-success-500 to-primary-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-secondary-800">
                    Спасибо за подписку!
                  </h3>
                  <p className="text-secondary-600">
                    Вы успешно подписались на нашу рассылку. Первое письмо придет в ближайшее время.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">10,000+</div>
              <div className="text-secondary-600">Подписчиков</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">50+</div>
              <div className="text-secondary-600">Эксклюзивных предложений</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">24/7</div>
              <div className="text-secondary-600">Поддержка</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 