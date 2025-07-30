'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { hydrate } from '@/store/slices/cartSlice';

// Функция для загрузки корзины из localStorage
const loadCartFromStorage = () => {
  if (typeof window === 'undefined') {
    return { items: [], total: 0, itemCount: 0 };
  }
  
  try {
    const cartData = localStorage.getItem('cart');
    if (!cartData) return { items: [], total: 0, itemCount: 0 };
    
    const parsed = JSON.parse(cartData);
    const now = Date.now();
    const threeHours = 3 * 60 * 60 * 1000; // 3 часа в миллисекундах
    
    // Проверяем, не истекло ли время жизни корзины (3 часа)
    if (parsed.timestamp && (now - parsed.timestamp) > threeHours) {
      localStorage.removeItem('cart');
      return { items: [], total: 0, itemCount: 0 };
    }
    
    return {
      items: parsed.items || [],
      total: parsed.total || 0,
      itemCount: parsed.itemCount || 0
    };
  } catch (error) {
    console.error('Ошибка при загрузке корзины из localStorage:', error);
    return { items: [], total: 0, itemCount: 0 };
  }
};

export default function CartHydration() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Гидратируем корзину из localStorage после монтирования компонента
    const cartData = loadCartFromStorage();
    dispatch(hydrate(cartData));
  }, [dispatch]);

  return null; // Этот компонент не рендерит ничего
} 