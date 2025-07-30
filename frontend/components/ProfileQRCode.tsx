import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode } from 'lucide-react';

interface ProfileQRCodeProps {
  userId: string;
  size?: 'sm' | 'md' | 'lg';
}

const ProfileQRCode: React.FC<ProfileQRCodeProps> = ({ userId, size = 'md' }) => {
  const [showQRModal, setShowQRModal] = useState(false);
  
  // Создаем данные для QR кода - идентификатор пользователя и временная метка
  const qrData = JSON.stringify({
    userId,
    type: 'profile',
    timestamp: Date.now()
  });

  // Определяем размеры QR-кода в зависимости от пропса size
  const qrSize = {
    sm: 120,
    md: 180,
    lg: 250
  }[size];

  // Определяем классы для кнопки в зависимости от размера
  const buttonClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2 text-base'
  }[size];

  const QRCodeComponent = (
    <QRCodeSVG
      value={qrData}
      size={qrSize}
      level="H"
      includeMargin
      imageSettings={{
        src: "/logo.png",
        x: undefined,
        y: undefined,
        height: 24,
        width: 24,
        excavate: true,
      }}
    />
  );

  return (
    <>
      <button
        onClick={() => setShowQRModal(true)}
        className={`inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium touch-manipulation ${buttonClasses}`}
        style={{ touchAction: 'manipulation' }}
      >
        <QrCode className="w-4 h-4" />
        <span>Показать QR-код</span>
      </button>

      <AnimatePresence>
        {showQRModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={() => setShowQRModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setShowQRModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col items-center space-y-6">
                <h3 className="text-2xl font-bold text-gray-900">QR-код профиля</h3>
                <div className="bg-white p-6 rounded-xl shadow-inner">
                  {QRCodeComponent}
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600">
                    Покажите этот QR-код сотруднику для быстрого поиска ваших активных заказов
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProfileQRCode; 