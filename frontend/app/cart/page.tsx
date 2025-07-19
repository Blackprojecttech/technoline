'use client';
// Тестовый комментарий для проверки changelog watcher - финальная версия

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { removeItem, updateQuantity, clearCart } from '../../store/slices/cartSlice';
import { Trash2, ShoppingCart, ArrowLeft, Plus, Minus, Calendar, Clock, Info, Home, MapPin, CheckCircle, Phone as PhoneIcon, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import Image from 'next/image';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useDeliveryMethods } from '../../hooks/useDeliveryMethods';
import { usePaymentMethods } from '../../hooks/usePaymentMethods';
import { getDeliveryZoneByAddress } from '../../utils/addressValidation';
import debounce from 'lodash.debounce';
import { motion, AnimatePresence } from 'framer-motion';
import PaymentMethodSelector from '../../components/PaymentMethodSelector';
import { updateUser } from '../../store/slices/authSlice';
import ReactInputMask from 'react-input-mask';

interface CartItem {
  _id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  sku: string;
}

interface DeliveryMethod {
  _id: string;
  name: string;
  description: string;
  type: 'pickup' | 'courier' | 'cdek' | 'urgent';
  price: number;
  isActive: boolean;
  order: number;
  conditions?: string;
  workingHours?: string;
  address?: string;
  restrictions?: string;
  costType?: 'fixed' | 'percentage' | 'zone';
  fixedCost?: number;
  costPercentage?: number;
  orderTimeFrom?: string;
  orderTimeTo?: string;
  deliveryTodayTimeFrom?: string;
  deliveryTodayTimeTo?: string;
  deliveryTomorrowTimeFrom?: string;
  deliveryTomorrowTimeTo?: string;
  orderTimeForToday?: string;
  orderTimeForTomorrow?: string;
  // Новые поля для гибких временных интервалов
  useFlexibleIntervals?: boolean;
  earlyOrderIntervals?: string[];
  lateOrderIntervals?: string[];
  orderTransitionTime?: string;
  // Поля для пользовательских интервалов
  customInterval1?: string;
  customInterval2?: string;
  // Поля для проверки адреса
  requireAddressValidation?: boolean;
  addressValidationType?: 'moscow_mkad' | 'moscow_region' | 'region';
  available?: boolean;
  unavailableReason?: string;
  zonePrices?: Record<string, number>; // Добавляем поле для хранения цен по зонам
  // Поле для разрешения доставки в выходные дни
  allowWeekendDelivery?: boolean;
}

// --- Вспомогательная функция для вычисления расстояния между двумя точками ---
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Радиус Земли в км
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// --- ДОБАВИТЬ В НАЧАЛО ФАЙЛА ---
declare global {
  interface Window {
    __cdekDebug?: any;
  }
}

// --- Красивая анимированная модалка сохранения адреса ---
const SaveAddressModal = ({ open, onClose, onSave }: { open: boolean, onClose: () => void, onSave: () => void }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative overflow-hidden"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {/* Градиентный фон */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-accent-50 to-primary-100 opacity-60 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-accent-400 rounded-full flex items-center justify-center mb-4 shadow-lg animate-bounce">
              <Home className="text-white" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-secondary-800 mb-2 text-center">Сохранить адрес?</h2>
            <p className="text-secondary-600 mb-6 text-center">Хотите сохранить адрес доставки в профиль для быстрого заполнения в будущем?</p>
            <div className="flex gap-4 w-full justify-center">
              <button
                onClick={onSave}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold shadow-md hover:from-primary-600 hover:to-accent-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
              >
                Сохранить
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-lg bg-gray-200 text-secondary-700 font-semibold shadow hover:bg-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
              >
                Не сейчас
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// --- Красивая анимированная модалка успешного заказа ---
const SuccessOrderModal = ({ open, orderId, onGoToOrder, onGoHome }: { open: boolean, orderId: string, onGoToOrder: () => void, onGoHome: () => void }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative overflow-hidden"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-success-100 via-primary-50 to-accent-100 opacity-60 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-gradient-to-br from-success-500 to-primary-500 rounded-full flex items-center justify-center mb-4 shadow-lg animate-bounce">
              <CheckCircle className="text-white" size={36} />
            </div>
            <h2 className="text-2xl font-bold text-secondary-800 mb-2 text-center">Заказ успешно оформлен!</h2>
            <p className="text-secondary-600 mb-6 text-center">Спасибо за ваш заказ. Мы уже начали его обработку!</p>
            <div className="flex gap-4 w-full justify-center">
              <button
                onClick={onGoToOrder}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold shadow-md hover:from-primary-600 hover:to-accent-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
              >
                Перейти к заказу
              </button>
              <button
                onClick={onGoHome}
                className="px-6 py-3 rounded-lg bg-gray-200 text-secondary-700 font-semibold shadow hover:bg-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
              >
                На главную
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const CartPage: React.FC = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, isAuthenticated, refreshOrders } = useAuth();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const [isCheckoutModalVisible, setIsCheckoutModalVisible] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState<string>('');
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState<string>('');
  const [selectedDeliveryTime, setSelectedDeliveryTime] = useState<string>('');
  // 1. Стейт для зоны
  const [zoneResult, setZoneResult] = useState<string | null>(null);
  const [zoneKey, setZoneKey] = useState<string | null>(null);
  const [zoneLoading, setZoneLoading] = useState(false);
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    paymentMethod: string;
    notes: string;
    lat: number | null;
    lng: number | null;
    pvzCdek?: any | null;
    cdekPvzAddress?: string;
    callRequest?: boolean;
  }>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Россия',
    paymentMethod: '',
    notes: '',
    lat: null,
    lng: null,
    pvzCdek: null,
    cdekPvzAddress: '',
    callRequest: false,
  });
  // --- Стейт для подсказок ---
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [zoneDeliveryCost, setZoneDeliveryCost] = useState<number|null>(null);
  const [zoneCostStatus, setZoneCostStatus] = useState<'unknown'|'loading'|'found'|'not_found'>('unknown');
  const [showInfoModal, setShowInfoModal] = useState(false);
  // Для дебага: сохраняем последний ответ от API
  const [deliveryDebug, setDeliveryDebug] = useState<any>(null);
  const [showZoneToast, setShowZoneToast] = useState<{message: string, key: number} | null>(null);
  const prevZoneRef = useRef<string | null>(null);
  const [showDeliveryMethodSelector, setShowDeliveryMethodSelector] = useState(true);
  const [isOrderProcessing, setIsOrderProcessing] = useState(false);
  const [cdekDeliveryDate, setCdekDeliveryDate] = useState<string | null>(null);
  const [showSaveAddressModal, setShowSaveAddressModal] = useState(false);
  const saveAddressPromiseRef = useRef<{ resolve: (v: boolean) => void } | null>(null);
  const [showSuccessOrderModal, setShowSuccessOrderModal] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [callRequest, setCallRequest] = useState<string | null>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [showCallRequestModal, setShowCallRequestModal] = useState(false);
  const [callRequestError, setCallRequestError] = useState(false);
  // 1. Добавляю состояние для toast ошибки:
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showCheckoutError, setShowCheckoutError] = useState(false);
  let errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { deliveryMethods, loading: deliveryLoading } = useDeliveryMethods();
  const { paymentMethods, loading: paymentLoading, error: paymentError } = usePaymentMethods(selectedDeliveryMethod);

  const selectedMethod = deliveryMethods.find(m => m._id === selectedDeliveryMethod);

  // Фильтрация способов доставки по зоне
  const filteredDeliveryMethods = useMemo(() => {
    return deliveryMethods.filter((method: any) => {
      if (!zoneResult) return true;
      if (zoneResult === 'mkad') return method.addressValidationType === 'moscow_mkad';
      if (zoneResult === 'ckad') return method.addressValidationType === 'moscow_region';
      if (zoneResult === 'region') return String(method.addressValidationType) === 'region';
      return true;
    });
  }, [deliveryMethods, zoneResult]);

  // Получаем московское время
  const getMoscowDate = () => {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
  };

  // Функция для проверки, можно ли выбрать сегодняшнюю дату
  const canSelectToday = (method: DeliveryMethod) => {
    const mskNow = getMoscowDate();
    const hour = mskNow.getHours();
    // Для самовывоза — всегда можно
    if (method.type === 'pickup') return true;
    // Для доставки — только до 11:00
    return hour < 11;
  };

  // Фильтрация доступных дат
  const availableDates = (method: DeliveryMethod) => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0];
    const afterTomorrow = new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0];
    const dates = [today, tomorrow, afterTomorrow];
    if (method.type === 'pickup') {
      // Для самовывоза всегда доступны все даты
      return dates;
    }
    // Для курьера — только до 11:00 можно выбрать сегодня
    if (!canSelectToday(method)) {
      return dates.slice(1);
    }
    return dates;
  };

  // Функция для проверки доступности доставки на конкретную дату
  const isDeliveryAvailable = (method: DeliveryMethod, date: string): boolean => {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Для СДЭК - поддерживаем все даты
    if (method.type === 'cdek') {
      // Если используется гибкая система интервалов
      if (method.useFlexibleIntervals && method.orderTransitionTime) {
        const isEarlyOrder = currentTime <= method.orderTransitionTime;
        
        if (date === 'today') {
          return isEarlyOrder;
        } else if (date === 'tomorrow') {
          return !isEarlyOrder;
        } else if (date === 'day3') {
          return !isEarlyOrder && method.isActive;
        } else if (['day4', 'day5', 'day6', 'day7'].includes(date)) {
          // Для остальных дней - просто проверяем, что метод активен
          return method.isActive;
        }
      } else {
        // Старая логика
        if (date === 'today') {
          // Если заказ делается до 18:50, то доступна доставка сегодня
          return currentTime <= '18:50';
        } else if (date === 'tomorrow') {
          // Завтра доступна всегда
          return true;
        } else if (date === 'day3') {
          // Для третьего дня - просто проверяем, что метод активен
          return method.isActive;
        } else if (['day4', 'day5', 'day6', 'day7'].includes(date)) {
          // Для остальных дней - просто проверяем, что метод активен
          return method.isActive;
        }
      }
    } else {
      // Для всех остальных методов - только сегодня, завтра, послезавтра
      if (method.useFlexibleIntervals && method.orderTransitionTime) {
        const isEarlyOrder = currentTime <= method.orderTransitionTime;
        
        if (date === 'today') {
          return isEarlyOrder;
        } else if (date === 'tomorrow') {
          return !isEarlyOrder;
        } else if (date === 'day3') {
          return !isEarlyOrder && method.isActive;
        } else if (date === 'day4') {
          // Для day4 (вторник) - только если метод активен (для субботних заказов)
          return method.isActive;
        }
      } else {
        // Старая логика
        if (date === 'today') {
          // Если заказ делается до 18:50, то доступна доставка сегодня
          return currentTime <= '18:50';
        } else if (date === 'tomorrow') {
          // Завтра доступна всегда
          return true;
        } else if (date === 'day3') {
          // Для третьего дня - просто проверяем, что метод активен
          return method.isActive;
        } else if (date === 'day4') {
          // Для day4 (вторник) - только если метод активен (для субботних заказов)
          return method.isActive;
        }
      }
    }
    
    return false;
  };

  // Функция для получения доступных дат доставки
  const getAvailableDeliveryDates = (method: DeliveryMethod): string[] => {
    const availableDates: string[] = [];
    
    // Проверяем ограничения по выходным дням для всех типов доставки
    const isWeekendRestricted = !method.allowWeekendDelivery;
    
    // Получаем текущий день недели
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 = воскресенье, 6 = суббота
    
    // Для СДЭК - проверяем все даты до 7 дней вперед
    if (method.type === 'cdek') {
      const dateOptions = ['today', 'tomorrow', 'day3', 'day4', 'day5', 'day6', 'day7'];
      
      dateOptions.forEach((dateOption, index) => {
        if (isDeliveryAvailable(method, dateOption)) {
          // Вычисляем дату для проверки выходных
          const checkDate = new Date();
          checkDate.setDate(checkDate.getDate() + index);
          const dayOfWeek = checkDate.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          
          if (!isWeekendRestricted || !isWeekend) {
            availableDates.push(dateOption);
          }
        }
      });
    } else {
      // Для всех остальных способов доставки - только сегодня, завтра, послезавтра
      const dateOptions = ['today', 'tomorrow', 'day3'];
      
      dateOptions.forEach((dateOption, index) => {
        if (isDeliveryAvailable(method, dateOption)) {
          // Вычисляем дату для проверки выходных
          const checkDate = new Date();
          checkDate.setDate(checkDate.getDate() + index);
          const dayOfWeek = checkDate.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          
          if (!isWeekendRestricted || !isWeekend) {
            availableDates.push(dateOption);
          }
        }
      });
      
      // Для субботних заказов добавляем вторник (day4) если нужно
      if (currentDayOfWeek === 6 && isWeekendRestricted) {
        // Проверяем, что вторник не выходной
        const tuesday = new Date();
        tuesday.setDate(tuesday.getDate() + 4); // вторник (суббота + 4 дня)
        const tuesdayDayOfWeek = tuesday.getDay();
        const isTuesdayWeekend = tuesdayDayOfWeek === 0 || tuesdayDayOfWeek === 6;
        
        if (!isTuesdayWeekend && method.isActive) {
          availableDates.push('day4');
        }
      }
    }
    
    // Специальная логика для заказов в выходные дни (только для не-СДЭК)
    if (isWeekendRestricted && method.type !== 'cdek') {
      // Если заказ в пятницу (5) - убираем day3 (понедельник), оставляем только tomorrow (вторник)
      if (currentDayOfWeek === 5) { // Пятница
        const filteredDates = availableDates.filter(date => date !== 'day3');
        return filteredDates;
      }
      
      // Если заказ в субботу (6) - убираем today и tomorrow (суббота и воскресенье), добавляем day3 (понедельник) и day4 (вторник)
      if (currentDayOfWeek === 6) { // Суббота
        let filteredDates = availableDates.filter(date => date !== 'today' && date !== 'tomorrow');
        // Добавляем понедельник (day3) и вторник (day4), если их нет
        if (!filteredDates.includes('day3')) {
          filteredDates.push('day3');
        }
        if (!filteredDates.includes('day4')) {
          filteredDates.push('day4');
        }
        return filteredDates;
      }
      
      // Если заказ в воскресенье (0) - убираем today (воскресенье), оставляем tomorrow и day3 (понедельник и вторник)
      if (currentDayOfWeek === 0) { // Воскресенье
        const filteredDates = availableDates.filter(date => date !== 'today');
        return filteredDates;
      }
    }
    
    return availableDates;
  };

  // Функция для получения названия даты
  const getDateLabel = (date: string): string => {
    const today = new Date();
    
    // Вычисляем дату на основе ключа
    const getDateByKey = (key: string): Date => {
      const dateMap: { [key: string]: number } = {
        'today': 0,
        'tomorrow': 1,
        'day3': 2,
        'day4': 3,
        'day5': 4,
        'day6': 5,
        'day7': 6
      };
      
      const daysToAdd = dateMap[key] || 0;
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + daysToAdd);
      return targetDate;
    };
    
    const targetDate = getDateByKey(date);
    
    // Определяем название дня
    const getDayName = (date: Date): string => {
      const dayOfWeek = date.getDay();
      const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
      return dayNames[dayOfWeek];
    };
    
    // Форматируем дату
    const formattedDate = targetDate.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'long' 
    });
    
    // Определяем префикс
    let prefix = '';
    switch (date) {
      case 'today':
        prefix = 'Сегодня';
        break;
      case 'tomorrow':
        prefix = 'Завтра';
        break;
      case 'day3':
        prefix = 'Послезавтра';
        break;
      default:
        // Для остальных дат показываем день недели и дату
        prefix = getDayName(targetDate);
        break;
    }
    
    return `${prefix} (${formattedDate})`;
  };



  // Генерация интервалов для самовывоза и доставки
  const generateTimeIntervals = (method: DeliveryMethod, date: string): string[] => {
    const intervals: string[] = [];
    const mskNow = getMoscowDate();
    const currentHour = mskNow.getHours();
    const currentMinute = mskNow.getMinutes();

    // 1. Кастомные интервалы из админки (только если они заданы и не пусты)
    if (method.customInterval1 && method.customInterval1.trim() !== '') {
      intervals.push(method.customInterval1);
    }
    if (method.customInterval2 && method.customInterval2.trim() !== '') {
      intervals.push(method.customInterval2);
    }
    
    // Если есть кастомные интервалы, возвращаем только их
    if (intervals.length > 0) {
      return intervals;
    }

    // 2. Гибкие интервалы (ранние/поздние) - только если они заданы
    if (method.useFlexibleIntervals && method.earlyOrderIntervals && method.earlyOrderIntervals.length > 0) {
      // orderTransitionTime — время перехода между "ранними" и "поздними" интервалами (например, 11:00)
      const transition = method.orderTransitionTime || '11:00';
      const [transitionHour, transitionMinute] = transition.split(':').map(Number);
      const isEarly = (currentHour < transitionHour) || (currentHour === transitionHour && currentMinute < transitionMinute);
      if (date === 'today') {
        const flexibleIntervals = isEarly ? (method.earlyOrderIntervals || []) : (method.lateOrderIntervals || []);
        if (flexibleIntervals.length > 0) {
          return flexibleIntervals;
        }
      } else {
        // Для других дат — всегда ранние интервалы, если заданы
        const flexibleIntervals = method.earlyOrderIntervals || [];
        if (flexibleIntervals.length > 0) {
          return flexibleIntervals;
        }
      }
    }

    // 3. Стандартные интервалы (только если нет кастомных и гибких)
    return generateStandardIntervals(date, currentHour, currentMinute);
  };

  // Функция для генерации стандартных интервалов
  const generateStandardIntervals = (date: string, currentHour: number, currentMinute: number): string[] => {
    const intervals: string[] = [];
    
    // 3. Самовывоз на сегодня — любые интервалы, если конец интервала позже текущего времени
    if (selectedDeliveryMethod) {
      const method = deliveryMethods.find(m => m._id === selectedDeliveryMethod);
      if (method && method.type === 'pickup' && date === 'today') {
        // Интервалы с 10:00 до 18:00 по 2 часа, последний — 18:00-19:00
        for (let hour = 10; hour < 18; hour += 2) {
          const intervalEnd = hour + 2;
          // Если конец интервала позже текущего времени — показываем
          if (intervalEnd > currentHour || (intervalEnd === currentHour && currentMinute === 0)) {
            intervals.push(`${hour.toString().padStart(2, '0')}:00 - ${intervalEnd.toString().padStart(2, '0')}:00`);
          }
        }
        // Последний короткий интервал 18:00-19:00
        if (19 > currentHour + (currentMinute > 0 ? 1 : 0)) {
          intervals.push('18:00 - 19:00');
        }
        return intervals;
      }
    }
    
    // 4. Доставка на сегодня — только будущие интервалы
    if (date === 'today') {
      const minStart = currentHour + (currentMinute > 0 ? 1 : 0);
      let intervalAdded = false;
      for (let hour = 10; hour < 18; hour += 2) {
        if (hour + 2 > minStart) {
          intervals.push(`${hour}:00 - ${hour + 2}:00`);
          intervalAdded = true;
        }
      }
      if (19 > minStart) {
        intervals.push('18:00 - 19:00');
        intervalAdded = true;
      }
      if (!intervalAdded && (currentHour < 19 && (60 - currentMinute) + (18 - currentHour) * 60 >= 30)) {
        const from = `${currentHour}:${currentMinute.toString().padStart(2, '0')}`;
        intervals.push(`${from} - 19:00`);
      }
      return intervals;
    }
    
    // 5. Для других дат — все интервалы
    for (let hour = 10; hour < 18; hour += 2) {
      intervals.push(`${hour}:00 - ${hour + 2}:00`);
    }
    intervals.push('18:00 - 19:00');
    return intervals;
  };

  // Устанавливаем флаг клиента
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Сброс выбранной даты при смене метода доставки
  useEffect(() => {
    setSelectedDeliveryDate('');
    setSelectedDeliveryTime('');
  }, [selectedDeliveryMethod]);

  // Собираем полный адрес для определения зоны и передачи в DebugZoneInfo
  const fullAddress = [formData.address, formData.city, formData.state, formData.zipCode, formData.country].filter(Boolean).join(', ');

  // --- ВАЖНО: Логика определения зоны и фильтрации способов доставки ---
  // 1. Сначала определяем зону (zone) по координатам через /api/delivery/calculate
  // 2. Фильтруем способы доставки только по zone (mkad, ckad, region)
  // 3. zoneKey используем только для поиска цены, если выбран способ с useZones
  // 4. Не определяем зону по zoneKey или addressType!

  // useEffect для запроса зоны и zoneKey
  useEffect(() => {
    // Отключаем расчет зоны для СДЭК
    const selectedMethod = deliveryMethods.find(m => m._id === selectedDeliveryMethod);
    if (selectedMethod && selectedMethod.type === 'cdek') return;
    if (!formData.address || !formData.lat || !formData.lng) return;
    const fetchZone = async () => {
      try {
        const res = await fetch('/api/delivery/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: formData.address,
            lat: formData.lat,
            lng: formData.lng,
          }),
        });
        const data = await res.json();
        setZoneResult(data.zone || null); // zone: mkad, ckad, region
        setZoneKey(data.zoneKey || null); // zoneKey: ключ зоны для useZones
      } catch (e) {
        setZoneResult(null);
        setZoneKey(null);
      }
    };
    fetchZone();
  }, [formData.address, formData.lat, formData.lng, selectedDeliveryMethod, deliveryMethods]);

  const calculateSubtotal = () => {
    return cartItems.reduce((sum: number, item: CartItem) => sum + (item.price * item.quantity), 0);
  };

  const calculateShipping = () => {
    if (!selectedDeliveryMethod || !Array.isArray(deliveryMethods)) return null;
    const method = deliveryMethods.find(m => m._id === selectedDeliveryMethod);
    if (!method) return null;

    // 1. По зонам
    if (method.costType === 'zone') {
      const key = zoneKey || zoneResult;
      if (method.zonePrices && key && method.zonePrices[key] !== undefined) {
        return method.zonePrices[key];
      }
      return null; // Цена не определена
    }
    // 2. Фиксированная стоимость
    if (method.costType === 'fixed' && method.fixedCost !== undefined) {
      return method.fixedCost;
    }
    // 3. Процент от суммы заказа
    if (method.costType === 'percentage' && method.costPercentage) {
      const subtotal = calculateSubtotal();
      return Math.round(subtotal * (method.costPercentage / 100));
    }
    // 4. Fallback: price
    return method.price && method.price > 0 ? method.price : 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const shipping = calculateShipping();
    return subtotal + (shipping || 0);
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      dispatch(removeItem(itemId));
    } else {
      dispatch(updateQuantity({ id: itemId, quantity }));
    }
  };

  const handleRemoveItem = (itemId: string) => {
    dispatch(removeItem(itemId));
    alert('Товар удален из корзины');
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (name === 'phone') {
      const cleaned = value.replace(/[^\d+()\-\s]/g, '');
      setFormData(prev => ({ ...prev, phone: cleaned }));
      return;
    }
    if (name === 'callRequest') {
      // Универсально для всех типов event
      const checked = 'checked' in e.target ? (e.target as HTMLInputElement).checked : false;
      setCallRequest(checked ? 'yes' : 'no');
      return;
    }
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' && 'checked' in e.target ? (e.target as HTMLInputElement).checked : value }));
  };



  // Автоматически заполняем форму данными пользователя при открытии модального окна
  useEffect(() => {
    if (isCheckoutModalVisible && user && isAuthenticated) {
      setFormData(prev => {
        let phone = user.phone || prev.phone;
        // Если телефон не соответствует маске, но похож на российский номер, форматируем
        if (phone && !/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/.test(phone)) {
          const digits = phone.replace(/\D/g, '');
          if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) {
            phone = `+7 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7,9)}-${digits.slice(9,11)}`;
          }
        }
        return {
          ...prev,
          email: user.email || prev.email,
          firstName: user.firstName || prev.firstName,
          lastName: user.lastName || prev.lastName,
          phone
        };
      });
    }
  }, [isCheckoutModalVisible, user, isAuthenticated]);

  // --- Функция для показа модалки и возврата результата ---
  const askSaveAddress = () => {
    setShowSaveAddressModal(true);
    return new Promise<boolean>((resolve) => {
      saveAddressPromiseRef.current = { resolve };
    });
  };

  const handleSaveAddressModalClose = () => {
    setShowSaveAddressModal(false);
    saveAddressPromiseRef.current?.resolve(false);
  };
  const handleSaveAddressModalSave = () => {
    setShowSaveAddressModal(false);
    saveAddressPromiseRef.current?.resolve(true);
  };

  // 3. Функция для показа toast:
  const showErrorToast = (msg: string) => {
    setCheckoutError(msg);
    setShowCheckoutError(true);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => setShowCheckoutError(false), 3000);
  };

  // 2. Модифицирую handleCheckout:
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    // Проверки
    if (!isPhoneValid) {
      showErrorToast('Пожалуйста, введите корректный номер телефона');
      return;
    }
    if (!formData.paymentMethod) {
      showErrorToast('Пожалуйста, выберите способ оплаты');
      return;
    }
    if (selectedMethod && selectedMethod.type === 'cdek' && !formData.pvzCdek) {
      showErrorToast('Пожалуйста, выберите пункт выдачи СДЭК');
      return;
    }
    if (calculateShipping() === null) {
      showErrorToast('Не удалось рассчитать стоимость доставки');
      return;
    }
    if (!callRequest) {
      setShowCallRequestModal(true);
      setCallRequestError(true);
      // Прокручиваем к полю выбора звонка
      setTimeout(() => {
        const callRequestElement = document.getElementById('callRequestContainer');
        if (callRequestElement) {
          callRequestElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 100);
      // Автоматически закрываем модальное окно через 3 секунды
      setTimeout(() => setShowCallRequestModal(false), 3000);
      return;
    }
    setIsOrderProcessing(true);
    try {
      if (cartItems.length === 0) {
        alert('Корзина пуста');
        setIsOrderProcessing(false);
        return;
      }
      if (!selectedDeliveryMethod) {
        alert('Выберите способ доставки');
        setIsOrderProcessing(false);
        return;
      }
      const selectedMethod = deliveryMethods.find(m => m._id === selectedDeliveryMethod);
      if (!isAuthenticated || !user) {
        alert('Необходимо войти в систему для оформления заказа');
        setIsOrderProcessing(false);
        return;
      }
      // Валидация: для CDEK не требуем дату и время доставки
      if (selectedMethod && selectedMethod.type !== 'cdek' && !selectedDeliveryDate) {
        alert('Пожалуйста, выберите дату доставки');
        setIsOrderProcessing(false);
        return;
      }
      if (selectedMethod && selectedMethod.type !== 'cdek' && !selectedDeliveryTime) {
        alert('Выберите время доставки');
        setIsOrderProcessing(false);
        return;
      }

      if (!formData.paymentMethod) {
        alert('Выберите способ оплаты');
        return;
      }

      // Проверяем зону только для способов доставки, требующих адрес
      if (selectedMethod && (selectedMethod.type === 'courier' || selectedMethod.type === 'cdek' || selectedMethod.type === 'urgent')) {
        if (zoneResult === null || zoneResult === 'unknown') {
          alert('Пожалуйста, введите корректный адрес для определения зоны доставки.');
          setIsOrderProcessing(false);
          return;
        }
      }

      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Ошибка авторизации. Пожалуйста, войдите в систему снова');
        router.push('/auth/login');
        return;
      }

      if (selectedMethod && selectedMethod.type === 'cdek' && !formData.pvzCdek) {
        alert('Пожалуйста, выберите пункт выдачи СДЭК!');
        setIsOrderProcessing(false);
        return;
      }

      // Находим выбранный способ оплаты для получения systemCode
      const selectedPaymentMethod = paymentMethods.find(pm => pm._id === formData.paymentMethod);
      console.log('🔍 Доступные способы оплаты:', paymentMethods);
      console.log('🔍 Выбранный способ оплаты:', selectedPaymentMethod);
      if (selectedPaymentMethod) {
        console.log('🔍 systemCode выбранного способа:', selectedPaymentMethod.systemCode);
      } else {
        console.log('❌ Не найден выбранный способ оплаты по _id:', formData.paymentMethod);
      }
      
      if (!selectedPaymentMethod) {
        alert('Выбранный способ оплаты не найден');
        return;
      }

      // Поддерживаем все возможные systemCode, которые могут прийти с бэка
      const validPaymentMethods = [
        'card', 'cash', 'bank_transfer', 'credit', 'credit_purchase', 'crypto', 'cash_on_delivery',
        'bank_card', 'usdt', 'sberbank_transfer', 'usdt_payment' // добавлен USDT для поддержки оформления заказа
      ];
      // Приводим к нужному значению для отправки в заказ
      let paymentSystemCode = selectedPaymentMethod.systemCode;
      if (paymentSystemCode === 'bank_card') paymentSystemCode = 'card';
      if (paymentSystemCode === 'sberbank_transfer') paymentSystemCode = 'bank_transfer';
      if (paymentSystemCode === 'credit_purchase') paymentSystemCode = 'credit';
      // usdt теперь не маппим на crypto, отправляем как есть
      
      if (!validPaymentMethods.includes(selectedPaymentMethod.systemCode)) {
        console.error('❌ Неподдерживаемый способ оплаты:', selectedPaymentMethod.systemCode);
        alert('Неподдерживаемый способ оплаты');
        return;
      }

      // Формируем orderData с учётом типа доставки
      let orderData: any = {
        items: cartItems.map((item: CartItem) => ({
          productId: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          sku: item.sku
        })),
        subtotal: calculateSubtotal(),
        shipping: calculateShipping(),
        total: calculateTotal(),
        deliveryMethod: selectedDeliveryMethod,
        paymentMethod: paymentSystemCode === 'cash_on_delivery' ? 'cash' : paymentSystemCode as 'card' | 'cash' | 'bank_transfer' | 'credit' | 'crypto' | 'usdt',
        shippingAddress: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: selectedMethod?.type === 'pickup' ? 'Самовывоз' : formData.address,
          city: selectedMethod?.type === 'pickup' ? 'Самовывоз' : formData.city,
          state: selectedMethod?.type === 'pickup' ? 'Самовывоз' : formData.state,
          zipCode: selectedMethod?.type === 'pickup' ? 'Самовывоз' : formData.zipCode,
          country: selectedMethod?.type === 'pickup' ? 'Россия' : formData.country,
          pvzCdek: formData.pvzCdek || undefined,
          cdekPvzAddress: formData.cdekPvzAddress || undefined,
        },
        notes: formData.notes,
        cdekPVZ: selectedCdekPVZ || formData.pvzCdek || null, // сохраняем выбранный ПВЗ
        callRequest: callRequest === 'yes',
      };
      // Только для НЕ-СДЭК добавляем дату и время
      if (selectedMethod && selectedMethod.type !== 'cdek') {
        orderData.deliveryDate = selectedDeliveryDate;
        // Сохраняем только полный интервал
        orderData.deliveryInterval = selectedDeliveryTime || undefined;
      }
      
      // Для СДЭК добавляем ожидаемую дату доставки и адрес ПВЗ
      if (selectedMethod && selectedMethod.type === 'cdek') {
        orderData.cdekDeliveryDate = cdekDeliveryDate;
        orderData.cdekPvzAddress = selectedCdekPVZ?.address_full || selectedCdekPVZ?.address || formData.cdekPvzAddress;
        // Также передаем дату в поле estimatedDelivery для совместимости с админкой
        if (cdekDeliveryDate) {
          orderData.estimatedDelivery = cdekDeliveryDate;
        }
      }

      console.log('📦 Отправляем данные заказа:', orderData);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        const order = await response.json();
        // --- Красивая модалка вместо confirm ---
        if (isAuthenticated && user) {
          const shouldSaveAddress = await askSaveAddress();
          if (shouldSaveAddress) {
            try {
              const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/auth/profile`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  firstName: formData.firstName,
                  lastName: formData.lastName,
                  phone: formData.phone,
                  address: formData.address
                })
              });
              if (updateResponse.ok) {
                console.log('Адрес доставки сохранен в профиль');
                dispatch(updateUser({
                  firstName: formData.firstName,
                  lastName: formData.lastName,
                  phone: formData.phone,
                  address: formData.address
                }));
              }
            } catch (error) {
              console.error('Ошибка при сохранении адреса в профиль:', error);
            }
          }
        }
        // --- Показываем красивую модалку ---
        console.log('order after response:', order);
        setLastOrderId(order._id);
        console.log('setLastOrderId:', order._id);
        setShowSuccessOrderModal(true);
        console.log('setShowSuccessOrderModal: true');
        dispatch(clearCart());
        setIsCheckoutModalVisible(false);
        // router.push(`/orders/${order._id}`); // редирект теперь через модалку
        await refreshOrders(); // обновляем историю заказов
      } else {
        const error = await response.json();
        console.error('❌ Ошибка создания заказа:', error);
        alert(error.message || 'Ошибка при оформлении заказа');
      }
    } catch (error) {
      alert('Ошибка сети');
    } finally {
      setIsOrderProcessing(false);
    }
  };

  // --- Функция для получения подсказок Dadata ---
  const fetchAddressSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setAddressSuggestions([]);
      return;
    }
    try {
      // Гарантируем правильную кодировку query
      const encodedQuery = encodeURIComponent(query);
      const res = await fetch(`/api/addresses/search?q=${encodedQuery}`);
      const data = await res.json();
      // Логируем для отладки
      console.log('Dadata suggestions:', data);
      return data.suggestions || [];
    } catch (e) {
      setAddressSuggestions([]);
      console.error('Ошибка получения подсказок Dadata:', e);
      return [];
    }
  };

  // --- Новый handleAddressInput ---
  const handleAddressInput = async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, address: value }));
    
    // Если адрес полностью очищен, очищаем все поля адреса и сбрасываем ПВЗ
    if (value.length === 0) {
      setFormData(prev => ({
        ...prev,
        address: '',
        city: '',
        state: '',
        zipCode: '',
        lat: null,
        lng: null
      }));
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    if (value.length >= 3) {
      setAddressLoading(true);
      try {
        const suggestions = await fetchAddressSuggestions(value);
        setAddressSuggestions(suggestions || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
        setAddressSuggestions([]);
      } finally {
        setAddressLoading(false);
      }
    } else {
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }

    // Если выбран способ доставки СДЭК — запускаем поиск ПВЗ
    const selectedMethod = deliveryMethods.find(m => m._id === selectedDeliveryMethod);
    if (selectedMethod && selectedMethod.type === 'cdek' && value.length >= 5) {
      // Небольшая задержка для избежания частых запросов
      setTimeout(() => {
        // triggerCdekSearch();
        // setCdekSelectedDate(...);
        // setCdekSelectedInterval(...);
        // setCdekSelectedPVZ(...);
        // setCdekTriggerSearch(...);
      }, 1000);
    }
  };

  // --- Новый handleSuggestionClick ---
  const handleSuggestionClick = (suggestion: any) => {
    setFormData(prev => ({
      ...prev,
      address: suggestion.value || '',
      city: suggestion.data?.city || '',
      state: suggestion.data?.region_with_type || '',
      zipCode: suggestion.data?.postal_code || '',
      country: suggestion.data?.country || 'Россия',
      lat: suggestion.data?.geo_lat ? parseFloat(suggestion.data.geo_lat) : null,
      lng: suggestion.data?.geo_lon ? parseFloat(suggestion.data.geo_lon) : null,
    }));
    setShowSuggestions(false);
    setTimeout(() => {
      const fullAddressParts = [suggestion.data?.country, suggestion.data?.region_with_type, suggestion.data?.city, suggestion.value, suggestion.data?.postal_code];
      const fullAddress = fullAddressParts.filter(Boolean).join(', ');
      if (fullAddress.length > 10 && fullAddress.includes(',') && suggestion.data?.city && suggestion.data?.region_with_type && suggestion.data?.country) {
        fetchCdekPVZ();
      }
    }, 0);
  };

  // Обработчики для СДЭК виджета
  const handleCdekCitySelect = (city: any) => {
    // Обновляем адрес в форме при выборе города в СДЭК
    const newAddressData = {
      address: city.city,
      city: city.city,
      state: city.region,
      zipCode: formData.zipCode,
      country: formData.country,
      lat: formData.lat,
      lng: formData.lng
    };
    
    setFormData(prev => ({
      ...prev,
      ...newAddressData
    }));
  };

  const handleCdekDebugInfo = (info: { pvzCount: number; pvzList: any[]; reason: string | null }) => {
    console.log('CDEK Debug Info:', info);
  };

  // --- useEffect: если адрес есть, но координаты не заданы — берём их из первой подсказки ---
  useEffect(() => {
    if (formData.address && (!formData.lat || !formData.lng)) {
      const fetchCoords = async () => {
        try {
          const res = await fetch(`/api/addresses/search?q=${encodeURIComponent(formData.address)}`);
          const data = await res.json();
          if (data && data.suggestions && data.suggestions.length > 0) {
            const s = data.suggestions[0];
            const lat = s.data?.geo_lat ? parseFloat(s.data.geo_lat) : null;
            const lng = s.data?.geo_lon ? parseFloat(s.data.geo_lon) : null;
            if (lat && lng) {
              setFormData(prev => ({
                ...prev,
                lat,
                lng,
              }));
            }
          }
        } catch (e) {}
      };
      fetchCoords();
    }
  }, [formData.address]);

  // --- useEffect: если есть адрес и координаты — вызываем /api/delivery/calculate ---
  useEffect(() => {
    if (!formData.address || !formData.lat || !formData.lng) return;
    const fetchZone = async () => {
      try {
        const res = await fetch('/api/delivery/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: formData.address,
            lat: formData.lat,
            lng: formData.lng,
          }),
        });
        const data = await res.json();
        setZoneResult(data.zone || null);
        setZoneKey(data.zoneKey || null);
      } catch (e) {}
    };
    fetchZone();
  }, [formData.address, formData.lat, formData.lng]);

  // Сброс выбранного метода, если он стал невалидным
  useEffect(() => {
    // Если выбранный способ доставки больше не валиден для текущей зоны — сбрасываем
    if (
      selectedDeliveryMethod &&
      !filteredDeliveryMethods.some(m => m._id === selectedDeliveryMethod)
    ) {
      setSelectedDeliveryMethod('');
      setShowDeliveryMethodSelector(true); // Показываем селектор при сбросе
    }
    // Если остался только один способ — выбираем его автоматически
    if (filteredDeliveryMethods.length === 1 && !selectedDeliveryMethod) {
      setSelectedDeliveryMethod(filteredDeliveryMethods[0]._id);
      setShowDeliveryMethodSelector(false); // Скрываем селектор при авто-выборе
    }
  }, [filteredDeliveryMethods, selectedDeliveryMethod]);

  // useEffect для отслеживания смены зоны и показа всплывающего окна
  useEffect(() => {
    if (!zoneResult || zoneResult === 'unknown') return;
    if (prevZoneRef.current && prevZoneRef.current !== zoneResult) {
      // Проверяем, подходит ли текущий способ доставки
      const selectedMethod = deliveryMethods.find(m => m._id === selectedDeliveryMethod);
      const validMethods = filteredDeliveryMethods;
      if (
        selectedMethod &&
        ((zoneResult === 'mkad' && selectedMethod.addressValidationType !== 'moscow_mkad') ||
         (zoneResult === 'ckad' && selectedMethod.addressValidationType !== 'moscow_region') ||
         (zoneResult === 'region' && String(selectedMethod.addressValidationType) !== 'region'))
      ) {
        if (validMethods.length > 1) {
          setShowZoneToast({ message: 'Измените способ доставки', key: Date.now() });
        } else if (validMethods.length === 1) {
          setShowZoneToast({ message: 'Способ доставки изменён', key: Date.now() });
          setSelectedDeliveryMethod(validMethods[0]._id);
        }
      }
    }
    prevZoneRef.current = zoneResult;
  }, [zoneResult, selectedDeliveryMethod, deliveryMethods, filteredDeliveryMethods]);

  // useEffect для авто-скрытия тоста
  useEffect(() => {
    if (showZoneToast) {
      const t = setTimeout(() => setShowZoneToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [showZoneToast]);

  // --- Исправленный обработчик выбора ПВЗ ---
  const handleCdekPVZSelect = async (pvzData: { address: string; city: string; region: string; postalCode: string; city_code?: string; fias_guid?: string, code?: string, address_full?: string, name?: string }) => {
    setFormData(prev => ({
      ...prev,
      city: pvzData.city || '',
      state: pvzData.region || '',
      zipCode: pvzData.postalCode || '',
      pvzCdek: pvzData,
      cdekPvzAddress: pvzData.address_full || pvzData.address || '',
    }));
    console.log('Выбран ПВЗ:', pvzData);
    console.log('Сохраняем cdekPvzAddress:', pvzData.address_full || pvzData.address || '');
    // --- Автоматический расчет даты доставки через API СДЭК ---
    try {
      const fromAddress = 'Митино'; // Было: 'Москва, Митино'
      const toCity = pvzData.city || '';
      if (toCity.length > 1) {
        const params = new URLSearchParams();
        params.append('address', toCity);
        params.append('from_address', fromAddress);
        params.append('tariff_code', '136');
        if (pvzData.city_code) params.append('city_code', String(pvzData.city_code));
        if (pvzData.fias_guid) params.append('fias_guid', String(pvzData.fias_guid));
        if (pvzData.region) params.append('region', pvzData.region);
        const res = await fetch(`/api/cdek/delivery-dates?${params.toString()}`);
        const data = await res.json();
        if (data && data.periods && data.periods.length > 0) {
          // Берём минимальный срок доставки
          const minPeriod = data.periods[0];
          if (minPeriod && minPeriod.period_min) {
            // Считаем дату доставки от сегодняшнего дня
            const today = new Date();
            today.setDate(today.getDate() + minPeriod.period_min);
            setCdekDeliveryDate(today.toISOString().split('T')[0]);
          }
        } else if (data && data.dates && data.dates.length > 0) {
          setCdekDeliveryDate(data.dates[0]);
        } else {
          setCdekDeliveryDate(null);
        }
      }
    } catch (e) {
      setCdekDeliveryDate(null);
    }
  };

  // --- ДОБАВЛЯЕМ СОСТОЯНИЕ ДЛЯ ДЕБАГА ПВЗ ---
  const [pvzDebug, setPvzDebug] = useState<{address: string, lat?: number, lng?: number, pvzCount: number, reason?: string, pvzList?: any[], debugReason?: string}>({address: '', pvzCount: 0});

  // --- ВЫЗОВ ПВЗ СДЭК ---
  const fetchCdekPVZ = async () => {
    // Собираем полный адрес для передачи на backend
    const fullAddressParts = [formData.country, formData.state, formData.city, formData.address, formData.zipCode];
    const fullAddress = fullAddressParts.filter(Boolean).join(', ');
    setPvzDebug({address: fullAddress, lat: formData.lat ?? undefined, lng: formData.lng ?? undefined, pvzCount: 0});
    const params = new URLSearchParams();
    params.append('address', fullAddress);
    if (formData.city) params.append('city', formData.city);
    if (formData.state) params.append('region', formData.state);
    if (formData.zipCode) params.append('postalCode', formData.zipCode);
    if (formData.country) params.append('country', formData.country);
    if (formData.address) params.append('street', formData.address);
    // Можно добавить дом, если есть отдельное поле
    const res = await fetch(`/api/cdek/pvz-list?${params.toString()}`);
    const data = await res.json();
    setPvzDebug({
      address: fullAddress,
      lat: formData.lat ?? undefined,
      lng: formData.lng ?? undefined,
      pvzCount: Array.isArray(data.pvzList) ? data.pvzList.length : 0,
      reason: data.reason || (Array.isArray(data.pvzList) && data.pvzList.length === 0 ? 'ПВЗ не найдены' : undefined),
      pvzList: Array.isArray(data.pvzList) ? data.pvzList : (Array.isArray(data) ? data : [])
    });
    // ... остальная логика работы с ПВЗ ...
  };

  // --- функция handleAddressBlur ---
  const handleAddressBlur = () => {
    const fullAddressParts = [formData.country, formData.state, formData.city, formData.address, formData.zipCode];
    const fullAddress = fullAddressParts.filter(Boolean).join(', ');
    if (fullAddress.length > 10 && fullAddress.includes(',') && formData.city && formData.state && formData.country) {
      fetchCdekPVZ();
    }
  };

  // --- СДЭК: стейты для поиска и отображения ПВЗ ---
  const [cdekPVZLoading, setCdekPVZLoading] = useState(false);
  const [cdekPVZList, setCdekPVZList] = useState<any[]>([]);
  const [cdekPVZError, setCdekPVZError] = useState<string | null>(null);
  const [selectedCdekPVZ, setSelectedCdekPVZ] = useState<any | null>(null);

  // --- В функции поиска и фильтрации ПВЗ ---
  const searchCdekPVZ = async () => {
    setCdekPVZLoading(true);
    setCdekPVZError(null);
    setCdekPVZList([]);
    try {
      // 1. Поиск ПВЗ по адресу через API СДЭК
      const fullAddress = [formData.country, formData.state, formData.city, formData.address, formData.zipCode].filter(Boolean).join(', ');
      const params = new URLSearchParams();
      params.append('address', fullAddress);
      if (formData.city) params.append('city', formData.city);
      if (formData.state) params.append('region', formData.state);
      if (formData.zipCode) params.append('postalCode', formData.zipCode);
      if (formData.country) params.append('country', formData.country);
      if (formData.address) params.append('street', formData.address);
      const res = await fetch(`/api/cdek/pvz-list?${params.toString()}`);
      const data = await res.json();
      let pvzList = Array.isArray(data.pvzList) ? data.pvzList : (Array.isArray(data) ? data : []);

      // --- DEBUG: сохраняем ответ бэкенда ---
      if (typeof window !== 'undefined') {
        window.__cdekDebug = window.__cdekDebug || {};
        window.__cdekDebug.backendResponse = data;
      }
      let debugBackendResponse = data;

      // --- DEBUG: сохраняем все ПВЗ до фильтрации ---
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let debugAllPVZ = pvzList.map((pvz: any) => ({...pvz}));
      let debugPVZReasons: {code: string, name: string, address: string, distance?: number, reason: string}[] = [];

      // 2. Получаем координаты адреса доставки (точка отсчёта)
      let baseLat = formData.lat;
      let baseLng = formData.lng;
      let addressCoordsSource = 'formData';
      if (!baseLat || !baseLng) {
        try {
          const dadataRes = await fetch(`/api/addresses/search?q=${encodeURIComponent(fullAddress)}`);
          const dadataData = await dadataRes.json();
          if (dadataData && dadataData.suggestions && dadataData.suggestions.length > 0) {
            baseLat = parseFloat(dadataData.suggestions[0].data.geo_lat);
            baseLng = parseFloat(dadataData.suggestions[0].data.geo_lon);
            addressCoordsSource = 'DaData';
          }
        } catch {}
      }
      console.log('[CDEK] Адрес:', fullAddress, '| Координаты:', baseLat, baseLng, '| Источник:', addressCoordsSource);
      if (!baseLat || !baseLng) {
        setCdekPVZError('Не удалось определить координаты адреса доставки.');
        setCdekPVZLoading(false);
        return;
      }

      // 3. Для каждого ПВЗ ищем координаты: сначала в pvz.location, если нет — через DaData, сохраняем в localStorage
      const getPVZCoords = async (pvz: any) => {
        if (pvz.location && pvz.location.latitude && pvz.location.longitude) {
          return { lat: pvz.location.latitude, lng: pvz.location.longitude, source: 'location' };
        }
        // Проверяем localStorage
        const cacheKey = `pvz_coords_${pvz.code}`;
        const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
        if (cached) {
          try {
            const obj = JSON.parse(cached);
            if (obj.lat && obj.lng) {
              return { lat: obj.lat, lng: obj.lng, source: 'localStorage' };
            }
          } catch {}
        }
        // Если нет — ищем через DaData
        try {
          const dadataRes = await fetch(`/api/addresses/search?q=${encodeURIComponent(pvz.address_full || pvz.address)}`);
          const dadataData = await dadataRes.json();
          if (dadataData && dadataData.suggestions && dadataData.suggestions.length > 0) {
            const lat = parseFloat(dadataData.suggestions[0].data.geo_lat);
            const lng = parseFloat(dadataData.suggestions[0].data.geo_lon);
            if (lat && lng) {
              if (typeof window !== 'undefined') localStorage.setItem(cacheKey, JSON.stringify({ lat, lng }));
              return { lat, lng, source: 'DaData' };
            }
          }
        } catch {}
        return null;
      };

      // 4. Считаем расстояние до каждого ПВЗ, фильтруем по радиусу
      const pvzWithCoords = await Promise.all(
        pvzList.map(async (pvz: any) => {
          const coords = await getPVZCoords(pvz);
          if (coords) {
            const dist = getDistanceKm(baseLat, baseLng, coords.lat, coords.lng);
            return { ...pvz, _coords: coords, _distance: dist };
          }
          return { ...pvz, _coords: null, _distance: null };
        })
      );
      // --- DEBUG: причины исключения ---
      pvzWithCoords.forEach((pvz: any) => {
        if (!pvz._coords) {
          debugPVZReasons.push({
            code: pvz.code,
            name: pvz.name,
            address: pvz.address_full || pvz.address,
            reason: 'нет координат (location.latitude/longitude и не удалось получить через DaData)'
          });
        } else if (pvz._distance > 50) {
          debugPVZReasons.push({
            code: pvz.code,
            name: pvz.name,
            address: pvz.address_full || pvz.address,
            distance: pvz._distance,
            reason: `слишком далеко (${pvz._distance.toFixed(2)} км)`
          });
        } else if (pvz._distance > 10) {
          debugPVZReasons.push({
            code: pvz.code,
            name: pvz.name,
            address: pvz.address_full || pvz.address,
            distance: pvz._distance,
            reason: `в радиусе 50 км, но не попал в 10 км (${pvz._distance.toFixed(2)} км)`
          });
        }
      });
      // --- НОВАЯ ЛОГИКА: показываем ПВЗ по возрастающему радиусу ---
      const radii = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]; // в километрах
      let foundPVZ: any[] = [];
      let usedRadius = null;
      
      for (let radiusKm of radii) {
        foundPVZ = pvzWithCoords.filter(pvz => 
          typeof pvz._distance === 'number' && pvz._distance <= radiusKm
        );
        
        if (foundPVZ.length > 0) {
          usedRadius = radiusKm;
          break;
        }
      }
      
      // Сортируем ПВЗ по расстоянию от ближайшего к дальнему
      const sortedPVZ = foundPVZ.sort((a, b) => {
        const distanceA = a._distance || 0;
        const distanceB = b._distance || 0;
        return distanceA - distanceB;
      });
      
      setCdekPVZList(sortedPVZ);
      if (typeof window !== 'undefined') {
        window.__cdekDebug = window.__cdekDebug || {};
        window.__cdekDebug.usedRadius = usedRadius;
        window.__cdekDebug.foundPVZ = sortedPVZ;
      }
      setCdekPVZError((sortedPVZ.length === 0) ? 'Пункты выдачи не найдены в радиусе 100 км.' : null);
    } catch (e: any) {
      setCdekPVZError(e.message || 'Ошибка поиска ПВЗ');
    } finally {
      setCdekPVZLoading(false);
    }
  };

  // --- useEffect: запуск поиска ПВЗ при выборе способа доставки СДЭК и заполнении адреса ---
  useEffect(() => {
    if (formData.address && formData.city && formData.state) {
      setSelectedCdekPVZ(null); // сбрасываем выбранный ПВЗ при изменении адреса
      searchCdekPVZ();
    }
  }, [formData.address, formData.city, formData.state]);

  const handleGoToOrder = () => {
    setShowSuccessOrderModal(false);
    if (lastOrderId) {
      router.push(`/orders/${lastOrderId}`);
    }
  };
  const handleGoHome = () => {
    setShowSuccessOrderModal(false);
    router.push(`/`);
  };

  const isPhoneValid = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/.test(formData.phone);

  // Показываем загрузку до тех пор, пока не загрузится клиент
  if (!isClient) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 pt-32 pb-32">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Загрузка корзины...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (cartItems.length === 0 && !showSuccessOrderModal) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 pt-32 pb-32">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center">
              <ShoppingCart className="w-24 h-24 text-gray-300 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Корзина пуста</h1>
              <p className="text-gray-600 mb-8">Добавьте товары в корзину для оформления заказа</p>
              <button
                onClick={() => router.push('/catalog')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Перейти к каталогу
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Внутри блока выбора способа доставки (в модальном окне):
  // Вместо простого map(filteredDeliveryMethods), группируем по zoneResult:

  // В рендере выбора способа доставки:
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pt-32 pb-48">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center mb-8">
            <button 
              onClick={() => router.back()}
              className="mr-4 p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Корзина</h1>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Список товаров */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Товары в корзине</h2>
              {cartItems.map((item: CartItem) => (
                <div key={item._id} className="flex items-center py-4 border-b border-gray-200 last:border-b-0">
                  <div className="flex-shrink-0 w-20 h-20 mr-4">
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={80}
                      height={80}
                      className="rounded-lg object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                    <p className="text-lg font-bold text-blue-600">{item.price.toLocaleString()} ₽</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleQuantityChange(item._id, item.quantity - 1)}
                      className="p-1 rounded hover:bg-gray-100"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center">{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                      className="p-1 rounded hover:bg-gray-100"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item._id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Итого и оформление */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Итого заказа</h2>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Подытог:</span>
                  <span>{calculateSubtotal().toLocaleString()} ₽</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Стоимость товаров:</span>
                  <span>{calculateSubtotal().toLocaleString()} ₽</span>
                </div>
                <div className="flex justify-between">
                  <span>Доставка:</span>
                  <span>{(() => {
                    const selectedMethod = deliveryMethods.find(m => m._id === selectedDeliveryMethod) as any;
                    if (selectedMethod && selectedMethod.costType === 'zone') {
                      const methodWithZone: any = selectedMethod;
                      // Если выбран способ с useZones, ищем цену в method.zonePrices[zoneKey]
                      const priceByZoneKey = zoneKey && methodWithZone.zonePrices && methodWithZone.zonePrices[zoneKey] !== undefined ? methodWithZone.zonePrices[zoneKey] : null;
                      if (zoneKey && priceByZoneKey !== null) {
                        return priceByZoneKey === 0 ? 'Бесплатно' : `${priceByZoneKey} ₽`;
                      }
                      // fallback к zoneResult, если zoneKey нет или цены нет
                      let zonePrice = null;
                      if (methodWithZone.zonePrices && zoneResult && methodWithZone.zonePrices[zoneResult] !== undefined) {
                        zonePrice = methodWithZone.zonePrices[zoneResult];
                      }
                      if (zoneResult && zonePrice !== null && zonePrice !== undefined) {
                        return zonePrice === 0 ? 'Бесплатно' : `${zonePrice} ₽`;
                      }
                      // если ни zoneKey, ни zoneResult не дали цену:
                      return (
                        <span className="inline-flex items-center gap-1">
                          Узнать цену
                          <button type="button" onClick={() => setShowInfoModal(true)} className="ml-1 text-blue-500 hover:text-blue-700 focus:outline-none">
                            <Info size={16} />
                          </button>
                        </span>
                      );
                    }
                    const shippingCost = calculateShipping();
                    return shippingCost === 0 ? 'Бесплатно' : shippingCost ? `${shippingCost.toLocaleString()} ₽` : 'Узнать стоимость';
                  })()}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Итого:</span>
                    <span>{calculateTotal().toLocaleString()} ₽</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsCheckoutModalVisible(true)}
                  disabled={cartItems.length === 0}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                  Оформить заказ
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Модальное окно оформления заказа */}
        {isCheckoutModalVisible && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full relative max-h-[90vh] overflow-y-auto">
              <AnimatePresence>
                {showZoneToast && (
                  <motion.div
                    key={showZoneToast.key}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ duration: 0.3 }}
                    className="sticky top-0 right-0 z-50 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg text-lg font-semibold mt-2 ml-auto w-fit"
                    style={{ pointerEvents: 'none' }}
                  >
                    {showZoneToast.message}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Оформление заказа</h2>
                  {isAuthenticated && user && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ Выполнен вход как {user.email}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setIsCheckoutModalVisible(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCheckout} className="space-y-4">
                {/* Выбор способа доставки */}
                {showDeliveryMethodSelector ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Способ доставки *
                    </label>
                    {deliveryLoading ? (
                      <div className="text-sm text-gray-500">Загрузка способов доставки...</div>
                    ) : !Array.isArray(deliveryMethods) ? (
                      <div className="text-sm text-gray-500">Ошибка загрузки способов доставки</div>
                    ) : (
                      filteredDeliveryMethods.length === 0 ? (
                        deliveryMethods.some(m => m.requireAddressValidation) ?
                          <div className="text-red-600 text-sm mb-2">Стоимость доставки будет рассчитана после подтверждения заказа.</div>
                          : null
                      ) : (
                        <div className="space-y-2">
                          {filteredDeliveryMethods.map((method) => {
                            // Определяем стоимость из зоны, если costType === 'zone'
                            let zonePrice = null;
                            const methodWithZone: any = method;
                            if (methodWithZone.costType === 'zone' && zoneResult) {
                              if (methodWithZone.zonePrices && methodWithZone.zonePrices[zoneResult] !== undefined) {
                                zonePrice = methodWithZone.zonePrices[zoneResult];
                              }
                            }
                            return (
                              <label key={method._id} className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                <input
                                  type="radio"
                                  name="deliveryMethod"
                                  value={method._id}
                                  checked={selectedDeliveryMethod === method._id}
                                  onChange={(e) => {
                                    const newMethodId = e.target.value;
                                    const newMethod = deliveryMethods.find(m => m._id === newMethodId);
                                    
                                                                      // Сохраняем адрес при смене способа доставки
                                  if (newMethod && (newMethod.type === 'courier' || newMethod.type === 'cdek')) {
                                    // Если переключаемся на способ доставки, требующий адрес, 
                                    // сохраняем текущий адрес (но не в localStorage)
                                    setSelectedDeliveryMethod(newMethodId);
                                  } else {
                                    // Если переключаемся на способ без адреса (например, самовывоз),
                                    // очищаем адрес
                                    setFormData(prev => ({
                                      ...prev,
                                      address: '',
                                      city: '',
                                      state: '',
                                      zipCode: '',
                                      country: 'Россия',
                                      lat: null,
                                      lng: null
                                    }));
                                    setSelectedDeliveryMethod(newMethodId);
                                  }
                                    
                                    // Скрываем селектор после выбора способа доставки
                                    setShowDeliveryMethodSelector(false);
                                  }}
                                  className="mt-1 mr-3"
                                  required
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900">{method.name}</span>
                                    <span className="text-sm font-medium text-blue-600">
                                      {(() => {
                                        const methodWithCost = method as any;
                                        if (methodWithCost.costType === 'zone') {
                                          const priceByZoneKey = zoneKey && methodWithZone.zonePrices && methodWithZone.zonePrices[zoneKey] !== undefined ? methodWithZone.zonePrices[zoneKey] : null;
                                          if (zoneKey && priceByZoneKey !== null) {
                                            return priceByZoneKey === 0 ? 'Бесплатно' : `${priceByZoneKey} ₽`;
                                          }
                                          // fallback к zoneResult, если zoneKey нет или цены нет
                                          if (zoneResult && zonePrice !== null && zonePrice !== undefined) {
                                            return zonePrice === 0 ? 'Бесплатно' : `${zonePrice} ₽`;
                                          }
                                          // если ни zoneKey, ни zoneResult не дали цену:
                                          return (
                                            <span className="inline-flex items-center gap-1">
                                              Узнать цену
                                              <button type="button" onClick={() => setShowInfoModal(true)} className="ml-1 text-blue-500 hover:text-blue-700 focus:outline-none">
                                                <Info size={16} />
                                              </button>
                                            </span>
                                          );
                                        }
                                        if (methodWithCost.costType === 'percentage' && methodWithCost.costPercentage) {
                                          const subtotal = calculateSubtotal();
                                          const calculatedCost = Math.round(subtotal * (methodWithCost.costPercentage / 100));
                                          return calculatedCost === 0 ? 'Бесплатно' : `${calculatedCost} ₽`;
                                        } else if (methodWithCost.costType === 'fixed' && methodWithCost.fixedCost !== undefined) {
                                          return methodWithCost.fixedCost === 0 ? 'Бесплатно' : `${methodWithCost.fixedCost} ₽`;
                                        } else {
                                          const price = method.price;
                                          if (!price || price === 0 || price === null || price === undefined || String(price) === 'null') {
                                            return 'Бесплатно';
                                          } else {
                                            return `${price} ₽`;
                                          }
                                        }
                                      })()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">{method.description}</p>
                                  {method.workingHours && (
                                    <p className="text-xs text-gray-500 mt-1">🕒 {method.workingHours}</p>
                                  )}
                                  {method.address && (
                                    <p className="text-xs text-gray-500 mt-1">📍 {method.address}</p>
                                  )}
                                  {method.conditions && (
                                    <p className="text-xs text-blue-600 mt-1">ℹ️ {method.conditions}</p>
                                  )}
                                  {method.restrictions && (
                                    <p className="text-xs text-orange-600 mt-1">⚠️ {method.restrictions}</p>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  /* Показываем выбранный способ доставки и кнопку изменения */
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Способ доставки *
                    </label>
                    {(() => {
                      const selectedMethod = deliveryMethods.find(m => m._id === selectedDeliveryMethod);
                      if (!selectedMethod) return null;
                      
                      return (
                        <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 relative">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium text-gray-900">{selectedMethod.name}</span>
                              <p className="text-sm text-gray-600 mt-1">{selectedMethod.description}</p>
                              {selectedMethod.workingHours && (
                                <p className="text-xs text-gray-500 mt-1">🕒 {selectedMethod.workingHours}</p>
                              )}
                              {selectedMethod.address && (
                                <p className="text-xs text-gray-500 mt-1">📍 {selectedMethod.address}</p>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShowDeliveryMethodSelector(true);
                              // Очищаем адрес при открытии селектора способов доставки
                              setFormData(prev => ({
                                ...prev,
                                address: '',
                                city: '',
                                state: '',
                                zipCode: '',
                                country: 'Россия',
                                lat: null,
                                lng: null
                              }));
                              // Сбрасываем выбранный ПВЗ
                              setSelectedCdekPVZ(null);
                              // Сбрасываем результат определения зоны, чтобы показывались все способы доставки
                              setZoneResult(null);
                              setZoneKey(null);
                            }}
                            className="absolute top-2 right-2 text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                          >
                            Изменить
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Выбор даты доставки */}
                {selectedDeliveryMethod && (() => {
                  const selectedMethod = deliveryMethods.find(m => m._id === selectedDeliveryMethod);
                  if (!selectedMethod || selectedMethod.type === 'cdek') return null; // Для CDEK не показываем выбор даты
                  return (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Дата доставки *
                      </label>
                      {/* ...оставляем остальной код выбора даты без изменений... */}
                      <div className="flex flex-wrap gap-2">
                        {getAvailableDeliveryDates(selectedMethod).map(date => {
                          let isTodayPickup = date === 'today' && selectedMethod.type === 'pickup';
                          let isTodayCourier = date === 'today' && selectedMethod.type === 'courier';
                          let availableTimes = isTodayPickup ? generateTimeIntervals(selectedMethod, 'today') : [];
                          let isTodayPickupDisabled = isTodayPickup && availableTimes.length === 0;
                          let isTodayCourierDisabled = isTodayCourier && !canSelectToday(selectedMethod);
                          let isTodayDisabled = isTodayPickupDisabled || isTodayCourierDisabled;
                          return (
                            <button
                              key={date}
                              onClick={() => {
                                if (isTodayDisabled) {
                                  alert(isTodayPickupDisabled
                                    ? 'Нет доступных интервалов на сегодня'
                                    : 'На сегодня курьерская доставка недоступна');
                                  return;
                                }
                                setSelectedDeliveryDate(date);
                              }}
                              className={`flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                                selectedDeliveryDate === date
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : isTodayDisabled
                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                    : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                              }`}
                              disabled={isTodayDisabled}
                              title={isTodayPickupDisabled
                                ? 'Нет доступных интервалов на сегодня'
                                : isTodayCourierDisabled
                                  ? 'На сегодня курьерская доставка недоступна'
                                  : ''}
                            >
                              {date === 'today' && <Calendar className="w-4 h-4 mr-2" />}
                              {date === 'tomorrow' && <Clock className="w-4 h-4 mr-2" />}
                              {date === 'day3' && <Calendar className="w-4 h-4 mr-2" />}
                              {getDateLabel(date)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                {/* Выбор удобного времени получения */}
                {selectedDeliveryDate && (() => {
                  const selectedMethod = deliveryMethods.find(m => m._id === selectedDeliveryMethod);
                  if (!selectedMethod) return null;
                  const availableTimes = generateTimeIntervals(selectedMethod, selectedDeliveryDate);
                  if (availableTimes.length === 0) {
                    return <div><label className="block text-sm font-medium text-gray-700 mb-1">Удобное время получения *</label><p className="text-sm text-red-600">Нет доступных интервалов на выбранную дату.</p></div>;
                  }
                  return (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Удобное время получения *</label>
                      <select
                        value={selectedDeliveryTime}
                        onChange={(e) => setSelectedDeliveryTime(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Выберите удобное время</option>
                        {availableTimes.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Фамилия</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                    <ReactInputMask
                      mask="+7 (999) 999-99-99"
                      maskChar={null}
                      value={formData.phone}
                      onChange={e => { handleInputChange(e); if (!phoneTouched) setPhoneTouched(true); }}
                      onBlur={() => setPhoneTouched(true)}
                    >
                      {(inputProps: any) => (
                        <input
                          {...inputProps}
                          type="tel"
                          name="phone"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="+7 (___) ___-__-__"
                        />
                      )}
                    </ReactInputMask>
                    {phoneTouched && !isPhoneValid && (
                      <div className="flex items-center mt-1 text-red-600 text-sm animate-fade-in">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Пожалуйста, введите полный номер телефона
                      </div>
                    )}
                  </div>
                </div>

                <div 
                  id="callRequestContainer"
                  className={`mt-4 p-4 rounded-lg border-2 transition-all duration-300 ${
                    callRequestError 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <label className={`block text-sm font-medium mb-2 ${
                    callRequestError ? 'text-red-700' : 'text-gray-700'
                  }`}>
                    Нужен ли вам звонок? *
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="callRequest"
                        value="yes"
                        checked={callRequest === 'yes'}
                        onChange={(e) => {
                          setCallRequest(e.target.value);
                          setCallRequestError(false);
                        }}
                        className="mr-2 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Да, нужен звонок</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="callRequest"
                        value="no"
                        checked={callRequest === 'no'}
                        onChange={(e) => {
                          setCallRequest(e.target.value);
                          setCallRequestError(false);
                        }}
                        className="mr-2 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Нет, звонок не нужен</span>
                    </label>
                  </div>
                  {callRequestError && (
                    <div className="mt-2 text-sm text-red-600 font-medium">
                      ⚠️ Пожалуйста, выберите нужен ли вам звонок
                    </div>
                  )}
                </div>

                {/* Адрес доставки с автоподсказками — для курьерских и СДЭК */}
                {(() => {
                  const selectedMethod = deliveryMethods.find(m => m._id === selectedDeliveryMethod);
                  const shouldShowAddress = selectedMethod && (selectedMethod.type === 'courier' || selectedMethod.type === 'cdek' || selectedMethod.type === 'urgent');
                  if (!shouldShowAddress) return null;
                  const hasDeliveryMethodMismatch = selectedMethod && 
                    ((zoneResult === 'mkad' && selectedMethod.addressValidationType !== 'moscow_mkad') ||
                     (zoneResult === 'ckad' && selectedMethod.addressValidationType !== 'moscow_region') ||
                     (zoneResult === 'region' && String(selectedMethod.addressValidationType) !== 'region'));
                  return (
                    <div className="mb-4 relative">
                      {hasDeliveryMethodMismatch && (
                        <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                          ⚠️ Выбранный способ доставки недоступен для данного адреса. Пожалуйста, выберите подходящий способ доставки.
                        </div>
                      )}
                      
                      {/* Кнопка "Изменить способ доставки" если есть адрес, но выбран способ без адреса */}
                      {selectedMethod && selectedMethod.type === 'pickup' && (formData.address || formData.city || formData.state || formData.zipCode) && (
                        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                          <div className="flex items-center justify-between">
                            <span>Вы ввели адрес доставки. Хотите выбрать доставку?</span>
                            <button
                              type="button"
                              onClick={() => setShowDeliveryMethodSelector(true)}
                              className="text-blue-600 hover:text-blue-800 font-medium underline"
                            >
                              Изменить способ доставки
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Кнопка "Изменить способ доставки" если выбран способ доставки, но нет адреса */}
                      {selectedMethod && (selectedMethod.type === 'courier' || selectedMethod.type === 'cdek' || selectedMethod.type === 'urgent') && !formData.address && (
                        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                          <div className="flex items-center justify-between">
                            <span>Выбрана доставка. Хотите выбрать самовывоз?</span>
                            <button
                              type="button"
                              onClick={() => {
                                setShowDeliveryMethodSelector(true);
                                // Очищаем адрес при открытии селектора способов доставки
                                setFormData(prev => ({
                                  ...prev,
                                  address: '',
                                  city: '',
                                  state: '',
                                  zipCode: '',
                                  country: 'Россия',
                                  lat: null,
                                  lng: null
                                }));
                                // Сбрасываем выбранный ПВЗ
                                setSelectedCdekPVZ(null);
                                // Сбрасываем результат определения зоны, чтобы показывались все способы доставки
                                setZoneResult(null);
                                setZoneKey(null);
                              }}
                              className="text-blue-600 hover:text-blue-800 font-medium underline ml-4"
                            >
                              Изменить
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Кнопка "Изменить способ доставки" для всех случаев, когда способ доставки выбран и есть адрес */}
                      {selectedMethod && formData.address && (
                        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                          <div className="flex items-center justify-between">
                            <span>Хотите изменить способ доставки?</span>
                            <button
                              type="button"
                              onClick={() => {
                                setShowDeliveryMethodSelector(true);
                                // Очищаем адрес при открытии селектора способов доставки
                                setFormData(prev => ({
                                  ...prev,
                                  address: '',
                                  city: '',
                                  state: '',
                                  zipCode: '',
                                  country: 'Россия',
                                  lat: null,
                                  lng: null
                                }));
                                // Сбрасываем выбранный ПВЗ
                                setSelectedCdekPVZ(null);
                                // Сбрасываем результат определения зоны, чтобы показывались все способы доставки
                                setZoneResult(null);
                                setZoneKey(null);
                              }}
                              className="text-blue-600 hover:text-blue-800 font-medium underline ml-4"
                            >
                              Изменить
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                        {selectedMethod && selectedMethod.type === 'cdek' ? 'Поиск ПВЗ' : 'Адрес доставки'}
                      </label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleAddressInput}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={handleAddressBlur}
                        autoComplete="off"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder={selectedMethod && selectedMethod.type === 'cdek' ? 'Введите адрес или код ПВЗ' : 'Введите адрес доставки'}
                        required
                      />
                      {showSuggestions && addressSuggestions.length > 0 && (
                        <ul className="absolute z-10 bg-white border border-gray-300 rounded w-full max-h-60 overflow-y-auto shadow">
                          {addressSuggestions.map((s, idx) => (
                            <li
                              key={s.value + idx}
                              className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                              onMouseDown={() => handleSuggestionClick(s)}
                            >
                              {s.value}
                            </li>
                          ))}
                        </ul>
                      )}
                      {/* --- СДЭК: Блок выбора ПВЗ --- */}
                      {(() => {
                        const selectedMethod = deliveryMethods.find(m => m._id === selectedDeliveryMethod);
                        if (!selectedMethod || selectedMethod.type !== 'cdek') return null;
                        if (!(formData.address && formData.city && formData.state)) return null;
                        return (
                          <div className="mt-4">
                            <h3 className="text-lg font-semibold mb-2">Выберите пункт выдачи СДЭК</h3>
                            {cdekPVZLoading && (
                              <div className="flex items-center space-x-2 animate-pulse">
                                <div className="w-6 h-6 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                                <span>Идёт поиск пунктов выдачи...</span>
                              </div>
                            )}
                            {cdekPVZError && (
                              <div className="text-red-500 mt-2">{cdekPVZError}</div>
                            )}
                            {!cdekPVZLoading && !cdekPVZError && cdekPVZList.length > 0 && (
                              <ul className="space-y-2 mt-2">
                                {cdekPVZList.map((pvz: any) => (
                                  <motion.li
                                    key={pvz.code}
                                    layout
                                    whileHover={{ scale: 1.03 }}
                                    animate={selectedCdekPVZ?.code === pvz.code ? { backgroundColor: '#e0f2fe', borderColor: '#3b82f6' } : { backgroundColor: '#fff', borderColor: '#e5e7eb' }}
                                    transition={{ duration: 0.2 }}
                                    className={`p-4 border rounded-lg transition-all ${selectedCdekPVZ?.code === pvz.code ? 'border-blue-500 bg-blue-100' : 'border-gray-200 bg-white'}`}
                                    // onClick убираем, чтобы клик по карточке ничего не делал
                                  >
                                    <div className="font-semibold">{pvz.name}</div>
                                    <div className="text-sm text-gray-600">{pvz.address_full || pvz.address}</div>
                                    <div className="text-xs text-gray-400 mt-1">{pvz.work_time}</div>
                                    {pvz.note && <div className="text-xs text-gray-500 mt-1">{pvz.note}</div>}
                                    <div className="text-xs mt-1">{pvz._distance ? (() => {
                                      return pvz._distance >= 1 
                                        ? `${pvz._distance.toFixed(1)} км` 
                                        : `${Math.round(pvz._distance * 1000)} м`;
                                    })() : ''}</div>
                                    <button
                                      className={`mt-2 px-4 py-2 rounded bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition-all ${selectedCdekPVZ?.code === pvz.code ? '' : ''}`}
                                      onClick={() => {
                                        if (!selectedCdekPVZ || selectedCdekPVZ.code !== pvz.code) {
                                          setSelectedCdekPVZ(pvz);
                                          handleCdekPVZSelect({
                                            address: pvz.location?.address_full || pvz.location?.address || pvz.address_full || pvz.address || '',
                                            city: pvz.location?.city || pvz.city || '',
                                            region: pvz.location?.region || pvz.region || '',
                                            postalCode: pvz.location?.postal_code || pvz.postal_code || '',
                                            city_code: pvz.location?.city_code || pvz.city_code || '',
                                            fias_guid: pvz.location?.fias_guid || pvz.fias_guid || '',
                                            code: pvz.code,
                                          });
                                        }
                                      }}
                                      type="button"
                                    >
                                      {selectedCdekPVZ?.code === pvz.code ? 'Выбран' : 'Выбрать'}
                                    </button>
                                    {selectedCdekPVZ?.code === pvz.code && cdekDeliveryDate && (
                                      <div className="mt-2 text-blue-700 font-medium">Примерная дата доставки: {new Date(cdekDeliveryDate).toLocaleDateString('ru-RU')}</div>
                                    )}
                                  </motion.li>
                                ))}
                              </ul>
                            )}
                            {cdekPVZList.length > 0 && (
                              <div className="mb-2 text-sm text-gray-500">
                                Найдено ПВЗ в радиусе: {(() => {
                                  // Определяем использованный радиус из window.__cdekDebug
                                  if (typeof window !== 'undefined' && window.__cdekDebug && window.__cdekDebug.usedRadius) {
                                    return `${window.__cdekDebug.usedRadius} км`;
                                  }
                                  // Fallback: вычисляем максимальное расстояние среди найденных ПВЗ
                                  const maxDistance = Math.max(...cdekPVZList.map(pvz => pvz._distance || 0));
                                  const radiusKm = Math.ceil(maxDistance / 1000);
                                  return `${radiusKm} км`;
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}

                {/* Выбор способа оплаты */}
                {selectedDeliveryMethod && (
                  <PaymentMethodSelector
                    paymentMethods={paymentMethods}
                    selectedPaymentMethod={formData.paymentMethod}
                    onPaymentMethodChange={(methodId) => {
                      setFormData(prev => ({
                        ...prev,
                        paymentMethod: methodId
                      }));
                    }}
                    loading={paymentLoading}
                    error={paymentError}
                  />
                )}

                {/* Примечания к заказу */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Комментарий к заказу</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Например: позвонить за 30 минут, не звонить после 21:00 и т.д."
                  />
                </div>

                {/* Итоги заказа перед подтверждением */}
                <div className="bg-gray-50 rounded-lg p-4 mb-2 border border-gray-200">
                  <h3 className="text-lg font-semibold mb-2">Итоги заказа</h3>
                  <div className="flex justify-between mb-1">
                    <span>Товаров:</span>
                    <span>{cartItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>Стоимость товаров:</span>
                    <span>{calculateSubtotal().toLocaleString()} ₽</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>Стоимость доставки:</span>
                    <span>{(() => {
                      const shipping = calculateShipping();
                      if (shipping === null) return 'Уточняется';
                      if (shipping === 0) return 'Бесплатно';
                      return `${shipping.toLocaleString()} ₽`;
                    })()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg mt-2">
                    <span>Итого к оплате:</span>
                    <span>{calculateTotal().toLocaleString()} ₽</span>
                  </div>
                </div>

                {/* Кнопка подтверждения заказа */}
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                    disabled={cartItems.length === 0 || deliveryLoading || paymentLoading}
                  >
                    Подтвердить заказ
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-4">
                  Нажимая «Подтвердить заказ», вы соглашаетесь с <a href="/about" className="underline hover:text-blue-600">условиями обработки персональных данных</a> и <a href="/about" className="underline hover:text-blue-600">публичной офертой</a>.
                </div>
                {/* 5. Добавляю анимированный toast под кнопкой: */}
                <AnimatePresence>
                  {showCheckoutError && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ duration: 0.3 }}
                      className="mt-2 mb-2 px-4 py-3 rounded-lg bg-red-100 text-red-700 font-medium shadow animate-fade-in text-center"
                    >
                      {checkoutError}
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </div>
          </div>
        )}
      </div>
      <SaveAddressModal
        open={showSaveAddressModal}
        onClose={handleSaveAddressModalClose}
        onSave={handleSaveAddressModalSave}
      />
      <SuccessOrderModal
        open={showSuccessOrderModal}
        orderId={lastOrderId || ''}
        onGoToOrder={handleGoToOrder}
        onGoHome={handleGoHome}
      />
      
      {/* Модальное окно для уведомления о выборе звонка */}
      {showCallRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <PhoneIcon className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Выберите нужен ли вам звонок
              </h3>
              <p className="text-gray-600 mb-4">
                Пожалуйста, выберите нужен ли вам звонок для подтверждения заказа
              </p>
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setShowCallRequestModal(false);
                  // Автоматически закрываем модальное окно через 2 секунды
                  setTimeout(() => setShowCallRequestModal(false), 2000);
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Понятно
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  </Layout>
  );
}

export default CartPage;