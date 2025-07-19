'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { ShoppingCart, Search, Menu, X, User, Heart, ChevronDown, Phone, MapPin, Clock, LogOut, Truck, Package } from 'lucide-react';
import CategoryTree from './CategoryTree';
import { useCategories, Category } from '../../hooks/useCategories';
import { useAuth } from '@/contexts/AuthContext';
import LoginModal from '../auth/LoginModal';
import { FC } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  onLoginClick?: () => void;
}

// Функция для проверки, сегодня или завтра ли дата доставки
function isTodayOrTomorrow(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  const now = new Date();
  let target: Date | null = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    target = new Date(Number(year), Number(month) - 1, Number(day));
  } else if (dateStr === 'today') {
    target = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (dateStr === 'tomorrow') {
    target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  }
  if (!target) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return (
    target.getTime() === today.getTime() ||
    target.getTime() === tomorrow.getTime()
  );
}

// Функция для форматирования даты доставки
function formatDeliveryDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
    return dateObj.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  if (dateStr === 'today') {
    const dateObj = new Date();
    return `Сегодня, ${dateObj.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`;
  }
  if (dateStr === 'tomorrow') {
    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() + 1);
    return `Завтра, ${dateObj.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`;
  }
  if (dateStr === 'day3') {
    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() + 2);
    return dateObj.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  return dateStr;
}

const Header: FC<HeaderProps> = ({ onLoginClick }) => {
  const { user, isAuthenticated, logout, orders } = useAuth();
  const { itemCount } = useSelector((state: RootState) => state.cart);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const categoriesRef = useRef<HTMLDivElement>(null);
  
  // Получаем категории из API
  const { categories, loading, error } = useCategories();

  // Проверка, является ли способ доставки самовывозом
  const isPickup = (method: any) => {
    if (!method) return false;
    // Проверяем по типу доставки из админки
    return method.type === 'pickup';
  };

  // Находим ближайший заказ для уведомления (включая самовывозы)
  const upcomingOrder = useMemo(() => {
    if (!orders) return null;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const dayAfterTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    
    // Фильтруем активные заказы с датой доставки
    const activeOrders = orders.filter(order => {
      if (!order.deliveryDate || !['pending', 'confirmed', 'processing'].includes(order.status)) return false;
      
      // Проверяем дату доставки
      if (['today', 'tomorrow', 'day3'].includes(order.deliveryDate)) return true;
      
      if (/^\d{4}-\d{2}-\d{2}$/.test(order.deliveryDate)) {
        const [year, month, day] = order.deliveryDate.split('-');
        const deliveryDate = new Date(Number(year), Number(month) - 1, Number(day));
        return deliveryDate >= today;
      }
      
      return false;
    });
    
    if (activeOrders.length === 0) return null;
    
    // Сортируем заказы по приоритету: сегодня > завтра > послезавтра, самовывоз > доставка
    activeOrders.sort((a, b) => {
      // Получаем даты доставки
      const getDeliveryDate = (order: any) => {
        if (order.deliveryDate === 'today') return today;
        if (order.deliveryDate === 'tomorrow') return tomorrow;
        if (order.deliveryDate === 'day3') return dayAfterTomorrow;
        if (/^\d{4}-\d{2}-\d{2}$/.test(order.deliveryDate)) {
          const [year, month, day] = order.deliveryDate.split('-');
          return new Date(Number(year), Number(month) - 1, Number(day));
        }
        return new Date(0); // Очень старая дата для сортировки
      };
      
      const dateA = getDeliveryDate(a);
      const dateB = getDeliveryDate(b);
      
      // Сначала сортируем по дате
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      
      // Если даты одинаковые, приоритет самовывозу
      const isPickupA = isPickup(a.deliveryMethod);
      const isPickupB = isPickup(b.deliveryMethod);
      
      if (isPickupA && !isPickupB) return -1;
      if (!isPickupA && isPickupB) return 1;
      
      // Если тип одинаковый, сортируем по времени создания (новые первыми)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return activeOrders[0];
  }, [orders]);

  // Функция для определения позиции выпадающего меню
  const getDropdownPosition = (element: HTMLElement | null) => {
    if (!element) {
      return { left: '50%', transform: 'translateX(-50%)' };
    }
    
    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const menuWidth = 288; // w-72 = 288px
    
    let left = '50%';
    let transform = 'translateX(-50%)';
    
    // Проверяем, не выходит ли меню за правый край
    if (rect.left + menuWidth / 2 > viewportWidth - 20) {
      left = 'auto';
      transform = 'translateX(-100%)';
    }
    
    // Проверяем, не выходит ли меню за левый край
    if (rect.left - menuWidth / 2 < 20) {
      left = '0';
      transform = 'translateX(0)';
    }
    
    return { left, transform };
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoriesRef.current && !categoriesRef.current.contains(event.target as Node)) {
        setIsCategoriesOpen(false);
      }
    };

    if (isCategoriesOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoriesOpen]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const isCategoryExpanded = (categoryId: string) => {
    return expandedCategories.has(categoryId);
  };

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  const handleOpenLoginModal = () => {
    if (onLoginClick) onLoginClick();
    setIsMobileMenuOpen(false);
  };

  // Верхнее меню с основными разделами
  const topNavigation = [
    { name: 'Оплата', href: '/payment' },
    { name: 'Доставка и Самовывоз', href: '/delivery' },
    { 
      name: 'Каталог товаров', 
      href: '/catalog',
      hasDropdown: true,
      children: categories // Используем категории из API с подкатегориями
    }
  ];

  // Нижнее меню с категориями товаров (только основные категории без подкатегорий)
  const bottomNavigation = categories.map(category => ({
    name: category.name,
    href: `/catalog/${category.slug}`
  }));

  // Функция для рекурсивного рендеринга категорий
  const renderCategoryChildren = (children: Category[], level: number = 0) => {
    return children.map((child) => (
      <div key={child._id} className="group relative">
        <div className="flex items-center justify-between">
          <Link
            href={`/catalog/${child.slug}`}
            className="block py-2 px-4 text-secondary-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors duration-200 text-sm flex-1"
          >
            {child.name}
          </Link>
          {child.children && child.children.length > 0 && (
            <button
              onClick={() => toggleCategory(child._id)}
              className="p-1 hover:bg-primary-50 rounded transition-colors duration-200"
            >
              <ChevronDown 
                className={`w-4 h-4 text-secondary-400 transition-transform duration-200 ${
                  isCategoryExpanded(child._id) ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}
        </div>
        {child.children && child.children.length > 0 && (
          <div className={`ml-4 pl-2 border-l border-light-100 mt-1 overflow-hidden transition-all duration-300 ${
            isCategoryExpanded(child._id) ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
              {renderCategoryChildren(child.children, level + 1)}
            </div>
          </div>
        )}
      </div>
    ));
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 w-full ${
      isScrolled 
        ? 'bg-white/70 backdrop-blur-md shadow-lg border-b border-light-200' 
        : 'bg-white/60 backdrop-blur-sm'
    }`}>
      {/* Top contact bar - поднят выше */}
      <div className="bg-secondary-800 text-white py-1">
        <div className="container mx-auto px-4 max-w-full">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Phone size={12} className="text-primary-400" />
                <span>+7(499)3223386</span>
                <Link href="/callback" className="text-primary-400 hover:text-primary-300 transition-colors duration-200">
                  Перезвоните мне
                </Link>
              </div>
              <div className="flex items-center space-x-2">
                <Clock size={12} className="text-primary-400" />
                <span>с 10:00 до 19:00</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin size={12} className="text-primary-400" />
              <span>Москва, Пятницкое шоссе, 18, Павильон 73. 1 этаж, 3 вход, прямо до конца, возле Mix Bar.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-full">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <img 
              src="/logo.png" 
              alt="TechnoLine Logo" 
              className="h-10 w-auto"
            />
          </Link>

          {/* Верхнее меню - Оплата, Доставка, Самовывоз, Каталог товаров */}
          <div className="hidden lg:flex items-center space-x-8">
            {topNavigation.map((item) => (
              <div key={item.name} className="relative group">
                <Link
                  href={item.href}
                  className="text-secondary-700 hover:text-primary-600 transition-colors duration-200 font-medium relative group text-sm flex items-center space-x-1"
                >
                  <span>{item.name}</span>
                  {item.hasDropdown && (
                    <ChevronDown size={16} className="transition-transform duration-200 group-hover:rotate-180" />
                  )}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary-400 to-accent-400 transition-all duration-300 group-hover:w-full"></span>
                </Link>
                
                {/* Выпадающее меню для "Каталог товаров" */}
                {item.hasDropdown && item.children && (
                  <div 
                    className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-[600px] bg-white border border-light-200 rounded-lg shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
                    style={{
                      maxHeight: 'calc(100vh - 150px)',
                      overflowY: 'auto'
                    }}
                  >
                    <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-1 gap-2">
                        {item.children.map((child) => (
                          <div key={child._id} className="group relative">
                            <div className="flex items-center justify-between">
                              <Link
                                href={`/catalog/${child.slug}`}
                                className="block py-3 px-4 text-secondary-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors duration-200 text-sm font-medium flex-1"
                              >
                                {child.name}
                              </Link>
                              {child.children && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleCategory(child._id);
                                  }}
                                  className="p-2 text-secondary-400 hover:text-primary-600 transition-colors duration-200 rounded-lg hover:bg-primary-50"
                                  title="Раскрыть подкатегории"
                                >
                                  <ChevronDown 
                                    size={16} 
                                    className={`transition-transform duration-200 ${isCategoryExpanded(child._id) ? 'rotate-180' : ''}`} 
                                  />
                                </button>
                              )}
                            </div>
                            {child.children && (
                              <div className={`ml-4 pl-2 border-l border-light-100 mt-1 overflow-hidden transition-all duration-300 ${
                                isCategoryExpanded(child._id) ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'
                              }`}>
                                <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                                  {renderCategoryChildren(child.children)}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            

          </div>

          {/* Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Поиск по магазину..."
                className="w-full px-4 py-2 pl-10 bg-white border border-light-300 rounded-lg text-secondary-700 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent shadow-sm"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" size={16} />
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center space-x-4">
            <Link
              href="/wishlist"
              className="p-2 text-secondary-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200 relative"
            >
              <Heart size={20} />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse-slow">
                0
              </span>
            </Link>
            
            <Link
              href="/cart"
              className="p-2 text-secondary-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200 relative"
            >
              <ShoppingCart size={20} />
              {isClient && (
                <AnimatePresence mode="wait">
                  {itemCount > 0 && (
                    <motion.span
                      key={itemCount}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-success-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
                    >
                      {itemCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              )}
            </Link>
            
            <div className="flex items-center space-x-2">
              {isAuthenticated ? (
                <div className="flex items-center space-x-2">
                  <Link
                    href="/profile"
                    className="px-4 py-2 text-secondary-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200 font-medium flex items-center space-x-2 relative"
                  >
                    <User size={16} />
                    <span>{user?.firstName}</span>
                    {upcomingOrder && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                        className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs px-2 py-1 rounded-full shadow-lg flex items-center space-x-1 animate-pulse"
                      >
                        {isPickup(upcomingOrder.deliveryMethod) ? (
                          <Package size={10} />
                        ) : (
                          <Truck size={10} />
                        )}
                        <span className="font-medium">
                          {isPickup(upcomingOrder.deliveryMethod) ? 'Самовывоз' : 'Доставка'}
                        </span>
                      </motion.div>
                    )}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 font-medium flex items-center space-x-2"
                  >
                    <LogOut size={16} />
                    <span>Выйти</span>
                  </button>
                </div>
                              ) : (
                <>
                  <button
                    onClick={handleOpenLoginModal}
                    className="px-4 py-2 text-secondary-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200 font-medium"
                  >
                    Вход
                  </button>
                  <Link
                    href="/auth/register"
                    className="px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                  >
                    Регистрация
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-secondary-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Search Bar */}
        {isSearchOpen && (
          <div className="lg:hidden py-4 border-t border-light-200">
            <div className="relative">
              <input
                type="text"
                placeholder="Поиск по магазину..."
                className="w-full px-4 py-3 pl-12 bg-white border border-light-300 rounded-lg text-secondary-700 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent shadow-sm"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-secondary-400" size={20} />
            </div>
          </div>
        )}
      </div>





      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur-md border-t border-light-200 shadow-lg">
          <div className="px-4 py-6 space-y-4">
            {/* Mobile Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Поиск по магазину..."
                className="w-full px-4 py-3 pl-12 bg-white border border-light-300 rounded-lg text-secondary-700 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent shadow-sm"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-secondary-400" size={20} />
            </div>

            {/* Мобильное меню - основные разделы */}
            <div className="border-b border-light-200 pb-4">
              <h3 className="text-lg font-semibold text-secondary-800 mb-3">Основные разделы</h3>
              <div className="grid grid-cols-1 gap-2">
                <Link
                  href="/payment"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-secondary-700 hover:text-primary-600 py-2 px-3 rounded-lg hover:bg-primary-50 transition-colors duration-200"
                >
                  Оплата
                </Link>
                <Link
                  href="/delivery"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-secondary-700 hover:text-primary-600 py-2 px-3 rounded-lg hover:bg-primary-50 transition-colors duration-200"
                >
                  Доставка и Самовывоз
                </Link>
                <Link
                  href="/contacts"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-secondary-700 hover:text-primary-600 py-2 px-3 rounded-lg hover:bg-primary-50 transition-colors duration-200"
                >
                  Контакты
                </Link>
                <Link
                  href="/about"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-secondary-700 hover:text-primary-600 py-2 px-3 rounded-lg hover:bg-primary-50 transition-colors duration-200"
                >
                  О нас
                </Link>
              </div>
            </div>

            {/* Мобильное меню - категории товаров */}
            <div className="border-b border-light-200 pb-4">
              <h3 className="text-lg font-semibold text-secondary-800 mb-3">Категории товаров</h3>
              <div className="max-h-80 overflow-y-auto">
                {categories.map((category) => (
                  <div key={category._id} className="relative group">
                    <Link
                      href={`/catalog/${category.slug}`}
                      className="text-secondary-700 hover:text-primary-600 transition-colors duration-200 font-medium relative group text-sm flex items-center space-x-1"
                    >
                      <span>{category.name}</span>
                      {category.children && category.children.length > 0 && (
                        <ChevronDown size={12} className="transition-transform duration-200 group-hover:rotate-180 text-secondary-400 group-hover:text-primary-600" />
                      )}
                      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary-400 to-accent-400 transition-all duration-300 group-hover:w-full"></span>
                    </Link>
                    
                    {/* Выпадающие подкатегории при наведении */}
                    {category.children && category.children.length > 0 && (
                      <div 
                        className="absolute top-full mt-2 w-72 bg-white border border-light-200 rounded-xl shadow-2xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300"
                        style={{
                          maxHeight: 'calc(100vh - 200px)',
                          overflowY: 'auto',
                          maxWidth: 'calc(100vw - 40px)',
                          minWidth: '280px',
                          ...getDropdownPosition(document.querySelector(`[data-category="${category._id}"]`) as HTMLElement)
                        }}
                      >
                        <div className="p-5">
                          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                            {category.children.map((child) => (
                              <Link
                                key={child._id}
                                href={`/catalog/${child.slug}`}
                                className="block py-3 px-4 text-secondary-700 hover:text-primary-600 hover:bg-gradient-to-r hover:from-primary-50 hover:to-accent-50 rounded-lg transition-all duration-200 text-sm font-medium hover:shadow-sm"
                              >
                                {child.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-4 border-t border-light-200">
              <div className="flex items-center justify-between">
                <Link
                  href="/wishlist"
                  className="flex items-center space-x-2 text-secondary-700 hover:text-primary-600 transition-colors duration-200"
                >
                  <Heart size={20} />
                  <span>Избранное</span>
                  <span className="w-5 h-5 bg-accent-500 text-white text-xs rounded-full flex items-center justify-center">
                    0
                  </span>
                </Link>
                
                <Link
                  href="/cart"
                  className="flex items-center space-x-2 text-secondary-700 hover:text-primary-600 transition-colors duration-200"
                >
                  <ShoppingCart size={20} />
                  <span>Корзина</span>
                  <AnimatePresence mode="wait">
                    {itemCount > 0 && (
                      <motion.span
                        key={itemCount}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="w-5 h-5 bg-success-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
                      >
                        {itemCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </div>
              
              <div className="pt-4 border-t border-light-200">
                {isAuthenticated ? (
                  <div className="flex flex-col space-y-2">
                    <Link
                      href="/profile"
                      className="flex items-center space-x-2 text-secondary-700 hover:text-primary-600 transition-colors duration-200 py-2 relative"
                    >
                      <User size={16} />
                      <span>Профиль ({user?.firstName})</span>
                      {upcomingOrder && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                          className="absolute -top-1 -right-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs px-2 py-1 rounded-full shadow-lg flex items-center space-x-1 animate-pulse"
                        >
                          {isPickup(upcomingOrder.deliveryMethod) ? (
                            <Package size={10} />
                          ) : (
                            <Truck size={10} />
                          )}
                          <span className="font-medium">
                            {isPickup(upcomingOrder.deliveryMethod) ? 'Самовывоз' : 'Доставка'}
                          </span>
                        </motion.div>
                      )}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 text-red-600 hover:text-red-700 transition-colors duration-200 py-2"
                    >
                      <LogOut size={16} />
                      <span>Выйти</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={handleOpenLoginModal}
                      className="text-secondary-700 hover:text-primary-600 transition-colors duration-200 py-2 text-left"
                    >
                      Вход
                    </button>
                    <Link
                      href="/auth/register"
                      className="text-secondary-700 hover:text-primary-600 transition-colors duration-200 py-2"
                    >
                      Регистрация
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
} 

export default Header; 