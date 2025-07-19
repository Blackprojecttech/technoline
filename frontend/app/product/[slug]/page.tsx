'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts } from '@/hooks/useProducts';
import Layout from '@/components/layout/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ShoppingCart, Heart, Share2, Truck, Shield, RotateCcw, Check } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store/store';
import { addItem } from '../../../store/slices/cartSlice';

export default function ProductPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user, isAuthenticated } = useAuth();
  const { products, loading, error } = useProducts();
  const dispatch = useDispatch();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [flyingItem, setFlyingItem] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const cartRef = useRef<HTMLDivElement>(null);

  // Находим товар по slug
  const product = products.find(p => p.slug === slug);

  // Отслеживание просмотра товара
  useEffect(() => {
    if (product && isAuthenticated && user) {
      const trackProductView = async () => {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/products/${product._id}/view`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          });
          
          if (response.ok) {
            console.log('✅ Product view tracked successfully');
          } else {
            console.error('❌ Failed to track product view');
          }
        } catch (error) {
          console.error('❌ Error tracking product view:', error);
        }
      };

      // Отправляем запрос через небольшую задержку, чтобы убедиться, что пользователь действительно смотрит товар
      const timer = setTimeout(trackProductView, 3000);
      return () => clearTimeout(timer);
    }
  }, [product, isAuthenticated, user]);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 pt-32">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="w-full h-96 bg-gray-200 rounded-lg"></div>
                <div className="grid grid-cols-4 gap-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-full h-20 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-12 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !product) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 pt-32">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Товар не найден</h1>
            <p className="text-gray-600">К сожалению, запрашиваемый товар не найден.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const handleAddToCart = async () => {
    if (product && !isAddingToCart) {
      setIsAddingToCart(true);
      
      // Имитация загрузки
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Анимация "улетания" к корзине
      setFlyingItem(true);
      
      // Добавляем товар в корзину
      dispatch(addItem({
        _id: product._id,
        name: product.name,
        price: product.price,
        image: product.mainImage,
        quantity: quantity,
        sku: product.sku || 'SKU-' + product._id
      }));
      
      // Показываем успех
      setTimeout(() => {
        setFlyingItem(false);
        setIsAddingToCart(false);
        setShowSuccess(true);
        
        // Скрываем сообщение об успехе через 2 секунды
        setTimeout(() => {
          setShowSuccess(false);
        }, 2000);
      }, 800);
    }
  };

  const handleAddToWishlist = () => {
    // Логика добавления в избранное
    console.log('Adding to wishlist:', product.name);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 pt-32">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Галерея изображений */}
          <div className="space-y-4">
            <div className="relative">
              <img
                src={product.mainImage}
                alt={product.name}
                className="w-full h-96 object-contain rounded-lg shadow-lg bg-white"
              />
              <div className="absolute top-4 right-4">
                <button
                  onClick={handleAddToWishlist}
                  className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                >
                  <Heart className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            
            {product.images && product.images.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-full h-20 object-cover rounded-lg border-2 transition-colors ${
                      selectedImage === index ? 'border-primary-500' : 'border-gray-200'
                    }`}
                  >
                    <img src={image} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover rounded" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Информация о товаре */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{product.name}</h1>
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-gray-600">(4.5)</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600">128 отзывов</span>
              </div>
            </div>

            <div className="text-3xl font-bold text-primary-600">
              {product.price.toLocaleString()} ₽
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label htmlFor="quantity" className="text-gray-700 font-medium">
                    Количество:
                  </label>
                  <select
                    id="quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {[...Array(10)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex space-x-4">
                <motion.button
                  ref={buttonRef}
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                  className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
                    isAddingToCart 
                      ? 'bg-green-600 text-white' 
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                  whileHover={!isAddingToCart ? { scale: 1.02 } : {}}
                  whileTap={!isAddingToCart ? { scale: 0.98 } : {}}
                >
                  <AnimatePresence mode="wait">
                    {isAddingToCart ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0, rotate: -180 }}
                        animate={{ opacity: 1, rotate: 0 }}
                        exit={{ opacity: 0, rotate: 180 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center space-x-2"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <ShoppingCart className="w-5 h-5" />
                        </motion.div>
                        <span>Добавляется...</span>
                      </motion.div>
                    ) : showSuccess ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center space-x-2"
                      >
                        <Check className="w-5 h-5" />
                        <span>Добавлено!</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="normal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center space-x-2"
                      >
                        <ShoppingCart className="w-5 h-5" />
                        <span>Добавить в корзину</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
                
                <button className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Share2 className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Анимированный элемент, летящий к корзине */}
              <AnimatePresence>
                {flyingItem && (
                  <motion.div
                    initial={{
                      position: 'fixed',
                      top: buttonRef.current?.getBoundingClientRect().top || 0,
                      left: buttonRef.current?.getBoundingClientRect().left || 0,
                      width: 40,
                      height: 40,
                      zIndex: 1000,
                      scale: 1,
                      opacity: 1,
                    }}
                    animate={{
                      top: 20, // Позиция корзины в хедере
                      left: window.innerWidth - 80, // Правая часть экрана
                      scale: 0.2,
                      opacity: 0,
                      rotate: 360,
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
                )}
              </AnimatePresence>
            </div>

            {/* Описание */}
            {product.description && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Описание</h3>
                <p className="text-gray-600 leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Характеристики */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Характеристики</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Truck className="w-5 h-5 text-green-500" />
                  <span className="text-gray-600">Бесплатная доставка</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-blue-500" />
                  <span className="text-gray-600">Гарантия 1 год</span>
                </div>
                <div className="flex items-center space-x-3">
                  <RotateCcw className="w-5 h-5 text-orange-500" />
                  <span className="text-gray-600">Возврат 14 дней</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
} 