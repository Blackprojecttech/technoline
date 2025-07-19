import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface OrderSocketOptions {
  orderId?: string;
  onOrderUpdate?: (data: { orderId: string; type: string; callRequest?: boolean; callStatus?: string }) => void;
}

export const useOrderSocket = ({ orderId, onOrderUpdate }: OrderSocketOptions) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Создаем подключение к Socket.IO (убираем /api из URL)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';
    const socketUrl = apiUrl.replace('/api', '');
    
    console.log('🔌 Connecting to Socket.IO:', socketUrl);
    
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    // Обработка подключения
    socket.on('connect', () => {
      console.log('🔌 Socket.IO connected:', socket.id);
      
      // Присоединяемся к комнате заказа, если orderId передан
      if (orderId) {
        console.log(`🔌 Joining order room: order_${orderId}`);
        socket.emit('joinOrderRoom', orderId);
        console.log(`🔌 Joined order room: order_${orderId}`);
      } else {
        // Если orderId не передан, присоединяемся к общей комнате для всех заказов
        console.log(`🔌 Joining general orders room`);
        socket.emit('joinOrderRoom', 'general');
        console.log(`🔌 Joined general orders room`);
      }
    });

    // Добавляем обработчик для всех событий для отладки
    socket.onAny((eventName, ...args) => {
      console.log(`🔌 Socket event received: ${eventName}`, args);
    });

    // Обработка отключения
    socket.on('disconnect', () => {
      console.log('🔌 Socket.IO disconnected');
    });

    // Обработка ошибок
    socket.on('connect_error', (error: Error) => {
      console.error('🔌 Socket.IO connection error:', error);
    });

    // Подписка на обновления заказа
    socket.on('order-updated', (data: { orderId: string; type: string; callRequest?: boolean; callStatus?: string }) => {
      console.log('📦 Order updated via Socket.IO:', data);
      console.log('📦 Calling onOrderUpdate callback...');
      onOrderUpdate?.(data);
    });

    // Очистка при размонтировании
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [orderId, onOrderUpdate]);

  return socketRef.current;
}; 