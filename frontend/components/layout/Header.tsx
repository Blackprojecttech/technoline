'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { ShoppingCart, Search, Menu, X, User, Heart, ChevronDown, Phone, MapPin, Clock, LogOut, Truck, Package, UserCheck, Bell } from 'lucide-react';
import CategoryTree from './CategoryTree';
import { useCategories, Category } from '../../hooks/useCategories';
import { useAuth } from '@/contexts/AuthContext';
import LoginModal from '../auth/LoginModal';
import { FC } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/contexts/NotificationContext';
import { useFavorites } from '@/hooks/useFavorites';
import MobileMenu from './MobileMenu';

interface HeaderProps {
  onLoginClick?: () => void;
  onNotificationClick?: () => void;
}

const Header: FC<HeaderProps> = ({ onLoginClick, onNotificationClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [expandedCategories, setExpandedCategories] = useState(new Set<string>());

  const { isAuthenticated, user, logout, orders } = useAuth();
  const { favorites } = useFavorites();
  const { itemCount } = useSelector((state: RootState) => state.cart);
  const { categories } = useCategories();
  const notifications = useNotifications();

  // Поиск ближайшего заказа для отображения на профиле
  const upcomingOrder = useMemo(() => {
    if (!orders) return null;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
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
    
    // Сортируем по приоритету: сегодня > завтра > послезавтра, самовывоз > доставка
    activeOrders.sort((a, b) => {
      const getDeliveryDate = (order: any) => {
        if (order.deliveryDate === 'today') return today;
        if (order.deliveryDate === 'tomorrow') return new Date(today.getTime() + 24 * 60 * 60 * 1000);
        if (order.deliveryDate === 'day3') return new Date(today.getTime() + 48 * 60 * 60 * 1000);
        if (/^\d{4}-\d{2}-\d{2}$/.test(order.deliveryDate)) {
          const [year, month, day] = order.deliveryDate.split('-');
          return new Date(Number(year), Number(month) - 1, Number(day));
        }
        return new Date(0);
      };
      
      const dateA = getDeliveryDate(a);
      const dateB = getDeliveryDate(b);
      
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      
      // Приоритет самовывозу
      const isPickupA = isPickup(a.deliveryMethod);
      const isPickupB = isPickup(b.deliveryMethod);
      
      if (isPickupA && !isPickupB) return -1;
      if (!isPickupA && isPickupB) return 1;
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return activeOrders[0];
  }, [orders]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMouseEnter = (item: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setHoveredItem(item);
    if (item === 'catalog') {
      setShowDropdown(true);
    }
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
      setShowDropdown(false);
    }, 150);
  };

  const isPickup = (deliveryMethod: any) => {
    return deliveryMethod?.type === 'pickup' || deliveryMethod?.name?.toLowerCase().includes('самовывоз');
  };

  // Получаем категории из API
  const topNavigation = [
    { name: 'Оплата', href: '/payment' },
    { name: 'Доставка и Самовывоз', href: '/delivery' },
    { 
      name: 'Каталог товаров', 
      href: '/catalog',
      hasDropdown: true,
      children: categories
    }
  ];

  const bottomNavigation = categories.map(category => ({
    name: category.name,
    href: `/catalog/${category.slug}`
  }));

  const renderCategoryChildren = (children: Category[], level: number = 0) => {
    return children.map((child) => (
      <div key={child._id} className={`${level > 0 ? 'ml-4' : ''}`}>
        <Link
          href={`/catalog/${child.slug}`}
          onClick={() => setIsMobileMenuOpen(false)}
          className="block py-2 px-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
        >
          {child.name}
        </Link>
        {child.children && child.children.length > 0 && (
          <div className="ml-4">
            {renderCategoryChildren(child.children, level + 1)}
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
    } z-50`}>
      {/* Top contact bar - полностью скрыт на мобильных */}
      <div className="bg-secondary-800 text-white py-1 hidden lg:block">
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

          {/* Мобильный поиск - только для мобильных */}
          <div className="flex-1 max-w-md mx-4 md:hidden">
            <div className="relative">
              <input
                type="text"
                placeholder="Поиск товаров..."
                className="w-full px-4 py-2 pl-10 bg-white border border-light-300 rounded-xl text-secondary-700 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent shadow-sm"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" size={16} />
            </div>
          </div>

          {/* Верхнее меню - Оплата, Доставка, Самовывоз, Каталог товаров */}
          <div className="hidden lg:flex items-center space-x-8">
            {topNavigation.map((item) => (
              <div key={item.name} className="relative group">
                <Link
                  href={item.href}
                  className="text-secondary-700 hover:text-primary-600 transition-colors duration-200 font-medium relative group text-sm flex items-center space-x-1"
                  onMouseEnter={() => handleMouseEnter(item.name === 'Каталог товаров' ? 'catalog' : item.name)}
                  onMouseLeave={handleMouseLeave}
                >
                  <span>{item.name}</span>
                  {item.hasDropdown && <ChevronDown size={14} />}
                </Link>

                {/* Dropdown для каталога */}
                {item.hasDropdown && showDropdown && hoveredItem === 'catalog' && (
                  <div 
                    className="absolute top-full left-0 w-80 bg-white/95 backdrop-blur-sm border border-light-200 rounded-xl shadow-xl mt-2 p-6 z-50"
                    onMouseEnter={() => handleMouseEnter('catalog')}
                    onMouseLeave={handleMouseLeave}
                  >
                    <h3 className="text-lg font-semibold text-secondary-700 mb-4">Категории товаров</h3>
                    <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                      {categories.map((category) => (
                        <div key={category._id} className="space-y-2">
                          <Link
                            href={`/catalog/${category.slug}`}
                            className="block font-medium text-secondary-700 hover:text-primary-600 transition-colors duration-200 py-1"
                          >
                            {category.name}
                          </Link>
                          {category.children && category.children.length > 0 && (
                            <div className="ml-4 space-y-1">
                              {category.children.slice(0, 5).map((child) => (
                                <Link
                                  key={child._id}
                                  href={`/catalog/${child.slug}`}
                                  className="block text-sm text-secondary-600 hover:text-primary-600 transition-colors duration-200 py-1"
                                >
                                  {child.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Search */}
          <div className="hidden md:flex items-center space-x-4 flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Поиск товаров..."
                className="w-full px-4 py-2 pl-10 bg-white border border-light-300 rounded-xl text-secondary-700 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent shadow-sm"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" size={16} />
            </div>
          </div>

          {/* Right side icons */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Notifications */}
            <button
              onClick={onNotificationClick}
              className="relative p-2 text-secondary-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200"
            >
              <Bell size={20} />
              {notifications && notifications.unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notifications.unreadCount > 99 ? '99+' : notifications.unreadCount}
                </span>
              )}
            </button>

            {/* Favorites */}
            <Link
              href="/favorites"
              className="relative p-2 text-secondary-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200"
            >
              <Heart size={20} />
              {favorites.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {favorites.length > 99 ? '99+' : favorites.length}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              className="relative p-2 text-secondary-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200"
            >
              <ShoppingCart size={20} />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>

            {/* User Account */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <Link
                    href="/profile"
                    className="relative p-2 text-secondary-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200"
                  >
                    <User size={20} />
                    {/* Анимированная надпись для заказов - только на профиле */}
                    {upcomingOrder && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                        className="absolute -top-4 -right-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs px-2 py-1 rounded-full shadow-lg flex items-center space-x-1 animate-pulse z-20 whitespace-nowrap min-w-max"
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
                    onClick={logout}
                    className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 font-medium flex items-center space-x-2"
                  >
                    <LogOut size={16} />
                    <span>Выйти</span>
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={onLoginClick}
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
            className="md:hidden p-2 text-secondary-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200 touch-target"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <MobileMenu 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)}
        onLoginClick={onLoginClick}
      />
    </header>
  );
} 

export default Header; 