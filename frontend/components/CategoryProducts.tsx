'use client';

import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Star, Heart, Plus, Check, ArrowUpDown, ArrowUp, ArrowDown, Star as StarIcon } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { addItem } from '../store/slices/cartSlice';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { fixImageUrl } from '../utils/imageUrl';

interface Product {
  _id: string;
  name: string;
  price: number;
  comparePrice?: number;
  mainImage: string;
  images?: string[];
  sku: string;
  inStock: boolean;
  rating: number;
  reviewCount: number;
  description?: string;
  stockQuantity?: number; // Added for stock display
  reviewPoints?: number; // Added for review points display
  slug: string; // Added for product page link
}

interface CategoryProductsProps {
  categorySlug: string;
  filters?: {
    searchQuery?: string | null;
    priceMin?: string;
    priceMax?: string;
    inStock?: boolean;
    onlyDiscount?: boolean;
    brand?: string;
    rating?: string;
    colors?: string[];
  };
  onProductsLoaded?: (products: { name: string }[]) => void;
  favoritesOnly?: boolean;
  favoriteIds?: string[];
}

// Функция для преобразования названия
function capitalizeWords(name: string) {
  return name.split(' ').map(word => {
    if (word.length > 3 && word[0] === word[0].toLowerCase()) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    return word;
  }).join(' ');
}

// Функция для генерации автоматических надписей на товарах (только для избранного)
function generateProductBadges(product: Product): string[] {
  const badges = [];
  const name = product.name.toLowerCase();
  
  // Проверяем цену - приоритетная надпись
  if (product.price < 3000) {
    badges.push('Низкая цена');
  } else if (product.price < 10000) {
    badges.push('Хорошая цена');
  } else if (product.price > 50000) {
    badges.push('Премиум');
  }
  
  // Проверяем категорию для гарантии - важная информация
  if (name.includes('apple') || name.includes('samsung') || name.includes('xiaomi') || 
      name.includes('iphone') || name.includes('airpods') || name.includes('macbook') ||
      name.includes('смартфон') || name.includes('планшет') || name.includes('ноутбук')) {
    badges.push('1 год гарантии');
  } else if (name.includes('наушники') || name.includes('чехол') || name.includes('зарядк') ||
             name.includes('кабель') || name.includes('адаптер') || name.includes('пленк')) {
    badges.push('6 мес гарантии');
  }
  
  // Проверяем рейтинг - показатель качества
  if (product.rating && product.rating >= 4.7) {
    badges.push('Топ рейтинг');
  } else if (product.rating && product.rating >= 4.3) {
    badges.push('Высокий рейтинг');
  }
  
  // Проверяем популярность
  if (product.reviewCount && product.reviewCount > 100) {
    badges.push('Хит продаж');
  } else if (product.reviewCount && product.reviewCount > 30) {
    badges.push('Популярный');
  }
  
  // Проверяем наличие
  if (product.stockQuantity && product.stockQuantity > 20) {
    badges.push('В наличии');
  } else if (product.stockQuantity && product.stockQuantity > 0 && product.stockQuantity <= 5) {
    badges.push('Осталось мало');
  }
  
  // Проверяем новинки
  if (name.includes('2024') || name.includes('new') || name.includes('новый') || name.includes('latest')) {
    badges.push('Новинка 2024');
  }
  
  // Технические преимущества
  if (name.includes('беспроводн') || name.includes('wireless') || name.includes('bluetooth')) {
    badges.push('Беспроводной');
  }
  
  if (name.includes('быстрая') || name.includes('fast') || name.includes('speed') || name.includes('quick')) {
    badges.push('Быстрая работа');
  }
  
  if (name.includes('защищ') || name.includes('защит') || name.includes('protect') || name.includes('водонепр')) {
    badges.push('Защищенный');
  }
  
  if (name.includes('original') || name.includes('оригинал')) {
    badges.push('Оригинальный');
  }
  
  // Если ничего не подошло, добавляем общие
  if (badges.length === 0) {
    badges.push('Качественный');
    badges.push('Проверенный');
  }
  
  // Возвращаем максимум 2 надписи, приоритет - более важные
  return badges.slice(0, 2);
}

export default function CategoryProducts({ categorySlug, filters, onProductsLoaded, favoritesOnly, favoriteIds }: CategoryProductsProps) {
  const dispatch = useDispatch();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [flyingCart, setFlyingCart] = useState<{left: number, top: number} | null>(null);
  const cartButtonRefs = useRef<{[key: string]: HTMLButtonElement | null}>({});
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc' | 'rating' | 'newest'>('name');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAddToCart = async (product: Product) => {
    const btn = cartButtonRefs.current[product._id];
    const cartIcon = typeof window !== 'undefined' && (window as any).__cartIconRef?.current;
    if (btn && cartIcon) {
      const btnRect = btn.getBoundingClientRect();
      const cartRect = cartIcon.getBoundingClientRect();
      setFlyingCart({
        left: btnRect.left + btnRect.width / 2,
        top: btnRect.top + btnRect.height / 2,
      });
      setTimeout(() => setFlyingCart(null), 1200);
      // Анимация будет лететь к cartRect.left/top
    }
    setAddingToCart(product._id);
    try {
      dispatch(addItem({
        _id: product._id,
        name: product.name,
        price: product.price,
        image: product.mainImage || (product.images && product.images[0]) || '/placeholder-product.jpg',
        quantity: 1,
        sku: product.sku,
        slug: product.slug
      }));
      await new Promise(resolve => setTimeout(resolve, 800));
      setAddingToCart(null);
      setShowSuccess(product._id);
      setTimeout(() => setShowSuccess(null), 1500);
    } catch (error) {
      alert('Ошибка при добавлении товара в корзину');
      setAddingToCart(null);
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      // Если это режим избранного без товаров, не делаем запрос
      if (favoritesOnly && (!favoriteIds || favoriteIds.length === 0)) {
        setProducts([]);
        setLoading(false);
        return;
      }

      try {
        
        // Add cache-busting parameter to avoid 304 responses
        const timestamp = Date.now();
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://technoline-api.loca.lt/api';
        let url = '';
        
        // Если это режим избранного, загружаем товары по ID
        if (favoritesOnly && favoriteIds && favoriteIds.length > 0) {
          url = `${API_BASE_URL}/products?ids=${favoriteIds.join(',')}&t=${timestamp}`;
        } else if (!categorySlug) {
          url = `${API_BASE_URL}/products?limit=10000&t=${timestamp}`;
        } else {
          url = `${API_BASE_URL}/products/category/${categorySlug}?limit=10000&t=${timestamp}`;
        }
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.products && Array.isArray(data.products)) {
          setProducts(data.products);
          if (typeof onProductsLoaded === 'function') {
            onProductsLoaded(data.products.map((p: any) => ({
              name: p.name,
              description: p.description,
              sku: p.sku,
              price: p.price,
              inStock: p.inStock,
              stockQuantity: p.stockQuantity,
              comparePrice: p.comparePrice,
              rating: p.rating,
              brand: p.brand,
            })));
          }
        } else {
          console.error(`❌ CategoryProducts: Products is not an array:`, data.products);
          setProducts([]);
        }
      } catch (err) {
        console.error('❌ CategoryProducts: Network Error:', err);
        setError(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [categorySlug, onProductsLoaded, favoritesOnly, favoriteIds]);

  // После получения products:
  let filteredProducts = products;
  if (filters) {
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      filteredProducts = filteredProducts.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        p.sku.toLowerCase().includes(q)
      );
    }
    if (filters.priceMin) {
      const min = parseInt(filters.priceMin, 10);
      if (!isNaN(min)) filteredProducts = filteredProducts.filter(p => p.price >= min);
    }
    if (filters.priceMax) {
      const max = parseInt(filters.priceMax, 10);
      if (!isNaN(max)) filteredProducts = filteredProducts.filter(p => p.price <= max);
    }
    if (filters.inStock) {
      filteredProducts = filteredProducts.filter(p => {
        // Если есть поле stockQuantity, фильтруем по нему
        if (typeof p.stockQuantity === 'number') {
          return p.stockQuantity > 0;
        }
        // fallback: по inStock
        return p.inStock;
      });
    }
    if (filters.onlyDiscount) {
      filteredProducts = filteredProducts.filter(p => typeof p.comparePrice === 'number' && p.comparePrice > p.price);
    }
    if (filters.brand) {
      // Мок: ищем по названию бренда в названии товара (заменить на p.brand при наличии поля)
      if (filters.brand) {
        filteredProducts = filteredProducts.filter(p => p.name.toLowerCase().includes(filters.brand!.toLowerCase()));
      }
    }
    if (filters.rating) {
      const minRating = parseFloat(filters.rating);
      if (!isNaN(minRating)) filteredProducts = filteredProducts.filter(p => (typeof p.rating === 'number' ? p.rating : 0) >= minRating);
    }
    if (Array.isArray(filters.colors) && filters.colors.length > 0) {
      filteredProducts = filteredProducts.filter(p =>
        filters.colors!.some(color => p.name.toLowerCase().includes(color.toLowerCase()))
      );
    }
  }

  // Сортировка товаров
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'newest':
        // Если есть поле createdAt, используем его, иначе оставляем как есть
        return 0; // Пока оставляем как есть, так как нет поля createdAt
      default:
        return 0;
    }
  });

  // Принудительный рендеринг в начале
  return (
    <div>
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка товаров...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <div className="text-red-400 mb-4">
            <ShoppingCart size={64} className="mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Ошибка загрузки</h3>
          <p className="text-gray-600">{error}</p>
          <div className="mt-4 p-4 bg-red-100 border border-red-400 rounded">
            <p className="text-sm text-red-800">
              <strong>Debug Info:</strong>
            </p>
            <p className="text-sm text-red-800">Category Slug: {categorySlug}</p>
            <p className="text-sm text-red-800">Error: {error}</p>
          </div>
        </div>
      )}

      {(!loading && !error && filteredProducts.length === 0) && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <ShoppingCart size={64} className="mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Товары не найдены</h3>
          <p className="text-gray-600">В данной категории пока нет товаров</p>
        </div>
      )}

      {(!loading && !error && filteredProducts.length > 0) && (
        <div>
          {/* Сортировка */}
          <div className="mb-4 md:mb-6 bg-white border border-gray-200 rounded-xl md:rounded-lg p-3 md:p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2 md:gap-4">
                <span className="text-xs md:text-sm font-medium text-gray-700">Сортировка:</span>
                <div className="flex flex-wrap gap-1 md:gap-2">
                  <button
                    onClick={() => setSortBy('name')}
                    className={`px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-medium rounded-lg md:rounded-md transition-all duration-200 flex items-center gap-1 hover:scale-105 ${
                      sortBy === 'name'
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <ArrowUpDown className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">По названию</span>
                    <span className="sm:hidden">Назв.</span>
                  </button>
                  <button
                    onClick={() => setSortBy('price-asc')}
                    className={`px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-medium rounded-lg md:rounded-md transition-all duration-200 flex items-center gap-1 hover:scale-105 ${
                      sortBy === 'price-asc'
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <ArrowUp className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">По цене ↑</span>
                    <span className="sm:hidden">↑</span>
                  </button>
                  <button
                    onClick={() => setSortBy('price-desc')}
                    className={`px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-medium rounded-lg md:rounded-md transition-all duration-200 flex items-center gap-1 hover:scale-105 ${
                      sortBy === 'price-desc'
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <ArrowDown className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">По цене ↓</span>
                    <span className="sm:hidden">↓</span>
                  </button>
                  <button
                    onClick={() => setSortBy('rating')}
                    className={`px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-medium rounded-lg md:rounded-md transition-all duration-200 flex items-center gap-1 hover:scale-105 ${
                      sortBy === 'rating'
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <StarIcon className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">По рейтингу</span>
                    <span className="sm:hidden">★</span>
                  </button>
                </div>
              </div>
              <div className="text-xs md:text-sm text-gray-500">
                Найдено товаров: <span className="font-semibold text-gray-700">{sortedProducts.length}</span>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
            {sortedProducts.map((product) => {
              const hasDiscount = typeof product.comparePrice === 'number' && product.comparePrice > product.price;
              const discountPercent = hasDiscount && product.comparePrice ? Math.round(100 - (product.price / product.comparePrice) * 100) : 0;
              return (
                <div key={product._id} className="h-full">
                  <Link href={`/product/${product.slug}`} className="block h-full">
                    <div className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 border border-gray-100 relative overflow-hidden flex flex-col h-full min-h-[420px] md:min-h-[520px] cursor-pointer">
                      {/* Бейджи: сердечко для избранного или распродажа для каталога */}
                      {favoritesOnly ? (
                        <div className="absolute top-2 md:top-3 left-2 md:left-3 bg-red-500 text-white text-xs font-bold px-2 md:px-3 py-1 rounded-full z-10 shadow flex items-center gap-1">
                          <Heart size={12} className="fill-current" />
                          <span className="hidden md:inline">Избранное</span>
                        </div>
                      ) : (
                        hasDiscount && (
                          <div className="absolute top-2 md:top-3 left-2 md:left-3 bg-pink-500 text-white text-xs font-bold px-2 md:px-3 py-1 rounded-full z-10 shadow">
                            <span className="hidden md:inline">Распродажа</span>
                            <span className="md:hidden">-{discountPercent}%</span>
                          </div>
                        )
                      )}
                      {/* Баллы за отзыв */}
                      {product.reviewPoints && (
                        <div className="absolute top-2 md:top-3 right-2 md:right-3 bg-blue-100 text-blue-700 text-xs font-semibold px-1 md:px-2 py-1 rounded-full z-10 shadow flex items-center gap-1">
                          <span className="font-bold">Б</span> 
                          <span className="hidden md:inline">{product.reviewPoints} баллов за отзыв</span>
                          <span className="md:hidden">{product.reviewPoints}</span>
                        </div>
                      )}
                      {/* Картинка */}
                      <div className="relative aspect-square overflow-hidden rounded-t-xl bg-white flex items-center justify-center">
                        <img
                          src={fixImageUrl(product.mainImage || (product.images && product.images[0]) || '/placeholder-product.jpg')}
                          alt={product.name}
                          className="w-full h-full max-h-40 md:max-h-60 max-w-40 md:max-w-60 object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                        
                        {/* Автоматические надписи для избранного */}
                        {favoritesOnly && (() => {
                          const badges = generateProductBadges(product);
                          return badges.map((badge, index) => (
                            <div
                              key={badge}
                              className={`absolute ${index === 0 ? 'top-12 md:top-16' : 'top-20 md:top-24'} right-2 md:right-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-semibold px-2 py-1 rounded-full z-10 shadow-lg`}
                            >
                              {badge}
                            </div>
                          ));
                        })()}
                        
                        {/* Артикул на изображении */}
                        <div className="absolute bottom-0 left-0 bg-black/40 text-white text-[10px] md:text-[11px] font-medium px-1 md:px-2 py-0.5 rounded-tr-md rounded-bl-md max-w-[80%] truncate text-left">
                          <span className="hidden md:inline">Артикул: </span>{product.sku}
                        </div>
                      </div>
                      <div className="p-2 md:p-4 pt-2 md:pt-3 flex flex-col flex-1 min-h-[200px] md:min-h-[240px]">
                        {/* Остаток */}
                        {typeof product.stockQuantity === 'number' && (
                          <div className="text-pink-600 text-xs font-bold mb-1">{product.stockQuantity} шт осталось</div>
                        )}
                        {/* Название */}
                        <h3 className="font-medium text-gray-900 mb-1 group-hover:text-primary-600 transition-colors text-xs md:text-sm leading-tight">
                          {capitalizeWords(product.name)}
                        </h3>
                        {/* Артикул */}
                        {/* Убрано из-под названия, теперь на картинке */}
                        {/* Краткое описание - скрыто на мобильных */}
                        {product.description && (
                          <div className="hidden md:block text-gray-500 text-xs mb-2 line-clamp-2 min-h-[32px]">
                            {product.description.replace(/<[^>]+>/g, '').slice(0, 80)}{product.description.replace(/<[^>]+>/g, '').length > 80 ? '…' : ''}
                          </div>
                        )}
                        {/* Цена, скидка, процент */}
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 mb-1">
                          <span className="text-base md:text-lg font-bold text-gray-900">{product.price.toLocaleString('ru-RU')} ₽</span>
                          {hasDiscount && (
                            <div className="flex items-center gap-1 md:gap-2">
                              <span className="text-xs md:text-sm text-gray-400 line-through">{product.comparePrice?.toLocaleString('ru-RU')} ₽</span>
                              <span className="text-xs bg-pink-100 text-pink-600 font-bold px-2 py-0.5 rounded-full">-{discountPercent}%</span>
                            </div>
                          )}
                        </div>
                        {/* Рейтинг и отзывы */}
                        {(typeof product.rating === 'number' || typeof product.reviewCount === 'number') && (
                          <div className="flex items-center gap-1 mb-2">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={12} className={`${i < Math.floor(product.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'} md:w-[13px] md:h-[13px]`} />
                            ))}
                            {typeof product.rating === 'number' && (
                              <span className="text-xs text-gray-500 ml-1">{product.rating.toFixed(1)}</span>
                            )}
                            {typeof product.reviewCount === 'number' && (
                              <span className="text-xs text-gray-400">({product.reviewCount})</span>
                            )}
                          </div>
                        )}
                        {/* Кнопка В корзину */}
                        <div className="mt-auto" onClick={e => e.stopPropagation()}>
                          <motion.button
                            ref={el => { cartButtonRefs.current[product._id] = el; }}
                            onClick={e => { e.preventDefault(); handleAddToCart(product); }}
                            disabled={addingToCart === product._id || !product.inStock}
                            className={`w-full font-medium py-2 md:py-2 px-2 md:px-4 rounded-lg transition-all duration-300 flex items-center justify-center space-x-1 md:space-x-2 text-sm md:text-base shadow-sm
                              ${addingToCart === product._id
                                ? 'bg-green-600 text-white'
                                : showSuccess === product._id
                                ? 'bg-green-600 text-white'
                                : product.inStock
                                ? 'bg-primary-600 text-white hover:bg-primary-700'
                                : 'bg-gray-400 text-gray-600 cursor-not-allowed'}
                            `}
                            whileHover={addingToCart !== product._id && product.inStock ? { scale: 1.02 } : {}}
                            whileTap={addingToCart !== product._id && product.inStock ? { scale: 0.98 } : {}}
                          >
                            <AnimatePresence mode="wait">
                              {addingToCart === product._id ? (
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
                                    <ShoppingCart size={18} />
                                  </motion.div>
                                  <span>Добавляется...</span>
                                </motion.div>
                              ) : showSuccess === product._id ? (
                                <motion.div
                                  key="success"
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  transition={{ duration: 0.3 }}
                                  className="flex items-center space-x-2"
                                >
                                  <Check size={18} />
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
                                  <ShoppingCart size={18} />
                                  <span>{product.inStock ? 'В корзину' : 'Нет в наличии'}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {flyingCart && typeof window !== 'undefined' && (window as any).__cartIconRef?.current && (
        (() => {
          const cartIcon = (window as any).__cartIconRef.current;
          const cartRect = cartIcon.getBoundingClientRect();
          return (
            <motion.div
              initial={{
                position: 'fixed',
                left: flyingCart.left,
                top: flyingCart.top,
                width: 40,
                height: 40,
                zIndex: 1000,
                scale: 1,
                opacity: 1,
                x: '-50%',
                y: '-50%',
              }}
              animate={{
                left: cartRect.left + cartRect.width / 2,
                top: cartRect.top + cartRect.height / 2,
                scale: 0.2,
                opacity: 0,
                rotate: 360,
                x: '-50%',
                y: '-50%',
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 1.2,
                ease: [0.25, 0.46, 0.45, 0.94],
                scale: { duration: 1.2, ease: 'easeInOut' },
                rotate: { duration: 1.2, ease: 'easeInOut' },
              }}
              className="bg-primary-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white pointer-events-none"
              style={{ boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
            >
              <ShoppingCart className="w-5 h-5 text-white" />
            </motion.div>
          );
        })()
      )}
    </div>
  );
} 