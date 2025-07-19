import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Wallet, Shield, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface PaymentMethod {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  deliveryTypes: string[];
  systemCode: string;
  displayTitle?: string;
  displayDescription?: string;
  features?: string[];
  icon?: string;
  color?: string;
  specialNote?: string;
  noteType?: 'info' | 'warning' | 'success';
}

interface PaymentMethodSelectorProps {
  paymentMethods: PaymentMethod[];
  selectedPaymentMethod: string;
  onPaymentMethodChange: (methodId: string) => void;
  loading?: boolean;
  error?: string | null;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  paymentMethods,
  selectedPaymentMethod,
  onPaymentMethodChange,
  loading = false,
  error = null
}) => {
  const getIcon = (method: PaymentMethod) => {
    if (method.icon) return method.icon;
    
    switch (method.systemCode) {
      case 'card':
        return '💳';
      case 'cash':
        return '💵';
      case 'bank_transfer':
        return '🏦';
      default:
        return '💳';
    }
  };

  const getColorClasses = (method: PaymentMethod, isSelected: boolean) => {
    const baseClasses = 'border-2 transition-all duration-300';
    
    if (isSelected) {
      switch (method.color) {
        case 'green':
          return `${baseClasses} border-green-500 bg-green-50 shadow-lg shadow-green-100`;
        case 'blue':
          return `${baseClasses} border-blue-500 bg-blue-50 shadow-lg shadow-blue-100`;
        case 'purple':
          return `${baseClasses} border-purple-500 bg-purple-50 shadow-lg shadow-purple-100`;
        case 'orange':
          return `${baseClasses} border-orange-500 bg-orange-50 shadow-lg shadow-orange-100`;
        default:
          return `${baseClasses} border-blue-500 bg-blue-50 shadow-lg shadow-blue-100`;
      }
    }
    
    return `${baseClasses} border-gray-200 bg-white hover:border-gray-300 hover:shadow-md`;
  };

  const getNoteIcon = (noteType: string) => {
    switch (noteType) {
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getNoteColor = (noteType: string) => {
    switch (noteType) {
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Способ оплаты
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-4 border-2 border-gray-200 rounded-lg bg-gray-50 animate-pulse"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded animate-pulse mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Способ оплаты
        </label>
        <div className="p-4 border border-red-200 rounded-lg bg-red-50 text-red-800">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (paymentMethods.length === 0) {
    return (
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Способ оплаты
        </label>
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-gray-600">
          <div className="flex items-center space-x-2">
            <Info className="w-5 h-5" />
            <span>Способы оплаты не найдены для выбранного способа доставки</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Способ оплаты *
      </label>
      
      <AnimatePresence>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paymentMethods.map((method, index) => {
            const isSelected = selectedPaymentMethod === method._id;
            
            return (
              <motion.div
                key={method._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ 
                  delay: index * 0.1,
                  duration: 0.3,
                  type: "spring",
                  stiffness: 300
                }}
                whileHover={{ 
                  scale: 1.02,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.98 }}
                className={`${getColorClasses(method, isSelected)} rounded-lg cursor-pointer p-4`}
                onClick={() => onPaymentMethodChange(method._id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">{getIcon(method)}</div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {method.displayTitle || method.name}
                      </h3>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500 }}
                          className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
                        >
                          <CheckCircle className="w-3 h-3 text-white" />
                        </motion.div>
                      )}
                    </div>
                    
                    {method.displayDescription && (
                      <p className="text-sm text-gray-600 mb-2">
                        {method.displayDescription}
                      </p>
                    )}
                    
                    {method.features && method.features.length > 0 && (
                      <div className="space-y-1 mb-3">
                        {method.features.map((feature, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + idx * 0.05 }}
                            className="flex items-center space-x-2 text-xs text-gray-500"
                          >
                            <Shield className="w-3 h-3 text-green-500" />
                            <span>{feature}</span>
                          </motion.div>
                        ))}
                      </div>
                    )}
                    
                    {method.specialNote && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className={`mt-3 p-2 rounded-md border text-xs ${getNoteColor(method.noteType || 'info')}`}
                      >
                        <div className="flex items-start space-x-2">
                          {getNoteIcon(method.noteType || 'info')}
                          <span>{method.specialNote}</span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>
    </div>
  );
};

export default PaymentMethodSelector; 