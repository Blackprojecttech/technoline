'use client';

import Layout from '@/components/layout/Layout';
import CategoryProducts from '@/components/CategoryProducts';
import CatalogFilters, { CatalogFiltersState } from '@/components/CatalogFilters';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function CatalogPage() {
  const searchParams = useSearchParams();
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

  // Обработка реферальной ссылки
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      // Отправляем запрос для отслеживания клика
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/referrals/track?ref=${ref}`, {
        method: 'GET',
        credentials: 'include' // Включаем куки
      })
        .then(response => {
          if (response.ok) {
            console.log('✅ Реферальный клик отслежен в каталоге:', ref);
            // Дополнительно сохраняем код в localStorage для надежности
            localStorage.setItem('referralCode', ref);
          } else {
            console.error('❌ Ошибка отслеживания клика в каталоге:', response.status);
          }
        })
        .catch(error => {
          console.error('Ошибка при отслеживании реферального клика:', error);
        });
    }
  }, [searchParams]);

  // Цветовые и технические синонимы для фильтрации моделей (как в [slug]/page.tsx)
  const COLOR_SYNONYMS = [
    'черный', 'black', 'midnight', 'phantom black', 'graphite',
    'белый', 'white',
    'серебристый', 'silver',
    'синий', 'blue', 'pacific blue', 'navy', 'dark blue',
    'красный', 'red',
    'зеленый', 'green',
    'серый', 'gray', 'grey', 'space gray', 'space grey',
    'золотой', 'gold', 'golden', 'starlight',
    'розовый', 'pink', 'rose gold',
    'фиолетовый', 'purple', 'violet', 'deep purple', 'lavender',
    'оранжевый', 'orange',
  ];
  const TECH_SYNONYMS = [
    'usb', 'magsafe', 'bluetooth', 'case', 'charging', 'wireless', 'lightning', 'type-c', 'type c', 'typec', 'c', 'with', 'and', 'наушники', 'гарнитура', 'наушник', 'чехол', 'зарядка', 'корпус', 'адаптер', 'адаптеры', 'провод', 'кабель', 'mic', 'microphone', 'микрофон', 'аккумулятор', 'батарея', 'power', 'protection', 'защита', 'plus', 'premium', 'original', 'оригинал', 'oem', 'copy', 'копия', 'новый', 'new', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015', '2014', '2013', '2012', '2011', '2010'
  ];

  // Получаем уникальные модели из товаров
  const modelButtons = useMemo(() => {
    if (!products || products.length === 0) return [];
    const models = products.map(p => {
      let name = p.name;
      [...COLOR_SYNONYMS, ...TECH_SYNONYMS].forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        name = name.replace(regex, '');
      });
      name = name.replace(/[\(\)\[\]\{\}\-_,.?!:;"'`~@#$%^&*+=<>\/\\|]/g, '');
      name = name.replace(/\s{2,}/g, ' ').replace(/^[,\s]+|[,\s]+$/g, '');
      const match = name.match(/Apple\s+([A-Za-z0-9 ]+(?: [A-Za-z0-9]+)?)/i);
      if (match && match[1]) return toTitleCase(match[1].trim());
      const airpods = name.match(/Airpods[^,]*/i);
      if (airpods) return toTitleCase(airpods[0].trim());
      const earpods = name.match(/Earpods[^,]*/i);
      if (earpods) return toTitleCase(earpods[0].trim());
      return null;
    }).filter(Boolean);
    function toTitleCase(str: string) {
      return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }
    return Array.from(new Set(models));
  }, [products]);

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
          
          {/* Быстрые кнопки фильтрации по моделям */}
          {modelButtons.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 md:mb-6">
              <button
                key="all-models"
                className={`px-3 md:px-4 py-2 md:py-1 rounded-xl md:rounded-full border text-xs md:text-sm font-medium transition-colors duration-200
                  ${!filters.searchQuery ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-primary-50'}`}
                onClick={() => setFilters(f => ({ ...f, searchQuery: '' }))}
              >
                Все
              </button>
              {modelButtons.map(model => (
                <button
                  key={model}
                  className={`px-3 md:px-4 py-2 md:py-1 rounded-xl md:rounded-full border text-xs md:text-sm font-medium transition-colors duration-200
                    ${filters.searchQuery === model ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-primary-50'}`}
                  onClick={() => setFilters(f => ({ ...f, searchQuery: model || '' }))}
                >
                  {model}
                </button>
              ))}
            </div>
          )}
          <CategoryProducts
            categorySlug={''}
            filters={filters}
            onProductsLoaded={setProducts}
          />
        </section>
      </div>
    </Layout>
  );
} 