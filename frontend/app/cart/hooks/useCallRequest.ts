import { useState } from 'react';

export function useCallRequest() {
  const [callRequest, setCallRequest] = useState<string | null>(null);
  const [showCallRequestModal, setShowCallRequestModal] = useState(false);
  const [callRequestError, setCallRequestError] = useState(false);
  const [isCallRequestLoading, setIsCallRequestLoading] = useState(false);

  const handleCallRequest = () => {
    setShowCallRequestModal(true);
  };

  const confirmCall = async (confirmed: boolean, orders: any[], updateOrder: (orderId: string, data: any) => Promise<void>) => {
    if (confirmed) {
      setIsCallRequestLoading(true);
      try {
        const activeOrder = orders?.find(order => ['pending', 'confirmed', 'processing'].includes(order.status));
        if (!activeOrder) {
          setShowCallRequestModal(false);
          setIsCallRequestLoading(false);
          return;
        }
        await updateOrder(activeOrder._id, { callRequest: true });
      } catch (error) {
        // обработка ошибки
      } finally {
        setIsCallRequestLoading(false);
      }
    }
    setShowCallRequestModal(false);
  };

  return {
    callRequest,
    setCallRequest,
    showCallRequestModal,
    setShowCallRequestModal,
    callRequestError,
    setCallRequestError,
    handleCallRequest,
    confirmCall,
    isCallRequestLoading,
    setIsCallRequestLoading,
  };
} 