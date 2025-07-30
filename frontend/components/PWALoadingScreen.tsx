'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function PWALoadingScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Проверяем, запущено ли приложение как PWA
    const checkIfPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      return isStandalone || isIOSStandalone;
    };

    // Показываем загрузку только для PWA при первом запуске
    if (checkIfPWA()) {
      const hasShownSplash = sessionStorage.getItem('pwa-splash-shown');
      
      if (!hasShownSplash) {
        setIsVisible(true);
        setIsLoading(true);
        
        // Показываем загрузку минимум 2 секунды для красивого эффекта
        const minLoadTime = setTimeout(() => {
          setIsLoading(false);
          
          // Скрываем через анимацию
          setTimeout(() => {
            setIsVisible(false);
            sessionStorage.setItem('pwa-splash-shown', 'true');
          }, 500);
        }, 2000);

        return () => clearTimeout(minLoadTime);
      }
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center transition-opacity duration-500 ${
      isLoading ? 'opacity-100' : 'opacity-0'
    }`}>
      {/* Фоновый паттерн */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e5e7eb' fill-opacity='0.3'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>

      {/* Контейнер логотипа */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Логотип с анимацией */}
        <div className="relative mb-8">
          {/* Пульсирующий фон */}
          <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
          <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-pulse"></div>
          
          {/* Логотип */}
          <div className="relative w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center shadow-2xl border border-gray-200">
            <Image
              src="/favicon.ico"
              alt="TechnoLine"
              width={48}
              height={48}
              className="w-12 h-12"
              priority
            />
          </div>
        </div>

        {/* Название приложения */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-wide">
          TechnoLine
        </h1>
        
        {/* Подзаголовок */}
        <p className="text-gray-600 text-lg mb-8 font-medium">
          Интернет-магазин электроники
        </p>

        {/* Индикатор загрузки */}
        <div className="flex flex-col items-center space-y-4">
          {/* Анимированные точки */}
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          
          {/* Текст загрузки */}
          <p className="text-gray-500 text-sm font-medium">
            Загрузка приложения...
          </p>
        </div>
      </div>

      {/* Версия приложения внизу */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-gray-400 text-xs">
          Версия 1.2.0
        </p>
      </div>

      {/* Дополнительные анимированные элементы */}
      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-300/30 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-blue-400/40 rounded-full animate-ping" style={{ animationDelay: '2s' }}></div>
      <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-blue-300/20 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
    </div>
  );
} 