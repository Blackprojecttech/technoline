'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh?: () => Promise<void> | void;
  enabled?: boolean;
}

export default function PullToRefresh({ onRefresh, enabled = true }: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  // Проверяем PWA статус только на клиенте
  useEffect(() => {
    setMounted(true);
    
    const checkPWA = () => {
      const isStandalone = (window.navigator as any).standalone === true || 
                           window.matchMedia('(display-mode: standalone)').matches;
      setIsPWA(isStandalone);
    };
    
    checkPWA();
  }, []);

  useEffect(() => {
    if (!enabled || !isPWA || !mounted) return;

    let touchStartY = 0;
    let currentPullDistance = 0;
    let isAtTop = false;

    const handleTouchStart = (e: TouchEvent) => {
      // Проверяем, что мы находимся в верхней части страницы
      isAtTop = window.scrollY === 0;
      if (!isAtTop) return;

      touchStartY = e.touches[0].clientY;
      setStartY(touchStartY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isAtTop || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - touchStartY;

      // Только если тянем вниз и находимся в верхней части
      if (deltaY > 0 && window.scrollY === 0) {
        e.preventDefault(); // Предотвращаем обычную прокрутку
        
        // Применяем сопротивление для более естественного ощущения
        currentPullDistance = Math.min(deltaY * 0.6, 120);
        setPullDistance(currentPullDistance);
        setIsPulling(currentPullDistance > 60);
      }
    };

    const handleTouchEnd = () => {
      if (currentPullDistance > 60 && !isRefreshing) {
        // Запускаем обновление
        triggerRefresh();
      }
      
      // Сбрасываем состояние
      setPullDistance(0);
      setIsPulling(false);
      currentPullDistance = 0;
    };

    const triggerRefresh = async () => {
      setIsRefreshing(true);
      
      try {
        if (onRefresh) {
          await onRefresh();
        } else {
          // По умолчанию перезагружаем страницу
          window.location.reload();
        }
      } catch (error) {
        console.error('Ошибка при обновлении:', error);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
        }, 500);
      }
    };

    // Добавляем обработчики событий
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Очистка
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
      }, [enabled, isPWA, onRefresh, isRefreshing, mounted]);

  // Не показываем компонент во время SSR и если не в PWA режиме
  if (!mounted || !isPWA || !enabled) return null;

  return (
    <>
      {/* Индикатор pull-to-refresh */}
      <div 
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center transition-all duration-300 ease-out"
        style={{
          transform: `translateY(${Math.max(pullDistance - 60, -60)}px)`,
          opacity: pullDistance > 20 ? 1 : 0,
        }}
      >
        <div className="bg-white shadow-lg rounded-full p-3 m-4">
          <RefreshCw 
            className={`w-6 h-6 transition-all duration-300 ${
              isPulling ? 'text-blue-600' : 'text-gray-400'
            } ${
              isRefreshing ? 'animate-spin' : isPulling ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>

      {/* Растягивающийся фон */}
      {pullDistance > 0 && (
        <div 
          className="fixed top-0 left-0 right-0 bg-gradient-to-b from-blue-50 to-transparent z-40 transition-all duration-200"
          style={{
            height: `${pullDistance}px`,
            opacity: Math.min(pullDistance / 80, 0.8),
          }}
        />
      )}
    </>
  );
} 