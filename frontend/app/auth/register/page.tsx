
'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Phone, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileNavigation from '@/components/layout/MobileNavigation';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

export default function RegisterPage() {
  const { register, user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Редирект для уже авторизованных пользователей
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/profile');
    }
  }, [user, authLoading, router]);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    if (formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName || undefined,
        email: formData.email,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zipCode: formData.zipCode || undefined,
        password: formData.password
      });

      // Проверяем наличие параметра redirect в URL
      const searchParams = new URLSearchParams(window.location.search);
      const redirectUrl = searchParams.get('redirect');
      
      // Перенаправляем на указанную страницу или на профиль по умолчанию
      router.push(redirectUrl || '/profile');
    } catch (error: any) {
      setError(error.message || 'Ошибка регистрации');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = (provider: string) => {
    // TODO: Реализовать OAuth
    console.log(`${provider} OAuth`);
  };

  // Функция для получения подсказок Dadata
  const fetchAddressSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setAddressSuggestions([]);
      return;
    }
    try {
      const encodedQuery = encodeURIComponent(query);
      const res = await fetch(`/api/addresses/search?q=${encodedQuery}`);
      const data = await res.json();
      setAddressSuggestions(data.suggestions || []);
    } catch (e) {
      setAddressSuggestions([]);
    }
  };

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

  // Если пользователь авторизован, не показываем форму регистрации (редирект произойдет через useEffect)
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
                  Регистрация
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-gray-600"
                >
                  Создайте аккаунт для доступа к личному кабинету
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

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Имя
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Имя"
                        autoComplete="given-name"
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
                      Фамилия
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Фамилия"
                        autoComplete="family-name"
                        required
                      />
                    </div>
                  </motion.div>
                </div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Отчество (необязательно)
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={formData.middleName}
                      onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Отчество (если есть)"
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
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
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Введите email"
                      autoComplete="email"
                      required
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Телефон
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                    <div className="pl-10">
                      <PhoneInput
                        country={'ru'}
                        value={formData.phone}
                        onChange={phone => setFormData({ ...formData, phone })}
                        inputClass="!w-full !pl-12 !pr-4 !py-3 !border !border-gray-300 !rounded-lg !focus:ring-2 !focus:ring-green-500 !focus:border-transparent"
                        buttonClass="!border-none !bg-transparent"
                        dropdownClass="!z-50"
                        containerClass="!w-full"
                        onlyCountries={['ru', 'by', 'kz', 'uz', 'kg', 'az', 'am', 'ge', 'md', 'ee', 'lv', 'lt']}
                        localization={{
                          ru: 'Россия',
                          by: 'Беларусь',
                          kz: 'Казахстан',
                          uz: 'Узбекистан',
                          kg: 'Киргизия',
                          az: 'Азербайджан',
                          am: 'Армения',
                          ge: 'Грузия',
                          md: 'Молдова',
                          ee: 'Эстония',
                          lv: 'Латвия',
                          lt: 'Литва'
                        }}
                        placeholder="Введите номер телефона"
                        enableSearch
                        disableSearchIcon={false}
                        autoFormat
                        disableCountryCode={false}
                        disableDropdown={false}
                        countryCodeEditable={false}
                      />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Адрес
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={formData.address}
                      onChange={e => {
                        setFormData({ ...formData, address: e.target.value });
                        setShowAddressSuggestions(true);
                        fetchAddressSuggestions(e.target.value);
                      }}
                      onFocus={() => {
                        if (formData.address.length > 1) {
                          setShowAddressSuggestions(true);
                          fetchAddressSuggestions(formData.address);
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 200)}
                      ref={addressInputRef}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Введите адрес доставки"
                      autoComplete="off"
                    />
                    {showAddressSuggestions && addressSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-20 bg-white border border-gray-200 rounded-b-lg shadow-lg max-h-56 overflow-y-auto animate-fade-in">
                        {addressSuggestions.map((s: any, idx: number) => (
                          <div
                            key={s.value + idx}
                            className="px-4 py-2 cursor-pointer hover:bg-green-50 text-sm text-gray-800"
                            onMouseDown={() => {
                              setFormData({
                                ...formData,
                                address: s.value,
                                city: s.data.city || s.data.settlement_with_type || s.data.settlement || '',
                                state: s.data.region_with_type || '',
                                zipCode: s.data.postal_code || ''
                              });
                              setShowAddressSuggestions(false);
                            }}
                          >
                            {s.value}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 }}
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
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Введите пароль"
                      autoComplete="new-password"
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
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.0 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Подтвердите пароль
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Подтвердите пароль"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </motion.div>

                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
                </motion.button>
              </form>

              {/* Блок соцсетей и Telegram Login Widget удалён */}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3 }}
                className="mt-8 text-center"
              >
                <span className="text-gray-600">Уже есть аккаунт? </span>
                <Link href="/auth/login" className="text-green-600 hover:text-green-800 font-medium">
                  Войти
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