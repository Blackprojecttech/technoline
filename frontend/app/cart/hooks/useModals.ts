import { useState, useRef } from 'react';

export function useModals(router: any) {
  const [isCheckoutModalVisible, setIsCheckoutModalVisible] = useState(false);
  const [showSaveAddressModal, setShowSaveAddressModal] = useState(false);
  const [showSuccessOrderModal, setShowSuccessOrderModal] = useState(false);
  const [showZoneToast, setShowZoneToast] = useState<{message: string, key: number} | null>(null);
  const saveAddressPromiseRef = useRef<{ resolve: (v: boolean) => void } | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  const handleSaveAddressModalClose = () => {
    setShowSaveAddressModal(false);
    if (saveAddressPromiseRef.current) {
      saveAddressPromiseRef.current.resolve(false);
      saveAddressPromiseRef.current = null;
    }
  };

  const handleSaveAddressModalSave = () => {
    setShowSaveAddressModal(false);
    if (saveAddressPromiseRef.current) {
      saveAddressPromiseRef.current.resolve(true);
      saveAddressPromiseRef.current = null;
    }
  };

  const handleGoToOrder = () => {
    setShowSuccessOrderModal(false);
    if (lastOrderId) {
      router.push(`/orders/${lastOrderId}`);
    }
  };

  const handleGoHome = () => {
    setShowSuccessOrderModal(false);
    router.push(`/`);
  };

  return {
    isCheckoutModalVisible,
    setIsCheckoutModalVisible,
    showSaveAddressModal,
    setShowSaveAddressModal,
    showSuccessOrderModal,
    setShowSuccessOrderModal,
    showZoneToast,
    setShowZoneToast,
    saveAddressPromiseRef,
    lastOrderId,
    setLastOrderId,
    handleSaveAddressModalClose,
    handleSaveAddressModalSave,
    handleGoToOrder,
    handleGoHome,
  };
} 