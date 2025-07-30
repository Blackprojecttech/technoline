import express, { Response } from 'express';
import { Payment } from '../models/Payment';
import { auth, AuthRequest } from '../middleware/auth';
import { admin } from '../middleware/admin';

const router = express.Router();

// Получить все платежи
router.get('/', auth, admin, async (req, res) => {
  try {
    const { type, category, dateFrom, dateTo, search, paymentMethod } = req.query;
    
    let query: any = {};
    if (type && type !== 'all') {
      query.type = type;
    }
    if (category && category !== 'all') {
      query.category = category;
    }
    if (paymentMethod && paymentMethod !== 'all') {
      query.paymentMethod = paymentMethod;
    }
    if (dateFrom && dateTo) {
      query.date = {
        $gte: new Date(dateFrom as string),
        $lte: new Date(dateTo as string)
      };
    }
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { supplierName: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const payments = await Payment.find(query).sort({ date: -1 });
    
    // Устанавливаем заголовки прав доступа
    const userRole = (req as any).user?.role;
    const canEdit = userRole === 'admin' || userRole === 'accountant';
    
    res.set('X-Can-Edit', canEdit.toString());
    res.set('X-User-Role', userRole || 'unknown');
    
    console.log('🔐 Устанавливаем заголовки прав доступа:', { canEdit, userRole });
    
    return res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return res.status(500).json({ error: 'Ошибка при получении платежей' });
  }
});

// Получить платеж по ID
router.get('/:id', auth, admin, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Платеж не найден' });
    }
    return res.json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    return res.status(500).json({ error: 'Ошибка при получении платежа' });
  }
});

// Создать новый платеж
router.post('/', auth, admin, async (req, res) => {
  try {
    // Генерируем уникальный ID для платежа, если он не указан или равен null
    const paymentId = req.body.id && req.body.id !== null ? req.body.id : `payment_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    const paymentData = {
      ...req.body,
      id: paymentId,
      createdBy: (req as any).user.id
    };
    
    const payment = new Payment(paymentData);
    await payment.save();
    return res.status(201).json(payment);
  } catch (error) {
    console.error('Error creating payment:', error);
    return res.status(500).json({ error: 'Ошибка при создании платежа' });
  }
});

// Обновление платежа
router.put('/:id', auth, admin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Если это инкассация, обрабатываем только нужные поля
    if (updateData.status === 'incassated') {
      const payment = await Payment.findByIdAndUpdate(
        id,
        {
          status: 'incassated',
          incassationDate: updateData.incassationDate
          // НЕ устанавливаем inCashRegister: true автоматически
        },
        { new: true, runValidators: false }
      );
      
      if (!payment) {
        return res.status(404).json({ error: 'Платеж не найден' });
      }
      
      return res.json(payment);
    }
    
    // Для обычных обновлений используем стандартную валидацию
    const payment = await Payment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!payment) {
      return res.status(404).json({ error: 'Платеж не найден' });
    }

    return res.json(payment);
  } catch (error) {
    console.warn('Error updating payment:', error);
    return res.status(500).json({ error: 'Ошибка при обновлении платежа' });
  }
});



// Удалить все платежи (должен быть ПЕРЕД /:id)
router.delete('/clear-all', auth, admin, async (req: AuthRequest, res: Response) => {
  try {
    console.log('🗑️ Запрос на удаление всех платежей от пользователя:', req.user?.role);
    
    // Дополнительная проверка прав (только супер-админ)
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Недостаточно прав для массового удаления' });
    }

    // Получаем количество платежей перед удалением
    const count = await Payment.countDocuments();
    console.log(`📊 Найдено платежей для удаления: ${count}`);

    if (count === 0) {
      return res.json({ message: 'Платежи не найдены', deletedCount: 0 });
    }

    // Удаляем все платежи
    const result = await Payment.deleteMany({});
    console.log(`🗑️ Удалено платежей: ${result.deletedCount}`);

    return res.json({ 
      message: `Удалено ${result.deletedCount} платежей`,
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('❌ Ошибка при массовом удалении платежей:', error);
    return res.status(500).json({ error: 'Ошибка при удалении платежей' });
  }
});

// Удалить платеж
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Платеж не найден' });
    }
    return res.json({ message: 'Платеж удален' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    return res.status(500).json({ error: 'Ошибка при удалении платежа' });
  }
});



// Получить статистику по платежам
router.get('/stats/summary', auth, admin, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    let dateFilter: any = {};
    if (dateFrom && dateTo) {
      dateFilter = {
        date: {
          $gte: new Date(dateFrom as string),
          $lte: new Date(dateTo as string)
        }
      };
    }

    const stats = await Payment.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const summary = {
      totalIncome: 0,
      totalExpense: 0,
      netProfit: 0,
      incomeCount: 0,
      expenseCount: 0
    };

    stats.forEach(stat => {
      if (stat._id === 'income') {
        summary.totalIncome = stat.totalAmount;
        summary.incomeCount = stat.count;
      } else if (stat._id === 'expense') {
        summary.totalExpense = stat.totalAmount;
        summary.expenseCount = stat.count;
      }
    });

    summary.netProfit = summary.totalIncome - summary.totalExpense;

    return res.json(summary);
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    return res.status(500).json({ error: 'Ошибка при получении статистики платежей' });
  }
});

// Специальный endpoint для удаления платежа на 8900
router.delete('/amount/8900', auth, admin, async (req, res) => {
  try {
    console.log('🔍 Ищем платеж на 8900 для удаления...');
    
    // Ищем платеж на 8900
    const payment = await Payment.findOne({ amount: 8900 });
    
    if (payment) {
      console.log('✅ Найден платеж для удаления:', {
        _id: payment._id,
        type: payment.type,
        amount: payment.amount,
        description: payment.description,
        date: payment.date,
        paymentMethod: payment.paymentMethod
      });
      
      // Удаляем платеж
      await Payment.findByIdAndDelete(payment._id);
      console.log('🗑️ Платеж на 8900 успешно удален!');
      
      return res.json({ 
        message: 'Платеж на 8900 успешно удален',
        deletedPayment: {
          _id: payment._id,
          type: payment.type,
          amount: payment.amount,
          description: payment.description
        }
      });
    } else {
      console.log('❌ Платеж на 8900 не найден');
      
      // Показываем все платежи для отладки
      const allPayments = await Payment.find({}).sort({ date: -1 }).limit(10);
      console.log('📋 Последние 10 платежей:');
      allPayments.forEach(p => {
        console.log(`- ${p.amount}₽ (${p.type}) - ${p.description} - ${p.date}`);
      });
      
      return res.status(404).json({ 
        error: 'Платеж на 8900 не найден',
        recentPayments: allPayments.map(p => ({
          _id: p._id,
          amount: p.amount,
          type: p.type,
          description: p.description,
          date: p.date
        }))
      });
    }
  } catch (error) {
    console.error('❌ Ошибка при удалении платежа на 8900:', error);
    return res.status(500).json({ error: 'Ошибка при удалении платежа' });
  }
});

export default router; 