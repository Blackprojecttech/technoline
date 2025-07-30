import express from 'express';
import { ClientRecord } from '../models/ClientRecord';
import { Payment } from '../models/Payment';
import { auth } from '../middleware/auth';
import { admin } from '../middleware/admin';

const router = express.Router();

// Получить все записи
router.get('/', auth, admin, async (req, res) => {
  try {
    const { status, search } = req.query;
    
    let query: any = { isDebt: true };
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { clientName: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const records = await ClientRecord.find(query).sort({ date: -1 });
    return res.json(records);
  } catch (error) {
    console.error('Error fetching client records:', error);
    return res.status(500).json({ error: 'Ошибка при получении записей' });
  }
});

// Создать новую запись
router.post('/', auth, admin, async (req, res) => {
  try {
    const recordData = {
      id: `CD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...req.body,
      isDebt: true,
      debtPaid: false,
      paidAmount: 0,
      remainingAmount: req.body.amount,
      createdBy: (req as any).user.id,
      status: 'active',
      date: new Date()
    };
    
    const record = new ClientRecord(recordData);
    await record.save();

    // Создаем запись в истории платежей
    const payment = new Payment({
      id: `PMT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'client_record',
      amount: record.amount,
      description: `ДОЛГ: "${record.clientName}"${record.notes ? ` (${record.notes})` : ''}`,
      date: record.date,
      debtId: record.id,
      status: 'active',
      adminName: (req as any).user.name || (req as any).user.email,
      apiType: 'expense',
      inCashRegister: 'debt', // Специальное значение для отображения "ДОЛГ" в колонке "В кассе"
      cashRegisterDate: new Date(),
      supplier: 'Долг'
    });
    await payment.save();

    return res.status(201).json(record);
  } catch (error) {
    console.error('Error creating client record:', error);
    return res.status(500).json({ error: 'Ошибка при создании записи' });
  }
});

// Частичная оплата записи
router.patch('/:id/pay', auth, admin, async (req, res) => {
  try {
    const { paymentAmount } = req.body;
    const record = await ClientRecord.findOne({ id: req.params.id });
    
    if (!record) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    // Проверяем сумму оплаты
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ error: 'Некорректная сумма оплаты' });
    }

    if (paymentAmount > record.remainingAmount) {
      return res.status(400).json({ error: 'Сумма оплаты превышает оставшуюся сумму долга' });
    }

    // Обновляем запись
    record.paidAmount += paymentAmount;
    if (record.paidAmount >= record.amount) {
      record.status = 'paid';
      record.debtPaid = true;
    }
    await record.save();

    // Создаем запись в истории платежей (возврат в кассу)
    const payment = new Payment({
      id: `PMT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'наличные', // Тип меняется на наличные при оплате
      amount: paymentAmount,
      description: `ДОЛГ: "${record.clientName}"${record.notes ? ` (${record.notes})` : ''}`,
      date: new Date(),
      debtId: record.id,
      status: 'active',
      adminName: (req as any).user.name || (req as any).user.email,
      apiType: 'income',
      inCashRegister: 'yes', // В кассе
      cashRegisterDate: new Date(),
      supplier: 'Долг'
    });
    await payment.save();

    // Обновляем тип в исходной записи
    await Payment.updateOne(
      { debtId: record.id, type: 'client_record' },
      { $set: { type: 'наличные' } }
    );

    return res.json(record);
  } catch (error) {
    console.error('Error updating client record payment:', error);
    return res.status(500).json({ error: 'Ошибка при обновлении оплаты' });
  }
});

// Удалить запись
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const record = await ClientRecord.findOneAndDelete({ id: req.params.id });
    
    if (!record) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    // Удаляем все связанные платежи
    await Payment.deleteMany({ debtId: record.id });

    return res.json({ message: 'Запись удалена' });
  } catch (error) {
    console.error('Error deleting client record:', error);
    return res.status(500).json({ error: 'Ошибка при удалении записи' });
  }
});

export default router; 