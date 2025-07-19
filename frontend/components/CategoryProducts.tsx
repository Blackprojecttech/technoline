'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Star, Heart, Plus } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { addItem } from '../store/slices/cartSlice';

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
}

interface CategoryProductsProps {
  categorySlug: string;
}

export default function CategoryProducts({ categorySlug }: CategoryProductsProps) {
  const dispatch = useDispatch();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  // Принудительный рендеринг для отладки
  console.log(`🔍 CategoryProducts: Component rendered with slug: ${categorySlug}`);

  const handleAddToCart = async (product: Product) => {
    setAddingToCart(product._id);
    try {
      dispatch(addItem({
        _id: product._id,
        name: product.name,
        price: product.price,
        image: product.mainImage || (product.images && product.images[0]) || '/placeholder-product.jpg',
        quantity: 1,
        sku: product.sku
      }));
      alert('Товар добавлен в корзину!');
    } catch (error) {
      alert('Ошибка при добавлении товара в корзину');
    } finally {
      setAddingToCart(null);
    }
  };

  useEffect(() => {
    console.log(`🔍 CategoryProducts: Starting fetch for category: ${categorySlug}`);
    
    const fetchProducts = async () => {
      try {
        console.log(`🔍 CategoryProducts: Making fetch request to API...`);
        
        // Add cache-busting parameter to avoid 304 responses
        const timestamp = Date.now();
        const url = `http://127.0.0.1:5002/api/products/category/${categorySlug}?t=${timestamp}`;
        
        console.log(`🔍 CategoryProducts: Fetching from URL: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          mode: 'cors',
          credentials: 'omit'
        });
        
        console.log(`📡 CategoryProducts: Response status: ${response.status}`);
        
        if (response.ok || response.status === 304) {
          let data;
          
          if (response.status === 304) {
            console.log(`📡 CategoryProducts: Got 304 - making another request without cache`);
            const noCacheResponse = await fetch(url, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              },
              mode: 'cors',
              credentials: 'omit'
            });
            
            if (noCacheResponse.ok) {
              data = await noCacheResponse.json();
            } else {
              throw new Error(`Failed to get fresh data: ${noCacheResponse.status}`);
            }
          } else {
            data = await response.json();
          }
          
          console.log(`✅ CategoryProducts: Raw API response:`, data);
          setDebugInfo(data);
          
          if (data.products && Array.isArray(data.products)) {
            console.log(`✅ CategoryProducts: Setting products:`, data.products);
            setProducts(data.products);
          } else {
            console.error(`❌ CategoryProducts: Products is not an array:`, data.products);
            setProducts([]);
          }
        } else {
          const errorText = await response.text();
          console.error(`❌ CategoryProducts: API Error:`, errorText);
          setError(`Failed to load products: ${response.status} - ${errorText}`);
        }
      } catch (err) {
        console.error('❌ CategoryProducts: Network Error:', err);
        setError(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [categorySlug]);

  // Принудительный рендеринг в начале
  return (
    <div>
      {/* Force Render Debug */}
      <div className="mb-4 p-4 bg-orange-100 border border-orange-400 rounded">
        <p className="text-sm text-orange-800 font-bold">CATEGORY PRODUCTS COMPONENT RENDERED</p>
        <p className="text-sm text-orange-800">Category Slug: {categorySlug}</p>
        <p className="text-sm text-orange-800">Loading: {loading ? 'true' : 'false'}</p>
        <p className="text-sm text-orange-800">Error: {error || 'нет'}</p>
        <p className="text-sm text-orange-800">Products Count: {products.length}</p>
      </div>

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

      {!loading && !error && products.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <ShoppingCart size={64} className="mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Товары не найдены</h3>
          <p className="text-gray-600">В данной категории пока нет товаров</p>
          
          {/* Debug Info */}
          {debugInfo && (
            <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded">
              <p className="text-sm text-yellow-800">
                <strong>Debug Info:</strong>
              </p>
              <p className="text-sm text-yellow-800">Category Slug: {categorySlug}</p>
              <p className="text-sm text-yellow-800">Products Count: {products.length}</p>
              <p className="text-sm text-yellow-800">Loading: {loading}</p>
              <p className="text-sm text-yellow-800">Error: {error}</p>
              <p className="text-sm text-yellow-800">Debug Data: {JSON.stringify(debugInfo, null, 2)}</p>
            </div>
          )}
        </div>
      )}

      {!loading && !error && products.length > 0 && (
        <div>
          {/* Debug Info */}
          {debugInfo && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 rounded">
              <p className="text-sm text-green-800">
                <strong>Success Debug Info:</strong>
              </p>
              <p className="text-sm text-green-800">Products Count: {products.length}</p>
              <p className="text-sm text-green-800">Debug Data: {JSON.stringify(debugInfo, null, 2)}</p>
            </div>
          )}
          
          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div key={product._id} className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="relative aspect-square overflow-hidden rounded-t-lg">
                  <img
                    src={product.mainImage || (product.images && product.images[0]) || '/placeholder-product.jpg'}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2">
                    <button className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors">
                      <Heart size={16} className="text-gray-400" />
                    </button>
                  </div>
                  {!product.inStock && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white font-semibold">Нет в наличии</span>
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                    {product.name}
                  </h3>
                  
                  <div className="flex items-center mb-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={`${
                            i < Math.floor(product.rating)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-500 ml-1">({product.reviewCount})</span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-gray-900">
                        {product.price.toLocaleString('ru-RU')} ₽
                      </span>
                      {product.comparePrice && product.comparePrice > product.price && (
                        <span className="text-sm text-gray-500 line-through">
                          {product.comparePrice.toLocaleString('ru-RU')} ₽
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">Арт: {product.sku}</span>
                  </div>
                  
                  <button 
                    onClick={() => handleAddToCart(product)}
                    disabled={addingToCart === product._id || !product.inStock}
                    className={`w-full font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 ${
                      addingToCart === product._id
                        ? 'bg-green-600 text-white'
                        : product.inStock
                        ? 'bg-primary-600 hover:bg-primary-700 text-white'
                        : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {addingToCart === product._id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Добавляется...</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={16} />
                        <span>{product.inStock ? 'В корзину' : 'Нет в наличии'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 