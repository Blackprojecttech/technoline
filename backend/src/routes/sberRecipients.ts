import express from 'express';
import { auth, adminOnly } from '../middleware/auth';
import { SberRecipient } from '../models/SberRecipient';

const router = express.Router();

// Получить все получатели Сбера
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const recipients = await SberRecipient.find().sort({ name: 1 });
    return res.json(recipients);
  } catch (error) {
    console.error('Error getting Sber recipients:', error);
    return res.status(500).json({ error: 'Ошибка при получении получателей Сбера' });
  }
});

// Добавить нового получателя
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name } = req.body;
    
    // Проверяем, существует ли уже такой получатель
    const existing = await SberRecipient.findOne({ name });
    if (existing) {
      return res.status(400).json({ error: 'Такой получатель уже существует' });
    }

    const recipient = new SberRecipient({
      name,
      createdBy: (req as any).user.id
    });

    await recipient.save();
    return res.status(201).json(recipient);
  } catch (error) {
    console.error('Error creating Sber recipient:', error);
    return res.status(500).json({ error: 'Ошибка при создании получателя Сбера' });
  }
});

// Удалить получателя
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const recipient = await SberRecipient.findByIdAndDelete(req.params.id);
    if (!recipient) {
      return res.status(404).json({ error: 'Получатель не найден' });
    }
    return res.json({ message: 'Получатель удален' });
  } catch (error) {
    console.error('Error deleting Sber recipient:', error);
    return res.status(500).json({ error: 'Ошибка при удалении получателя Сбера' });
  }
});

export default router; 