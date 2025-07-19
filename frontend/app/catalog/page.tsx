'use client';

import { useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import CategoryTree from '@/components/layout/CategoryTree';
import { ShoppingBag, Star, Truck, Shield, CreditCard, Headphones, Smartphone, Laptop, Tablet, Watch } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCategories } from '@/hooks/useCategories';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  children?: Category[];
}

export default function CatalogPage() {
  const { categories, loading, error } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    },
    hover: {
      scale: 1.05,
      transition: {
        duration: 0.3
      }
    }
  };

  const popularCategories = [
    {
      icon: Smartphone,
      title: "Мобильные телефоны",
      description: "Широкий выбор смартфонов от ведущих производителей",
      color: "from-blue-500 to-purple-600",
      delay: 0.1,
      slug: "mobilnye-telefony"
    },
    {
      icon: Laptop,
      title: "Ноутбуки",
      description: "Игровые, бизнес и ультрабуки для любых задач",
      color: "from-green-500 to-blue-600",
      delay: 0.2,
      slug: "noutbuki"
    },
    {
      icon: Tablet,
      title: "Планшеты",
      description: "iPad, Android и Windows планшеты для работы и развлечений",
      color: "from-orange-500 to-red-600",
      delay: 0.3,
      slug: "planshety"
    },
    {
      icon: Watch,
      title: "Умные часы",
      description: "Современные гаджеты для здоровья и стиля",
      color: "from-purple-500 to-pink-600",
      delay: 0.4,
      slug: "umnye-chasy"
    },
    {
      icon: Headphones,
      title: "Аксессуары",
      description: "Наушники, чехлы, зарядные устройства и другие аксессуары",
      color: "from-teal-500 to-cyan-600",
      delay: 0.5,
      slug: "aksessuary"
    },
    {
      icon: Laptop,
      title: "Компьютерное оборудование",
      description: "Мониторы, клавиатуры, мыши и другие комплектующие",
      color: "from-indigo-500 to-blue-600",
      delay: 0.6,
      slug: "kompyuternoe-oborudovanie"
    }
  ];

  // Функция для получения реальных популярных категорий
  const getPopularCategories = () => {
    if (!categories.length) return popularCategories;
    
    // Берем первые 6 категорий из базы данных
    const dbCategories = categories.slice(0, 6).map((category, index) => {
      const iconMap: { [key: string]: any } = {
        'mobilnye-telefony': Smartphone,
        'noutbuki': Laptop,
        'planshety': Tablet,
        'umnye-chasy': Watch,
        'aksessuary': Headphones,
        'kompyuternoe-oborudovanie': Laptop,
        'iphone': Smartphone,
        'samsung': Smartphone,
        'xiaomi': Smartphone,
        'honor': Smartphone,
        'default': ShoppingBag
      };

      const colorMap = [
        "from-blue-500 to-purple-600",
        "from-green-500 to-blue-600", 
        "from-orange-500 to-red-600",
        "from-purple-500 to-pink-600",
        "from-teal-500 to-cyan-600",
        "from-indigo-500 to-blue-600"
      ];

      const Icon = iconMap[category.slug] || iconMap['default'];
      const color = colorMap[index % colorMap.length];

      return {
        icon: Icon,
        title: category.name,
        description: category.description || `Товары в категории ${category.name}`,
        color,
        delay: (index + 1) * 0.1,
        slug: category.slug
      };
    });

    // Если категорий из базы меньше 6, добавляем статичные
    if (dbCategories.length < 6) {
      const remainingCount = 6 - dbCategories.length;
      const staticCategories = popularCategories.slice(0, remainingCount);
      return [...dbCategories, ...staticCategories];
    }

    return dbCategories;
  };

  const benefits = [
    { icon: Shield, text: "Официальная гарантия на все товары", delay: 0.1 },
    { icon: Truck, text: "Быстрая доставка по всей России", delay: 0.2 },
    { icon: Star, text: "Профессиональная консультация", delay: 0.3 },
    { icon: CreditCard, text: "Удобные способы оплаты", delay: 0.4 }
  ];

  return (
    <Layout>
      <div className="pt-32 pb-16">
        <motion.div 
          className="container mx-auto px-4 py-12"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div 
            className="max-w-6xl mx-auto"
            variants={itemVariants}
          >
            {/* Hero Section */}
            <motion.div 
              className="text-center mb-16"
              variants={itemVariants}
            >
              <motion.h1 
                className="text-5xl lg:text-6xl font-bold text-secondary-800 mb-6"
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                Каталог товаров
              </motion.h1>
              <motion.p 
                className="text-xl text-secondary-600 max-w-3xl mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                Откройте мир современных технологий с нашим обширным каталогом товаров
              </motion.p>
            </motion.div>

            {/* Popular Categories Grid */}
            <motion.div 
              className="mb-16"
              variants={itemVariants}
            >
              <motion.h2 
                className="text-3xl font-bold text-secondary-800 mb-8 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                Популярные категории
              </motion.h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getPopularCategories().map((category, index) => (
                  <motion.div
                    key={index}
                    className="group cursor-pointer"
                    variants={cardVariants}
                    whileHover="hover"
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: category.delay }}
                  >
                    <Link href={`/catalog/${category.slug}`}>
                      <div className={`bg-white border border-light-200 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2`}>
                        <div className={`w-16 h-16 bg-gradient-to-br ${category.color} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <category.icon className="text-white text-2xl" />
                        </div>
                        <h3 className="text-xl font-bold text-secondary-800 mb-2 group-hover:text-primary-600 transition-colors duration-300">
                          {category.title}
                        </h3>
                        <p className="text-secondary-600 text-sm leading-relaxed">
                          {category.description}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Benefits Section */}
            <motion.div 
              className="mb-16"
              variants={itemVariants}
            >
              <motion.h2 
                className="text-3xl font-bold text-secondary-800 mb-8 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                Почему выбирают нас
              </motion.h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    className="text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: benefit.delay }}
                  >
                    <div className="bg-white border border-light-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <benefit.icon className="text-white text-xl" />
                      </div>
                      <p className="text-secondary-700 font-medium">
                        {benefit.text}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Category Tree Section */}
            <motion.div 
              className="mb-16"
              variants={itemVariants}
            >
              <motion.h2 
                className="text-3xl font-bold text-secondary-800 mb-8 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                Полный каталог
              </motion.h2>
              
              <div className="bg-white border border-light-200 rounded-2xl p-8 shadow-lg">
                <CategoryTree />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  );
} 