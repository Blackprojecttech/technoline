'use client';

import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/layout/Layout';
import { ShoppingCart, Star, Heart, Eye, Filter, Grid, List, Search, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { addItem } from '../../store/slices/cartSlice';

interface Product {
  _id: string;
  name: string;
  categoryId: {
    _id: string;
    name: string;
    slug: string;
  };
  price: number;
  comparePrice?: number;
  rating?: number;
  reviews?: number;
  mainImage: string;
  images: string[];
  isActive: boolean;
  isFeatured: boolean;
  slug: string;
  description?: string;
  sku: string;
  stockQuantity: number;
  inStock: boolean;
  createdAt: string;
}

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  children?: Category[];
}

export default function ProductsPage() {
  const dispatch = useDispatch();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('name');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [flyingItems, setFlyingItems] = useState<Set<string>>(new Set());
  const [showSuccess, setShowSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Получаем все товары
      const productsResponse = await fetch('http://localhost:5002/api/products');
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setProducts(productsData.products || []);
      }

      // Получаем категории
      const categoriesResponse = await fetch('http://localhost:5002/api/categories');
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const sortProducts = (products: Product[]) => {
    return [...products].sort((a, b) => {
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
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });
  };

  const filterProducts = (products: Product[]) => {
    return products.filter(product => {
      // Фильтр по цене
      if (priceRange.min && product.price < parseInt(priceRange.min)) return false;
      if (priceRange.max && product.price > parseInt(priceRange.max)) return false;
      
      // Фильтр по категории
      if (selectedCategory && product.categoryId?.slug !== selectedCategory) return false;
      
      // Фильтр по поиску
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesDescription = product.description?.toLowerCase().includes(query) || false;
        const matchesCategory = product.categoryId?.name.toLowerCase().includes(query) || false;
        const matchesSku = product.sku.toLowerCase().includes(query);
        
        if (!matchesName && !matchesDescription && !matchesCategory && !matchesSku) {
          return false;
        }
      }
      
      return true;
    });
  };

  const filteredAndSortedProducts = sortProducts(filterProducts(products));

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
      image: product.mainImage,
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
        <div className="pt-32 pb-16">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-secondary-600">Загрузка товаров...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="pt-32 pb-16">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <p className="text-red-600">{error}</p>
              <button 
                onClick={fetchData}
                className="mt-4 bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600"
              >
                Попробовать снова
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="pt-32 pb-16">
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <nav className="mb-8">
            <ol className="flex items-center space-x-2 text-sm text-secondary-600">
              <li><a href="/" className="hover:text-primary-600">Главная</a></li>
              <li>/</li>
              <li className="text-secondary-800 font-medium">Все товары</li>
            </ol>
          </nav>

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary-800 mb-4">
              Все товары
            </h1>
            <p className="text-lg text-secondary-600 max-w-3xl">
              Широкий выбор товаров с отличными ценами и качеством
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" size={20} />
              <input
                type="text"
                placeholder="Поиск товаров..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-light-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filters and Controls */}
          <div className="bg-white border border-light-200 rounded-lg p-6 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600"
                >
                  <Filter size={20} />
                  <span>Фильтры</span>
                </button>
                
                <div className="flex items-center space-x-2">
                  <span className="text-secondary-800 font-medium">Сортировка:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="border border-light-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="name">По названию</option>
                    <option value="price-asc">По цене (возрастание)</option>
                    <option value="price-desc">По цене (убывание)</option>
                    <option value="rating">По рейтингу</option>
                    <option value="newest">Сначала новые</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-primary-500 text-white' : 'bg-light-100 text-secondary-600'}`}
                  >
                    <Grid size={20} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-primary-500 text-white' : 'bg-light-100 text-secondary-600'}`}
                  >
                    <List size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-light-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-800 mb-2">
                      Категория
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full border border-light-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Все категории</option>
                      {categories.map((category) => (
                        <option key={category._id} value={category.slug}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-800 mb-2">
                      Цена
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        placeholder="От"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                        className="flex-1 border border-light-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <input
                        type="number"
                        placeholder="До"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                        className="flex-1 border border-light-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Stock Filter */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-800 mb-2">
                      Наличие
                    </label>
                    <select className="w-full border border-light-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                      <option value="">Все товары</option>
                      <option value="in-stock">В наличии</option>
                      <option value="out-of-stock">Нет в наличии</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Products Count */}
          <div className="mb-6">
            <p className="text-secondary-600">
              Найдено товаров: <span className="font-semibold text-secondary-800">{filteredAndSortedProducts.length}</span>
            </p>
          </div>

          {/* Products Grid/List */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedProducts.map((product) => (
                <div key={product._id} className="bg-white border border-light-200 rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-300">
                  <div className="relative">
                    <img
                      src={`http://localhost:5002/${product.mainImage}`}
                      alt={product.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    {product.comparePrice && product.comparePrice > product.price && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                        -{Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)}%
                      </div>
                    )}
                    <button className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-sm hover:bg-light-50">
                      <Heart size={16} className="text-secondary-400" />
                    </button>
                  </div>
                  
                  <div className="p-4">
                    <div className="mb-2">
                      <span className="text-xs text-secondary-500 bg-light-100 px-2 py-1 rounded">
                        {product.categoryId?.name}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold text-secondary-800 mb-2 line-clamp-2">
                      {product.name}
                    </h3>
                    
                    <div className="flex items-center mb-2">
                      {product.rating && (
                        <div className="flex items-center">
                          <Star size={14} className="text-yellow-400 fill-current" />
                          <span className="text-sm text-secondary-600 ml-1">{product.rating}</span>
                          {product.reviews && (
                            <span className="text-sm text-secondary-500 ml-1">({product.reviews})</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-secondary-800">
                          {product.price.toLocaleString()} ₽
                        </span>
                        {product.comparePrice && product.comparePrice > product.price && (
                          <span className="text-sm text-secondary-500 line-through">
                            {product.comparePrice.toLocaleString()} ₽
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <motion.button 
                        className={`flex-1 py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 ${
                          addingToCart === product._id 
                            ? 'bg-green-500 text-white' 
                            : 'bg-primary-500 text-white hover:bg-primary-600'
                        }`}
                        onClick={(e) => handleAddToCart(product, e)}
                        disabled={addingToCart === product._id}
                        whileHover={addingToCart !== product._id ? { scale: 1.02 } : {}}
                        whileTap={addingToCart !== product._id ? { scale: 0.98 } : {}}
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
                                <ShoppingCart size={16} />
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
                              <Check size={16} />
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
                              <ShoppingCart size={16} />
                              <span>В корзину</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                      <button className="p-2 border border-light-200 rounded-lg hover:bg-light-50">
                        <Eye size={16} className="text-secondary-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedProducts.map((product) => (
                <div key={product._id} className="bg-white border border-light-200 rounded-lg p-4 flex space-x-4">
                  <img
                    src={`http://localhost:5002/${product.mainImage}`}
                    alt={product.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2">
                          <span className="text-xs text-secondary-500 bg-light-100 px-2 py-1 rounded">
                            {product.categoryId?.name}
                          </span>
                        </div>
                        
                        <h3 className="font-semibold text-secondary-800 mb-2">
                          {product.name}
                        </h3>
                        
                        <p className="text-sm text-secondary-600 mb-3 line-clamp-2">
                          {product.description}
                        </p>
                        
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg font-bold text-secondary-800">
                              {product.price.toLocaleString()} ₽
                            </span>
                            {product.comparePrice && product.comparePrice > product.price && (
                              <span className="text-sm text-secondary-500 line-through">
                                {product.comparePrice.toLocaleString()} ₽
                              </span>
                            )}
                          </div>
                          
                          {product.rating && (
                            <div className="flex items-center">
                              <Star size={14} className="text-yellow-400 fill-current" />
                              <span className="text-sm text-secondary-600 ml-1">{product.rating}</span>
                              {product.reviews && (
                                <span className="text-sm text-secondary-500 ml-1">({product.reviews})</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-2">
                        <motion.button 
                          className={`py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2 ${
                            addingToCart === product._id 
                              ? 'bg-green-500 text-white' 
                              : 'bg-primary-500 text-white hover:bg-primary-600'
                          }`}
                          onClick={(e) => handleAddToCart(product, e)}
                          disabled={addingToCart === product._id}
                          whileHover={addingToCart !== product._id ? { scale: 1.02 } : {}}
                          whileTap={addingToCart !== product._id ? { scale: 0.98 } : {}}
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
                                  <ShoppingCart size={16} />
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
                                <Check size={16} />
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
                                <ShoppingCart size={16} />
                                <span>В корзину</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.button>
                        <div className="flex space-x-2">
                          <button className="p-2 border border-light-200 rounded-lg hover:bg-light-50">
                            <Heart size={16} className="text-secondary-600" />
                          </button>
                          <button className="p-2 border border-light-200 rounded-lg hover:bg-light-50">
                            <Eye size={16} className="text-secondary-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Products Message */}
          {filteredAndSortedProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-secondary-600 text-lg">Товары не найдены</p>
              <p className="text-secondary-500 mt-2">Попробуйте изменить параметры поиска</p>
            </div>
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