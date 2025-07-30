'use client';

import { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import CategoryProducts from '@/components/CategoryProducts';
import CatalogFilters, { CatalogFiltersState } from '@/components/CatalogFilters';
import { useFavorites } from '@/hooks/useFavorites';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

export default function FavoritesPage() {
  const { favorites } = useFavorites();
  const [mounted, setMounted] = useState(false);
  const [filters, setFilters] = useState<CatalogFiltersState>({
    searchQuery: '',
    priceMin: '',
    priceMax: '',
    inStock: true,
    brand: '',
    rating: '',
    onlyDiscount: false,
    colors: [],
  });
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-4 md:py-8 flex gap-8 pt-16 md:pt-40">
          {/* Фильтры слева - скелетон */}
          <aside className="w-72 shrink-0 hidden lg:block">
            <div className="bg-white rounded-2xl shadow p-6 mb-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </aside>
          
          {/* Товары - скелетон */}
          <section className="flex-1 min-w-0">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
                  <div className="aspect-square bg-gray-200"></div>
                  <div className="p-3">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </Layout>
    );
  }

  if (favorites.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-4 md:py-8 flex gap-8 pt-16 md:pt-40">
          {/* Фильтры слева - пустые */}
          <aside className="w-72 shrink-0 hidden lg:block">
            <div className="bg-white rounded-2xl shadow p-6 mb-6">
              <p className="text-gray-500 text-sm">Добавьте товары в избранное, чтобы использовать фильтры</p>
            </div>
          </aside>
          
          {/* Пустое состояние */}
          <section className="flex-1 min-w-0">
            <div className="flex flex-col items-center justify-center py-20">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-24 h-24 bg-gradient-to-r from-primary-100 to-accent-100 rounded-full flex items-center justify-center mb-6"
              >
                <Heart className="w-12 h-12 text-primary-600" />
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Список желаний пуст</h2>
              <p className="text-gray-600 text-center mb-8 max-w-md">
                Добавляйте товары в избранное, чтобы не потерять их и быстро найти позже
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-primary-500 to-accent-500 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() => window.location.href = '/catalog'}
              >
                Перейти в каталог
              </motion.button>
            </div>
          </section>
        </div>
      </Layout>
    );
  }

     return (
     <Layout>
       <div className="container mx-auto px-4 py-4 md:py-8 flex gap-8 pt-16 md:pt-40">
         {/* Фильтры слева - скрыты на мобильных */}
         <aside className="w-72 shrink-0 hidden lg:block">
           <div className="bg-white rounded-2xl shadow p-6 mb-6">
             {products.length > 0 && (
               <CatalogFilters filters={filters} onChange={setFilters} hideBrandFilter={true} products={products} />
             )}
           </div>
         </aside>
         
         {/* Правая часть: товары */}
         <section className="flex-1 min-w-0">
           {/* Мобильная кнопка фильтров */}
           <div className="lg:hidden mb-4">
             <button className="w-full btn-secondary rounded-xl py-3 text-left flex items-center justify-between">
               <span>Фильтры</span>
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707v4.586a1 1 0 01-.293.707l-2 2A1 1 0 0111 21v-6.586a1 1 0 00-.293-.707L4.293 7.293A1 1 0 014 6.586V4z" />
               </svg>
             </button>
           </div>
           
           <CategoryProducts 
             categorySlug="" 
             filters={filters}
             favoritesOnly={true}
             favoriteIds={favorites}
             onProductsLoaded={setProducts}
           />
         </section>
       </div>
     </Layout>
   );
} 