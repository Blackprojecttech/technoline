'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import CategoryTree from '@/components/layout/CategoryTree';
import Footer from '@/components/layout/Footer';
import { ShoppingBag, Star, Truck, Shield, CreditCard, Headphones, Smartphone, Laptop, Tablet, Watch } from 'lucide-react';
import { motion } from 'framer-motion';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  children?: Category[];
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('http://localhost:5002/api/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

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
    }
  ];

  // Функция для получения реальных популярных категорий
  const getPopularCategories = () => {
    if (!categories.length) return popularCategories;
    
    // Берем первые 5 категорий из базы данных
    return categories.slice(0, 5).map((category, index) => {
      const iconMap: { [key: string]: any } = {
        'mobilnye-telefony': Smartphone,
        'noutbuki': Laptop,
        'planshety': Tablet,
        'umnye-chasy': Watch,
        'aksessuary': Headphones,
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
        "from-teal-500 to-cyan-600"
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
  };

  const benefits = [
    { icon: Shield, text: "Официальная гарантия на все товары", delay: 0.1 },
    { icon: Truck, text: "Быстрая доставка по всей России", delay: 0.2 },
    { icon: Star, text: "Профессиональная консультация", delay: 0.3 },
    { icon: CreditCard, text: "Удобные способы оплаты", delay: 0.4 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-light-50 to-accent-50">
      <Header />
      <main className="pt-32 pb-16">
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
                        <div className="bg-white border border-light-200 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
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

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Categories Tree */}
              <motion.div 
                className="lg:col-span-1"
                variants={itemVariants}
              >
                <motion.div 
                  className="bg-white border border-light-200 rounded-2xl shadow-lg p-8"
                  variants={cardVariants}
                  whileHover="hover"
                >
                  <h2 className="text-2xl font-bold text-secondary-800 mb-6 flex items-center">
                    <ShoppingBag className="mr-3 text-primary-600" />
                    Все категории
                  </h2>
                  <CategoryTree />
                </motion.div>
              </motion.div>

              {/* Benefits Section */}
              <motion.div 
                className="lg:col-span-1"
                variants={itemVariants}
              >
                <motion.div 
                  className="bg-white border border-light-200 rounded-2xl shadow-lg p-8"
                  variants={cardVariants}
                  whileHover="hover"
                >
                  <h2 className="text-2xl font-bold text-secondary-800 mb-8">
                    Почему выбирают нас?
                  </h2>
                  
                  <div className="space-y-6">
                    {benefits.map((benefit, index) => (
                      <motion.div
                        key={index}
                        className="flex items-start space-x-4 group"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: benefit.delay }}
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <benefit.icon className="text-white text-xl" />
                        </div>
                        <div className="flex-1">
                          <p className="text-secondary-700 font-medium group-hover:text-primary-600 transition-colors duration-300">
                            {benefit.text}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Stats Section */}
                  <motion.div 
                    className="mt-8 pt-6 border-t border-light-200"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <h3 className="text-lg font-semibold text-secondary-800 mb-4">
                      Наши достижения
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-gradient-to-br from-primary-50 to-accent-50 rounded-xl">
                        <div className="text-2xl font-bold text-primary-600">10K+</div>
                        <div className="text-sm text-secondary-600">Довольных клиентов</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-success-50 to-primary-50 rounded-xl">
                        <div className="text-2xl font-bold text-success-600">24/7</div>
                        <div className="text-sm text-secondary-600">Поддержка</div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>

            {/* Call to Action */}
            <motion.div 
              className="mt-16 text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <div className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-4">
                  Готовы найти идеальный товар?
                </h3>
                <p className="text-lg mb-6 opacity-90">
                  Изучите наш каталог и выберите то, что подходит именно вам
                </p>
                <Link href="/products">
                  <motion.button
                    className="bg-white text-primary-600 font-semibold py-3 px-8 rounded-xl hover:bg-light-50 transition-colors duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Начать покупки
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
} 