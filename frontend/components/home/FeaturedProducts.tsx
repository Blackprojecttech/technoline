'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star, Heart, ShoppingCart, Eye } from 'lucide-react';
import { useFeaturedProducts, Product } from '../../hooks/useProducts';
import { fixProductsImageUrls } from '../../utils/imageUrl';

export default function FeaturedProducts() {
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);
  const { products, loading, error } = useFeaturedProducts();

  if (loading) {
    return (
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 to-accent-50/50"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-secondary-800 mb-4">
              Популярные товары
            </h2>
            <p className="text-xl text-secondary-600 max-w-2xl mx-auto">
              Загрузка товаров...
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white border border-light-200 rounded-2xl p-6 animate-pulse shadow-sm">
                <div className="w-full h-64 bg-light-200 rounded-xl mb-6"></div>
                <div className="space-y-4">
                  <div className="h-4 bg-light-200 rounded"></div>
                  <div className="h-6 bg-light-200 rounded"></div>
                  <div className="h-4 bg-light-200 rounded"></div>
                  <div className="h-10 bg-light-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error && products.length === 0) {
    return (
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 to-accent-50/50"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center">
            <h2 className="text-4xl lg:text-5xl font-bold text-secondary-800 mb-4">
              Популярные товары
            </h2>
            <p className="text-xl text-secondary-600">
              {error}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 to-accent-50/50"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-secondary-800 mb-4">
            Популярные товары
          </h2>
          <p className="text-xl text-secondary-600 max-w-2xl mx-auto">
            Самые востребованные товары с отличными отзывами и выгодными ценами
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {fixProductsImageUrls(products).map((product) => (
            <div
              key={product._id}
              className={`group relative bg-white border border-light-200 rounded-2xl p-6 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-primary-500/25 ${
                hoveredProduct === product._id ? 'ring-2 ring-primary-400' : ''
              }`}
              onMouseEnter={() => setHoveredProduct(product._id)}
              onMouseLeave={() => setHoveredProduct(null)}
            >
              {/* Badge */}
              {product.isFeatured && (
                <div className="absolute top-4 left-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white text-xs font-semibold px-3 py-1 rounded-full z-10 shadow-lg">
                  Популярно
                </div>
              )}

              {/* Product image */}
              <div className="relative mb-6">
                <div className="w-full h-64 bg-gradient-to-br from-primary-100 to-accent-100 rounded-xl flex items-center justify-center border border-light-200 overflow-hidden">
                  {product.mainImage ? (
                    <img
                      src={product.mainImage}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-6xl">📱</div>
                  )}
                </div>
                
                {/* Quick actions */}
                <div className="absolute top-4 right-4 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <button className="w-10 h-10 bg-primary-500/80 hover:bg-primary-600 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110 shadow-lg">
                    <Heart size={18} />
                  </button>
                  <Link href={`/product/${product.slug}`}>
                    <button className="w-10 h-10 bg-primary-500/80 hover:bg-primary-600 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110 shadow-lg">
                      <Eye size={18} />
                    </button>
                  </Link>
                </div>
              </div>

              {/* Product info */}
              <div className="space-y-4">
                <div>
                  <p className="text-secondary-500 text-sm font-medium mb-1">
                    {product.categoryId?.name || 'Категория'}
                  </p>
                  <h3 className="text-xl font-bold text-secondary-800 mb-2 group-hover:text-primary-600 transition-colors duration-300">
                    {product.name}
                  </h3>
                </div>

                {/* Rating */}
                {product.rating && (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={`${
                            i < Math.floor(product.rating || 0)
                              ? 'text-warning-400 fill-current'
                              : 'text-secondary-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-secondary-500 text-sm">
                      {product.rating} ({product.reviews || 0})
                    </span>
                  </div>
                )}

                {/* Price */}
                <div className="flex items-center space-x-3">
                  <span className="text-2xl font-bold text-secondary-800">
                    {product.price.toLocaleString()} ₽
                  </span>
                  {product.comparePrice && product.comparePrice > product.price && (
                    <span className="text-lg text-secondary-500 line-through">
                      {product.comparePrice.toLocaleString()} ₽
                    </span>
                  )}
                </div>

                {/* Add to cart button */}
                <button className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2">
                  <ShoppingCart size={20} />
                  <span>В корзину</span>
                </button>
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-accent-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            </div>
          ))}
        </div>

        {/* View all products button */}
        <div className="text-center mt-12">
          <Link
                            href="/catalog"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-semibold rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg"
          >
            Смотреть все товары
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
} 