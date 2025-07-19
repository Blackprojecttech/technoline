'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useCategories } from '../../hooks/useCategories';
import { motion, AnimatePresence } from 'framer-motion';

export default function CategoryMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { categories, loading } = useCategories();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 text-secondary-700 hover:text-primary-600 transition-colors duration-200 font-medium"
      >
        <span>Категории</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={16} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-light-200 z-50"
          >
            <div className="p-4 space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-4 bg-light-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : (
                categories.map((category) => (
                  <div key={category._id} className="group">
                    <Link
                      href={`/catalog/${category.slug}`}
                      className="block text-secondary-700 hover:text-primary-600 transition-colors duration-200 py-2 px-3 rounded-lg hover:bg-primary-50"
                    >
                      {category.name}
                    </Link>
                    
                    {category.children && category.children.length > 0 && (
                      <div className="ml-4 mt-1 space-y-1">
                        {category.children.slice(0, 3).map((subcategory) => (
                          <Link
                            key={subcategory._id}
                            href={`/catalog/${subcategory.slug}`}
                            className="block text-sm text-secondary-600 hover:text-primary-600 transition-colors duration-200 py-1 px-3 rounded hover:bg-primary-50"
                          >
                            {subcategory.name}
                          </Link>
                        ))}
                        {category.children.length > 3 && (
                          <div className="text-xs text-secondary-500 px-3 py-1">
                            +{category.children.length - 3} еще
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 