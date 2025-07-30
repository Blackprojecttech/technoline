import express from 'express';
import Notification from '../models/Notification';
import PushSubscription from '../models/PushSubscription';
import PushNotificationService from '../services/pushNotificationService';
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Получить все уведомления пользователя (новые сначала)
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Пользователь не авторизован' });
    }

    const notifications = await Notification.find({ user: req.user._id })
      .populate({
        path: 'product._id',
        model: 'Product',
        select: 'name slug'
      })
      .sort({ createdAt: -1 });
    
    return res.json(notifications);
  } catch (error) {
    console.error('Ошибка при получении уведомлений:', error);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Отметить уведомление как прочитанное
router.patch('/:id/read', auth, async (req: AuthRequest, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user!._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      res.status(404).json({ message: 'Уведомление не найдено' });
      return;
    }
    res.json(notification);
    return;
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
    return;
  }
});

// (Для теста/админа) Создать уведомление вручную
router.post('/', auth, async (req: AuthRequest, res) => {
  try {
    const { type, text, link, user } = req.body;
    const notification = await Notification.create({
      user: user || req.user!._id,
      type,
      text,
      link,
    });
    res.status(201).json(notification);
    return;
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
    return;
  }
});

// Подписка на push-уведомления
router.post('/subscribe', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Пользователь не авторизован' });
    }

    const { subscription, userAgent } = req.body;
    
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ message: 'Некорректные данные подписки' });
    }

    // Проверяем, есть ли уже такая подписка
    const existingSubscription = await PushSubscription.findOne({
      endpoint: subscription.endpoint
    });

    if (existingSubscription) {
      // Обновляем существующую подписку
      existingSubscription.user = req.user._id as any;
      existingSubscription.p256dh = subscription.keys.p256dh;
      existingSubscription.auth = subscription.keys.auth;
      existingSubscription.userAgent = userAgent;
      existingSubscription.isActive = true;
      existingSubscription.lastUsed = new Date();
      await existingSubscription.save();
      
      console.log('✅ Обновлена push-подписка для пользователя:', req.user._id);
    } else {
      // Создаем новую подписку
      const newSubscription = new PushSubscription({
        user: req.user._id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
        isActive: true
      });
      
      await newSubscription.save();
      console.log('✅ Создана новая push-подписка для пользователя:', req.user._id);
    }

    return res.status(200).json({ message: 'Подписка успешно сохранена' });
  } catch (error) {
    console.error('❌ Ошибка сохранения push-подписки:', error);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Отписка от push-уведомлений
router.post('/unsubscribe', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Пользователь не авторизован' });
    }

    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ message: 'Не указан endpoint' });
    }

    // Деактивируем подписку
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { isActive: false }
    );

    console.log('✅ Деактивирована push-подписка для пользователя:', req.user._id);
    return res.status(200).json({ message: 'Отписка успешно выполнена' });
  } catch (error) {
    console.error('❌ Ошибка отписки от push-уведомлений:', error);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Тестовое push-уведомление
router.post('/test', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Пользователь не авторизован' });
    }

    const success = await PushNotificationService.sendTestNotification(req.user._id);
    
    if (success) {
      return res.status(200).json({ message: 'Тестовое уведомление отправлено' });
    } else {
      return res.status(400).json({ message: 'Не удалось отправить уведомление. Проверьте подписку.' });
    }
  } catch (error) {
    console.error('❌ Ошибка отправки тестового уведомления:', error);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
});

export default router; 