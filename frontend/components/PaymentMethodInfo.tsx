import React from 'react';
import { CreditCard, DollarSign, Banknote, Wallet, Shield, Clock, Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface PaymentMethod {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  deliveryTypes: string[];
  systemCode: string;
  // Дополнительные поля из админки
  displayTitle?: string;
  displayDescription?: string;
  features?: string[];
  icon?: string;
  color?: string;
  specialNote?: string;
  noteType?: 'info' | 'warning' | 'success';
}

interface PaymentMethodInfoProps {
  method: PaymentMethod | null;
  compact?: boolean;
}

const PaymentMethodInfo: React.FC<PaymentMethodInfoProps> = ({ method, compact }) => {
  if (!method) return null;

  const getIcon = (systemCode: string) => {
    switch (systemCode) {
      case 'cash_on_delivery':
        return <DollarSign className="w-5 h-5" />;
      case 'bank_card':
        return <CreditCard className="w-5 h-5" />;
      case 'sberbank_transfer':
        return <Banknote className="w-5 h-5" />;
      case 'credit_purchase':
        return <Wallet className="w-5 h-5" />;
      case 'usdt_payment':
        return <Wallet className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  const getColorClasses = (color?: string) => {
    switch (color) {
      case 'green':
        return 'from-green-50 to-emerald-50 border-green-200';
      case 'red':
        return 'from-red-50 to-pink-50 border-red-200';
      case 'yellow':
        return 'from-yellow-50 to-amber-50 border-yellow-200';
      case 'purple':
        return 'from-purple-50 to-violet-50 border-purple-200';
      default:
        return 'from-blue-50 to-indigo-50 border-blue-200';
    }
  };

  const getNoteColorClasses = (noteType?: string) => {
    switch (noteType) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getNoteIcon = (noteType?: string) => {
    switch (noteType) {
      case 'warning':
        return <Info className="w-4 h-4 text-yellow-600" />;
      case 'success':
        return <Clock className="w-4 h-4 text-green-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const title = method.displayTitle || method.name;
  const description = method.displayDescription || method.description || 'Способ оплаты';
  const features = method.features || ['Безопасно', 'Удобно'];
  const icon = method.icon || getIcon(method.systemCode);
  const colorClasses = getColorClasses(method.color);
  const noteColorClasses = getNoteColorClasses(method.noteType);
  const noteIcon = getNoteIcon(method.noteType);

  if (compact) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-blue-100 rounded-md text-blue-600">{icon}</span>
        <span className="font-medium text-gray-900 truncate">{title}</span>
        <span className="text-xs text-gray-500 truncate">{description}</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-gradient-to-r ${colorClasses} border rounded-lg p-4 mt-3`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-white/50 rounded-lg flex items-center justify-center">
            <span className="text-lg">{icon}</span>
          </div>
        </div>
        
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">
            {title}
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            {description}
          </p>
          
          <div className="flex flex-wrap gap-2">
            {features.map((feature, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/70 text-gray-700"
              >
                <Shield className="w-3 h-3 mr-1" />
                {feature}
              </motion.span>
            ))}
          </div>
        </div>
      </div>
      
      {method.specialNote && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`mt-3 p-3 border rounded-lg ${noteColorClasses}`}
        >
          <div className="flex items-center space-x-2">
            {noteIcon}
            <span className="text-sm">
              {method.specialNote}
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default PaymentMethodInfo; 