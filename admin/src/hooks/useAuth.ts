import { useState, useEffect, useCallback } from 'react'

interface User {
  _id: string
  email: string
  firstName: string
  lastName: string
  role: 'user' | 'admin' | 'moderator' | 'accountant'
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      // Используем только production API URL
      const apiUrls = [
        import.meta.env.VITE_API_URL || 'https://technohubstore.net/api'
      ].filter(Boolean);

      // Функция для проверки токена с определенным URL
      const checkTokenWithUrl = async (apiUrl: string) => {
        try {
          const response = await fetch(`${apiUrl}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!response.ok) {
            throw new Error('Token invalid');
          }
          
          return await response.json();
        } catch (error) {
          throw error;
        }
      };

      // Пробуем каждый URL по очереди
      const tryUrls = async () => {
        for (const apiUrl of apiUrls) {
          try {
            console.log(`🔍 Проверяем токен с URL: ${apiUrl}`);
            const data = await checkTokenWithUrl(apiUrl);
            
            console.log('🔐 Проверка токена:', data);
            if (data._id && (data.role === 'admin' || data.role === 'moderator' || data.role === 'accountant')) {
              console.log('✅ Пользователь авторизован:', data.role);
              localStorage.setItem('admin_user', JSON.stringify(data));
              localStorage.setItem('admin_name', `${data.firstName} ${data.lastName}`);
              setIsAuthenticated(true);
              setUser(data);
              return; // Успешно авторизованы, выходим
            } else {
              console.log('❌ Пользователь не авторизован или роль не подходит:', data.role);
            }
          } catch (error) {
            console.log(`❌ Ошибка с URL ${apiUrl}:`, error);
            // Продолжаем с следующим URL
          }
        }
        
        // Если ни один URL не сработал, очищаем токены
        console.log('❌ Не удалось авторизоваться ни с одним URL');
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        localStorage.removeItem('admin_name');
      };

      tryUrls().finally(() => {
        setLoading(false);
      });
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    // Используем только production API URL
    const apiUrls = [
      import.meta.env.VITE_API_URL || 'https://technohubstore.net/api'
    ].filter(Boolean);

    for (const apiUrl of apiUrls) {
      try {
        console.log(`🔍 Пробуем логин с URL: ${apiUrl}`);
        
        const response = await fetch(`${apiUrl}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        console.log('🔑 Ответ сервера при логине:', data);

        if (response.ok && data.token && (data.role === 'admin' || data.role === 'moderator' || data.role === 'accountant')) {
          console.log('✅ Логин успешен для роли:', data.role);
          localStorage.setItem('admin_token', data.token);
          localStorage.setItem('admin_user', JSON.stringify(data));
          localStorage.setItem('admin_name', `${data.firstName} ${data.lastName}`);
          setIsAuthenticated(true);
          setUser(data);
          return { success: true };
        } else {
          console.log('❌ Логин не удался:', { response: response.ok, token: !!data.token, role: data.role });
          if (response.ok) {
            // Если сервер ответил, но роль не подходит, не пробуем другие URL
            return { success: false, message: data.message || 'Недостаточно прав доступа' };
          }
        }
      } catch (error) {
        console.log(`❌ Ошибка с URL ${apiUrl}:`, error);
        // Продолжаем с следующим URL
      }
    }

    return { success: false, message: 'Не удалось подключиться к серверу' };
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    localStorage.removeItem('admin_name')
    setIsAuthenticated(false)
    setUser(null)
  }, [])

  // Функции для проверки ролей
  const isAdmin = useCallback(() => {
    return user?.role === 'admin'
  }, [user])

  const isAccountant = useCallback(() => {
    return user?.role === 'accountant'
  }, [user])

  const canDeleteAnything = useCallback(() => {
    return user?.role === 'admin' || user?.role === 'accountant'
  }, [user])

  const canDeleteWithRestrictions = useCallback(() => {
    return user?.role === 'moderator'
  }, [user])

  // Функция для проверки прав администратора или бухгалтера (полные права)
  const hasFullAccess = useCallback(() => {
    return user?.role === 'admin' || user?.role === 'accountant'
  }, [user])

  return {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    isAdmin,
    isAccountant,
    canDeleteAnything,
    canDeleteWithRestrictions,
    hasFullAccess
  }
} 