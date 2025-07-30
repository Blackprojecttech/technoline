'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Phone, Clock, MapPin, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function CallbackPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    time: '',
    comment: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Здесь будет отправка данных на сервер
    setIsSubmitted(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-light-50 to-accent-50">
      <Header onNotificationClick={() => window.openNotificationDrawer?.()} />
      <main className="pt-32 lg:pt-40 pb-16">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl lg:text-5xl font-bold text-secondary-800 mb-4">
                Заказать обратный звонок
              </h1>
              <p className="text-xl text-secondary-600 max-w-2xl mx-auto">
                Оставьте свои контакты, и мы перезвоним вам в удобное время
              </p>
            </div>

            {!isSubmitted ? (
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Contact Info */}
                <div className="bg-white border border-light-200 rounded-lg shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-secondary-800 mb-6">
                    Контактная информация
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="flex items-start space-x-4">
                      <Phone size={24} className="text-primary-500 mt-1" />
                      <div>
                        <h3 className="text-lg font-semibold text-secondary-800 mb-1">
                          Телефон
                        </h3>
                        <p className="text-secondary-600">+7(499)3223386</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <Clock size={24} className="text-primary-500 mt-1" />
                      <div>
                        <h3 className="text-lg font-semibold text-secondary-800 mb-1">
                          Время работы
                        </h3>
                        <p className="text-secondary-600">с 10:00 до 19:00</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <MapPin size={24} className="text-primary-500 mt-1" />
                      <div>
                        <h3 className="text-lg font-semibold text-secondary-800 mb-1">
                          Адрес
                        </h3>
                        <p className="text-secondary-600">
                          Москва, Пятницкое шоссе, 18, Павильон 73.<br />
                          1 этаж, 3 вход, прямо до конца, возле Mix Bar.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Callback Form */}
                <div className="bg-white border border-light-200 rounded-lg shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-secondary-800 mb-6">
                    Форма заявки
                  </h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="name" className="block text-secondary-800 font-medium mb-2">
                        Ваше имя *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-white border border-light-300 rounded-lg text-secondary-700 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all duration-300"
                        placeholder="Введите ваше имя"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-secondary-800 font-medium mb-2">
                        Номер телефона *
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-white border border-light-300 rounded-lg text-secondary-700 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all duration-300"
                        placeholder="+7 (999) 123-45-67"
                      />
                    </div>

                    <div>
                      <label htmlFor="time" className="block text-secondary-800 font-medium mb-2">
                        Удобное время для звонка
                      </label>
                      <select
                        id="time"
                        name="time"
                        value={formData.time}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white border border-light-300 rounded-lg text-secondary-700 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all duration-300"
                      >
                        <option value="">Выберите время</option>
                        <option value="10:00-12:00">10:00 - 12:00</option>
                        <option value="12:00-14:00">12:00 - 14:00</option>
                        <option value="14:00-16:00">14:00 - 16:00</option>
                        <option value="16:00-18:00">16:00 - 18:00</option>
                        <option value="18:00-19:00">18:00 - 19:00</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="comment" className="block text-secondary-800 font-medium mb-2">
                        Комментарий
                      </label>
                      <textarea
                        id="comment"
                        name="comment"
                        value={formData.comment}
                        onChange={handleChange}
                        rows={4}
                        className="w-full px-4 py-3 bg-white border border-light-300 rounded-lg text-secondary-700 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all duration-300 resize-none"
                        placeholder="Опишите ваш вопрос или что вас интересует"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg"
                    >
                      Заказать звонок
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-light-200 rounded-lg shadow-lg p-12 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-success-500 to-primary-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={32} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-secondary-800 mb-4">
                  Спасибо за заявку!
                </h2>
                <p className="text-secondary-600 mb-6">
                  Мы получили вашу заявку на обратный звонок. Наш менеджер свяжется с вами в указанное время.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  Вернуться на главную
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 