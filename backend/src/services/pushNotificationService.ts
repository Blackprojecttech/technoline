import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription';
import mongoose from 'mongoose';

// Настройка VAPID ключей (в продакшене нужно использовать переменные окружения)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BCQmdw7UtjDaFV260LXlR3JuVxtojy_L2J8epI5ouclHmUSN1KC85FyuJtIY34RqhmPmn-SQh27jhh1PwKlZ-T8';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'JpmFij053flGvVSi6CCv7peOHFq9th_QL79ZhBpGKwE';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@techno-line.store';

// Инициализация VAPID
webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  data?: any;
}

class PushNotificationService {
  
  /**
   * Отправка push-уведомления конкретному пользователю
   */
  async sendToUser(userId: string | mongoose.Types.ObjectId, payload: PushNotificationPayload): Promise<boolean> {
    try {
      console.log('📱 Отправка push-уведомления пользователю:', userId);
      
      // Находим все активные подписки пользователя
      const subscriptions = await PushSubscription.find({ 
        user: userId, 
        isActive: true 
      });

      if (subscriptions.length === 0) {
        console.log('📭 У пользователя нет активных push-подписок');
        return false;
      }

      // Подготавливаем данные для отправки
      const notificationData = {
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon-192.png',
        badge: payload.badge || '/icon-192.png',
        tag: payload.tag || 'notification',
        url: payload.url || '/',
        data: payload.data || {},
        requireInteraction: true,
        actions: [
          {
            action: 'view',
            title: 'Посмотреть'
          }
        ]
      };

      let successCount = 0;
      const failedSubscriptions: string[] = [];

      // Отправляем уведомления всем подпискам пользователя
      for (const subscription of subscriptions) {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          };

          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(notificationData)
          );

          // Обновляем время последнего использования
          subscription.lastUsed = new Date();
          await subscription.save();
          
          successCount++;
          console.log('✅ Уведомление отправлено на устройство');

        } catch (error: any) {
          console.error('❌ Ошибка отправки на устройство:', error);
          
          // Если подписка больше не действительна, деактивируем её
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log('🗑️ Деактивируем недействительную подписку');
            subscription.isActive = false;
            await subscription.save();
          }
          
          failedSubscriptions.push(subscription.endpoint);
        }
      }

      console.log(`📱 Push-уведомления: отправлено ${successCount}/${subscriptions.length}`);
      return successCount > 0;

    } catch (error) {
      console.error('❌ Ошибка сервиса push-уведомлений:', error);
      return false;
    }
  }

  /**
   * Отправка уведомления о регистрации
   */
  async sendWelcomeNotification(userId: string | mongoose.Types.ObjectId, userName: string): Promise<boolean> {
    return this.sendToUser(userId, {
      title: '🎉 Добро пожаловать в Techno-line!',
      body: `Привет, ${userName}! Спасибо за регистрацию. Начинайте делать покупки!`,
      tag: 'welcome',
      url: '/catalog'
    });
  }

  /**
   * Отправка уведомления о новом заказе
   */
  async sendNewOrderNotification(userId: string | mongoose.Types.ObjectId, orderNumber: string, total: number): Promise<boolean> {
    return this.sendToUser(userId, {
      title: '🛍️ Заказ оформлен!',
      body: `Ваш заказ #${orderNumber} на сумму ${total.toLocaleString()} ₽ принят в обработку`,
      tag: 'new_order',
      url: `/orders/${orderNumber}`,
      data: { orderNumber, total }
    });
  }

  /**
   * Отправка уведомления об изменении статуса заказа
   */
  async sendOrderStatusNotification(
    userId: string | mongoose.Types.ObjectId, 
    orderNumber: string, 
    status: string,
    orderId: string
  ): Promise<boolean> {
    const statusMessages: Record<string, { title: string; body: string; emoji: string }> = {
      confirmed: {
        title: '✅ Заказ подтвержден',
        body: `Ваш заказ #${orderNumber} подтвержден и передан в обработку`,
        emoji: '✅'
      },
      processing: {
        title: '📦 Заказ собирается',
        body: `Ваш заказ #${orderNumber} собирается на складе`,
        emoji: '📦'
      },
      shipped: {
        title: '🚚 Заказ отправлен',
        body: `Ваш заказ #${orderNumber} отправлен и скоро будет доставлен`,
        emoji: '🚚'
      },
      with_courier: {
        title: '🏃‍♂️ Курьер в пути',
        body: `Курьер выехал с вашим заказом #${orderNumber}. Ожидайте звонка!`,
        emoji: '🏃‍♂️'
      },
      delivered: {
        title: '🎉 Заказ доставлен',
        body: `Ваш заказ #${orderNumber} успешно доставлен. Спасибо за покупку!`,
        emoji: '🎉'
      },
      cancelled: {
        title: '❌ Заказ отменен',
        body: `Ваш заказ #${orderNumber} был отменен`,
        emoji: '❌'
      }
    };

    const statusInfo = statusMessages[status] || {
      title: '📋 Статус заказа изменен',
      body: `Статус вашего заказа #${orderNumber} обновлен`,
      emoji: '📋'
    };

    return this.sendToUser(userId, {
      title: statusInfo.title,
      body: statusInfo.body,
      tag: 'order_status',
      url: `/orders/${orderId}`,
      data: { orderNumber, status, orderId }
    });
  }

  /**
   * Тестовое уведомление
   */
  async sendTestNotification(userId: string | mongoose.Types.ObjectId): Promise<boolean> {
    return this.sendToUser(userId, {
      title: '🧪 Тестовое уведомление',
      body: 'Если вы видите это сообщение, push-уведомления работают корректно!',
      tag: 'test',
      url: '/profile'
    });
  }

}

export default new PushNotificationService(); 