"use client";
import { useFavorites } from "@/hooks/useFavorites";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart, Heart, X, Search, Filter, Star, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useDispatch } from "react-redux";
import { addItem } from "@/store/slices/cartSlice";
import Layout from "@/components/layout/Layout";
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, BadgePercent, Flame, Sparkles, ShieldCheck, Info, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories } from '@/hooks/useCategories';
import { fixImageUrl } from '@/utils/imageUrl';

// Мотивация на основе данных товара
function getMotivation(product: any) {
  if (product.isNewProduct) return { icon: <Sparkles className="w-5 h-5 text-blue-500" />, text: 'Новинка! Будьте первым владельцем.' };
  if (product.isBestseller) return { icon: <Flame className="w-5 h-5 text-orange-500" />, text: 'Лидер продаж — выбирают чаще всего!' };
  if (product.comparePrice && product.price < product.comparePrice) return { icon: <BadgePercent className="w-5 h-5 text-green-500" />, text: 'Выгодная цена — скидка!' };
  if (product.specifications && product.specifications.length > 3) return { icon: <ShieldCheck className="w-5 h-5 text-purple-500" />, text: 'Максимальная комплектация!' };
  if (product.rating && product.rating >= 4.5) return { icon: <Star className="w-5 h-5 text-yellow-400" />, text: 'Лучшие отзывы покупателей' };
  return { icon: <Info className="w-5 h-5 text-gray-400" />, text: 'Отличный выбор для вас!' };
}

export default function WishlistPage() {
  const { isAuthenticated } = useAuth();
  const { favorites, removeFavorite } = useFavorites();
  const { categories } = useCategories();
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [toDelete, setToDelete] = useState<string|null>(null);
  const [addingToCart, setAddingToCart] = useState<string|null>(null);
  const [showSuccess, setShowSuccess] = useState<string|null>(null);
  
  // Состояния для фильтров и поиска
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  
  const dispatch = useDispatch();

  useEffect(() => {
    if (favorites.length === 0) {
      setProducts([]);
      setFilteredProducts([]);
      return;
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/products?ids=${favorites.join(",")}&limit=100`)
      .then(res => res.ok ? res.json() : { products: [] })
      .then(data => {
        const productsData = data.products || [];
        setProducts(productsData);
        setFilteredProducts(productsData);
      });
  }, [favorites]);

  // Функции для фильтрации и сортировки
  const sortProducts = (products: any[]) => {
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

  const filterProducts = (products: any[]) => {
    return products.filter(product => {
      // Поиск по названию
      if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Фильтр по категории
      if (selectedCategory && product.categoryId?.slug !== selectedCategory) {
        return false;
      }
      
      // Фильтр по цене
      if (priceRange.min && product.price < Number(priceRange.min)) {
        return false;
      }
      if (priceRange.max && product.price > Number(priceRange.max)) {
        return false;
      }
      
      return true;
    });
  };

  // Применяем фильтры и сортировку при изменении параметров
  useEffect(() => {
    const filtered = filterProducts(products);
    const sorted = sortProducts(filtered);
    setFilteredProducts(sorted);
  }, [products, searchQuery, selectedCategory, priceRange, sortBy]);

  const handleAddToCart = async (product: any, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (addingToCart === product._id) return;
    setAddingToCart(product._id);
    await new Promise(resolve => setTimeout(resolve, 700));
    dispatch(addItem({
      _id: product._id,
      name: product.name,
      price: product.price,
      image: product.mainImage,
      quantity: 1,
      sku: product.sku || '',
      slug: product.slug || ''
    }));
    setAddingToCart(null);
    setShowSuccess(product._id);
    setTimeout(() => setShowSuccess(null), 1200);
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center pt-32">
          <Heart className="w-12 h-12 mb-4 text-primary-400 animate-bounce" />
          <div className="text-2xl font-bold text-gray-700 mb-2">Только для авторизованных пользователей</div>
          <div className="text-gray-500 text-lg">Войдите в аккаунт, чтобы пользоваться избранным</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[60vh] bg-gradient-to-br from-blue-50 via-white to-pink-50 py-24 pt-32 px-2 sm:px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Breadcrumb */}
          <nav className="mb-8">
            <ol className="flex items-center space-x-2 text-sm text-secondary-600">
              <li><a href="/" className="hover:text-primary-600">Главная</a></li>
              <li>/</li>
              <li className="text-secondary-800 font-medium">Избранное</li>
            </ol>
          </nav>





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
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" size={20} />
                  <input
                    type="text"
                    placeholder="Поиск в избранном..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 pl-10 pr-4 py-2 border border-light-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSortBy('name')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-1 hover:scale-105 ${
                      sortBy === 'name'
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <ArrowUpDown className="w-4 h-4" />
                    По названию
                  </button>
                  <button
                    onClick={() => setSortBy('price-asc')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-1 hover:scale-105 ${
                      sortBy === 'price-asc'
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <ArrowUp className="w-4 h-4" />
                    По цене ↑
                  </button>
                  <button
                    onClick={() => setSortBy('price-desc')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-1 hover:scale-105 ${
                      sortBy === 'price-desc'
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <ArrowDown className="w-4 h-4" />
                    По цене ↓
                  </button>
                  <button
                    onClick={() => setSortBy('rating')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-1 hover:scale-105 ${
                      sortBy === 'rating'
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <Star className="w-4 h-4" />
                    По рейтингу
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-light-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      {Array.from(new Set(products.map(p => p.categoryId?.slug).filter(Boolean))).map((slug) => {
                        const category = categories.find(c => c.slug === slug);
                        return (
                          <option key={slug} value={slug}>
                            {category?.name || slug}
                          </option>
                        );
                      })}
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
                </div>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/catalog"
                className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors duration-200 text-sm font-medium"
              >
                Каталог
              </Link>
              {Array.from(new Set(products.map(p => p.categoryId?.slug).filter(Boolean)))
                .slice(0, 5)
                .map((slug) => {
                  const category = categories.find(c => c.slug === slug);
                  return (
                    <Link
                      key={slug}
                      href={`/catalog/${slug}`}
                      className="px-4 py-2 bg-light-100 text-secondary-700 rounded-lg hover:bg-primary-100 hover:text-primary-700 transition-colors duration-200 text-sm font-medium"
                    >
                      {category?.name || slug}
                    </Link>
                  );
                })}
            </div>
          </div>

        {filteredProducts.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-gray-500 text-lg py-24">
            <Heart className="w-12 h-12 mx-auto mb-4 text-primary-400 animate-bounce" />
            {products.length === 0 ? 'У вас пока нет избранных товаров' : 'По вашему запросу ничего не найдено'}
          </motion.div>
        ) : (
          <motion.div layout className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            <AnimatePresence>
              {filteredProducts.map(product => (
                <motion.div
                  key={product._id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white/90 rounded-md shadow border border-gray-100 p-2 flex flex-col relative group overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  {/* Кнопка удаления */}
                  <button
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-white shadow hover:bg-red-100 transition z-10 border border-gray-200"
                    onClick={() => setToDelete(product._id)}
                    title="Удалить из избранного"
                  >
                    <X className="w-3.5 h-3.5 text-red-500" />
                  </button>
                  {/* Мотивация */}
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="absolute left-1.5 top-1.5 bg-gradient-to-r from-blue-100 to-pink-100 rounded-full px-2 py-0.5 flex items-center gap-1 shadow text-[10px] font-medium text-gray-700 animate-fade-in">
                    {getMotivation(product).icon}
                    <span>{getMotivation(product).text}</span>
                  </motion.div>
                  <Link href={`/product/${product.slug}`} className="block mb-1 mt-5">
                    <motion.div whileHover={{ scale: 1.01 }} className="aspect-[4/5] bg-gray-50 rounded-md flex items-center justify-center overflow-hidden shadow-inner min-h-[80px]">
                      <img src={fixImageUrl(product.mainImage || (product.images && product.images[0]) || '/placeholder-product.jpg')} alt={product.name} className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105" />
                    </motion.div>
                    <h3 className="font-semibold text-gray-900 mt-1 mb-0.5 text-xs truncate drop-shadow-sm leading-tight">{product.name}</h3>
                    <div className="text-primary-600 font-bold text-xs drop-shadow">{product.price?.toLocaleString()} ₽</div>
                  </Link>
                  <motion.button
                    className="mt-auto w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-primary-600 to-pink-500 hover:from-primary-700 hover:to-pink-600 text-white text-xs font-semibold py-1.5 rounded-md transition-all duration-150 shadow"
                    onClick={(e) => handleAddToCart(product, e)}
                    disabled={addingToCart === product._id}
                    whileTap={addingToCart !== product._id ? { scale: 0.96 } : {}}
                  >
                    <AnimatePresence mode="wait">
                      {addingToCart === product._id ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0, rotate: -180 }}
                          animate={{ opacity: 1, rotate: 0 }}
                          exit={{ opacity: 0, rotate: 180 }}
                          transition={{ duration: 0.3 }}
                          className="flex items-center gap-1"
                        >
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
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
                          className="flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Добавлено!</span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="normal"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="flex items-center gap-1"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>В корзину</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
        </div>
        {/* Модалка подтверждения удаления */}
        <AnimatePresence>
          {toDelete && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                initial={{ scale: 0.85, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.85, opacity: 0, y: 40 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative overflow-hidden border border-gray-100"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-white to-pink-100 opacity-60 pointer-events-none" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-pink-400 rounded-full flex items-center justify-center mb-4 shadow-lg animate-bounce">
                    <X className="text-white w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Удалить из избранного?</h2>
                  <p className="text-gray-600 mb-6 text-center">Вы точно хотите удалить этот товар из избранного?</p>
                  <div className="flex gap-4 w-full justify-center">
                    <button
                      onClick={() => { removeFavorite(toDelete!); setToDelete(null); }}
                      className="px-6 py-3 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold shadow-md hover:from-red-600 hover:to-pink-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                    >
                      Удалить
                    </button>
                    <button
                      onClick={() => setToDelete(null)}
                      className="px-6 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold shadow hover:bg-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
} 