'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import Hero from '@/components/home/Hero';
import Categories from '@/components/home/Categories';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import Newsletter from '@/components/home/Newsletter';

function HomeContent() {
  const [isLoaded, setIsLoaded] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    setIsLoaded(true);
    
    // Обработка реферального параметра
    const ref = searchParams.get('ref');
    if (ref) {
      // Отправляем запрос на отслеживание клика
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/referrals/track?ref=${ref}`, {
        method: 'GET',
        credentials: 'include' // Важно для установки куки
      })
        .then(response => {
          if (response.ok) {
            console.log('✅ Реферальный клик отслежен:', ref);
            // Дополнительно сохраняем код в localStorage для надежности
            localStorage.setItem('referralCode', ref);
          } else {
            console.error('❌ Ошибка отслеживания клика:', response.status);
          }
        })
        .catch(error => {
          console.error('❌ Ошибка при отслеживании реферального клика:', error);
        });
    }
  }, [searchParams]);

  return (
    <div className={`pt-0 md:pt-40 transition-all duration-1000 w-full overflow-x-hidden ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary-200 rounded-full opacity-30 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-accent-200 rounded-full opacity-40 animate-bounce"></div>
        <div className="absolute bottom-40 left-1/4 w-16 h-16 bg-success-200 rounded-full opacity-35 animate-ping"></div>
        <div className="absolute top-1/2 right-1/3 w-20 h-20 bg-warning-200 rounded-full opacity-30 animate-spin"></div>
      </div>
      
      <Hero />
      <Categories />
      <FeaturedProducts />
      <Newsletter />
    </div>
  );
}

export default function Home() {
  return (
    <Layout>
      <Suspense fallback={<div>Загрузка...</div>}>
        <HomeContent />
      </Suspense>
    </Layout>
  );
} 