import { Request, Response } from 'express';

let clients: Response[] = [];

export const eventController = {
  // Подключение клиента к SSE
  subscribe: (req: Request, res: Response) => {
    console.log('👥 New client connected to SSE');
    
    // Настраиваем таймаут соединения
    req.socket.setTimeout(0);
    req.socket.setNoDelay(true);
    req.socket.setKeepAlive(true);
    
    // Отключаем буферизацию
    res.setHeader('X-Accel-Buffering', 'no');
    
    // Устанавливаем заголовки SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true'
    });

    // Отправляем начальное сообщение
    const connectMessage = { 
      type: 'connected', 
      timestamp: new Date().toISOString(),
      clientId: req.socket.remoteAddress
    };
    console.log('✉️ Sending connect message:', connectMessage);
    res.write(`data: ${JSON.stringify(connectMessage)}\n\n`);

    // Добавляем клиента в список
    clients.push(res);
    console.log('📊 Total connected clients:', clients.length);

    // Отправляем пинг каждые 30 секунд для поддержания соединения
    const pingInterval = setInterval(() => {
      if (res.writableEnded) {
        clearInterval(pingInterval);
        return;
      }
      res.write(`: ping\n\n`);
    }, 30000);

    // Удаляем клиента при отключении
    req.on('close', () => {
      console.log('👋 Client disconnected from SSE');
      clearInterval(pingInterval);
      clients = clients.filter(client => client !== res);
      console.log('📊 Remaining connected clients:', clients.length);
    });
  },

  // Отправка события всем подключенным клиентам
  sendEvent: (eventData: any) => {
    console.log('📨 Sending event to all clients:', eventData);
    console.log('📊 Number of connected clients:', clients.length);
    
    const eventString = `data: ${JSON.stringify(eventData)}\n\n`;
    
    clients = clients.filter(client => {
      try {
        if (!client.writableEnded) {
          client.write(eventString);
          return true;
        }
        console.log('❌ Client connection ended, removing from list');
        return false;
      } catch (error) {
        console.error('❌ Error sending event to client:', error);
        return false;
      }
    });

    console.log('📊 Clients after cleanup:', clients.length);
  }
}; 