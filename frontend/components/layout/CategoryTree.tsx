'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useCategories, Category } from '../../hooks/useCategories';
import { motion, AnimatePresence } from 'framer-motion';

export default function CategoryTree() {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { categories, loading, error } = useCategories();
  
  console.log('CategoryTree - categories:', categories);
  console.log('CategoryTree - loading:', loading);
  console.log('CategoryTree - error:', error);

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedItems.has(category._id);

    return (
      <motion.div 
        key={category._id} 
        className="w-full"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: level * 0.1 }}
      >
        <motion.div 
          className="flex items-center justify-between group"
          whileHover={{ x: 5 }}
          transition={{ duration: 0.2 }}
        >
          <Link
                            href={`/catalog/${category.slug}`}
            className={`flex-1 py-3 px-4 text-secondary-700 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-300 text-sm font-medium ${
              level === 0 ? 'font-semibold' : 'font-normal'
            }`}
          >
            {category.name}
          </Link>
          {hasChildren && (
            <motion.button
              onClick={() => toggleItem(category._id)}
              className="p-2 text-secondary-400 hover:text-primary-600 transition-colors duration-200 rounded-lg hover:bg-primary-50"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronRight size={16} />
              </motion.div>
            </motion.button>
          )}
        </motion.div>
        
        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div 
              className="ml-4 pl-4 border-l-2 border-light-200 mt-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {category.children.map(child => renderCategory(child, level + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <motion.div 
            key={i} 
            className="animate-pulse"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="h-10 bg-light-200 rounded-xl"></div>
          </motion.div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <motion.div 
        className="text-center py-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-secondary-500 text-sm">Ошибка загрузки категорий</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="space-y-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {categories.map((category, index) => (
        <motion.div
          key={category._id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          {renderCategory(category)}
        </motion.div>
      ))}
    </motion.div>
  );
} 