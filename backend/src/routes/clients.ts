import express from 'express';
import { Client } from '../models/Client';
import { auth } from '../middleware/auth';
import { admin } from '../middleware/admin';

const router = express.Router();

// Получить всех клиентов
router.get('/', auth, admin, async (req, res) => {
  try {
    const { status, search } = req.query;
    
    let query: any = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const clients = await Client.find(query).sort({ createdAt: -1 });
    return res.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return res.status(500).json({ error: 'Ошибка при получении клиентов' });
  }
});

// Получить клиента по ID
router.get('/:id', auth, admin, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Клиент не найден' });
    }
    return res.json(client);
  } catch (error) {
    console.error('Error fetching client:', error);
    return res.status(500).json({ error: 'Ошибка при получении клиента' });
  }
});

// Создать нового клиента
router.post('/', auth, admin, async (req, res) => {
  try {
    const clientData = {
      ...req.body,
      createdBy: (req as any).user.id
    };
    
    const client = new Client(clientData);
    await client.save();
    return res.status(201).json(client);
  } catch (error) {
    console.error('Error creating client:', error);
    return res.status(500).json({ error: 'Ошибка при создании клиента' });
  }
});

// Обновить клиента
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!client) {
      return res.status(404).json({ error: 'Клиент не найден' });
    }
    return res.json(client);
  } catch (error) {
    console.error('Error updating client:', error);
    return res.status(500).json({ error: 'Ошибка при обновлении клиента' });
  }
});

// Удалить клиента
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Клиент не найден' });
    }
    return res.json({ message: 'Клиент удален' });
  } catch (error) {
    console.error('Error deleting client:', error);
    return res.status(500).json({ error: 'Ошибка при удалении клиента' });
  }
});

// Получить статистику по клиентам
router.get('/stats/summary', auth, admin, async (req, res) => {
  try {
    const totalClients = await Client.countDocuments();
    const activeClients = await Client.countDocuments({ status: 'active' });
    const topClients = await Client.find({ status: 'active' })
      .sort({ totalSpent: -1 })
      .limit(10)
      .select('name totalSpent totalOrders');

    const summary = {
      totalClients,
      activeClients,
      inactiveClients: totalClients - activeClients,
      topClients
    };

    return res.json(summary);
  } catch (error) {
    console.error('Error fetching client stats:', error);
    return res.status(500).json({ error: 'Ошибка при получении статистики клиентов' });
  }
});

export default router; 