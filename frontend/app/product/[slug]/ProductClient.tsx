"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ShoppingCart, Heart, Share2, Truck, Shield, RotateCcw, Check, Tag, Info, Percent, MessageCircle, X, ArrowLeft, ArrowRight, Image as ImageIcon, Loader2, Clipboard } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { addItem } from '../../../store/slices/cartSlice';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useFavorites } from '@/hooks/useFavorites';
import { fixImageUrl } from '@/utils/imageUrl';

interface Product {
  _id: string;
  name: string;
  price: number;
  comparePrice?: number;
  mainImage: string;
  images?: string[];
  sku?: string;
  description?: string;
  slug?: string;
  rating?: number;
  reviews?: number;
  specifications?: { name: string; value: string }[];
  characteristics?: { characteristicId: string; value: string }[];
  categoryId?: { _id: string; slug: string; name: string; parentId?: string }; // Добавляем categoryId
}

interface User {
  [key: string]: any;
}

interface ProductClientProps {
  slug: string;
}

function useProductBySlug(slug: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    setProduct(null);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';
    fetch(`${API_URL}/products/slug/${slug}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Товар не найден');
        return res.json();
      })
      .then((data) => setProduct(data))
      .catch(() => setError('Товар не найден'))
      .finally(() => setLoading(false));
  }, [slug]);

  return { product, loading, error };
}

// 1. Добавляю тип для характеристики
interface CharacteristicDictItem {
  _id: string;
  name: string;
}

// Функция для преобразования названия
function capitalizeWords(name: string) {
  return name.split(' ').map(word => {
    if (word.length >= 3 && word[0] === word[0].toLowerCase()) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    return word;
  }).join(' ');
}

export default function ProductClient({ slug }: ProductClientProps) {
  const dispatch = useDispatch();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [flyingItem, setFlyingItem] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const { user, orders, isAuthenticated } = useAuth();
  const { product, loading, error } = useProductBySlug(slug);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [reviewImagePreviews, setReviewImagePreviews] = useState<string[]>([]);
  const [imageModal, setImageModal] = useState<{visible: boolean, images: string[], index: number}>({visible: false, images: [], index: 0});
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [characteristicsDict, setCharacteristicsDict] = useState<CharacteristicDictItem[]>([]);
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselVisibleCount, setCarouselVisibleCount] = useState(3);
  const [addedToCartIds, setAddedToCartIds] = useState<string[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `Смотри что я нашел на сайте Технолайн:`;
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();

  // Обработка клавиш для модала изображений
  useEffect(() => {
    if (!imageModal.visible) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setImageModal({visible: false, images: [], index: 0});
      } else if (e.key === 'ArrowLeft' && imageModal.index > 0) {
        setImageModal(prev => ({...prev, index: prev.index - 1}));
      } else if (e.key === 'ArrowRight' && imageModal.index < imageModal.images.length - 1) {
        setImageModal(prev => ({...prev, index: prev.index + 1}));
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [imageModal]);

  // Загружаем справочник характеристик
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';
    fetch(`${API_URL}/characteristics`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => setCharacteristicsDict(Array.isArray(data) ? data : []))
      .catch(() => setCharacteristicsDict([]));
  }, []);

  // Подгружаем отзывы текущего пользователя (для ограничения на количество)
  useEffect(() => {
    if (!product || !isAuthenticated || !user) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/reviews/product/${product._id}?all=1`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setUserReviews(Array.isArray(data) ? data.filter((r: any) => r.user && r.user._id === user._id) : []);
      })
      .catch(() => setUserReviews([]));
  }, [product, isAuthenticated, user]);

  // Подгружаем все одобренные отзывы
  useEffect(() => {
    if (!product) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/reviews/product/${product._id}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setAllReviews(Array.isArray(data) ? data.filter((r: any) => r.isApproved) : []);
      })
      .catch(() => setAllReviews([]));
  }, [product]);

  // Загружаем рекомендуемые товары (например, из той же категории, кроме текущего)
  useEffect(() => {
    if (!product || !product._id || !product.slug) return;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';
    // Получаем товары из той же категории, кроме текущего
    if (product.categoryId && product.categoryId.slug) {
      fetch(`${API_URL}/products/category/${product.categoryId.slug}?limit=12`)
        .then(res => res.ok ? res.json() : { products: [] })
        .then(data => {
          if (data.products && Array.isArray(data.products)) {
            setSuggestedProducts(data.products.filter((p: any) => p._id !== product._id));
          }
        });
    }
  }, [product]);

  // Адаптивное количество карточек в зависимости от ширины
  useEffect(() => {
    if (!carouselRef.current) return;
    const updateVisible = () => {
      const width = carouselRef.current?.offsetWidth || 0;
      const cardWidth = 140 + 16; // min-w + gap
      const count = Math.max(1, Math.floor(width / cardWidth));
      setCarouselVisibleCount(count);
    };
    updateVisible();
    const observer = new window.ResizeObserver(updateVisible);
    observer.observe(carouselRef.current);
    return () => observer.disconnect();
  }, [suggestedProducts.length]);

  // Автопрокрутка, если товаров больше видимых
  useEffect(() => {
    if (suggestedProducts.length <= carouselVisibleCount) return;
    const interval = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % (suggestedProducts.length - carouselVisibleCount + 1));
    }, 3500);
    return () => clearInterval(interval);
  }, [suggestedProducts.length, carouselVisibleCount]);

  // Прокрутка при изменении индекса
  useEffect(() => {
    if (carouselRef.current && suggestedProducts.length > carouselVisibleCount) {
      const cardWidth = 140 + 16;
      carouselRef.current.scrollTo({
        left: carouselIndex * cardWidth,
        behavior: 'smooth',
      });
    }
  }, [carouselIndex, suggestedProducts.length, carouselVisibleCount]);

  const handlePrev = () => {
    setCarouselIndex(i => Math.max(i - 1, 0));
  };
  const handleNext = () => {
    setCarouselIndex(i => Math.min(i + 1, suggestedProducts.length - carouselVisibleCount));
  };

  // Сколько раз купил этот товар (доставленные)
  const deliveredCount = isAuthenticated && product ? orders.reduce((acc, order) => {
    if (order.status === 'delivered') {
      acc += order.items.filter((item: any) => item.productId && item.productId._id === product._id).length;
  }
    return acc;
  }, 0) : 0;
  // Сколько отзывов уже оставил
  const userReviewCount = userReviews.length;
  // Можно ли оставить еще отзыв
  const canWriteReview = isAuthenticated && deliveredCount > userReviewCount;

  useEffect(() => {
    if (product && isAuthenticated && user) {
      const trackProductView = async () => {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/products/${product._id}/view`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          });
        } catch {}
      };
      const timer = setTimeout(trackProductView, 3000);
      return () => clearTimeout(timer);
    }
  }, [product, isAuthenticated, user]);

  // Хлебные крошки (breadcrumb)
  function getCategoryBreadcrumbs(category: any): Array<{ name: string; slug: string }> {
    const crumbs: Array<{ name: string; slug: string }> = [];
    let current = category;
    while (current) {
      if (current.name && current.slug) {
        crumbs.unshift({ name: current.name, slug: current.slug });
      }
      current = current.parentId;
    }
    return crumbs;
  }
  const breadcrumbs = product && product.categoryId ? getCategoryBreadcrumbs(product.categoryId) : [];

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 pt-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Загрузка товара...</h1>
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

  // Галерея
  const galleryImages = [fixImageUrl(product.mainImage), ...(product.images?.filter(img => img !== product.mainImage).map(img => fixImageUrl(img)) || [])];

  // Скидка
  const hasDiscount = product.comparePrice && product.comparePrice > product.price;
  const discountPercent = hasDiscount ? Math.round(100 - (product.price / product.comparePrice!) * 100) : 0;

  // Характеристики (specifications)
  const specs = product.specifications || [];

  // SKU
  const sku = product.sku || '';

  // Рейтинг
  const rating = typeof product.rating === 'number' ? product.rating : null;
  const reviews = typeof product.reviews === 'number' ? product.reviews : null;

  // Средний рейтинг по отзывам (если есть)
  const reviewsCount = allReviews.length;
  const avgRating = reviewsCount > 0 ? allReviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviewsCount : null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 pt-32">
        {/* Хлебные крошки */}
        {breadcrumbs.length > 0 && (
          <nav className="mb-4 text-sm text-gray-500 font-medium flex flex-wrap items-center gap-1">
            <Link href="/" className="hover:underline text-primary-600">Главная</Link>
            <span>/</span>
            {breadcrumbs.map((cat, idx) => (
              <span key={cat.slug} className="flex items-center gap-1">
                <Link href={`/catalog/${cat.slug}`} className="hover:underline text-primary-600">{cat.name}</Link>
                {idx < breadcrumbs.length - 1 && <span>/</span>}
              </span>
            ))}
            <span className="text-gray-400">/</span>
            <span className="text-gray-800 font-semibold">{product?.name ? capitalizeWords(product.name) : ''}</span>
          </nav>
        )}
        {/* Мобильная версия */}
        <div className="lg:hidden">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Галерея */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="relative group">
                <img
                  src={galleryImages[selectedImage]}
                  alt={product.name}
                  className="w-full h-80 object-contain rounded-xl shadow-lg bg-white transition-all duration-300"
                />
                {hasDiscount && (
                  <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                    <Percent className="w-4 h-4" /> -{discountPercent}%
                  </div>
                )}
                {/* Кнопка добавить в избранное */}
                <button
                  className={`absolute bottom-4 right-4 p-2 rounded-full shadow-lg transition-colors z-10 ${isFavorite(product._id) ? 'bg-pink-500' : 'bg-white'}`}
                  title={isFavorite(product._id) ? 'Убрать из избранного' : 'Добавить в избранное'}
                  onClick={e => {
                    e.preventDefault();
                    if (!isAuthenticated) {
                      alert('Войдите в аккаунт, чтобы добавлять товары в избранное');
                      return;
                    }
                    isFavorite(product._id) ? removeFavorite(product._id) : addFavorite(product._id);
                  }}
                >
                  <Heart className={`w-5 h-5 ${isFavorite(product._id) ? 'text-white fill-current' : 'text-pink-500'}`} />
                </button>
              </div>
              {galleryImages.length > 1 && (
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                  {galleryImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 transition-all duration-200 overflow-hidden ${selectedImage === idx ? 'border-primary-500' : 'border-gray-200'}`}
                    >
                      <img src={img} alt={product.name + ' ' + (idx + 1)} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Название, цена и кнопка покупки */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
                             {/* Название */}
               <div>
                 <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">{capitalizeWords(product.name)}</h1>
                 <div className="flex items-center gap-3 flex-wrap text-sm">
                   {reviewsCount > 0 && avgRating !== null && (
                     <div className="flex items-center gap-1">
                       {[...Array(5)].map((_, i) => (
                         <Star key={i} className={`w-4 h-4 ${i < Math.round(avgRating) ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} />
                       ))}
                       <span className="text-gray-700 font-medium ml-1">{avgRating.toFixed(1)}</span>
                     </div>
                   )}
                   <button
                     type="button"
                     className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-sm font-medium hover:underline"
                     onClick={() => setIsReviewsOpen(true)}
                   >
                     <MessageCircle className="w-4 h-4" /> 
                     Отзывы{reviewsCount > 0 ? ` (${reviewsCount})` : ''}
                   </button>
                   <span className="text-xs text-gray-500 flex items-center gap-1">
                     <Tag className="w-3 h-3" /> Артикул: <span className="font-semibold">{sku}</span>
                   </span>
                 </div>
               </div>

              {/* Цена */}
              <div className="flex items-end gap-4">
                <div className="text-3xl font-bold text-primary-600">{product.price.toLocaleString()} ₽</div>
                {hasDiscount && (
                  <div className="text-lg text-gray-500 line-through">{product.comparePrice?.toLocaleString()} ₽</div>
                )}
              </div>

              {/* Кнопка купить */}
              <motion.button
                ref={buttonRef}
                onClick={async () => {
                  setIsAddingToCart(true);
                  await new Promise(res => setTimeout(res, 500));
                  setFlyingItem(true);
                  dispatch(addItem({
                    _id: product._id,
                    name: product.name,
                    price: product.price,
                    image: product.mainImage,
                    quantity: 1, // Фиксированное количество для мобильной версии
                    sku: product.sku || '',
                    slug: product.slug || ''
                  }));
                  setTimeout(() => {
                    setFlyingItem(false);
                    setIsAddingToCart(false);
                    setShowSuccess(true);
                    setTimeout(() => setShowSuccess(false), 2000);
                  }, 800);
                }}
                disabled={isAddingToCart}
                className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-3 shadow-lg ${isAddingToCart ? 'bg-green-600 text-white' : 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800'}`}
                whileHover={!isAddingToCart ? { scale: 1.02 } : {}}
                whileTap={!isAddingToCart ? { scale: 0.98 } : {}}
              >
                <AnimatePresence mode="wait">
                  {isAddingToCart ? (
                    <motion.div key="loading" initial={{ opacity: 0, rotate: -180 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 180 }} transition={{ duration: 0.3 }} className="flex items-center space-x-2">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                        <ShoppingCart className="w-6 h-6" />
                      </motion.div>
                      <span>Добавляется...</span>
                    </motion.div>
                  ) : showSuccess ? (
                    <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.3 }} className="flex items-center space-x-2">
                      <Check className="w-6 h-6" />
                      <span>Добавлено!</span>
                    </motion.div>
                  ) : (
                    <motion.div key="normal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="flex items-center space-x-2">
                      <ShoppingCart className="w-6 h-6" />
                      <span>Купить</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>

            {/* Карусель рекомендуемых товаров */}
            {suggestedProducts.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="space-y-4"
              >
                <h2 className="text-xl font-bold text-gray-900">Рекомендуем также</h2>
                <div className="relative">
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {suggestedProducts.map((p) => (
                      <Link key={p._id} href={`/product/${p.slug}`} className="flex-shrink-0 w-32">
                        <img src={fixImageUrl(p.mainImage)} alt={p.name} className="w-full h-32 object-contain bg-white rounded-lg border border-gray-200 mb-2" />
                        <div className="p-1">
                          <span className="font-medium text-gray-900 text-xs truncate block">{capitalizeWords(p.name)}</span>
                          <span className="text-primary-600 font-bold text-sm block">{p.price?.toLocaleString()} ₽</span>
                          <button
                            type="button"
                            className={`mt-2 w-full flex items-center justify-center gap-1 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold py-1 rounded-md transition-all duration-200 ${addedToCartIds.includes(p._id) ? 'bg-green-600' : ''}`}
                            onClick={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              dispatch(addItem({
                                _id: p._id,
                                name: p.name,
                                price: p.price,
                                image: p.mainImage,
                                quantity: 1,
                                sku: p.sku || '',
                                slug: p.slug || ''
                              }));
                              setAddedToCartIds(ids => [...ids, p._id]);
                              setTimeout(() => setAddedToCartIds(ids => ids.filter(id => id !== p._id)), 1200);
                            }}
                            disabled={addedToCartIds.includes(p._id)}
                          >
                            {addedToCartIds.includes(p._id) ? (
                              <>
                                <Check className="w-3 h-3" />
                                Добавлено!
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="w-3 h-3" />
                                В корзину
                              </>
                            )}
                          </button>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Остальной контент в мобильной версии */}
            {/* Характеристики (specifications) */}
            {specs.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2"><Shield className="w-5 h-5 text-blue-500" /> Характеристики</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-[300px] w-full text-sm text-gray-700">
                    <tbody>
                      {specs.map((spec, idx) => (
                        <tr key={idx} className="border-b last:border-b-0">
                          <td className="py-2 pr-4 font-medium whitespace-nowrap w-1/3">{spec.name}</td>
                          <td className="py-2 pl-4">{spec.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
            
            {/* Характеристики (characteristics) */}
            {Array.isArray(product.characteristics) && product.characteristics.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2"><Tag className="w-5 h-5 text-purple-500" /> Характеристики</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-[300px] w-full text-sm text-gray-700">
                    <tbody>
                      {product.characteristics.map((char, idx) => {
                        const found = characteristicsDict.find(c => c._id === char.characteristicId);
                        return (
                          <tr key={idx} className="border-b last:border-b-0">
                            <td className="py-2 pr-4 font-medium whitespace-nowrap w-1/3">{found ? found.name : char.characteristicId}</td>
                            <td className="py-2 pl-4">{char.value}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* Описание */}
            {product.description && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2"><Info className="w-5 h-5 text-indigo-500" /> Описание</h3>
                <div className="text-gray-700 text-sm leading-relaxed">
                  {descExpanded || product.description.length <= 1000 ? (
                    <>
                      <span dangerouslySetInnerHTML={{ __html: product.description }} />
                      {product.description.length > 1000 && (
                        <button className="ml-2 text-primary-600 hover:underline text-sm font-medium" onClick={() => setDescExpanded(false)}>Скрыть</button>
                      )}
                    </>
                  ) : (
                    <>
                      <span dangerouslySetInnerHTML={{ __html: product.description.slice(0, 1000) + '...' }} />
                      <button className="ml-2 text-primary-600 hover:underline text-sm font-medium" onClick={() => setDescExpanded(true)}>Показать полностью</button>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* Блок преимуществ магазина */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
              className="rounded-2xl border-2 border-primary-100 bg-gradient-to-br from-primary-50 to-white shadow-lg p-4">
              <h3 className="text-lg font-bold text-primary-700 mb-3 flex items-center gap-2">
                <Shield className="w-6 h-6 text-green-500" /> Почему выбирают нас?
              </h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-3 text-gray-800 text-sm font-medium"><Truck className="w-5 h-5 text-primary-500" /> Быстрая доставка по Москве и РФ</li>
                <li className="flex items-center gap-3 text-gray-800 text-sm font-medium"><Shield className="w-5 h-5 text-blue-500" /> Оригинальные товары с гарантией</li>
                <li className="flex items-center gap-3 text-gray-800 text-sm font-medium"><RotateCcw className="w-5 h-5 text-yellow-500" /> 1 год гарантии</li>
                <li className="flex items-center gap-3 text-gray-800 text-sm font-medium"><Check className="w-5 h-5 text-green-600" /> Поддержка 7 дней в неделю</li>
                <li className="flex items-center gap-3 text-gray-800 text-sm font-medium"><Star className="w-5 h-5 text-yellow-400" /> Более 1000 положительных отзывов</li>
              </ul>
            </motion.div>

            
          </motion.div>
        </div>

        {/* Десктопная версия */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden lg:grid grid-cols-1 lg:grid-cols-2 gap-10"
        >
          {/* Левая колонка: галерея + характеристики */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {/* Галерея */}
            <div className="relative group">
              <img
                src={galleryImages[selectedImage]}
                alt={product.name}
                className="w-full h-96 object-contain rounded-xl shadow-lg bg-white transition-all duration-300 group-hover:scale-105"
              />
              {hasDiscount && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                  <Percent className="w-4 h-4" /> -{discountPercent}%
                </div>
              )}
              {/* Кнопка поделиться */}
              <div className="absolute top-4 right-4 z-20">
              <button
                  onClick={() => setShareOpen(o => !o)}
                  className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors relative"
                  title="Поделиться"
              >
                <Share2 className="w-5 h-5 text-gray-600" />
              </button>
                {shareOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in flex flex-col gap-1">
                    <button
                      className="flex items-center gap-2 px-4 py-2 hover:bg-primary-50 text-gray-800 text-sm w-full text-left"
                      onClick={() => {
                        navigator.clipboard.writeText(shareUrl);
                        setShareOpen(false);
                      }}
                    >
                      <Clipboard className="w-5 h-5 text-primary-600" />
                      Скопировать ссылку
                    </button>
                    <a
                      href={`https://vk.com/share.php?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 hover:bg-primary-50 text-gray-800 text-sm"
                      onClick={() => setShareOpen(false)}
                    >
                      <img src="/VK_Compact_Logo_(2021-present).svg.webp" alt="VK" className="w-5 h-5" />
                      Поделиться в VK
                    </a>
                    <a
                      href={`https://connect.ok.ru/offer?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 hover:bg-primary-50 text-gray-800 text-sm"
                      onClick={() => setShareOpen(false)}
                    >
                      <img src="/Odnoklassniki.svg.png" alt="OK" className="w-5 h-5" />
                      Поделиться в Одноклассниках
                    </a>
                    <a
                      href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 hover:bg-primary-50 text-gray-800 text-sm"
                      onClick={() => setShareOpen(false)}
                    >
                      <img src="/Telegram_2019_Logo.svg.webp" alt="Telegram" className="w-5 h-5" />
                      Поделиться в Telegram
                    </a>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 hover:bg-primary-50 text-gray-800 text-sm"
                      onClick={() => setShareOpen(false)}
                    >
                      <img src="/2062095_application_chat_communication_logo_whatsapp_icon.svg.webp" alt="WhatsApp" className="w-5 h-5" />
                      Поделиться в WhatsApp
                    </a>
                  </div>
                )}
              </div>
              {/* Кнопка добавить в избранное */}
              <button
                className={`absolute bottom-4 right-4 p-2 rounded-full shadow-lg transition-colors z-10 ${isFavorite(product._id) ? 'bg-pink-500' : 'bg-white'}`}
                title={isFavorite(product._id) ? 'Убрать из избранного' : 'Добавить в избранное'}
                onClick={e => {
                  e.preventDefault();
                  if (!isAuthenticated) {
                    alert('Войдите в аккаунт, чтобы добавлять товары в избранное');
                    return;
                  }
                  isFavorite(product._id) ? removeFavorite(product._id) : addFavorite(product._id);
                }}
              >
                <Heart className={`w-5 h-5 ${isFavorite(product._id) ? 'text-white fill-current' : 'text-pink-500'}`} />
              </button>
            </div>
            {galleryImages.length > 1 && (
              <div className="flex gap-2 mt-2">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-16 h-16 rounded-lg border-2 transition-all duration-200 overflow-hidden ${selectedImage === idx ? 'border-primary-500' : 'border-gray-200'}`}
                  >
                    <img src={img} alt={product.name + ' ' + (idx + 1)} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {/* Характеристики (specifications) */}
            {specs.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="border-t pt-6 mt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2"><Shield className="w-5 h-5 text-blue-500" /> Характеристики</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-[300px] w-full text-sm text-gray-700">
                    <tbody>
                      {specs.map((spec, idx) => (
                        <tr key={idx} className="border-b last:border-b-0">
                          <td className="py-2 pr-4 font-medium whitespace-nowrap w-1/3">{spec.name}</td>
                          <td className="py-2 pl-4">{spec.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
            {/* Характеристики (characteristics) */}
            {Array.isArray(product.characteristics) && product.characteristics.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="border-t pt-6 mt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2"><Tag className="w-5 h-5 text-purple-500" /> Характеристики</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-[300px] w-full text-sm text-gray-700">
                    <tbody>
                      {product.characteristics.map((char, idx) => {
                        const found = characteristicsDict.find(c => c._id === char.characteristicId);
                        return (
                          <tr key={idx} className="border-b last:border-b-0">
                            <td className="py-2 pr-4 font-medium whitespace-nowrap w-1/3">{found ? found.name : char.characteristicId}</td>
                            <td className="py-2 pl-4">{char.value}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
            {/* Блок преимуществ магазина */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
              className="mt-6 rounded-2xl border-2 border-primary-100 bg-gradient-to-br from-primary-50 to-white shadow-lg p-6 flex flex-col gap-3">
              <h3 className="text-xl font-bold text-primary-700 mb-2 flex items-center gap-2">
                <Shield className="w-7 h-7 text-green-500" /> Почему выбирают нас?
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-800 text-base font-medium"><Truck className="w-6 h-6 text-primary-500" /> Быстрая доставка по Москве и РФ</li>
                <li className="flex items-center gap-3 text-gray-800 text-base font-medium"><Shield className="w-6 h-6 text-blue-500" /> Оригинальные товары с гарантией</li>
                <li className="flex items-center gap-3 text-gray-800 text-base font-medium"><RotateCcw className="w-6 h-6 text-yellow-500" /> 1 год гарантии</li>
                <li className="flex items-center gap-3 text-gray-800 text-base font-medium"><Check className="w-6 h-6 text-green-600" /> Поддержка 7 дней в неделю</li>
                <li className="flex items-center gap-3 text-gray-800 text-base font-medium"><Star className="w-6 h-6 text-yellow-400" /> Более 1000 положительных отзывов</li>
              </ul>
            </motion.div>
          </motion.div>

          {/* Правая колонка: всё остальное (инфо, цена, описание, соцсети, отзывы и т.д.) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold text-gray-900 leading-tight">{capitalizeWords(product.name)}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                {reviewsCount > 0 && avgRating !== null && (
                  <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-5 h-5 ${i < Math.round(avgRating) ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} />
                  ))}
                    <span className="text-gray-700 font-medium ml-1">{avgRating.toFixed(1)}</span>
                </div>
                )}
                <span className="text-xs text-gray-500 flex items-center gap-1"><Tag className="w-4 h-4" /> Артикул: <span className="font-semibold">{sku}</span></span>
                <button
                  type="button"
                  className="text-primary-600 hover:underline flex items-center gap-1 text-sm"
                  onClick={() => setIsReviewsOpen(true)}
                >
                  <MessageCircle className="w-4 h-4" /> Отзывы{reviewsCount > 0 ? ` (${reviewsCount})` : ''}
                </button>
              </div>
            </div>
            <div className="flex items-end gap-4">
              <div className="text-3xl font-bold text-primary-600">{product.price.toLocaleString()} ₽</div>
              {hasDiscount && (
                <div className="text-lg text-gray-500 line-through">{product.comparePrice?.toLocaleString()} ₽</div>
              )}
            </div>
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex items-center gap-2">
                <label htmlFor="quantity" className="text-gray-700 font-medium">Количество:</label>
                  <select
                    id="quantity"
                    value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {[...Array(10)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
              </div>
                <motion.button
                  ref={buttonRef}
                onClick={async () => {
                  setIsAddingToCart(true);
                  await new Promise(res => setTimeout(res, 500));
                  setFlyingItem(true);
                  dispatch(addItem({
                    _id: product._id,
                    name: product.name,
                    price: product.price,
                    image: product.mainImage,
                    quantity,
                    sku: product.sku || '',
                    slug: product.slug || ''
                  }));
                  setTimeout(() => {
                    setFlyingItem(false);
                    setIsAddingToCart(false);
                    setShowSuccess(true);
                    setTimeout(() => setShowSuccess(false), 2000);
                  }, 800);
                }}
                  disabled={isAddingToCart}
                className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${isAddingToCart ? 'bg-green-600 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
                  whileHover={!isAddingToCart ? { scale: 1.02 } : {}}
                  whileTap={!isAddingToCart ? { scale: 0.98 } : {}}
                >
                  <AnimatePresence mode="wait">
                    {isAddingToCart ? (
                    <motion.div key="loading" initial={{ opacity: 0, rotate: -180 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 180 }} transition={{ duration: 0.3 }} className="flex items-center space-x-2">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                          <ShoppingCart className="w-5 h-5" />
                        </motion.div>
                        <span>Добавляется...</span>
                      </motion.div>
                    ) : showSuccess ? (
                    <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.3 }} className="flex items-center space-x-2">
                        <Check className="w-5 h-5" />
                        <span>Добавлено!</span>
                      </motion.div>
                    ) : (
                    <motion.div key="normal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="flex items-center space-x-2">
                        <ShoppingCart className="w-5 h-5" />
                      <span>Купить</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
            </div>
            {/* Карусель рекомендуемых товаров */}
            {suggestedProducts.length > 0 && (
              <div className="mt-6">
                <h3 className="text-base font-semibold text-gray-800 mb-2 flex items-center gap-2"><ArrowRight className="w-4 h-4 text-primary-500" /> Рекомендуем к этому товару</h3>
                <div className="relative">
                  {suggestedProducts.length > carouselVisibleCount && (
                    <>
                      <button onClick={handlePrev} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-primary-100 rounded-full p-1 shadow border border-gray-200"><ArrowLeft className="w-5 h-5 text-primary-600" /></button>
                      <button onClick={handleNext} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-primary-100 rounded-full p-1 shadow border border-gray-200"><ArrowRight className="w-5 h-5 text-primary-600" /></button>
                    </>
                  )}
                  <div ref={carouselRef} className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary-200 scrollbar-track-transparent px-6">
                    <div className="flex gap-4 pb-2" style={{ minWidth: 0 }}>
                      {suggestedProducts.map((p, idx) => (
                        <Link key={p._id} href={`/product/${p.slug}`} className="block min-w-[140px] max-w-[140px] bg-white rounded-xl shadow hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden flex-shrink-0 group relative">
                          <div className="aspect-square bg-gray-50 flex items-center justify-center">
                            <img src={fixImageUrl(p.mainImage || (p.images && p.images[0]) || '/placeholder-product.jpg')} alt={p.name} className="w-full h-full object-contain" />
                          </div>
                          <div className="p-2 flex flex-col gap-1">
                            <span className="font-medium text-gray-900 text-xs truncate">{capitalizeWords(p.name)}</span>
                            <span className="text-primary-600 font-bold text-sm">{p.price?.toLocaleString()} ₽</span>
                            <button
                              type="button"
                              className={`mt-2 w-full flex items-center justify-center gap-1 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold py-1 rounded-md transition-all duration-200 shadow-sm transform hover:scale-105 active:scale-95 ${addedToCartIds.includes(p._id) ? 'bg-green-600' : ''}`}
                              onClick={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                dispatch(addItem({
                                  _id: p._id,
                                  name: p.name,
                                  price: p.price,
                                  image: p.mainImage,
                                  quantity: 1,
                                  sku: p.sku || '',
                                  slug: p.slug || ''
                                }));
                                setAddedToCartIds(ids => [...ids, p._id]);
                                setTimeout(() => setAddedToCartIds(ids => ids.filter(id => id !== p._id)), 1200);
                              }}
                              disabled={addedToCartIds.includes(p._id)}
                            >
                              {addedToCartIds.includes(p._id) ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  Добавлено!
                                </>
                              ) : (
                                <>
                                  <ShoppingCart className="w-4 h-4" />
                                  В корзину
                                </>
                              )}
                            </button>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Соцсети */}
            <div className="flex flex-col items-start gap-2 mb-4 mt-2">
              <span className="text-gray-500 text-sm font-semibold mb-1 flex items-center gap-2"><ArrowRight className="w-4 h-4 text-primary-500" /> Мы в соцсетях:</span>
              <div className="flex gap-3 pl-6">
                <a href="https://t.me/tehnoline" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shadow-lg hover:scale-110 transition">
                  <img src="/Telegram_2019_Logo.svg.webp" alt="Telegram" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                </a>
                <a href="https://yandex.ru/maps/org/tekhnolayn/79043885143/?ll=37.383633%2C55.844334&z=16" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shadow-lg hover:scale-110 transition">
                  <img src="/Yandex_icon.svg.png" alt="Яндекс" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                </a>
                <a href="https://www.avito.ru/brands/i47031393/all?gdlkerfdnwq=101&page_from=from_item_card&iid=3710998009&sellerId=c947ff37111cc2e56892a2171d15df5b" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shadow-lg hover:scale-110 transition">
                  <img src="/1671105260_grizly-club-p-avito-logotip-png-14.png" alt="Авито" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                </a>
                <a href="https://vk.com/topic-134001522_36361702" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shadow-lg hover:scale-110 transition">
                  <img src="/VK_Compact_Logo_(2021-present).svg.webp" alt="ВКонтакте" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                </a>
              </div>
            </div>
            {/* Краткое описание с кнопкой */}
            {product.description && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2"><Info className="w-5 h-5 text-primary-500" /> Описание</h3>
                <div className="text-gray-600 leading-relaxed">
                  {descExpanded || product.description.length <= 1000 ? (
                    <>
                      <span dangerouslySetInnerHTML={{ __html: product.description }} />
                      {product.description.length > 1000 && (
                        <button className="ml-2 text-primary-600 hover:underline text-sm font-medium" onClick={() => setDescExpanded(false)}>Скрыть</button>
                      )}
                    </>
                  ) : (
                    <>
                      <span dangerouslySetInnerHTML={{ __html: product.description.slice(0, 1000) + '...' }} />
                      <button className="ml-2 text-primary-600 hover:underline text-sm font-medium" onClick={() => setDescExpanded(true)}>Показать полностью</button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>

        {/* Модальное окно отзывов */}
        <AnimatePresence>
          {isReviewsOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 relative m-4"
              >
                <button
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition"
                  onClick={() => {
                    setIsReviewsOpen(false);
                    setIsWritingReview(false);
                    setReviewText('');
                    setReviewRating(0);
                    setReviewSuccess(false);
                    setReviewImages([]);
                    setReviewImagePreviews([]);
                    setIsAnonymous(false);
                  }}
                  aria-label="Закрыть"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><MessageCircle className="w-6 h-6 text-primary-600" /> Отзывы о товаре</h2>
                {/* Список отзывов */}
                <div className="space-y-6 mb-8">
                  {allReviews.length === 0 ? (
                    <div className="bg-gray-50 rounded-xl p-6 text-center text-secondary-600 text-lg border border-light-200">
                      Пока нет отзывов.
                    </div>
                  ) : (
                    allReviews.map(r => (
                      <div key={r._id} className="bg-gray-50 rounded-xl p-4 border border-light-200 text-left">
                        <div className="flex items-center gap-2 mb-1">
                          {/* Аватар-инициалы */}
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700 text-base mr-2">
                            {r.authorName && r.authorName !== 'Анонимно' ? r.authorName.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'A'}
                          </div>
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'text-yellow-400' : 'text-gray-200'}`} />
                          ))}
                        </div>
                        <p className="text-gray-800 mt-2">{r.text}</p>
                        {r.images && r.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {r.images.map((img: any, imgIdx: number) => (
                              <button
                                key={imgIdx}
                                onClick={() => setImageModal({visible: true, images: r.images, index: imgIdx})}
                                className="w-20 h-20 rounded-md overflow-hidden hover:opacity-80 transition-opacity cursor-pointer border-2 border-transparent hover:border-primary-300"
                              >
                                <img src={fixImageUrl(img)} alt={`Review image ${imgIdx + 1}`} className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                        <p className="text-gray-600 text-sm mt-2">
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Дата неизвестна'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                {/* Форма отзыва */}
                {canWriteReview ? (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Оставить отзыв</h3>
                  <form onSubmit={(e) => {
                      e.preventDefault();
                      
                      if (!reviewText.trim()) {
                        alert('Пожалуйста, напишите текст отзыва');
                        return;
                      }
                      
                      if (reviewRating === 0) {
                        alert('Пожалуйста, выберите рейтинг');
                        return;
                      }
                      
                      setReviewSubmitting(true);
                    // Сначала создаем отзыв
                    const reviewData = {
                      product: product._id,
                      text: reviewText,
                      rating: reviewRating,
                      ...(isAnonymous && { authorName: 'Анонимно' })
                    };

                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/reviews`, {
                      method: 'POST',
                      credentials: 'include',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                      },
                      body: JSON.stringify(reviewData)
                    })
                      .then(res => res.ok ? res.json() : res.json().then(err => { throw err; }))
                      .then(async (data) => {
                        // Если есть изображения, загружаем их
                                                 if (reviewImages.length > 0 && data._id) {
                           const imageFormData = new FormData();
                           reviewImages.forEach((file) => {
                             imageFormData.append('file', file);
                           });
                          
                          try {
                                                         await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reviews/${data._id}/upload-image`, {
                              method: 'POST',
                              credentials: 'include',
                              headers: {
                                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                              },
                              body: imageFormData
                            });
                          } catch (imageError) {
                            console.error('Ошибка при загрузке изображений:', imageError);
                            // Не прерываем процесс, отзыв уже создан
                          }
                        }
                        
                        setReviewSuccess(true);
                        setReviewSubmitting(false);
                        setIsReviewsOpen(false);
                        setIsWritingReview(false);
                        setReviewText('');
                        setReviewRating(0);
                        setReviewImages([]);
                        setReviewImagePreviews([]);
                        setIsAnonymous(false);
                        // Обновляем список отзывов
                        fetch(`${process.env.NEXT_PUBLIC_API_URL}/reviews/product/${product._id}`)
                          .then(res => res.ok ? res.json() : [])
                          .then(data => {
                            setAllReviews(Array.isArray(data) ? data.filter((r: any) => r.isApproved) : []);
                          })
                          .catch(() => setAllReviews([]));
                      })
                      .catch(err => {
                        console.error('Error submitting review:', err);
                        setReviewSubmitting(false);
                        alert('Ошибка при отправке отзыва: ' + err.message || 'Неизвестная ошибка');
                      });
                  }} className="space-y-4">
                    <div>
                      <label htmlFor="reviewText" className="block text-sm font-medium text-gray-700">Текст отзыва:</label>
                      <textarea
                        id="reviewText"
                        rows={4}
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        placeholder="Напишите ваш отзыв о товаре..."
                        required
                      ></textarea>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Рейтинг:</label>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setReviewRating(i + 1)}
                            className={`transition-colors hover:scale-110 transform duration-200 ${
                              i < reviewRating 
                                ? 'text-yellow-400 fill-current' 
                                : 'text-gray-300 hover:text-yellow-300'
                            }`}
                            aria-label={`Рейтинг ${i + 1} звезд`}
                          >
                            <Star className="w-8 h-8" />
                          </button>
                        ))}
                        <span className="ml-2 text-sm text-gray-600">
                          {reviewRating > 0 ? `${reviewRating} из 5 звёзд` : 'Выберите рейтинг'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="isAnonymous" className="flex items-center">
                        <input
                          type="checkbox"
                          id="isAnonymous"
                          checked={isAnonymous}
                          onChange={(e) => setIsAnonymous(e.target.checked)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Оставить отзыв анонимно</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Добавить изображения (не более 5):
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          id="reviewImages"
                          multiple
                          accept="image/*"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 5) {
                              alert('Можно выбрать не более 5 изображений');
                              return;
                            }
                            setReviewImages(files);
                            setReviewImagePreviews(files.map(file => URL.createObjectURL(file)));
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-primary-300 rounded-xl bg-primary-50 hover:bg-primary-100 transition-colors cursor-pointer">
                          <div className="text-center">
                            <ImageIcon className="w-8 h-8 text-primary-500 mx-auto mb-2" />
                            <p className="text-sm font-medium text-primary-700">
                              Нажмите, чтобы выбрать фото
                            </p>
                            <p className="text-xs text-primary-500">
                              PNG, JPG до 10MB (максимум 5 фото)
                            </p>
                          </div>
                        </div>
                      </div>
                      {reviewImagePreviews.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {reviewImagePreviews.map((preview, index) => (
                            <div key={index} className="relative w-20 h-20 rounded-md overflow-hidden">
                              <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => {
                                  setReviewImages(prev => prev.filter((_, i) => i !== index));
                                  setReviewImagePreviews(prev => prev.filter((_, i) => i !== index));
                                }}
                                className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 flex items-center justify-center"
                                aria-label="Удалить изображение"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                      <button
                        type="submit"
                      disabled={reviewSubmitting}
                      className="w-full py-2 px-4 rounded-lg font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {reviewSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : (
                        <MessageCircle className="w-5 h-5 mr-2" />
                      )}
                      {reviewSuccess ? 'Отзыв отправлен!' : 'Отправить отзыв'}
                      </button>
                  </form>
                </div>
                ) : (
                  <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Оставить отзыв</h3>
                    <p className="text-gray-600 text-sm">
                      {!isAuthenticated 
                        ? 'Войдите в аккаунт, чтобы оставить отзыв' 
                        : deliveredCount === 0 
                        ? 'Чтобы оставить отзыв, необходимо сначала купить и получить этот товар'
                        : 'Вы уже оставили максимальное количество отзывов для этого товара'
                      }
                    </p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Модал просмотра изображений */}
        <AnimatePresence>
          {imageModal.visible && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
              onClick={() => setImageModal({visible: false, images: [], index: 0})}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative max-w-4xl max-h-[90vh] mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Кнопка закрытия */}
                <button
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
                  onClick={() => setImageModal({visible: false, images: [], index: 0})}
                  aria-label="Закрыть"
                >
                  <X className="w-6 h-6" />
                </button>
                
                {/* Изображение */}
                <div className="relative">
                  <img 
                    src={fixImageUrl(imageModal.images[imageModal.index])} 
                    alt={`Изображение ${imageModal.index + 1}`}
                    className="max-w-full max-h-[90vh] object-contain rounded-lg"
                  />
                  
                  {/* Навигация между изображениями */}
                  {imageModal.images.length > 1 && (
                    <>
                      {/* Кнопка назад */}
                      {imageModal.index > 0 && (
                        <button
                          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
                          onClick={() => setImageModal(prev => ({...prev, index: prev.index - 1}))}
                          aria-label="Предыдущее изображение"
                        >
                          <ArrowLeft className="w-6 h-6" />
                        </button>
                      )}
                      
                      {/* Кнопка вперед */}
                      {imageModal.index < imageModal.images.length - 1 && (
                        <button
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
                          onClick={() => setImageModal(prev => ({...prev, index: prev.index + 1}))}
                          aria-label="Следующее изображение"
                        >
                          <ArrowRight className="w-6 h-6" />
                        </button>
                      )}
                      
                      {/* Индикатор */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-sm">
                        {imageModal.index + 1} из {imageModal.images.length}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
} 