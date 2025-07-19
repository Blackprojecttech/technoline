'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import Hero from '@/components/home/Hero';
import Categories from '@/components/home/Categories';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import Newsletter from '@/components/home/Newsletter';

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <Layout>
      <div className={`pt-16 transition-all duration-1000 w-full overflow-x-hidden ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
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
    </Layout>
  );
} 