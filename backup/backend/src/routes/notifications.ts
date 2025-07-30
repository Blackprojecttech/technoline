import express from 'express';
import Notification from '../models/Notification';
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Получить все уведомления пользователя (новые сначала)
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Пользователь не авторизован' });
    }

    const notifications = await Notification.find({ user: req.user._id })
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

export default router; 