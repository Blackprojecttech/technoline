const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://technoline-api.loca.lt/api';

interface AuthResponse {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phone?: string;
  role: string;
  token: string;
  addresses?: ProfileAddress[];
}

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

interface UserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  role: string;
  addresses?: ProfileAddress[];
}

interface Order {
  _id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  deliveryDate?: string;
  deliveryInterval?: string;
  shippingAddress: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  paymentMethod?: string;
  notes?: string;
  items: Array<{
    productId: {
      _id: string;
      name: string;
      mainImage: string;
    };
    quantity: number;
    price: number;
  }>;
  deliveryMethod?: {
    _id: string;
    name: string;
    type: string;
    price: number;
  };
  userId?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

// Auth API
export const authAPI = {
  // Регистрация
  register: async (data: {
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
  }): Promise<AuthResponse> => {
    // Получаем реферальный код из localStorage или куки
    const referralCode = typeof window !== 'undefined' ? 
      localStorage.getItem('referralCode') || 
      document.cookie.split('; ').find(row => row.startsWith('referralCode='))?.split('=')[1] 
      : null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Передаем реферальный код в заголовке
    if (referralCode) {
      headers['x-referral-code'] = referralCode;
      console.log('🔗 Передаем реферальный код при регистрации:', referralCode);
    }

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers,
      credentials: 'include', // Важно для передачи куки
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка регистрации');
    }

    const result = await response.json();
    
    // Очищаем реферальный код после успешной регистрации
    if (typeof window !== 'undefined' && referralCode) {
      localStorage.removeItem('referralCode');
      console.log('🧹 Реферальный код очищен после регистрации');
    }

    return result;
  },

  // Вход
  login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка входа');
    }

    return response.json();
  },

  // Восстановление пароля
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка отправки письма');
    }

    return response.json();
  },

  // Сброс пароля
  resetPassword: async (data: { token: string; password: string }): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка сброса пароля');
    }

    return response.json();
  },

  // OAuth
  googleAuth: async (accessToken: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accessToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка Google OAuth');
    }

    return response.json();
  },

  yandexAuth: async (accessToken: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/yandex`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accessToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка Yandex OAuth');
    }

    return response.json();
  },

  telegramAuth: async (accessToken: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accessToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка Telegram OAuth');
    }

    return response.json();
  },
};

// User API
export const userAPI = {
  // Получить профиль пользователя
  getProfile: async (token: string): Promise<UserProfile> => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка получения профиля');
    }

    return response.json();
  },

  // Обновить профиль
  updateProfile: async (token: string, data: Partial<UserProfile>): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка обновления профиля');
    }

    return response.json();
  },
};

// Orders API
export const ordersAPI = {
  // Получить заказы пользователя
  getUserOrders: async (token: string): Promise<Order[]> => {
    const response = await fetch(`${API_BASE_URL}/orders/my-orders`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка получения заказов');
    }

    return response.json();
  },

  // Получить конкретный заказ по ID
  getOrderById: async (token: string, orderId: string): Promise<Order> => {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка получения заказа');
    }

    return response.json();
  },
};

// Utility functions
export const setAuthToken = (token: string) => {
  if (typeof window !== 'undefined') {
    console.log('💾 Сохранение токена:', {
      tokenLength: token?.length,
      tokenStart: token?.substring(0, 20) + '...'
    });
    localStorage.setItem('authToken', token);
    console.log('✅ Токен сохранен в localStorage');
  }
};

export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('authToken');
    console.log('🔍 Получение токена:', {
      tokenExists: !!token,
      tokenLength: token?.length
    });
    return token;
  }
  return null;
};

export const removeAuthToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authToken');
  }
}; 