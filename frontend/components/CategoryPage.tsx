'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ShoppingCart, Check } from 'lucide-react';
import Link from 'next/link';
import Layout from './layout/Layout';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { addItem } from '../store/slices/cartSlice';
import { fixImageUrl } from '../utils/imageUrl';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  mainImage: string;
  slug: string;
  isActive: boolean;
  inStock: boolean;
  sku?: string;
}

interface Category {
  _id: string;
  name: string;
  description: string;
  slug: string;
}

interface CategoryPageProps {
  slug: string;
}

export default function CategoryPage({ slug }: CategoryPageProps) {
  const dispatch = useDispatch();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [flyingItems, setFlyingItems] = useState<Set<string>>(new Set());
  const [showSuccess, setShowSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log(`🔍 CategoryPage: Starting fetch for slug: ${slug}`);
        
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://technoline-api.loca.lt/api';
        
        // Получаем информацию о категории
        const categoryResponse = await fetch(`${API_BASE_URL}/categories/${slug}`);
        console.log(`📡 CategoryPage: Category response status: ${categoryResponse.status}`);
        
        if (!categoryResponse.ok) {
          throw new Error('Категория не найдена');
        }
        
        const categoryData = await categoryResponse.json();
        console.log(`✅ CategoryPage: Category data:`, categoryData);
        setCategory(categoryData);

        // Получаем товары категории
        const productsResponse = await fetch(`${API_BASE_URL}/products/category/${slug}`);
        console.log(`📡 CategoryPage: Products response status: ${productsResponse.status}`);
        
        if (!productsResponse.ok) {
          throw new Error('Не удалось загрузить товары');
        }
        
        const productsData = await productsResponse.json();
        console.log(`✅ CategoryPage: Products data:`, productsData);
        setProducts(productsData.products || []);
        
      } catch (err) {
        console.error('❌ CategoryPage: Error:', err);
        setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  const handleAddToCart = async (product: Product, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (addingToCart === product._id) return;
    
    setAddingToCart(product._id);
    
    // Имитация загрузки
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Анимация "улетания" к корзине
    setFlyingItems(prev => new Set(Array.from(prev).concat(product._id)));
    
    // Добавляем товар в корзину
    dispatch(addItem({
      _id: product._id,
      name: product.name,
      price: product.price,
      image: product.mainImage || product.images[0],
      quantity: 1,
      sku: product.sku || 'SKU-' + product._id
    }));
    
    // Показываем успех
    setTimeout(() => {
      setFlyingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(product._id);
        return newSet;
      });
      setAddingToCart(null);
      setShowSuccess(product._id);
      
      // Скрываем сообщение об успехе через 2 секунды
      setTimeout(() => {
        setShowSuccess(null);
      }, 2000);
    }, 800);
  };

  if (loading) {
    return (
      <Layout>
        <div className="pt-32 pb-20">
          <div className="container mx-auto px-4">
            <div className="animate-pulse">
              <div className="h-8 bg-light-200 rounded-lg mb-4 w-1/3"></div>
              <div className="h-4 bg-light-200 rounded-lg mb-8 w-1/2"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-6 shadow-lg">
                    <div className="h-48 bg-light-200 rounded-lg mb-4"></div>
                    <div className="h-4 bg-light-200 rounded-lg mb-2"></div>
                    <div className="h-4 bg-light-200 rounded-lg mb-2 w-2/3"></div>
                    <div className="h-6 bg-light-200 rounded-lg w-1/3"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="pt-32 pb-20">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-8 shadow-lg max-w-md mx-auto"
              >
                <h2 className="text-2xl font-bold text-secondary-800 mb-4">Ошибка</h2>
                <p className="text-secondary-600 mb-6">{error}</p>
                <Link
                  href="/catalog"
                  className="inline-flex items-center px-6 py-3 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors"
                >
                  <ArrowLeft size={20} className="mr-2" />
                  Вернуться к каталогу
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <motion.nav
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8"
          >
            <ol className="flex items-center space-x-2 text-sm text-secondary-600">
              <li>
                <Link href="/" className="hover:text-primary-600 transition-colors">
                  Главная
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/catalog" className="hover:text-primary-600 transition-colors">
                  Каталог
                </Link>
              </li>
              <li>/</li>
              <li className="text-secondary-800 font-medium">{category?.name}</li>
            </ol>
          </motion.nav>

          {/* Category Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl lg:text-5xl font-bold text-secondary-800 mb-4">
              {category?.name}
            </h1>
            {category?.description && (
              <p className="text-xl text-secondary-600 max-w-2xl mx-auto">
                {category.description}
              </p>
            )}
          </motion.div>

          {/* Products Grid */}
          {products.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {products.map((product, index) => (
                <Link
                  key={product._id}
                  href={`/product/${product.slug}`}
                  className="block"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer"
                  >
                    {/* Product Image */}
                    <div className="relative mb-4 overflow-hidden rounded-lg">
                      <img
                        src={fixImageUrl(product.mainImage || product.images[0])}
                        alt={product.name}
                        className="w-full h-48 object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                      {!product.inStock && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                          Нет в наличии
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <h3 className="text-lg font-semibold text-secondary-800 mb-2 group-hover:text-primary-600 transition-colors">
                      {product.name}
                    </h3>
                    
                    <p className="text-secondary-600 text-sm mb-4 line-clamp-2">
                      {product.description}
                    </p>

                    {/* Price and Actions */}
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary-600">
                        {product.price.toLocaleString()} ₽
                      </span>
                      
                      <motion.button 
                        className={`p-2 rounded-full transition-colors ${
                          addingToCart === product._id 
                            ? 'bg-green-500 text-white' 
                            : 'bg-primary-500 text-white hover:bg-primary-600'
                        }`}
                        onClick={(e) => handleAddToCart(product, e)}
                        disabled={addingToCart === product._id}
                        whileHover={addingToCart !== product._id ? { scale: 1.1 } : {}}
                        whileTap={addingToCart !== product._id ? { scale: 0.9 } : {}}
                      >
                        <AnimatePresence mode="wait">
                          {addingToCart === product._id ? (
                            <motion.div
                              key="loading"
                              initial={{ opacity: 0, rotate: -180 }}
                              animate={{ opacity: 1, rotate: 0 }}
                              exit={{ opacity: 0, rotate: 180 }}
                              transition={{ duration: 0.3 }}
                            >
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              >
                                <ShoppingCart size={20} />
                              </motion.div>
                            </motion.div>
                          ) : showSuccess === product._id ? (
                            <motion.div
                              key="success"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Check size={20} />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="normal"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <ShoppingCart size={20} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md mx-auto">
                <h3 className="text-xl font-semibold text-secondary-800 mb-4">
                  Товары не найдены
                </h3>
                <p className="text-secondary-600 mb-6">
                  В данной категории пока нет товаров
                </p>
                <Link
                  href="/catalog"
                  className="inline-flex items-center px-6 py-3 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors"
                >
                  <ArrowLeft size={20} className="mr-2" />
                  Вернуться к каталогу
                </Link>
              </div>
            </motion.div>
          )}

          {/* Анимированные элементы, летящие к корзине */}
          <AnimatePresence>
            {Array.from(flyingItems).map((productId) => {
              const product = products.find(p => p._id === productId);
              if (!product) return null;
              
              return (
                <motion.div
                  key={productId}
                  initial={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    width: 40,
                    height: 40,
                    zIndex: 1000,
                    scale: 1,
                    opacity: 1,
                    x: '-50%',
                    y: '-50%',
                  }}
                  animate={{
                    top: 20, // Позиция корзины в хедере
                    left: window.innerWidth - 80, // Правая часть экрана
                    scale: 0.2,
                    opacity: 0,
                    rotate: 360,
                    x: 0,
                    y: 0,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ 
                    duration: 1.2, 
                    ease: [0.25, 0.46, 0.45, 0.94],
                    scale: {
                      duration: 1.2,
                      ease: "easeInOut"
                    },
                    rotate: {
                      duration: 1.2,
                      ease: "easeInOut"
                    }
                  }}
                  className="bg-primary-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
                  style={{
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <ShoppingCart className="w-5 h-5 text-white" />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
} 