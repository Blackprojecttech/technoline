'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '../../lib/api';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import MobileNavigation from '../../components/layout/MobileNavigation';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { motion, AnimatePresence } from 'framer-motion';

interface ReferralStats {
  clicks: number;
  registrations: number;
  orders: number;
  totalCommission: number;
  availableCommission: number;
  withdrawnCommission: number;
  referrals: Array<{
    ip: string;
    firstClick: string;
    totalClicks: number;
    registered: boolean;
    registrationDate?: string;
    orders: Array<{
      orderId: string;
      orderDate: string;
      amount: number;
      commission: number;
      paid: boolean;
    }>;
    totalSpent: number;
    totalCommission: number;
  }>;
}

interface ReferralLink {
  referralUrl: string;
  stats: {
    totalEarnings: number;
    availableBalance: number;
    withdrawnAmount: number;
    totalReferrals: number;
    activeReferrals: number;
  };
}

export default function ReferralsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [referralLink, setReferralLink] = useState<ReferralLink | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Получение реферальной ссылки
  const fetchReferralLink = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/referrals/my-link`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReferralLink(data);
      } else {
        throw new Error('Ошибка при получении реферальной ссылки');
      }
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  // Получение статистики рефералов
  const fetchReferralStats = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/referrals/my-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReferralStats(data);
      } else {
        throw new Error('Ошибка при получении статистики');
      }
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  // Генерация реферальной ссылки
  const generateReferralLink = async () => {
    setGenerating(true);
    try {
      await fetchReferralLink();
    } finally {
      setGenerating(false);
    }
  };

  // Копирование ссылки в буфер обмена
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToastMessage('Ссылка скопирована успешно!');
    } catch (error) {
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToastMessage('Ссылка скопирована успешно!');
    }
  };

  // Функция для показа toast уведомления
  const showToastMessage = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  // Запрос на вывод средств
  const requestWithdrawal = async () => {
    if (!withdrawAmount || !paymentMethod || !paymentDetails) {
      showToastMessage('Заполните все поля', 'error');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (amount <= 0 || (referralLink && amount > referralLink.stats.availableBalance)) {
      showToastMessage('Неверная сумма для вывода', 'error');
      return;
    }

    setWithdrawLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/referrals/withdrawal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount,
          paymentMethod,
          paymentDetails
        })
      });

      if (response.ok) {
        showToastMessage('Заявка на вывод создана! Ожидайте обработки администратором.');
        setWithdrawModalOpen(false);
        setWithdrawAmount('');
        setPaymentMethod('');
        setPaymentDetails('');
        fetchReferralLink(); // Обновляем баланс
      } else {
        const error = await response.json();
        showToastMessage(error.message || 'Ошибка при создании заявки', 'error');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      showToastMessage('Ошибка при создании заявки на вывод', 'error');
    } finally {
      setWithdrawLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchReferralLink(), fetchReferralStats()]);
      setLoading(false);
    };

    loadData();
    }
  }, [user]);

  if (loading) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 pt-32 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
        <div className="hidden md:block">
          <Footer />
        </div>
              <MobileNavigation />

      {/* Toast уведомление */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", duration: 0.5 }}
            className={`fixed bottom-6 right-6 left-6 md:left-auto z-50 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 max-w-md md:max-w-none mx-auto md:mx-0 ${
              toastType === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            <div className="flex-shrink-0">
              {toastType === 'success' ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{toastMessage}</p>
            </div>
            <button
              onClick={() => setShowToast(false)}
              className={`flex-shrink-0 ml-2 transition-colors ${
                toastType === 'success' ? 'text-green-200 hover:text-white' : 'text-red-200 hover:text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 pt-20 pb-24 md:pt-32 md:pb-0">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 md:mb-12 text-center"
        >
          {/* Основной заголовок */}
          <div className="mb-6 md:mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4 md:mb-6 shadow-lg">
              <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3 md:mb-4 px-2">
              Реферальная программа
            </h1>
            <p className="text-base md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed px-4">
              Приглашайте друзей и получайте <span className="font-bold text-green-600">1.5%</span> с каждого их заказа! 
              Зарабатывайте пассивный доход, помогая близким делать выгодные покупки.
          </p>
        </div>

          {/* Преимущества */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8 px-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg md:rounded-xl p-4 md:p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3 md:mb-4">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">Стабильный доход</h3>
              <p className="text-gray-600 text-xs md:text-sm">Получайте деньги с каждого заказа приглашенных друзей</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg md:rounded-xl p-4 md:p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3 md:mb-4">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">Быстрый старт</h3>
              <p className="text-gray-600 text-xs md:text-sm">Создайте ссылку за несколько секунд и начинайте зарабатывать</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Детальная статистика</h3>
              <p className="text-gray-600 text-sm">Отслеживайте все переходы, регистрации и заработок в реальном времени</p>
            </motion.div>
          </div>
        </motion.div>

        {/* Реферальная ссылка */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl p-8 mb-8 border border-blue-200 relative overflow-hidden"
        >
          {/* Декоративные элементы */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full translate-y-12 -translate-x-12"></div>
          
          <div className="relative">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Ваша реферальная ссылка</h2>
              <p className="text-gray-600">Поделитесь с друзьями и начните зарабатывать уже сегодня!</p>
            </div>
          
          {referralLink ? (
            <div className="space-y-4">
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <svg className="w-4 h-4 inline mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Ваша персональная ссылка
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={referralLink.referralUrl}
                      readOnly
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-base font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => copyToClipboard(referralLink.referralUrl)}
                      className="px-3 py-2 md:px-6 md:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg font-medium whitespace-nowrap text-sm md:text-base"
                    >
                      <svg className="w-3 h-3 md:w-4 md:h-4 inline mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Копировать
                    </motion.button>
                  </div>
                </div>

                {/* Способы поделиться */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    Быстро поделиться
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink.referralUrl)}&text=${encodeURIComponent('Отличный магазин! Переходи по моей ссылке')}`)}
                      className="flex items-center justify-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                    >
                      Telegram
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('Отличный магазин! Переходи по моей ссылке: ' + referralLink.referralUrl)}`)}
                      className="flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      WhatsApp
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => copyToClipboard(referralLink.referralUrl)}
                      className="flex items-center justify-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                    >
                      Копировать
                    </motion.button>
                </div>
              </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    💰 <strong>Помните:</strong> Вы получите 1.5% с каждого заказа ваших друзей после успешной доставки
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mb-6">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Создайте свою реферальную ссылку</h3>
                  <p className="text-gray-600 mb-6">Получите персональную ссылку для приглашения друзей</p>
            </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                onClick={generateReferralLink}
                disabled={generating}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50 shadow-xl font-medium text-lg"
                >
                  {generating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Генерируем ссылку...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Создать реферальную ссылку
                    </>
                  )}
                </motion.button>
            </div>
          )}
        </div>
        </motion.div>

        {/* Статистика */}
        {referralLink && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow"
            >
              <h3 className="text-sm font-medium text-gray-500">Переходы</h3>
              <p className="text-2xl font-bold text-blue-600">{referralStats?.clicks || 0}</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35 }}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow"
            >
              <h3 className="text-sm font-medium text-gray-500">Регистрации</h3>
              <p className="text-2xl font-bold text-green-600">{referralStats?.registrations || 0}</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow"
            >
              <h3 className="text-sm font-medium text-gray-500">Заказы</h3>
              <p className="text-2xl font-bold text-purple-600">{referralStats?.orders || 0}</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45 }}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow"
            >
              <h3 className="text-sm font-medium text-gray-500">Общий доход</h3>
              <p className="text-2xl font-bold text-green-600">
                {referralStats?.totalCommission.toFixed(2) || '0.00'} ₽
              </p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow"
            >
              <h3 className="text-sm font-medium text-gray-500">Доступно к выводу</h3>
              <p className="text-2xl font-bold text-orange-600">
                {referralLink.stats.availableBalance.toFixed(2)} ₽
              </p>
              {referralLink.stats.availableBalance > 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setWithdrawModalOpen(true)}
                  className="mt-2 px-3 py-1 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors shadow-lg"
                >
                  Вывести
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Детальная статистика */}
        {referralStats && referralStats.referrals.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Детальная статистика</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP адрес
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Первый переход
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Кликов
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Регистрация
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Заказов
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Потрачено
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ваш доход
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {referralStats.referrals.map((referral, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {referral.ip}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(referral.firstClick).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {referral.totalClicks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {referral.registered ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Да
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Нет
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {referral.orders.length}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {referral.totalSpent.toFixed(2)} ₽
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {referral.totalCommission.toFixed(2)} ₽
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Подробное описание программы */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 mb-8 border border-blue-200"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Как работает программа?</h2>
            <p className="text-gray-600 text-lg max-w-3xl mx-auto">
              Простая пошаговая инструкция для начала заработка с нашей реферальной программой
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Шаг 1 */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <span className="text-2xl font-bold text-white">1</span>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-ping"></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Получите ссылку</h3>
              <p className="text-gray-600 text-sm">
                Создайте свою уникальную реферальную ссылку одним кликом
              </p>
            </motion.div>

            {/* Шаг 2 */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center"
            >
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Поделитесь</h3>
              <p className="text-gray-600 text-sm">
                Отправьте ссылку друзьям в соцсетях, мессенджерах или лично
              </p>
            </motion.div>

            {/* Шаг 3 */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className="text-center"
            >
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <span className="text-2xl font-bold text-white">3</span>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Друзья покупают</h3>
              <p className="text-gray-600 text-sm">
                Ваши друзья переходят по ссылке, регистрируются и делают заказы
              </p>
            </motion.div>

            {/* Шаг 4 */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center"
            >
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <span className="text-2xl font-bold text-white">4</span>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '1.5s' }}></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Получайте доход</h3>
              <p className="text-gray-600 text-sm">
                Автоматически получайте 1.5% с каждого заказа ваших рефералов
              </p>
            </motion.div>
          </div>

          {/* Дополнительная информация */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Условия программы</h4>
              </div>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Комиссия: 1.5% с каждого заказа
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Минимальная сумма для вывода: 100 ₽
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Начисление после доставки заказа
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Срок действия ссылки: бессрочно
                </li>
              </ul>
            </div>

                         <div className="bg-white rounded-xl p-6 shadow-lg">
               <div className="flex items-center mb-4">
                 <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                   <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                   </svg>
                 </div>
                 <h4 className="text-lg font-semibold text-gray-900">Способы вывода</h4>
               </div>
               <ul className="space-y-3 text-gray-600">
                 <li className="flex items-center">
                   <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                   <div>
                     <span className="font-medium text-gray-900">USDT BEP20</span>
                     <div className="text-xs text-gray-500">Binance Smart Chain</div>
                   </div>
                 </li>
                 <li className="flex items-center">
                   <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                   <div>
                     <span className="font-medium text-gray-900">USDT SOL</span>
                     <div className="text-xs text-gray-500">Solana Network</div>
                   </div>
                 </li>
                 <li className="flex items-center">
                   <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                   <div>
                     <span className="font-medium text-gray-900">Банковская карта</span>
                     <div className="text-xs text-orange-600">Скоро будет доступен</div>
                   </div>
                 </li>
               </ul>
             </div>
          </div>

          {/* FAQ секция */}
          <div className="mt-12">
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">Часто задаваемые вопросы</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Когда начисляется комиссия?</h4>
                <p className="text-gray-600 text-sm">
                  Комиссия начисляется автоматически после успешной доставки заказа. Средства становятся доступными для вывода в течение 24 часов.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Есть ли ограничения на количество рефералов?</h4>
                <p className="text-gray-600 text-sm">
                  Нет, вы можете приглашать неограниченное количество друзей. Чем больше активных рефералов, тем больше ваш доход.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Как долго действует привязка реферала?</h4>
                <p className="text-gray-600 text-sm">
                  Привязка реферала действует пожизненно. Все будущие заказы вашего друга будут приносить вам комиссию.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Можно ли использовать свою же ссылку?</h4>
                <p className="text-gray-600 text-sm">
                  Нет, система автоматически исключает самопереходы. Комиссия начисляется только за заказы других пользователей.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Модальное окно вывода средств */}
        {withdrawModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Вывод средств</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Сумма к выводу
                    </label>
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      max={referralLink?.stats.availableBalance}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Введите сумму"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Доступно: {referralLink?.stats.availableBalance.toFixed(2)} ₽
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Способ оплаты
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Выберите способ</option>
                      <option value="usdt_bep20">USDT BEP20 (Binance Smart Chain)</option>
                      <option value="usdt_sol">USDT SOL (Solana Network)</option>
                      <option value="bank_card" disabled>Банковская карта (скоро)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Реквизиты
                    </label>
                    <textarea
                      value={paymentDetails}
                      onChange={(e) => setPaymentDetails(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Укажите адрес криптокошелька (для USDT BEP20/SOL) или номер банковской карты"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setWithdrawModalOpen(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={requestWithdrawal}
                    disabled={withdrawLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {withdrawLoading ? 'Отправляем...' : 'Отправить заявку'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
      
      {/* Футер - скрыт на мобильных */}
      <div className="hidden md:block">
        <Footer />
      </div>
      
      <MobileNavigation />
    </ProtectedRoute>
  );
} 