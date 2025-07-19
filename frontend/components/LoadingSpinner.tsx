'use client';

import { motion } from 'framer-motion';
import { Loader2, Clock, CheckCircle } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ 
  message = 'Обрабатываем ваш заказ...', 
  size = 'md' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: {
      container: 'p-4',
      spinner: 'w-6 h-6',
      text: 'text-sm'
    },
    md: {
      container: 'p-6',
      spinner: 'w-8 h-8',
      text: 'text-base'
    },
    lg: {
      container: 'p-8',
      spinner: 'w-12 h-12',
      text: 'text-lg'
    }
  };

  const classes = sizeClasses[size];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`text-center ${classes.container}`}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className={`mx-auto mb-4 text-blue-600 ${classes.spinner}`}
      >
        <Loader2 className="w-full h-full" />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`font-medium text-gray-700 ${classes.text}`}
      >
        {message}
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-sm text-gray-500 mt-2"
      >
        Пожалуйста, подождите...
      </motion.div>
    </motion.div>
  );
}

// Компонент для отображения статуса заказа с анимацией
export function OrderStatusWithAnimation({ status }: { status: string }) {
  if (status === 'pending') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center space-x-2 text-orange-600"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-4 h-4" />
        </motion.div>
        <span className="text-sm font-medium">Ожидает подтверждения</span>
      </motion.div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <CheckCircle className="w-4 h-4 text-green-600" />
      <span className="text-sm font-medium text-green-600">Подтвержден</span>
    </div>
  );
} 