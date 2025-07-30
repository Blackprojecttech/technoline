import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode } from 'lucide-react';

interface OrderQRCodeProps {
  orderNumber: string;
  orderId: string;
  showInModal?: boolean;
}

const OrderQRCode: React.FC<OrderQRCodeProps> = ({ orderNumber, orderId, showInModal = false }) => {
  const [showQRModal, setShowQRModal] = useState(false);
  
  // Создаем данные для QR кода
  const qrData = JSON.stringify({
    orderNumber,
    orderId,
    timestamp: Date.now()
  });

  const QRCodeComponent = (
    <QRCodeSVG
      value={qrData}
      size={showInModal ? 180 : 250}
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

  if (showInModal) {
    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="bg-white p-4 rounded-xl shadow-inner">
          {QRCodeComponent}
        </div>
        <p className="text-sm text-gray-600 text-center">
          Покажите сотруднику QR-код при получении
        </p>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowQRModal(true)}
        className="w-full inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl text-lg font-medium touch-manipulation"
        style={{ touchAction: 'manipulation' }}
      >
        <QrCode className="w-6 h-6" />
        <span>Показать QR-код для получения</span>
      </button>

      <AnimatePresence>
        {showQRModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={() => setShowQRModal(false)}
            style={{ touchAction: 'none' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 relative"
              onClick={e => e.stopPropagation()}
              style={{ touchAction: 'auto' }}
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
                <h3 className="text-2xl font-bold text-gray-900">QR-код для получения заказа</h3>
                <div className="bg-white p-6 rounded-xl shadow-inner">
                  {QRCodeComponent}
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-medium text-gray-900">
                    Заказ #{orderNumber}
                  </p>
                  <p className="text-sm text-gray-600">
                    Покажите этот QR-код сотруднику при получении заказа
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

export default OrderQRCode; 