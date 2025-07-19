'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, userAPI, ordersAPI, setAuthToken, getAuthToken, removeAuthToken } from '@/lib/api';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  role: string;
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
    email: string;
    phone?: string;
    address?: string;
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
    const token = getAuthToken();
    console.log('🔑 Проверка токена при загрузке:', {
      tokenExists: !!token,
      tokenLength: token?.length
    });
    if (token) {
      refreshUser();
    } else {
      setIsLoading(false);
    }
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
      
      setAuthToken(response.token);
      setUser({
        _id: response._id,
        firstName: response.firstName,
        lastName: response.lastName,
        email: response.email,
        phone: response.phone,
        role: response.role,
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
    email: string;
    phone?: string;
    address?: string;
    password: string;
  }) => {
    try {
      const response = await authAPI.register(data);
      setAuthToken(response.token);
      setUser({
        _id: response._id,
        firstName: response.firstName,
        lastName: response.lastName,
        email: response.email,
        phone: response.phone,
        role: response.role,
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
      });
      await refreshOrders(); // Обновляем заказы после обновления профиля
    } catch (error) {
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      const token = getAuthToken();
      console.log('🔄 Обновление пользователя:', {
        tokenExists: !!token,
        tokenLength: token?.length
      });
      
      if (!token) {
        console.log('❌ Нет токена для обновления пользователя');
        setIsLoading(false);
        return;
      }

      const userData = await userAPI.getProfile(token);
      console.log('✅ Пользователь обновлен:', userData);
      setUser(userData);
      await refreshOrders(); // Загружаем заказы после обновления пользователя
    } catch (error) {
      console.error('❌ Ошибка обновления пользователя:', error);
      removeAuthToken();
      setUser(null);
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