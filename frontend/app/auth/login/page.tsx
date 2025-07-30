'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileNavigation from '@/components/layout/MobileNavigation';

// Для корректного расширения window
declare global {
  interface Window {
    onTelegramAuth?: (user: any) => void;
  }
}

export default function LoginPage() {
  const { login, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Редирект для уже авторизованных пользователей
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/profile');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await login(formData.email, formData.password);
      
      // Проверяем наличие параметра redirect в URL
      const searchParams = new URLSearchParams(window.location.search);
      const redirectUrl = searchParams.get('redirect');
      
      // Перенаправляем на указанную страницу или на профиль по умолчанию
      router.push(redirectUrl || '/profile');
    } catch (error: any) {
      setError(error.message || 'Ошибка входа');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = (provider: string) => {
    if (provider === 'google') {
      window.location.href = '/api/auth/google';
    } else if (provider === 'yandex') {
      window.location.href = '/api/auth/yandex';
    } else if (provider === 'telegram') {
      window.location.href = '/api/auth/telegram';
    }
  };

  useEffect(() => {
    // Добавляем Telegram Login Widget только на клиенте
    if (typeof window !== 'undefined') {
      // Удаляем старый виджет, если есть
      const old = document.getElementById('telegram-login-script');
      if (old) old.remove();
      // Создаём функцию-обработчик
      window.onTelegramAuth = function(user: any) {
        fetch('http://localhost:5002/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user)
        })
        .then(res => res.json())
        .then(data => {
          if (data.token) {
            localStorage.setItem('authToken', data.token);
            window.location.href = '/profile';
          } else {
            alert('Ошибка Telegram авторизации');
          }
        });
      };
      // Добавляем скрипт Telegram
      const script = document.createElement('script');
      script.id = 'telegram-login-script';
      script.src = 'https://telegram.org/js/telegram-widget.js?7';
      script.async = true;
      script.setAttribute('data-telegram-login', 'oauthtechno_bot');
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-userpic', 'false');
      script.setAttribute('data-request-access', 'write');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      const container = document.getElementById('telegram-login-widget');
      if (container) {
        container.innerHTML = '';
        container.appendChild(script);
      }
    }
  }, []);

  // Показываем загрузку пока проверяется авторизация
  if (authLoading) {
    return (
      <>
        <Header onNotificationClick={() => window.openNotificationDrawer?.()} />
        <div className="min-h-screen bg-gray-50 pt-32 pb-16 md:pb-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Проверяем авторизацию...</p>
          </div>
        </div>
        <div className="hidden md:block">
          <Footer />
        </div>
        <MobileNavigation />
      </>
    );
  }

  // Если пользователь авторизован, не показываем форму входа (редирект произойдет через useEffect)
  if (user) {
    return null;
  }

  return (
    <>
      <Header onNotificationClick={() => window.openNotificationDrawer?.()} />
      <div className="min-h-screen bg-gray-50 pt-32 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-2xl shadow-xl p-8"
            >
              <div className="text-center mb-8">
                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-3xl font-bold text-gray-900 mb-2"
                >
                  Вход в аккаунт
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-gray-600"
                >
                  Войдите в свой аккаунт для продолжения
                </motion.p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm mb-6"
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Введите email"
                      required
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Пароль
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Введите пароль"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center justify-between"
                >
                  <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-800">
                    Забыли пароль?
                  </Link>
                </motion.div>

                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Вход...' : 'Войти'}
                </motion.button>
              </form>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="mt-8 text-center"
              >
                <span className="text-gray-600">Нет аккаунта? </span>
                <Link href="/auth/register" className="text-blue-600 hover:text-blue-800 font-medium">
                  Зарегистрироваться
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
      {/* Футер - скрыт на мобильных */}
      <div className="hidden md:block">
        <Footer />
      </div>
      
      <MobileNavigation />
    </>
  );
} 