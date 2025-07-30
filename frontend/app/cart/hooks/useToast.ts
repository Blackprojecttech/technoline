import { useState, useRef } from 'react';

export function useToast() {
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showCheckoutError, setShowCheckoutError] = useState(false);
  let errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showErrorToast = (msg: string) => {
    setCheckoutError(msg);
    setShowCheckoutError(true);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => setShowCheckoutError(false), 3000);
  };

  return {
    showErrorToast,
    checkoutError,
    showCheckoutError,
  };
} 