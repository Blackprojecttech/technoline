import express from 'express';
import { Receipt } from '../models/Receipt';
import { Payment } from '../models/Payment';
import { Arrival } from '../models/Arrival';
import { auth } from '../middleware/auth';
import { admin } from '../middleware/admin';

const router = express.Router();

// Получить все чеки
router.get('/', auth, admin, async (req, res) => {
  try {
    const { status, dateFrom, dateTo, search, paymentMethod } = req.query;
    
    let query: any = {};
    if (status && status !== 'all') {
      query.status = status;
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
        { receiptNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { 'items.productName': { $regex: search, $options: 'i' } }
      ];
    }

    const receipts = await Receipt.find(query).sort({ date: -1 });
    return res.json(receipts);
  } catch (error) {
    console.error('Error fetching receipts:', error);
    return res.status(500).json({ error: 'Ошибка при получении чеков' });
  }
});

// Получить чек по ID
router.get('/:id', auth, admin, async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ error: 'Чек не найден' });
    }
    return res.json(receipt);
  } catch (error) {
    console.error('Error fetching receipt:', error);
    return res.status(500).json({ error: 'Ошибка при получении чека' });
  }
});

// Создать новый чек
router.post('/', auth, admin, async (req, res) => {
  try {
    console.log('🧾 POST /api/receipts - Создание чека:', {
      isDebt: req.body.isDebt,
      customerName: req.body.customerName,
      total: req.body.total
    });

    // Проверяем существование всех товаров в приходах
    if (req.body.items && req.body.items.length > 0) {
      const unavailableItems = [];
      
      for (const item of req.body.items) {
        if (item.arrivalId) {
          const arrival = await Arrival.findById(item.arrivalId);
          if (!arrival) {
            const itemDescription = item.serialNumber 
              ? `"${item.productName}" (S/N: ${item.serialNumber})`
              : `"${item.productName}" (${item.quantity} шт.)`;
            
            unavailableItems.push(`• ${itemDescription} - приход был удален`);
            continue;
          }

          // Проверяем, есть ли товар в приходе
          const arrivalItem = arrival.items.find(arrItem => {
            if (item.serialNumber) {
              // Для товаров с серийными номерами
              return arrItem.productName === item.productName && 
                     arrItem.serialNumbers && 
                     arrItem.serialNumbers.includes(item.serialNumber);
            } else {
              // Для аксессуаров и услуг
              return arrItem.productName === item.productName &&
                     arrItem.isAccessory === item.isAccessory &&
                     arrItem.isService === item.isService;
            }
          });

          if (!arrivalItem) {
            const itemDescription = item.serialNumber 
              ? `"${item.productName}" (S/N: ${item.serialNumber})`
              : `"${item.productName}" (${item.quantity} шт.)`;
            
            unavailableItems.push(`• ${itemDescription} - товар отсутствует в приходе`);
          } else {
            // Дополнительные проверки для обнаружения изменений в приходе
            
            // Проверяем цены - они должны совпадать с актуальными в приходе
            if (Math.abs(arrivalItem.price - item.price) > 0.01) {
              const itemDescription = item.serialNumber 
                ? `"${item.productName}" (S/N: ${item.serialNumber})`
                : `"${item.productName}"`;
              
              unavailableItems.push(`• ${itemDescription} - цена изменилась (была: ${item.price} ₽, стала: ${arrivalItem.price} ₽)`);
            }
            
            // Проверяем себестоимость
            if (Math.abs(arrivalItem.costPrice - item.costPrice) > 0.01) {
              const itemDescription = item.serialNumber 
                ? `"${item.productName}" (S/N: ${item.serialNumber})`
                : `"${item.productName}"`;
              
              unavailableItems.push(`• ${itemDescription} - себестоимость изменилась (была: ${item.costPrice} ₽, стала: ${arrivalItem.costPrice} ₽)`);
            }
            
            // Для аксессуаров и услуг проверяем доступное количество
            if (!item.serialNumber && (item.isAccessory || item.isService)) {
              if (arrivalItem.quantity < item.quantity) {
                unavailableItems.push(`• "${item.productName}" - недостаточное количество (доступно: ${arrivalItem.quantity}, требуется: ${item.quantity})`);
              }
            }
            
            // Проверяем, что поставщик не изменился
            if (arrivalItem.supplierId && item.supplierId && arrivalItem.supplierId !== item.supplierId) {
              const itemDescription = item.serialNumber 
                ? `"${item.productName}" (S/N: ${item.serialNumber})`
                : `"${item.productName}"`;
              
              unavailableItems.push(`• ${itemDescription} - поставщик изменился в приходе`);
            }
          }
        } else {
          // Товар без arrivalId
          const itemDescription = item.serialNumber 
            ? `"${item.productName}" (S/N: ${item.serialNumber})`
            : `"${item.productName}" (${item.quantity} шт.)`;
          
          unavailableItems.push(`• ${itemDescription} - товар не привязан к приходу`);
        }
      }
      
      if (unavailableItems.length > 0) {
        const errorMessage = `Невозможно создать чек. Данные товаров изменились:\n\n${unavailableItems.join('\n')}\n\nОбновите информацию о товарах или пересоздайте чек с актуальными данными.`;
        
        return res.status(400).json({ 
          error: errorMessage
        });
      }
    }

    // Генерируем номер чека
    const lastReceipt = await Receipt.findOne().sort({ createdAt: -1 });
    const lastNumber = lastReceipt?.receiptNumber 
      ? parseInt(lastReceipt.receiptNumber.replace('R-', '')) 
      : 0;
    const receiptNumber = `R-${String(lastNumber + 1).padStart(6, '0')}`;

    const receiptData = {
      ...req.body,
      receiptNumber,
      createdBy: (req as any).user.id
    };
    
    const receipt = new Receipt(receiptData);
    await receipt.save();

    // Логируем создание чека в долг
    if (receipt.isDebt) {
      const customerName = receipt.customerName || 'Клиент (имя не указано)';
      
      // Формируем описание товаров с серийными номерами для логирования
      const itemsDescription = receipt.items.map(item => {
        let description = `${item.productName}`;
        if (item.serialNumber) {
          description += ` (S/N: ${item.serialNumber})`;
        }
        return description;
      }).join(', ');
      
      console.log(`💰 Создан долг для чека ${receiptNumber}:`, {
        customerName: customerName,
        amount: receipt.total,
        items: itemsDescription
      });
    }

    return res.status(201).json(receipt);
  } catch (error) {
    console.error('Error creating receipt:', error);
    return res.status(500).json({ error: 'Ошибка при создании чека' });
  }
});

// Обновить чек
router.put('/:id', auth, admin, async (req, res) => {
  try {
    // Получаем старый чек для сравнения
    const oldReceipt = await Receipt.findById(req.params.id);
    if (!oldReceipt) {
      return res.status(404).json({ error: 'Чек не найден' });
    }

    // Обновляем чек
    const receipt = await Receipt.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // Если чек отменяется (status меняется на 'cancelled'), удаляем связанные платежи
    const wasCancelled = oldReceipt.status !== 'cancelled' && req.body.status === 'cancelled';
    if (wasCancelled) {
      console.log(`🗑️ Чек ${receipt!.receiptNumber} отменяется, удаляем связанные платежи...`);
      
      // Удаляем платежи, связанные с этим чеком из коллекции payments
      const deletedPayments = await Payment.deleteMany({ 
        $or: [
          { description: { $regex: `Чек ${receipt!.receiptNumber}` } },
          { id: { $regex: `^receipt_${req.params.id}_` } }
        ]
      });
      
      if (deletedPayments.deletedCount > 0) {
        console.log(`🗑️ Удалено ${deletedPayments.deletedCount} связанных платежей для отмененного чека ${receipt!.receiptNumber}`);
      }
    }

    return res.json(receipt);
  } catch (error) {
    console.error('Error updating receipt:', error);
    return res.status(500).json({ error: 'Ошибка при обновлении чека' });
  }
});

// Очистить все чеки (только для админов и бухгалтеров) - ДОЛЖНО БЫТЬ ПЕРЕД /:id
router.delete('/clear-all', auth, admin, async (req, res) => {
  try {
    console.log('🗑️ Запрос на удаление всех чеков от пользователя:', (req as any).user);
    
    // Дополнительная проверка роли
    const userRole = (req as any).user.role;
    if (userRole !== 'admin' && userRole !== 'accountant') {
      return res.status(403).json({ error: 'Только администратор или бухгалтер может очищать все записи' });
    }

    // Получаем количество чеков перед удалением
    const count = await Receipt.countDocuments();
    
    // Удаляем все чеки
    const result = await Receipt.deleteMany({});
    
    console.log(`🗑️ Удалено ${result.deletedCount} чеков из ${count}`);
    
    return res.json({ 
      message: 'Все чеки удалены',
      deletedCount: result.deletedCount,
      totalCount: count
    });
  } catch (error) {
    console.error('Error clearing all receipts:', error);
    return res.status(500).json({ error: 'Ошибка при удалении всех чеков' });
  }
});

// Удалить чек
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const receipt = await Receipt.findByIdAndDelete(req.params.id);
    if (!receipt) {
      return res.status(404).json({ error: 'Чек не найден' });
    }
    return res.json({ message: 'Чек удален' });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    return res.status(500).json({ error: 'Ошибка при удалении чека' });
  }
});

// Получить статистику по чекам
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

    const stats = await Receipt.aggregate([
      { $match: { status: 'completed', ...dateFilter } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$total' },
          totalReceipts: { $sum: 1 },
          averageCheck: { $avg: '$total' }
        }
      }
    ]);

    return res.json(stats[0] || { totalSales: 0, totalReceipts: 0, averageCheck: 0 });
  } catch (error) {
    console.error('Error fetching receipt stats:', error);
    return res.status(500).json({ error: 'Ошибка при получении статистики' });
  }
});

// Инкассация наличных платежей
router.patch('/incassate', auth, admin, async (req, res) => {
  try {
    const { receiptIds } = req.body;
    
    if (!receiptIds || !Array.isArray(receiptIds)) {
      return res.status(400).json({ error: 'Необходимо указать массив ID чеков' });
    }

    console.log('🏦 Инкассация чеков:', receiptIds);

    // Сначала проверим, что у нас есть в базе
    const receiptsBeforeUpdate = await Receipt.find({ _id: { $in: receiptIds } });
    console.log('🏦 Чеки перед инкассацией:');
    receiptsBeforeUpdate.forEach(r => {
      console.log(`  Чек ${r.receiptNumber} (${r._id}):`);
      r.payments.forEach((p, index) => {
        console.log(`    Платеж ${index + 1}: ${p.method} ${p.amount}₽, inCashRegister: ${p.inCashRegister}, cashRegisterDate: ${p.cashRegisterDate}`);
      });
    });

    // Обновляем все наличные платежи в указанных чеках
    const result = await Receipt.updateMany(
      { 
        _id: { $in: receiptIds }
      },
      { 
        $set: { 
          'payments.$[elem].inCashRegister': false
        },
        $unset: {
          'payments.$[elem].cashRegisterDate': ""
        }
      },
      {
        arrayFilters: [{ 
          'elem.method': 'cash',
          'elem.inCashRegister': true
        }]
      }
    );

    console.log('🏦 Результат инкассации:', result);

    // Проверяем, что изменения действительно сохранились
    const updatedReceipts = await Receipt.find({ _id: { $in: receiptIds } });
    console.log('🏦 Проверка обновленных чеков:');
    updatedReceipts.forEach(r => {
      console.log(`  Чек ${r.receiptNumber} (${r._id}):`);
      r.payments.forEach((p, index) => {
        console.log(`    Платеж ${index + 1}: ${p.method} ${p.amount}₽, inCashRegister: ${p.inCashRegister}, cashRegisterDate: ${p.cashRegisterDate}`);
      });
    });

    return res.json({ 
      message: 'Инкассация выполнена',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error during incassation:', error);
    return res.status(500).json({ error: 'Ошибка при инкассации' });
  }
});

export default router; 