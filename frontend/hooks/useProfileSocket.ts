import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface ProfileSocketOptions {
  orderIds?: string[];
  onOrderUpdate?: (data: { orderId: string; type: string; callRequest?: boolean; callStatus?: string }) => void;
}

export const useProfileSocket = ({ orderIds = [], onOrderUpdate }: ProfileSocketOptions) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Создаем подключение к Socket.IO (убираем /api из URL)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';
    const socketUrl = apiUrl.replace('/api', '');
    
    console.log('🔌 Profile connecting to Socket.IO:', socketUrl);
    
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    // Обработка подключения
    socket.on('connect', () => {
      console.log('🔌 Profile Socket.IO connected:', socket.id);
      
      // Присоединяемся к общей комнате для всех заказов
      console.log(`🔌 Joining general orders room`);
      socket.emit('joinOrderRoom', 'general');
      console.log(`🔌 Joined general orders room`);
      
      // Присоединяемся к комнатам всех заказов пользователя
      if (orderIds.length > 0) {
        console.log(`🔌 Joining rooms for orders:`, orderIds);
        orderIds.forEach(orderId => {
          socket.emit('joinOrderRoom', orderId);
          console.log(`🔌 Joined order room: order_${orderId}`);
        });
      }
    });

    // Добавляем обработчик для всех событий для отладки
    socket.onAny((eventName, ...args) => {
      console.log(`🔌 Profile Socket event received: ${eventName}`, args);
    });

    // Обработка отключения
    socket.on('disconnect', () => {
      console.log('🔌 Profile Socket.IO disconnected');
    });

    // Обработка ошибок
    socket.on('connect_error', (error: Error) => {
      console.error('🔌 Profile Socket.IO connection error:', error);
    });

    // Подписка на обновления заказа
    socket.on('order-updated', (data: { orderId: string; type: string; callRequest?: boolean; callStatus?: string }) => {
      console.log('📦 Profile received order update via Socket.IO:', data);
      onOrderUpdate?.(data);
    });

    // Очистка при размонтировании
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [orderIds, onOrderUpdate]);

  return socketRef.current;
}; 