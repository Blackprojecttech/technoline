'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';

interface Category {
  _id: string;
  name: string;
  slug: string;
  children?: Category[];
}

interface DisplayCategory {
  _id?: string;
  name: string;
  slug: string;
  children?: Category[];
}

export default function PopularCategories() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [isSubmenuHovered, setIsSubmenuHovered] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { categories, loading } = useCategories();

  // Получаем популярные категории (первые 8)
  const popularCategories = categories.slice(0, 8);

  // Фильтруем и заменяем категории для отображения
  const displayCategories: DisplayCategory[] = popularCategories.map(category => {
    // Заменяем аксессуары на игровые приставки
    if (category.slug === 'aksessuary') {
      // Находим категорию игровых приставок в API
      const gamingCategory = categories.find(cat => cat.slug === 'igrovye-pristavki');
      return {
        _id: category._id,
        name: 'Игровые приставки',
        slug: 'igrovye-pristavki',
        children: gamingCategory?.children || []
      };
    }
    return category;
  });

  // Добавляем недостающие категории с их подкатегориями из API
  const additionalCategories: DisplayCategory[] = [
    { 
      name: 'Техника для дома', 
      slug: 'tehnika-dlya-doma',
      children: categories.find(cat => cat.slug === 'tehnika-dlya-doma')?.children
    },
    { 
      name: 'Компьютерное оборудование', 
      slug: 'kompyuternoe-oborudovanie',
      children: categories.find(cat => cat.slug === 'kompyuternoe-oborudovanie')?.children
    }
  ];

  // Берем первые 4 категории + добавляем недостающие
  const firstFourCategories = displayCategories.slice(0, 4);
  const finalCategories = [...firstFourCategories, ...additionalCategories.slice(0, 2)];

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCategoryMouseEnter = (categoryId: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setHoveredCategory(categoryId);
    setIsSubmenuHovered(false);
  };

  const handleCategoryMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      if (!isSubmenuHovered) {
        setHoveredCategory(null);
      }
    }, 150);
  };

  const handleSubmenuMouseEnter = () => {
    setIsSubmenuHovered(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleSubmenuMouseLeave = () => {
    setIsSubmenuHovered(false);
    setHoveredCategory(null);
  };

  if (loading) {
    return (
      <div className="sticky top-32 z-40 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-24 z-40 bg-white/60 backdrop-blur-sm border-b border-gray-200 shadow-sm hidden md:block">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-6">
            {/* Показываем первые 4 категории с hover эффектом */}
            <div className="hidden md:flex items-center space-x-6">
              {finalCategories.map((category) => (
                <div 
                  key={category._id || category.slug}
                  className="relative"
                  onMouseEnter={() => handleCategoryMouseEnter(category._id || category.slug)}
                  onMouseLeave={handleCategoryMouseLeave}
                >
                  <Link
                    href={`/catalog/${category.slug}`}
                    className="text-sm text-gray-600 hover:text-primary-600 transition-colors duration-200"
                  >
                    {category.name}
                  </Link>
                  
                  {/* Подкатегории при hover */}
                  {hoveredCategory === (category._id || category.slug) && category.children && category.children.length > 0 && (
                    <div 
                      className="absolute top-full left-0 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg mt-1 min-w-48 z-50"
                      onMouseEnter={handleSubmenuMouseEnter}
                      onMouseLeave={handleSubmenuMouseLeave}
                    >
                      <div className="p-3">
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {category.children.map((subCategory: Category) => (
                            <Link
                              key={subCategory._id}
                              href={`/catalog/${subCategory.slug}`}
                              className="text-sm text-gray-600 hover:text-primary-600 transition-colors duration-200 block py-1"
                            >
                              {subCategory.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Кнопка "Показать еще" с кликом */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700 transition-colors duration-200"
          >
            <span>{isExpanded ? 'Скрыть' : 'Показать еще'}</span>
            {isExpanded ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </button>
        </div>

        {/* Раскрывающиеся категории при клике */}
        {isExpanded && (
          <div className="border-t border-gray-100 py-4 bg-white/95 backdrop-blur-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {popularCategories.map((category) => (
                <Link
                  key={category._id}
                  href={`/catalog/${category.slug}`}
                  className="text-sm text-gray-600 hover:text-primary-600 transition-colors duration-200 py-1"
                >
                  {category.name}
                </Link>
              ))}
            </div>
            
            {/* Ссылка на все категории */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <Link
                href="/catalog"
                className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors duration-200"
              >
                Все категории →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 