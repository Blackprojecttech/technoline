import express from 'express';
import { AdminAction } from '../models/AdminAction';
import { auth } from '../middleware/auth';
import { admin } from '../middleware/admin';

const router = express.Router();

// Получить все действия администраторов
router.get('/', auth, admin, async (req, res) => {
  try {
    const { page, limit = 5000, pageFilter, search, dateFrom, dateTo } = req.query;
    
    let query: any = {};
    
    // Фильтр по странице
    if (pageFilter && pageFilter !== 'all') {
      query.page = pageFilter;
    }
    
    // Поиск по действию, деталям или имени администратора
    if (search) {
      query.$or = [
        { action: { $regex: search, $options: 'i' } },
        { details: { $regex: search, $options: 'i' } },
        { adminName: { $regex: search, $options: 'i' } },
        { entityName: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Фильтр по дате
    if (dateFrom && dateTo) {
      query.createdAt = {
        $gte: new Date(dateFrom as string),
        $lte: new Date(dateTo as string)
      };
    }
    
    const skip = page ? (parseInt(page as string) - 1) * parseInt(limit as string) : 0;
    
    const actions = await AdminAction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));
    
    const total = await AdminAction.countDocuments(query);
    
    return res.json({
      actions,
      pagination: {
        current: page ? parseInt(page as string) : 1,
        pageSize: parseInt(limit as string),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching admin actions:', error);
    return res.status(500).json({ error: 'Ошибка при получении действий' });
  }
});

// Создать новое действие
router.post('/', auth, admin, async (req, res) => {
  try {
    const { action, page, details, entityId, entityName } = req.body;
    
    const adminAction = new AdminAction({
      adminId: (req as any).user.id,
      adminName: (req as any).user.firstName && (req as any).user.lastName 
        ? `${(req as any).user.firstName} ${(req as any).user.lastName}`
        : (req as any).user.firstName || (req as any).user.email || 'Администратор',
      action,
      page,
      details,
      entityId,
      entityName,
      ip: req.ip
    });
    
    await adminAction.save();
    return res.status(201).json(adminAction);
  } catch (error) {
    console.error('Error creating admin action:', error);
    return res.status(500).json({ error: 'Ошибка при создании действия' });
  }
});

// Удалить старые действия (для очистки)
router.delete('/cleanup', auth, admin, async (req, res) => {
  try {
    const { daysOld = 90 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysOld as string));
    
    const result = await AdminAction.deleteMany({
      createdAt: { $lt: cutoffDate }
    });
    
    return res.json({ 
      message: `Удалено ${result.deletedCount} старых действий`,
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error cleaning up admin actions:', error);
    return res.status(500).json({ error: 'Ошибка при очистке действий' });
  }
});

export default router; 