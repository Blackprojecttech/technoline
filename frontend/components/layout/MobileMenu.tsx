'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { X, User, LogOut, Truck, Package, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories } from '../../hooks/useCategories';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginClick?: () => void;
}

export default function MobileMenu({ isOpen, onClose, onLoginClick }: MobileMenuProps) {
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const { categories } = useCategories();
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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

  const renderCategoryChildren = (children: any[], level: number = 0) => {
    return children.map((child) => (
      <div key={child._id} className={`${level > 0 ? 'ml-4' : ''}`}>
        <div className="flex items-center justify-between">
          <Link
            href={`/catalog/${child.slug}`}
            onClick={onClose}
            className="flex-1 py-2 px-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors text-sm"
          >
            {child.name}
          </Link>
          {child.children && child.children.length > 0 && (
            <button
              onClick={() => toggleCategory(child._id)}
              className="p-2 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <ChevronDown 
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                  isCategoryExpanded(child._id) ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}
        </div>
        {child.children && child.children.length > 0 && (
                     <div className={`ml-2 overflow-hidden transition-all duration-300 ${
             isCategoryExpanded(child._id) ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'
           }`}>
                                      <div className="border-l border-gray-200 pl-2 mt-1 max-h-[250px] overflow-y-auto scrollbar-thin pr-1">
               {renderCategoryChildren(child.children, level + 1)}
             </div>
          </div>
        )}
      </div>
    ));
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const handleOpenLoginModal = () => {
    if (onLoginClick) onLoginClick();
    onClose();
  };

  if (!mounted) {
    return null;
  }

  const menuContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="mobile-menu-overlay inset-0 bg-black/50"
          />
          
          {/* Menu Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="mobile-menu-panel top-0 right-0 bottom-0 w-80 bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Меню</h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-xl touch-target"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {/* User Section */}
              {isAuthenticated ? (
                <div className="p-6 bg-gradient-to-r from-primary-50 to-accent-50 border-b border-gray-100">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{user?.firstName} {user?.lastName}</h3>
                      <p className="text-sm text-gray-600">{user?.email}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 border-b border-gray-100">
                  <button
                    onClick={handleOpenLoginModal}
                    className="w-full bg-gradient-to-r from-primary-500 to-accent-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg"
                  >
                    Войти в аккаунт
                  </button>
                </div>
              )}

              {/* Navigation */}
              <div className="p-6 space-y-2">
                                 {/* Категории товаров */}
                 <div className="space-y-2">
                   <h3 className="font-semibold text-gray-900 mb-3">Категории товаров</h3>
                                       <div className="space-y-1 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2">
                    {categories.map((category) => (
                      <div key={category._id}>
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/catalog/${category.slug}`}
                            onClick={onClose}
                            className="flex-1 py-3 px-4 text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors font-medium"
                          >
                            {category.name}
                          </Link>
                          {category.children && category.children.length > 0 && (
                            <button
                              onClick={() => toggleCategory(category._id)}
                              className="p-3 hover:bg-primary-50 rounded-xl transition-colors touch-target"
                            >
                              <ChevronDown 
                                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                                  isCategoryExpanded(category._id) ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                          )}
                        </div>
                        {category.children && category.children.length > 0 && (
                                     <div className={`ml-4 overflow-hidden transition-all duration-300 ${
             isCategoryExpanded(category._id) ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
           }`}>
                                                                      <div className="border-l-2 border-primary-100 pl-4 mt-2 space-y-1 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2">
               {renderCategoryChildren(category.children)}
             </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Основные разделы */}
                <div className="space-y-1 pt-4 border-t border-gray-100 mt-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Услуги</h3>
                  
                  <Link
                    href="/delivery"
                    onClick={onClose}
                    className="flex items-center space-x-3 p-4 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors touch-target"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Truck className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">Доставка</div>
                      <div className="text-sm text-gray-500">Способы и сроки доставки</div>
                    </div>
                  </Link>

                  <Link
                    href="/payment"
                    onClick={onClose}
                    className="flex items-center space-x-3 p-4 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors touch-target"
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <div className="text-2xl">💳</div>
                    </div>
                    <div>
                      <div className="font-medium">Оплата</div>
                      <div className="text-sm text-gray-500">Способы оплаты</div>
                    </div>
                  </Link>
                </div>

                {/* Контакты */}
                <div className="pt-4 border-t border-gray-100 mt-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Контакты</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div>📞 +7(499)3223386</div>
                    <div>⏰ с 10:00 до 19:00</div>
                    <div>📍 Москва, Пятницкое шоссе, 18, Павильон 73</div>
                  </div>
                </div>

                {/* Logout */}
                {isAuthenticated && (
                  <div className="pt-4 border-t border-gray-100 mt-6">
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-3 p-4 text-red-600 hover:bg-red-50 rounded-xl transition-colors w-full touch-target"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-medium">Выйти</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(menuContent, document.body);
} 