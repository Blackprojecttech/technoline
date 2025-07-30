'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Particle {
  id: number;
  left: number;
  top: number;
  animationDelay: number;
  animationDuration: number;
}

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setIsVisible(true);
    
    // Генерируем частицы только на клиенте
    const newParticles: Particle[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      animationDelay: Math.random() * 2,
      animationDuration: 2 + Math.random() * 3
    }));
    setParticles(newParticles);
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const slides = [
    {
      title: "Новейшие смартфоны",
      subtitle: "Откройте мир технологий будущего",
      description: "Самые мощные процессоры, камеры профессионального уровня и инновационные функции",
      image: "/images/hero-phone.jpg",
      bgColor: "from-primary-500 to-accent-500"
    },
    {
      title: "Игровые ноутбуки",
      subtitle: "Погрузитесь в мир игр",
      description: "Максимальная производительность для самых требовательных игр и приложений",
      image: "/images/hero-laptop.jpg",
      bgColor: "from-success-500 to-primary-500"
    },
    {
      title: "Умные часы",
      subtitle: "Технологии на вашем запястье",
      description: "Отслеживайте здоровье, получайте уведомления и оставайтесь на связи",
      image: "/images/hero-watch.jpg",
      bgColor: "from-warning-500 to-accent-500"
    }
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-light-50 to-accent-50"></div>
      
      {/* Animated particles - рендерим только после hydration */}
      <div className="absolute inset-0">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-2 h-2 bg-primary-300 rounded-full opacity-30 animate-pulse"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              animationDelay: `${particle.animationDelay}s`,
              animationDuration: `${particle.animationDuration}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 md:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className={`text-secondary-800 transition-all duration-1000 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'}`}>
            <div className="mb-6">
              <span className="inline-block px-4 py-2 bg-primary-100 backdrop-blur-sm rounded-full text-primary-700 text-sm font-medium border border-primary-200 shadow-sm">
                🚀 Новые поступления
              </span>
            </div>
            
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                {slides[currentSlide].title}
              </span>
            </h1>
            
            <h2 className="text-lg md:text-2xl lg:text-3xl font-semibold mb-4 text-secondary-700">
              {slides[currentSlide].subtitle}
            </h2>
            
            <p className="text-base md:text-lg text-secondary-600 mb-8 max-w-lg">
              {slides[currentSlide].description}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/catalog"
                className="inline-flex items-center px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-semibold rounded-2xl md:rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg text-center justify-center"
              >
                Смотреть товары
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              
              <Link 
                href="/about"
                className="inline-flex items-center px-6 md:px-8 py-3 md:py-4 border-2 border-primary-400 text-primary-700 hover:bg-primary-50 font-semibold rounded-2xl md:rounded-full transition-all duration-300 text-center justify-center"
              >
                Узнать больше
              </Link>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 md:gap-6 mt-8 md:mt-12">
              <div className="text-center">
                <div className="text-xl md:text-3xl font-bold text-primary-600">1000+</div>
                <div className="text-xs md:text-sm text-secondary-600">Товаров</div>
              </div>
              <div className="text-center">
                <div className="text-xl md:text-3xl font-bold text-primary-600">50K+</div>
                <div className="text-xs md:text-sm text-secondary-600">Клиентов</div>
              </div>
              <div className="text-center">
                <div className="text-xl md:text-3xl font-bold text-primary-600">24/7</div>
                <div className="text-xs md:text-sm text-secondary-600">Поддержка</div>
              </div>
            </div>
          </div>

          {/* Image - скрыт на мобильных */}
          <div className={`relative transition-all duration-1000 hidden md:block ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
            <div className="relative">
              {/* Floating device mockup */}
              <div className="relative w-full h-96 lg:h-[500px] bg-gradient-to-br from-primary-100 to-accent-100 rounded-3xl backdrop-blur-sm border border-primary-200 p-8 shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-200/20 to-accent-200/20 rounded-3xl"></div>
                
                {/* Device image placeholder */}
                <div className="relative z-10 w-full h-full flex items-center justify-center">
                  <div className="w-64 h-64 lg:w-80 lg:h-80 bg-gradient-to-br from-primary-400 to-accent-400 rounded-3xl shadow-2xl flex items-center justify-center">
                    <div className="text-white text-6xl">📱</div>
                  </div>
                </div>
                
                {/* Floating elements */}
                <div className="absolute top-4 right-4 w-16 h-16 bg-primary-300 rounded-full opacity-60 animate-bounce"></div>
                <div className="absolute bottom-4 left-4 w-12 h-12 bg-accent-300 rounded-full opacity-60 animate-pulse"></div>
                <div className="absolute top-1/2 left-4 w-8 h-8 bg-success-300 rounded-full opacity-60 animate-ping"></div>
              </div>
            </div>
          </div>

          {/* Мобильная иконка товара */}
          <div className="md:hidden text-center mt-8">
            <div className="text-8xl mb-4">
              📱
            </div>
          </div>
        </div>
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-4 md:bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              currentSlide === index 
                ? 'bg-primary-500 scale-125' 
                : 'bg-primary-300 hover:bg-primary-400'
            }`}
          />
        ))}
      </div>
    </section>
  );
} 