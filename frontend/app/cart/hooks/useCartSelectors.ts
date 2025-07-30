import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';

export function useCartSelectors(user: any) {
  // Селектор для товаров в корзине
  const cartItems = useSelector((state: RootState) => state.cart.items);

  // Мемоизированные адреса профиля
  const profileAddresses = useMemo(() => {
    return Array.isArray(user?.addresses) ? user.addresses : [];
  }, [user]);

  // Можно добавить другие derived state/селекторы по необходимости

  return {
    cartItems,
    profileAddresses,
  };
} 