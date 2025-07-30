'use client';

import { motion } from 'framer-motion';
import { 
  Clock, 
  CheckCircle, 
  Truck, 
  Package, 
  XCircle, 
  AlertCircle,
  Loader2,
  User,
  UserCheck
} from 'lucide-react';

interface OrderStatusProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showAnimation?: boolean;
}

export default function OrderStatus({ status, size = 'md', showAnimation = true }: OrderStatusProps) {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'text-orange-600',
          bg: 'bg-orange-100',
          border: 'border-orange-200',
          text: 'Ожидает подтверждения',
          description: 'Заказ ожидает подтверждения администратором'
        };
      case 'confirmed':
        return {
          icon: CheckCircle,
          color: 'text-blue-600',
          bg: 'bg-blue-100',
          border: 'border-blue-200',
          text: 'Подтвержден',
          description: 'Заказ подтвержден и готов к обработке'
        };
      case 'processing':
        return {
          icon: Package,
          color: 'text-purple-600',
          bg: 'bg-purple-100',
          border: 'border-purple-200',
          text: 'В обработке',
          description: 'Заказ обрабатывается'
        };
      case 'shipped':
        return {
          icon: Truck,
          color: 'text-indigo-600',
          bg: 'bg-indigo-100',
          border: 'border-indigo-200',
          text: 'Отправлен',
          description: 'Заказ отправлен'
        };
      case 'delivered':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bg: 'bg-green-100',
          border: 'border-green-200',
          text: 'Доставлен',
          description: 'Заказ доставлен'
        };
      case 'cancelled':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bg: 'bg-red-100',
          border: 'border-red-200',
          text: 'Отменен',
          description: 'Заказ отменен'
        };
      case 'with_courier':
        return {
          icon: UserCheck,
          color: 'text-cyan-600',
          bg: 'bg-cyan-100',
          border: 'border-cyan-200',
          text: 'Передан курьеру',
          description: 'Заказ передан курьеру'
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-600',
          bg: 'bg-gray-100',
          border: 'border-gray-200',
          text: 'Неизвестный статус',
          description: 'Статус не определен'
        };
    }
  };

  const statusInfo = getStatusInfo(status);
  const StatusIcon = statusInfo.icon;

  const sizeClasses = {
    sm: {
      container: 'px-2 py-1 text-xs',
      icon: 'w-3 h-3',
      text: 'text-xs'
    },
    md: {
      container: 'px-3 py-2 text-sm',
      icon: 'w-4 h-4',
      text: 'text-sm'
    },
    lg: {
      container: 'px-4 py-3 text-base',
      icon: 'w-5 h-5',
      text: 'text-base'
    }
  };

  const classes = sizeClasses[size];

  return (
    <motion.div
      initial={showAnimation ? { opacity: 0, scale: 0.8 } : false}
      animate={showAnimation ? { opacity: 1, scale: 1 } : false}
      transition={{ duration: 0.3 }}
      className={`inline-flex items-center space-x-2 ${statusInfo.bg} ${statusInfo.border} border rounded-lg ${classes.container}`}
    >
      {status === 'pending' && showAnimation ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className={`${statusInfo.color} ${classes.icon}`} />
        </motion.div>
      ) : status === 'with_courier' && showAnimation ? (
        <motion.div
          animate={{ 
            x: [0, 5, 0],
            y: [0, -2, 0]
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="opacity-90"
        >
          <UserCheck className={`${statusInfo.color} ${classes.icon}`} />
        </motion.div>
      ) : (
        <StatusIcon className={`${statusInfo.color} ${classes.icon}`} />
      )}
      <span className={`font-medium ${statusInfo.color} ${classes.text}`}>
        {statusInfo.text}
      </span>
    </motion.div>
  );
} 