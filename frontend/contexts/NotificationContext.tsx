import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Notification {
  _id: string;
  type: 'review_request' | 'review_published' | 'review_moderated' | 'custom';
  text: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  product?: {
    slug?: string;
    name?: string;
    _id?: string;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  fetchNotifications: async () => {},
  markAsRead: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://technoline-api.loca.lt/api';
      
      // Если нет токена, просто не загружаем уведомления
      if (!token) {
        console.log('ℹ️ Пользователь не авторизован - уведомления не загружаются');
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }
      
      console.log('🔑 Загрузка уведомлений для авторизованного пользователя:', {
        tokenExists: !!token,
        tokenLength: token?.length,
        apiUrl: apiUrl
      });
      
      const res = await fetch(`${apiUrl}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('📡 Ответ от сервера уведомлений:', {
        status: res.status,
        statusText: res.statusText,
        url: res.url
      });
      
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.isRead).length);
        console.log('✅ Уведомления загружены успешно:', data.length, 'уведомлений');
      } else if (res.status === 401) {
        console.log('🔐 Токен недействителен - очищаем localStorage');
        localStorage.removeItem('authToken');
        setNotifications([]);
        setUnreadCount(0);
      } else {
        console.log('❌ Ошибка получения уведомлений:', res.status, res.statusText);
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('❌ Ошибка сети при получении уведомлений:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        console.log('ℹ️ Нет токена для отметки уведомления как прочитанного');
        return;
      }
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://technoline-api.loca.lt/api'}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        setNotifications(notifications => notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
        setUnreadCount(count => Math.max(0, count - 1));
      } else if (res.status === 401) {
        console.log('🔐 Токен недействителен при отметке уведомления - очищаем localStorage');
        localStorage.removeItem('authToken');
      } else {
        console.error('❌ Ошибка при отметке уведомления как прочитанного:', res.status, res.statusText);
      }
    } catch (error) {
      console.error('❌ Ошибка сети при отметке уведомления как прочитанного:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, fetchNotifications, markAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
}; 