import { useState, useEffect } from 'react';

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  parentId?: string | null;
  children: Category[];
  createdAt: string;
  updatedAt: string;
  ymlId?: string;
}

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        
        const response = await fetch('http://localhost:5002/api/categories');
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки категорий');
        }
        
        const data = await response.json();
        
        setCategories(data || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки категорий');
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
  };
}; 