import { useState, useEffect } from 'react';

export interface Product {
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

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://technoline-api.loca.lt/api';
        const response = await fetch(`${API_BASE_URL}/products`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        
        const data = await response.json();
        setProducts(data.products || []);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Не удалось загрузить товары');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return { products, loading, error };
}

export function useFeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://technoline-api.loca.lt/api';
        const response = await fetch(`${API_BASE_URL}/products/featured?limit=6`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch featured products');
        }
        
        const data = await response.json();
        setProducts(data || []);
      } catch (err) {
        console.error('Error fetching featured products:', err);
        setError('Не удалось загрузить популярные товары');
        // Fallback to demo products
        setProducts([
          {
            _id: '1',
            name: 'iPhone 15 Pro Max',
            categoryId: { _id: '1', name: 'Смартфоны', slug: 'smartphones' },
            price: 129999,
            comparePrice: 149999,
            rating: 4.8,
            reviews: 156,
            mainImage: '/images/iphone-15-pro.jpg',
            images: ['/images/iphone-15-pro.jpg'],
            isActive: true,
            isFeatured: true,
            slug: 'iphone-15-pro-max',
            description: 'Новейший iPhone с мощным процессором',
            sku: 'IPHONE-15-PRO-MAX',
            stockQuantity: 10,
            inStock: true,
            createdAt: new Date().toISOString()
          },
          {
            _id: '2',
            name: 'MacBook Pro 16" M3',
            categoryId: { _id: '2', name: 'Ноутбуки', slug: 'laptops' },
            price: 299999,
            comparePrice: 329999,
            rating: 4.9,
            reviews: 89,
            mainImage: '/images/macbook-pro.jpg',
            images: ['/images/macbook-pro.jpg'],
            isActive: true,
            isFeatured: true,
            slug: 'macbook-pro-16-m3',
            description: 'Мощный ноутбук для профессионалов',
            sku: 'MACBOOK-PRO-16-M3',
            stockQuantity: 5,
            inStock: true,
            createdAt: new Date().toISOString()
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return { products, loading, error };
} 