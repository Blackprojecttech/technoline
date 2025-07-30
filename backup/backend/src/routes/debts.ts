import express from 'express';
import { Debt } from '../models/Debt';
import { Payment } from '../models/Payment';
import { auth } from '../middleware/auth';
import { admin } from '../middleware/admin';

const router = express.Router();

// Получить все долги
router.get('/', auth, admin, async (req, res) => {
  try {
    const { status, supplierId, search } = req.query;
    
    let query: any = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (supplierId) {
      query.supplierId = supplierId;
    }
    if (search) {
      query.$or = [
        { supplierName: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const debts = await Debt.find(query).sort({ date: -1 });
    return res.json(debts);
  } catch (error) {
    console.error('Error fetching debts:', error);
    return res.status(500).json({ error: 'Ошибка при получении долгов' });
  }
});

// Получить долг по ID
router.get('/:id', auth, admin, async (req, res) => {
  try {
    const debt = await Debt.findById(req.params.id);
    if (!debt) {
      return res.status(404).json({ error: 'Долг не найден' });
    }
    return res.json(debt);
  } catch (error) {
    console.error('Error fetching debt:', error);
    return res.status(500).json({ error: 'Ошибка при получении долга' });
  }
});

// Создать новый долг
router.post('/', auth, admin, async (req, res) => {
  try {
    const debtData = {
      ...req.body,
      createdBy: (req as any).user.id
    };
    
    const debt = new Debt(debtData);
    await debt.save();
    return res.status(201).json(debt);
  } catch (error) {
    console.error('Error creating debt:', error);
    return res.status(500).json({ error: 'Ошибка при создании долга' });
  }
});

// Обновить долг
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const debt = await Debt.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!debt) {
      return res.status(404).json({ error: 'Долг не найден' });
    }
    return res.json(debt);
  } catch (error) {
    console.error('Error updating debt:', error);
    return res.status(500).json({ error: 'Ошибка при обновлении долга' });
  }
});

// Частичная оплата долга
router.patch('/:id/pay', auth, admin, async (req, res) => {
  try {
    const { amount } = req.body;
    
    console.log('💰 Получен запрос на оплату долга:', {
      debtId: req.params.id,
      amount,
      body: req.body
    });
    
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      console.log('❌ Некорректная сумма платежа:', amount);
      return res.status(400).json({ error: 'Некорректная сумма платежа' });
    }

    // Ищем долг только по полю id
    const debt = await Debt.findOne({ id: req.params.id });
    
    console.log('🔍 Результат поиска долга:', debt ? {
      _id: debt._id,
      id: debt.id,
      amount: debt.amount,
      paidAmount: debt.paidAmount,
      remainingAmount: debt.remainingAmount,
      status: debt.status
    } : 'Долг не найден');
    
    if (!debt) {
      return res.status(404).json({ error: 'Долг не найден' });
    }

    if (amount > debt.remainingAmount) {
      console.log('❌ Сумма платежа превышает остаток:', {
        payment: amount,
        remaining: debt.remainingAmount
      });
      return res.status(400).json({ 
        error: `Сумма платежа (${amount}) не может быть больше оставшейся суммы долга (${debt.remainingAmount})`
      });
    }

    // Обновляем суммы
    debt.paidAmount += amount;
    debt.remainingAmount -= amount;

    // Обновляем статус
    const oldStatus = debt.status;
    if (debt.remainingAmount === 0) {
      debt.status = 'paid';
    } else if (debt.paidAmount > 0) {
      debt.status = 'partially_paid';
    }

    // Сохраняем изменения
    await debt.save();

    // Создаем запись о списании из наличных кассы
    try {
      // Генерируем уникальный ID для платежа
      const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      const cashExpense = new Payment({
        id: paymentId,
        type: 'наличные', // Тип платежного средства
        category: 'Оплата долга поставщику',
        amount: -Math.abs(amount), // Расходы должны быть отрицательными
        date: new Date(),
        description: (() => {
          // Формируем описание с перечислением товаров
          const itemsDescription = debt.items.map(item => {
            let itemDesc = `${item.productName}`;
            
            // Добавляем количество если больше 1
            if (item.quantity > 1) {
              itemDesc += ` (${item.quantity} шт.)`;
            }
            
            // Добавляем серийные номера если есть
            if (item.serialNumbers && item.serialNumbers.length > 0) {
              itemDesc += ` [S/N: ${item.serialNumbers.join(', ')}]`;
            }
            
            // Добавляем штрих-код если есть
            if (item.barcode) {
              itemDesc += ` [ШК: ${item.barcode}]`;
            }
            
            return itemDesc;
          }).join('; ');
          
          return `Оплата долга поставщику "${debt.supplierName}": ${itemsDescription} (${new Date(debt.date).toLocaleDateString('ru-RU')})`;
        })(),
        paymentMethod: 'наличные',
        apiType: 'expense', // Это расход - будет преобразован в отрицательную сумму в UI
        supplierId: debt.supplierId,
        supplierName: debt.supplierName,
        debtId: debt.id,
        notes: (() => {
          const itemsList = debt.items.map(item => {
            let details = `• ${item.productName} - ${item.quantity} шт. по ${item.costPrice.toLocaleString('ru-RU')} ₽`;
            if (item.serialNumbers && item.serialNumbers.length > 0) {
              details += ` (S/N: ${item.serialNumbers.join(', ')})`;
            }
            if (item.barcode) {
              details += ` (ШК: ${item.barcode})`;
            }
            return details;
          }).join('\n');
          
          return `Оплата долга на сумму ${amount.toLocaleString('ru-RU')} ₽. Приход от ${new Date(debt.date).toLocaleDateString('ru-RU')}.\n\nТовары:\n${itemsList}`;
        })(),
        inCashRegister: true, // Наличные расходы в кассе по умолчанию
        cashRegisterDate: new Date(), // Дата постановки в кассу
        createdBy: (req as any).user.id
      });

      await cashExpense.save();
      
      console.log('💰 Создана запись о списании из кассы:', {
        paymentId: paymentId,
        mongoId: cashExpense._id,
        amount: amount,
        supplier: debt.supplierName,
        debtId: debt.id
      });
    } catch (error) {
      console.error('⚠️ Ошибка при создании записи о списании из кассы:', error);
      // Не прерываем выполнение, так как долг уже оплачен
    }

    console.log('✅ Долг успешно обновлен:', {
      _id: debt._id,
      id: debt.id,
      payment: amount,
      oldStatus,
      newStatus: debt.status,
      oldPaid: debt.paidAmount - amount,
      newPaid: debt.paidAmount,
      oldRemaining: debt.remainingAmount + amount,
      newRemaining: debt.remainingAmount
    });

    return res.json(debt);
  } catch (error) {
    console.error('❌ Ошибка при оплате долга:', error);
    return res.status(500).json({ error: 'Ошибка при оплате долга' });
  }
});

// Удалить долг
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    // Сначала найдем долг для получения информации
    const debt = await Debt.findById(req.params.id);
    if (!debt) {
      return res.status(404).json({ error: 'Долг не найден' });
    }

    console.log('🗑️ Удаление долга:', {
      debtId: debt._id?.toString(),
      debtIdField: debt.id,
      supplier: debt.supplierName,
      amount: debt.amount,
      paidAmount: debt.paidAmount
    });

    // Удаляем связанные платежи (оплаты этого долга)
    const deletedPayments = await Payment.deleteMany({ 
      $or: [
        { debtId: (debt._id as any)?.toString() },
        { debtId: debt.id }
      ]
    });
    
    if (deletedPayments.deletedCount > 0) {
      console.log(`🗑️ Удалено ${deletedPayments.deletedCount} связанных платежей для долга ${debt.id}`);
    }

    // Если долг был частично оплачен, возвращаем деньги в кассу
    if (debt.paidAmount > 0) {
      try {
        // Генерируем уникальный ID для возвратного платежа
        const refundPaymentId = `refund_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        
        const refundPayment = new Payment({
          id: refundPaymentId,
          type: 'income',
          category: 'Возврат в кассу',
          amount: debt.paidAmount,
          date: new Date(),
          description: `Возврат в кассу при удалении долга поставщику "${debt.supplierName}"`,
          paymentMethod: 'cash',
          supplierId: debt.supplierId,
          supplierName: debt.supplierName,
          notes: `Возврат ${debt.paidAmount.toLocaleString('ru-RU')} ₽ в кассу при удалении долга от ${new Date(debt.date).toLocaleDateString('ru-RU')}`,
          createdBy: (req as any).user.id
        });

        await refundPayment.save();
        console.log('💰 Создан возврат в кассу на сумму:', debt.paidAmount);
      } catch (error) {
        console.error('⚠️ Ошибка при создании возврата в кассу:', error);
      }
    }

    // Удаляем сам долг
    await Debt.findByIdAndDelete(req.params.id);

    console.log('✅ Долг успешно удален вместе с связанными платежами');
    
    return res.json({ 
      message: 'Долг удален',
      deletedPayments: deletedPayments.deletedCount,
      refundAmount: debt.paidAmount > 0 ? debt.paidAmount : 0
    });
  } catch (error) {
    console.error('Error deleting debt:', error);
    return res.status(500).json({ error: 'Ошибка при удалении долга' });
  }
});

// Получить статистику по долгам
router.get('/stats/summary', auth, admin, async (req, res) => {
  try {
    const stats = await Debt.aggregate([
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$amount' },
          remainingAmount: { $sum: '$remainingAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const summary = {
      totalDebt: 0,
      remainingDebt: 0,
      paidDebt: 0,
      activeDebts: 0,
      overdue: 0
    };

    stats.forEach(stat => {
      summary.totalDebt += stat.totalAmount;
      summary.remainingDebt += stat.remainingAmount;
      
      if (stat._id === 'active' || stat._id === 'partially_paid') {
        summary.activeDebts += stat.count;
      }
      if (stat._id === 'overdue') {
        summary.overdue += stat.count;
      }
    });

    summary.paidDebt = summary.totalDebt - summary.remainingDebt;

    return res.json(summary);
  } catch (error) {
    console.error('Error fetching debt stats:', error);
    return res.status(500).json({ error: 'Ошибка при получении статистики долгов' });
  }
});

export default router; 