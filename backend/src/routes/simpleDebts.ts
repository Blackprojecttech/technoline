import express from 'express';
import { SimpleDebt } from '../models/SimpleDebt';
import { Payment } from '../models/Payment';
import { auth } from '../middleware/auth';
import { admin } from '../middleware/admin';

const router = express.Router();

// Получить все простые долги
router.get('/', auth, admin, async (req, res) => {
  try {
    const { status, search } = req.query;
    
    let query: any = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const debts = await SimpleDebt.find(query).sort({ date: -1 });
    return res.json(debts);
  } catch (error) {
    console.error('Error fetching simple debts:', error);
    return res.status(500).json({ error: 'Ошибка при получении долгов' });
  }
});

// Создать новый простой долг
router.post('/', auth, admin, async (req, res) => {
  try {
    const debtData = {
      ...req.body,
      createdBy: (req as any).user.id
    };
    
    const debt = new SimpleDebt(debtData);
    await debt.save();
    return res.status(201).json(debt);
  } catch (error) {
    console.error('Error creating simple debt:', error);
    return res.status(500).json({ error: 'Ошибка при создании долга' });
  }
});

// Частичная оплата долга
router.patch('/:id/pay', auth, admin, async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Некорректная сумма платежа' });
    }

    const debt = await SimpleDebt.findOne({ id: req.params.id });
    
    if (!debt) {
      return res.status(404).json({ error: 'Долг не найден' });
    }

    if (amount > debt.remainingAmount) {
      return res.status(400).json({ 
        error: `Сумма платежа (${amount}) не может быть больше оставшейся суммы долга (${debt.remainingAmount})`
      });
    }

    // Обновляем суммы
    debt.paidAmount += amount;
    debt.remainingAmount -= amount;

    // Обновляем статус
    if (debt.remainingAmount === 0) {
      debt.status = 'paid';
    } else if (debt.paidAmount > 0) {
      debt.status = 'partially_paid';
    }

    // Сохраняем изменения
    await debt.save();

    // Создаем запись о списании из наличных кассы
    try {
      const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      const cashExpense = new Payment({
        id: paymentId,
        type: 'наличные',
        category: 'Оплата долга',
        amount: -Math.abs(amount),
        date: new Date(),
        description: `Оплата долга: ${debt.title}`,
        paymentMethod: 'наличные',
        apiType: 'expense',
        debtId: debt.id,
        notes: `Оплата долга на сумму ${amount.toLocaleString('ru-RU')} ₽\nНазвание: ${debt.title}`,
        inCashRegister: 'yes',
        cashRegisterDate: new Date(),
        createdBy: (req as any).user.id
      });

      await cashExpense.save();
    } catch (error) {
      console.error('Ошибка при создании записи о списании из кассы:', error);
    }

    return res.json(debt);
  } catch (error) {
    console.error('Ошибка при оплате долга:', error);
    return res.status(500).json({ error: 'Ошибка при оплате долга' });
  }
});

// Удалить все простые долги (только для админов) - ДОЛЖНО БЫТЬ ПЕРЕД /:id
router.delete('/clear-all', auth, admin, async (req, res) => {
  try {
    console.log('🗑️ Запрос на удаление всех простых долгов от пользователя:', (req as any).user?.role);
    
    // Дополнительная проверка прав (только супер-админ)
    if ((req as any).user?.role !== 'admin') {
      return res.status(403).json({ error: 'Недостаточно прав для массового удаления' });
    }

    // Получаем количество долгов перед удалением
    const count = await SimpleDebt.countDocuments();
    console.log(`📊 Найдено простых долгов для удаления: ${count}`);

    if (count === 0) {
      return res.json({ message: 'Простые долги не найдены', deletedCount: 0 });
    }

    // Находим все долги с оплаченными суммами для возврата в кассу
    const debtsWithPayments = await SimpleDebt.find({ paidAmount: { $gt: 0 } });
    
    // Создаем возвратные платежи для каждого оплаченного долга
    if (debtsWithPayments.length > 0) {
      for (const debt of debtsWithPayments) {
        try {
          const refundPaymentId = `refund_simple_debt_clear_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          
          const refundPayment = new Payment({
            id: refundPaymentId,
            type: 'наличные',
            category: 'Возврат в кассу',
            amount: debt.paidAmount,
            date: new Date(),
            description: `Возврат в кассу при очистке простого долга "${debt.title}"`,
            paymentMethod: 'наличные',
            apiType: 'income',
            notes: `Возврат ${debt.paidAmount.toLocaleString('ru-RU')} ₽ в кассу при очистке всех простых долгов`,
            inCashRegister: 'yes',
            cashRegisterDate: new Date(),
            createdBy: (req as any).user.id
          });

          await refundPayment.save();
          console.log(`💰 Создан возврат в кассу на сумму: ${debt.paidAmount} ₽ для простого долга ${debt.id}`);
        } catch (error) {
          console.error(`⚠️ Ошибка при создании возврата для простого долга ${debt.id}:`, error);
        }
      }
    }

    // Удаляем связанные платежи (расходы по простым долгам)
    const deletedPayments = await Payment.deleteMany({ 
      $or: [
        { category: 'Оплата долга' },
        { paymentMethod: 'simple_debt' }
      ]
    });
    
    console.log(`🗑️ Удалено связанных платежей: ${deletedPayments.deletedCount}`);

    // Удаляем все простые долги
    const result = await SimpleDebt.deleteMany({});
    
    console.log(`✅ Удалено простых долгов: ${result.deletedCount}, возвращено в кассу: ${debtsWithPayments.reduce((sum, debt) => sum + debt.paidAmount, 0)} ₽`);
    
    return res.json({ 
      message: 'Все простые долги удалены',
      deletedCount: result.deletedCount,
      deletedPayments: deletedPayments.deletedCount,
      refundAmount: debtsWithPayments.reduce((sum, debt) => sum + debt.paidAmount, 0)
    });
  } catch (error) {
    console.error('Error clearing all simple debts:', error);
    return res.status(500).json({ error: 'Ошибка при очистке простых долгов' });
  }
});

// Удалить долг
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const debt = await SimpleDebt.findOne({ id: req.params.id });
    if (!debt) {
      return res.status(404).json({ error: 'Долг не найден' });
    }

    // Удаляем связанные платежи
    await Payment.deleteMany({ debtId: debt.id });

    // Если долг был частично оплачен, возвращаем деньги в кассу
    if (debt.paidAmount > 0) {
      try {
        const refundPaymentId = `refund_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        
        const refundPayment = new Payment({
          id: refundPaymentId,
          type: 'income',
          category: 'Возврат в кассу',
          amount: debt.paidAmount,
          date: new Date(),
          description: `Возврат в кассу при удалении долга: ${debt.title}`,
          paymentMethod: 'cash',
          notes: `Возврат ${debt.paidAmount.toLocaleString('ru-RU')} ₽ в кассу при удалении долга "${debt.title}"`,
          createdBy: (req as any).user.id
        });

        await refundPayment.save();
      } catch (error) {
        console.error('Ошибка при создании возврата в кассу:', error);
      }
    }

    // Удаляем сам долг
    await SimpleDebt.deleteOne({ id: debt.id });

    return res.json({ 
      message: 'Долг удален',
      refundAmount: debt.paidAmount > 0 ? debt.paidAmount : 0
    });
  } catch (error) {
    console.error('Error deleting simple debt:', error);
    return res.status(500).json({ error: 'Ошибка при удалении долга' });
  }
});

export default router; 