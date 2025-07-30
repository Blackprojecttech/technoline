'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, userAPI, ordersAPI, setAuthToken, getAuthToken, removeAuthToken } from '@/lib/api';
import { validateAndCleanToken } from '@/utils/tokenValidator';

interface ProfileAddress {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  isDefault?: boolean;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phone?: string;
  address?: string;
  addresses?: ProfileAddress[];
  role: string;
  authProvider?: 'google' | 'yandex' | 'telegram' | 'local';
  linkedAccounts?: {
    google?: boolean;
    yandex?: boolean;
    telegram?: boolean;
  };
}

interface Order {
  _id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  deliveryDate?: string;
  deliveryInterval?: string;
  deliveryMethod?: {
    name?: string;
    displayName?: string;
  };
  paymentMethod?: string;
  callRequest?: boolean;
  callStatus?: 'requested' | 'completed' | 'not_completed';
  items: Array<{
    productId: {
      _id: string;
      name: string;
      mainImage: string;
    };
    quantity: number;
    price: number;
  }>;
}

interface AuthContextType {
  user: User | null;
  orders: Order[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    firstName: string;
    lastName: string;
    middleName?: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshOrders: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Проверка токена при загрузке
  useEffect(() => {
    const initAuth = async () => {
      console.log('🔑 Получение токена:', {
        tokenExists: !!getAuthToken(),
        tokenLength: getAuthToken()?.length
      });
      
      const validToken = await validateAndCleanToken();
      if (validToken) {
        refreshUser();
      } else {
        setIsLoading(false);
      }
    };
    
    initAuth();
  }, []);

  // Автоматическое обновление заказов каждые 30 секунд
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      refreshOrders();
    }, 30000); // 30 секунд

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 Попытка входа:', { email });
      const response = await authAPI.login({ email, password });
      console.log('✅ Вход успешен:', {
        userId: response._id,
        tokenLength: response.token?.length
      });
      setAuthToken(response.token); // <--- Исправление: сохраняем токен после входа
      setUser({
        _id: response._id,
        firstName: response.firstName,
        lastName: response.lastName,
        email: response.email,
        phone: response.phone,
        role: response.role,
        addresses: response.addresses || [],
        authProvider: (response as any).authProvider,
        linkedAccounts: (response as any).linkedAccounts,
      });
      await refreshOrders();
    } catch (error) {
      console.error('❌ Ошибка входа:', error);
      throw error;
    }
  };

  const register = async (data: {
    firstName: string;
    lastName: string;
    middleName?: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    password: string;
  }) => {
    try {
      const response = await authAPI.register(data);
      setAuthToken(response.token);
      setUser({
        _id: response._id,
        firstName: response.firstName,
        lastName: response.lastName,
        middleName: response.middleName,
        email: response.email,
        phone: response.phone,
        role: response.role,
        addresses: response.addresses || [],
        authProvider: (response as any).authProvider,
        linkedAccounts: (response as any).linkedAccounts,
      });
      await refreshOrders();
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    setOrders([]);
  };

  const forgotPassword = async (email: string) => {
    try {
      await authAPI.forgotPassword(email);
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (token: string, password: string) => {
    try {
      await authAPI.resetPassword({ token, password });
    } catch (error) {
      throw error;
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Не авторизован');

      const response = await userAPI.updateProfile(token, data);
      setAuthToken(response.token);
      setUser({
        _id: response._id,
        firstName: response.firstName,
        lastName: response.lastName,
        email: response.email,
        phone: response.phone,
        role: response.role,
        addresses: response.addresses || [],
      });
      await refreshOrders(); // Обновляем заказы после обновления профиля
    } catch (error) {
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      const userData = await userAPI.getProfile(token);
      setUser({
        _id: userData._id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        addresses: userData.addresses || [],
        authProvider: (userData as any).authProvider,
        linkedAccounts: (userData as any).linkedAccounts,
      });
      await refreshOrders(); // Загружаем заказы после обновления пользователя
    } catch (error: any) {
      // --- Исправлено: logout только при ошибке авторизации ---
      const message = error?.message?.toLowerCase() || '';
      if (
        message.includes('токен') ||
        message.includes('401') ||
        message.includes('авторизован') ||
        message.includes('недействительный') ||
        message.includes('not found')
      ) {
        removeAuthToken();
        setUser(null);
        // Можно добавить уведомление: "Сессия истекла, войдите заново"
      } else {
        // Ошибка сети, CORS и т.д. — НЕ делаем logout!
        // Можно показать уведомление: "Нет соединения с сервером, попробуйте позже"
        // Например: setError('Нет соединения с сервером, попробуйте позже');
        console.error('Ошибка соединения или временная ошибка:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshOrders = async () => {
    try {
      const token = getAuthToken();
      console.log('📦 Обновление заказов:', {
        tokenExists: !!token,
        tokenLength: token?.length
      });
      
      if (!token) {
        console.log('❌ Нет токена для обновления заказов');
        return;
      }

      const ordersData = await ordersAPI.getUserOrders(token);
      console.log('✅ Заказы обновлены:', ordersData.length, 'заказов');
      
      // Проверяем, есть ли изменения в заказах
      const updatedOrders = ordersData.map(order => ({
        ...order,
        callRequest: (order as any).callRequest,
        callStatus: (order as any).callStatus
      }));
      
      console.log('📋 Детали заказов:', updatedOrders.map(o => ({
        id: o._id,
        orderNumber: o.orderNumber,
        callRequest: (o as any).callRequest,
        callStatus: (o as any).callStatus
      })));
      
      setOrders(updatedOrders);
      console.log('📦 Orders state updated via refreshOrders');
    } catch (error) {
      console.error('❌ Ошибка обновления заказов:', error);
    }
  };

  const value: AuthContextType = {
    user,
    orders,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    refreshUser,
    refreshOrders,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 