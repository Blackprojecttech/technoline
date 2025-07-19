'use client';
 
import { useState } from 'react';
import Link from 'next/link';
import { Smartphone, Laptop, Tablet, Headphones, Watch, Camera } from 'lucide-react';

export default function Categories() {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const categories = [
    {
      id: 'smartphones',
      name: 'Смартфоны',
      description: 'Новейшие модели с мощными процессорами',
      icon: Smartphone,
      color: 'from-primary-500 to-accent-500',
      bgColor: 'bg-primary-50',
      borderColor: 'border-primary-200',
      count: '150+ моделей'
    },
    {
      id: 'laptops',
      name: 'Ноутбуки',
      description: 'Игровые и рабочие ноутбуки',
      icon: Laptop,
      color: 'from-success-500 to-primary-500',
      bgColor: 'bg-success-50',
      borderColor: 'border-success-200',
      count: '80+ моделей'
    },
    {
      id: 'tablets',
      name: 'Планшеты',
      description: 'Планшеты для работы и развлечений',
      icon: Tablet,
      color: 'from-warning-500 to-accent-500',
      bgColor: 'bg-warning-50',
      borderColor: 'border-warning-200',
      count: '45+ моделей'
    },
    {
      id: 'accessories',
      name: 'Аксессуары',
      description: 'Наушники, чехлы и другие аксессуары',
      icon: Headphones,
      color: 'from-primary-500 to-success-500',
      bgColor: 'bg-primary-50',
      borderColor: 'border-primary-200',
      count: '200+ товаров'
    },
    {
      id: 'smartwatches',
      name: 'Умные часы',
      description: 'Отслеживайте здоровье и активность',
      icon: Watch,
      color: 'from-success-500 to-accent-500',
      bgColor: 'bg-success-50',
      borderColor: 'border-success-200',
      count: '30+ моделей'
    },
    {
      id: 'cameras',
      name: 'Фототехника',
      description: 'Камеры и объективы для профессионалов',
      icon: Camera,
      color: 'from-warning-500 to-error-500',
      bgColor: 'bg-warning-50',
      borderColor: 'border-warning-200',
      count: '60+ товаров'
    }
  ];

  return (
    <section className="py-20 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 to-accent-50/50"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-secondary-800 mb-4">
            Популярные категории
          </h2>
          <p className="text-xl text-secondary-600 max-w-2xl mx-auto">
            Выберите категорию и найдите идеальный товар для себя
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map((category) => {
            const IconComponent = category.icon;
            return (
              <Link
                key={category.id}
                href={`/catalog/${category.id}`}
                className={`group relative overflow-hidden rounded-2xl border ${category.borderColor} ${category.bgColor} p-8 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-primary-500/25 bg-white`}
                onMouseEnter={() => setHoveredCategory(category.id)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                
                {/* Animated background elements */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className={`absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br ${category.color} rounded-full opacity-10 group-hover:opacity-20 transition-all duration-500 group-hover:scale-150`}></div>
                  <div className={`absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br ${category.color} rounded-full opacity-10 group-hover:opacity-20 transition-all duration-500 group-hover:scale-150`}></div>
                </div>

                <div className="relative z-10">
                  {/* Icon */}
                  <div className={`w-16 h-16 bg-gradient-to-br ${category.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <IconComponent size={32} className="text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-secondary-800 mb-3 group-hover:text-primary-600 transition-colors duration-300">
                    {category.name}
                  </h3>
                  
                  <p className="text-secondary-600 mb-4 group-hover:text-secondary-700 transition-colors duration-300">
                    {category.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-secondary-500 font-medium">
                      {category.count}
                    </span>
                    
                    {/* Arrow icon */}
                    <div className={`w-8 h-8 bg-gradient-to-br ${category.color} rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Hover effect overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
              </Link>
            );
          })}
        </div>

        {/* View all categories button */}
        <div className="text-center mt-12">
          <Link
            href="/catalog"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-semibold rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg"
          >
            Смотреть все категории
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
} 