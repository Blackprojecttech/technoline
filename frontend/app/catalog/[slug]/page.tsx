'use client';

import Layout from '@/components/layout/Layout';
import CategoryProducts from '@/components/CategoryProducts';
import CatalogFilters, { CatalogFiltersState } from '@/components/CatalogFilters';
import { useState, useMemo } from 'react';

export default function CategoryPage({ params }: { params: { slug?: string } }) {
  const slug = params?.slug || '';
  const isAll = !slug || slug === 'all';
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
  const [productsInCategory, setProductsInCategory] = useState<any[]>([]);

  // Цветовые синонимы для удаления из модели
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

  // Технические синонимы для удаления из модели
  const TECH_SYNONYMS = [
    'usb', 'magsafe', 'bluetooth', 'case', 'charging', 'wireless', 'lightning', 'type-c', 'type c', 'typec', 'c', 'with', 'and', 'наушники', 'гарнитура', 'наушник', 'чехол', 'зарядка', 'корпус', 'адаптер', 'адаптеры', 'провод', 'кабель', 'mic', 'microphone', 'микрофон', 'аккумулятор', 'батарея', 'power', 'protection', 'защита', 'plus', 'premium', 'original', 'оригинал', 'oem', 'copy', 'копия', 'новый', 'new', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015', '2014', '2013', '2012', '2011', '2010'
  ];

  // Получаем уникальные модели из товаров (например, Airpods 3, Airpods Max 2024)
  const modelButtons = useMemo(() => {
    // Берём только товары этой категории
    const products = productsInCategory;
    if (!products || products.length === 0) return [];
    const models = products.map(p => {
      let name = p.name;
      // Удаляем все синонимы цветов и технические слова из названия
      [...COLOR_SYNONYMS, ...TECH_SYNONYMS].forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        name = name.replace(regex, '');
      });
      // Удаляем все скобки, дефисы, запятые, точки и другие неалфавитно-цифровые символы
      name = name.replace(/[\(\)\[\]\{\}\-_,.?!:;"'`~@#$%^&*+=<>\/\\|]/g, '');
      // Удаляем лишние пробелы
      name = name.replace(/\s{2,}/g, ' ').replace(/^[,\s]+|[,\s]+$/g, '');
      // Пример: ищем подстроку после 'Apple ' и до конца строки
      const match = name.match(/Apple\s+([A-Za-z0-9 ]+(?: [A-Za-z0-9]+)?)/i);
      if (match && match[1]) return toTitleCase(match[1].trim());
      // Альтернатива: ищем Airpods ...
      const airpods = name.match(/Airpods[^,]*/i);
      if (airpods) return toTitleCase(airpods[0].trim());
      const earpods = name.match(/Earpods[^,]*/i);
      if (earpods) return toTitleCase(earpods[0].trim());
      return null;
    }).filter(Boolean);

    function toTitleCase(str: string) {
      return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }
    // Уникальные модели
    return Array.from(new Set(models));
  }, [productsInCategory]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 flex gap-8 pt-40">
        {/* Фильтры слева */}
        <aside className="w-72 shrink-0 hidden lg:block">
          <div className="bg-white rounded-2xl shadow p-6 mb-6">
            {productsInCategory.length > 0 && (
              <CatalogFilters filters={filters} onChange={setFilters} hideBrandFilter={true} products={productsInCategory} />
            )}
          </div>
        </aside>
        {/* Правая часть: товары */}
        <section className="flex-1 min-w-0">
          {/* Быстрые кнопки фильтрации по моделям */}
          {modelButtons.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                key="all-models"
                className={`px-4 py-1 rounded-full border text-sm font-medium transition-colors duration-200
                  ${!filters.searchQuery ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-primary-50'}`}
                onClick={() => setFilters(f => ({ ...f, searchQuery: '' }))}
              >
                Все
              </button>
              {modelButtons.map(model => (
                <button
                  key={model}
                  className={`px-4 py-1 rounded-full border text-sm font-medium transition-colors duration-200
                    ${filters.searchQuery === model ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-primary-50'}`}
                  onClick={() => setFilters(f => ({ ...f, searchQuery: model }))}
                >
                  {model}
                </button>
              ))}
            </div>
          )}
          <CategoryProducts categorySlug={isAll ? '' : slug} filters={filters} onProductsLoaded={setProductsInCategory} />
        </section>
      </div>
    </Layout>
  );
} 