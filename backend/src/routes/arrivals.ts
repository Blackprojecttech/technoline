import express from 'express';
import { Arrival, IArrival } from '../models/Arrival';
import { Debt } from '../models/Debt';
import { Payment } from '../models/Payment';
import { Receipt } from '../models/Receipt';
import { auth } from '../middleware/auth';
import { admin } from '../middleware/admin';
import { Types } from 'mongoose';
import { eventController } from '../controllers/eventController';

const router = express.Router();

// Получить все приходы
router.get('/', auth, admin, async (req, res) => {
  try {
    const { supplierId, dateFrom, dateTo, search } = req.query;
    
    let query: any = {};
    if (supplierId) {
      query.supplierId = supplierId;
    }
    if (dateFrom && dateTo) {
      query.date = {
        $gte: new Date(dateFrom as string),
        $lte: new Date(dateTo as string)
      };
    }
    if (search) {
      query.$or = [
        { supplierName: { $regex: search, $options: 'i' } },
        { 'items.productName': { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const arrivals = await Arrival.find(query).sort({ date: -1 });
    return res.json(arrivals);
  } catch (error) {
    console.error('Error fetching arrivals:', error);
    return res.status(500).json({ error: 'Ошибка при получении приходов' });
  }
});

// Получить приход по ID
router.get('/:id', auth, admin, async (req, res) => {
  try {
    const arrival = await Arrival.findById(req.params.id);
    if (!arrival) {
      return res.status(404).json({ error: 'Приход не найден' });
    }
    return res.json(arrival);
  } catch (error) {
    console.error('Error fetching arrival:', error);
    return res.status(500).json({ error: 'Ошибка при получении прихода' });
  }
});

// Создать новый приход
router.post('/', auth, admin, async (req, res) => {
  try {
    const arrivalData = {
      ...req.body,
      createdBy: (req as any).user.id
    };
    
    const arrival = await (new Arrival(arrivalData)).save();

    // Отправляем события о новых товарах
    arrival.items.forEach(item => {
      if (item.serialNumbers && item.serialNumbers.length > 0) {
        // Для товаров с серийными номерами отправляем каждый отдельно
        item.serialNumbers.forEach(serialNumber => {
          console.log(`📤 Sending event for product with serial number: ${serialNumber}`);
          eventController.sendEvent({
            type: 'productAdded',
            product: {
              arrivalId: arrival._id,
              productName: item.productName,
              serialNumber,
              price: item.price,
              costPrice: item.costPrice,
              isAccessory: item.isAccessory,
              isService: item.isService,
              supplierId: arrival.supplierId,
              supplierName: arrival.supplierName,
              barcode: item.barcode,
              addedAt: new Date().toISOString() // Добавляем timestamp для уникальности
            }
          });
        });
      } else {
        // Для аксессуаров и услуг отправляем общее количество
        console.log(`📤 Sending event for accessory/service: ${item.productName}`);
        eventController.sendEvent({
          type: 'productAdded',
          product: {
            arrivalId: arrival._id,
            productName: item.productName,
            price: item.price,
            costPrice: item.costPrice,
            isAccessory: item.isAccessory,
            isService: item.isService,
            supplierId: arrival.supplierId,
            supplierName: arrival.supplierName,
            barcode: item.barcode,
            quantity: item.quantity,
            addedAt: new Date().toISOString() // Добавляем timestamp для уникальности
          }
        });
      }
    });

    // Создаем долг для прихода
    // Считаем сумму только для товаров и услуг с закупочной ценой > 0
    const totalAmount = (arrival.items || []).reduce((sum, item) => {
      // Для услуг учитываем только если есть закупочная цена
      if (item.isService && (!item.costPrice || item.costPrice <= 0)) {
        return sum;
      }
      return sum + (item.costPrice * item.quantity);
    }, 0);
    
    const dueDate = new Date(arrival.date);
    dueDate.setDate(dueDate.getDate() + 4); // Срок оплаты через 4 дня

    // Создаем долг если есть поставщик и есть товары/услуги с закупочной ценой
    if (arrival.supplierId && arrival.supplierName && totalAmount > 0) {
      const debt = new Debt({
        id: `debt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        arrivalId: arrival._id instanceof Types.ObjectId ? arrival._id.toString() : arrival._id,
        supplierId: arrival.supplierId,
        supplierName: arrival.supplierName,
        amount: totalAmount,
        paidAmount: 0,
        remainingAmount: totalAmount,
        date: arrival.date,
        dueDate: dueDate,
        status: 'active',
        notes: `Долг по приходу от ${new Date(arrival.date).toLocaleDateString('ru-RU')} (${arrival.items.filter(item => !item.isService || (item.costPrice && item.costPrice > 0)).map(item => item.productName).join(', ')})`,
        items: arrival.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          costPrice: item.costPrice,
          isAccessory: item.isAccessory,
          isService: item.isService,
          serialNumbers: item.serialNumbers || [],
          barcode: item.barcode
        })),
        createdBy: (req as any).user.id
      });

             await debt.save();
     }
    
    return res.status(201).json(arrival);
  } catch (error) {
    console.error('Error creating arrival:', error);
    return res.status(500).json({ error: 'Ошибка при создании прихода' });
  }
});

// Обновить приход
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const oldArrival = await Arrival.findById(req.params.id);
    if (!oldArrival) {
      return res.status(404).json({ error: 'Приход не найден' });
    }

    const arrivalId = oldArrival._id instanceof Types.ObjectId ? oldArrival._id.toString() : oldArrival._id;

    // Проверяем, какие товары удаляются при обновлении
    const newItems = req.body.items || [];
    const receiptsWithThisArrival = await Receipt.find({
      'items.arrivalId': arrivalId
    });

    if (receiptsWithThisArrival.length > 0) {
      // Собираем информацию о конфликтных товарах
      const conflicts = [];
      
      // Проверяем каждый товар из чеков
      for (const receipt of receiptsWithThisArrival) {
        for (const receiptItem of receipt.items) {
          if (receiptItem.arrivalId === arrivalId) {
            // Проверяем, есть ли этот товар в новой версии прихода
            const stillExists = newItems.some((newItem: any) => {
              if (receiptItem.serialNumber) {
                // Для товаров с серийными номерами
                return newItem.productName === receiptItem.productName &&
                       newItem.serialNumbers && 
                       newItem.serialNumbers.includes(receiptItem.serialNumber);
              } else {
                // Для аксессуаров и услуг
                return newItem.productName === receiptItem.productName &&
                       newItem.isAccessory === receiptItem.isAccessory &&
                       newItem.isService === receiptItem.isService &&
                       (newItem.quantity || 0) >= (receiptItem.quantity || 1);
              }
            });

            if (!stillExists) {
              const itemDescription = receiptItem.serialNumber 
                ? `"${receiptItem.productName}" (S/N: ${receiptItem.serialNumber})`
                : `"${receiptItem.productName}" (${receiptItem.quantity} шт.)`;
                
              conflicts.push(`• ${itemDescription} → чек ${receipt.receiptNumber}`);
            }
          }
        }
      }
      
      if (conflicts.length > 0) {
        const errorMessage = `Нельзя изменить приход, так как следующие товары уже проданы:\n\n${conflicts.join('\n')}\n\nЭти товары нельзя удалять или изменять, пока не будут удалены соответствующие чеки.`;
        
        return res.status(400).json({
          error: errorMessage
        });
      }
    }

    const arrival = await Arrival.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!arrival) {
      return res.status(404).json({ error: 'Приход не найден' });
    }

    // Отправляем события об удалении старых товаров
    oldArrival.items.forEach(item => {
      if (item.serialNumbers && item.serialNumbers.length > 0) {
        item.serialNumbers.forEach(serialNumber => {
          console.log(`📤 Sending removal event for old product: ${serialNumber}`);
          eventController.sendEvent({
            type: 'productRemoved',
            product: {
              arrivalId: oldArrival._id,
              productName: item.productName,
              serialNumber,
              price: item.price,
              costPrice: item.costPrice,
              isAccessory: item.isAccessory,
              isService: item.isService,
              supplierId: oldArrival.supplierId,
              supplierName: oldArrival.supplierName,
              barcode: item.barcode,
              removedAt: new Date().toISOString()
            }
          });
        });
      } else {
        console.log(`📤 Sending removal event for old accessory/service: ${item.productName}`);
        eventController.sendEvent({
          type: 'productRemoved',
          product: {
            arrivalId: oldArrival._id,
            productName: item.productName,
            price: item.price,
            costPrice: item.costPrice,
            isAccessory: item.isAccessory,
            isService: item.isService,
            supplierId: oldArrival.supplierId,
            supplierName: oldArrival.supplierName,
            barcode: item.barcode,
            quantity: item.quantity,
            removedAt: new Date().toISOString()
          }
        });
      }
    });

    // Отправляем события о новых товарах
    arrival.items.forEach(item => {
      if (item.serialNumbers && item.serialNumbers.length > 0) {
        item.serialNumbers.forEach(serialNumber => {
          console.log(`📤 Sending addition event for updated product: ${serialNumber}`);
          eventController.sendEvent({
            type: 'productAdded',
            product: {
              arrivalId: arrival._id,
              productName: item.productName,
              serialNumber,
              price: item.price,
              costPrice: item.costPrice,
              isAccessory: item.isAccessory,
              isService: item.isService,
              supplierId: arrival.supplierId,
              supplierName: arrival.supplierName,
              barcode: item.barcode,
              addedAt: new Date().toISOString()
            }
          });
        });
      } else {
        console.log(`📤 Sending addition event for updated accessory/service: ${item.productName}`);
        eventController.sendEvent({
          type: 'productAdded',
          product: {
            arrivalId: arrival._id,
            productName: item.productName,
            price: item.price,
            costPrice: item.costPrice,
            isAccessory: item.isAccessory,
            isService: item.isService,
            supplierId: arrival.supplierId,
            supplierName: arrival.supplierName,
            barcode: item.barcode,
            quantity: item.quantity,
            addedAt: new Date().toISOString()
          }
        });
      }
    });

    // Обновляем связанный долг
    const existingDebt = await Debt.findOne({ arrivalId });
    
    if (existingDebt) {
      // Пересчитываем общую сумму долга
      const totalAmount = (arrival.items || []).reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
      
      // Обновляем долг, сохраняя paidAmount
      const newRemainingAmount = totalAmount - existingDebt.paidAmount;
      
      await Debt.findByIdAndUpdate(existingDebt._id, {
        amount: totalAmount,
        remainingAmount: Math.max(0, newRemainingAmount),
        notes: `Долг по приходу от ${new Date(arrival.date).toLocaleDateString('ru-RU')} (${arrival.items.map(item => item.productName).join(', ')})`,
        items: arrival.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          costPrice: item.costPrice,
          isAccessory: item.isAccessory,
          isService: item.isService,
          serialNumbers: item.serialNumbers || [],
          barcode: item.barcode
        }))
      });
      
      console.log(`📝 Обновлен долг для прихода ${arrivalId}: ${totalAmount} ₽`);
    }

    return res.json(arrival);
  } catch (error) {
    console.error('Error updating arrival:', error);
    return res.status(500).json({ error: 'Ошибка при обновлении прихода' });
  }
});

// Очистить все приходы (только для админов и бухгалтеров) - ДОЛЖНО БЫТЬ ПЕРЕД /:id
router.delete('/clear-all', auth, admin, async (req, res) => {
  try {
    console.log('🗑️ Запрос на удаление всех приходов от пользователя:', (req as any).user);
    
    // Дополнительная проверка роли
    const userRole = (req as any).user.role;
    if (userRole !== 'admin' && userRole !== 'accountant') {
      return res.status(403).json({ error: 'Только администратор или бухгалтер может очищать все записи' });
    }

    // Получаем количество приходов перед удалением
    const arrivalsCount = await Arrival.countDocuments();
    
    // Получаем количество связанных долгов
    const debtsCount = await Debt.countDocuments();
    
    // Удаляем все приходы
    const arrivalsResult = await Arrival.deleteMany({});
    
    // Удаляем все связанные долги
    const debtsResult = await Debt.deleteMany({});
    
    console.log(`🗑️ Удалено ${arrivalsResult.deletedCount} приходов из ${arrivalsCount}`);
    console.log(`🗑️ Удалено ${debtsResult.deletedCount} долгов из ${debtsCount}`);
    
    return res.json({ 
      message: 'Все приходы и связанные долги удалены',
      deletedCount: arrivalsResult.deletedCount,
      totalCount: arrivalsCount,
      deletedDebts: debtsResult.deletedCount,
      totalDebts: debtsCount
    });
  } catch (error) {
    console.error('Error clearing all arrivals:', error);
    return res.status(500).json({ error: 'Ошибка при удалении всех приходов' });
  }
});

// Удалить приход
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const arrival = await Arrival.findById(req.params.id) as IArrival | null;
    if (!arrival) {
      return res.status(404).json({ error: 'Приход не найден' });
    }

    // Преобразуем ID прихода в строку
    const deleteArrivalId: string = arrival._id.toString();

    // Проверяем, есть ли чеки с товарами из этого прихода
    const receiptsWithThisArrival = await Receipt.find({
      'items.arrivalId': deleteArrivalId,
      // Исключаем отмененные и удаленные чеки
      status: { $nin: ['cancelled', 'deleted'] }
    });

    // Проверяем, есть ли покупки, связанные с этим приходом
    const purchases = (req.body?.purchases || []) as Array<{ arrivalId?: string; productName: string }>;
    const purchaseWithThisArrival = purchases.find(p => p.arrivalId === deleteArrivalId);
    
    if (purchaseWithThisArrival) {
      return res.status(400).json({
        error: `Нельзя удалить приход, так как он связан с покупкой "${purchaseWithThisArrival.productName}". Сначала удалите покупку на странице "Расчеты" -> "Покупки".`
      });
    }

    if (receiptsWithThisArrival.length > 0) {
      // Собираем детальную информацию о товарах в чеках
      const conflictDetails = [];
      
      for (const receipt of receiptsWithThisArrival) {
        const itemsFromThisArrival = receipt.items.filter(item => item.arrivalId === deleteArrivalId);
        
        for (const item of itemsFromThisArrival) {
          const itemDescription = item.serialNumber 
            ? `"${item.productName}" (S/N: ${item.serialNumber})`
            : `"${item.productName}" (${item.quantity} шт.)`;
            
          conflictDetails.push(`• ${itemDescription} → чек ${receipt.receiptNumber}`);
        }
      }
      
      const errorMessage = `Нельзя удалить приход, так как следующие товары из него используются в активных чеках:\n\n${conflictDetails.join('\n')}\n\nЧтобы удалить приход, необходимо сначала отменить или удалить все чеки, в которых используются товары из этого прихода.`;
      
      return res.status(400).json({ 
        error: errorMessage
      });
    }

    // Отправляем события об удалении товаров
    arrival.items.forEach(item => {
      if (item.serialNumbers && item.serialNumbers.length > 0) {
        // Для товаров с серийными номерами отправляем каждый отдельно
        item.serialNumbers.forEach(serialNumber => {
          console.log(`📤 Sending removal event for product with serial number: ${serialNumber}`);
          eventController.sendEvent({
            type: 'productRemoved',
            product: {
              arrivalId: arrival._id,
              productName: item.productName,
              serialNumber,
              price: item.price,
              costPrice: item.costPrice,
              isAccessory: item.isAccessory,
              isService: item.isService,
              supplierId: arrival.supplierId,
              supplierName: arrival.supplierName,
              barcode: item.barcode,
              removedAt: new Date().toISOString()
            }
          });
        });
      } else {
        // Для аксессуаров и услуг отправляем событие об удалении
        console.log(`📤 Sending removal event for accessory/service: ${item.productName}`);
        eventController.sendEvent({
          type: 'productRemoved',
          product: {
            arrivalId: arrival._id,
            productName: item.productName,
            price: item.price,
            costPrice: item.costPrice,
            isAccessory: item.isAccessory,
            isService: item.isService,
            supplierId: arrival.supplierId,
            supplierName: arrival.supplierName,
            barcode: item.barcode,
            quantity: item.quantity,
            removedAt: new Date().toISOString()
          }
        });
      }
    });
    
    // Проверяем связанный долг перед удалением
    const debt = await Debt.findOne({ arrivalId: deleteArrivalId });
    let needsCashRefund = false;
    let refundAmount = 0;
    
    if (debt && debt.paidAmount > 0) {
      needsCashRefund = true;
      refundAmount = debt.paidAmount;
      console.log(`💰 Найден оплаченный долг на сумму ${refundAmount} ₽, требуется возврат в кассу`);
    }

    // Удаляем приход
    await Arrival.findByIdAndDelete(req.params.id);

    // Удаляем связанные платежи по этому долгу (расходы за оплату долга)
    const deletedPayments = await Payment.deleteMany({ 
      $or: [
        { debtId: debt?._id?.toString() },
        { arrivalId: deleteArrivalId }
      ]
    });
    
    if (deletedPayments.deletedCount > 0) {
      console.log(`🗑️ Удалено ${deletedPayments.deletedCount} связанных платежей для прихода ${deleteArrivalId}`);
    }

    // Удаляем связанный долг
    if (debt) {
      await Debt.deleteOne({ _id: debt._id });
      console.log(`🗑️ Удален долг ${debt._id} для прихода ${deleteArrivalId}`);
    }

    // Если был оплаченный долг, создаем возвратный платеж для пополнения кассы
    if (needsCashRefund && refundAmount > 0) {
      try {
        // Генерируем уникальный ID для возвратного платежа
        const refundPaymentId = `arrival_refund_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        
        const refundPayment = new Payment({
          id: refundPaymentId,
          type: 'наличные', // ✅ Используем русское значение из enum схемы
          apiType: 'income', // ✅ Правильное поле для типа операции
          category: 'Возврат за удаленный приход',
          amount: refundAmount,
          date: new Date(),
          description: `Возврат в кассу после удаления прихода от ${new Date(arrival.date).toLocaleDateString('ru-RU')} (${arrival.supplierName || 'Поставщик не указан'})`,
          paymentMethod: 'наличные', // ✅ Используем русское значение
          inCashRegister: true, // ✅ Возврат попадает в кассу
          cashRegisterDate: new Date(), // ✅ Дата поступления в кассу
          supplierId: arrival.supplierId,
          supplierName: arrival.supplierName,
          arrivalId: deleteArrivalId,
          notes: `Автоматический возврат ${refundAmount.toLocaleString('ru-RU')} ₽ в кассу после удаления оплаченного прихода`,
          createdBy: (req as any).user?.id
        });
        
        await refundPayment.save();
        console.log(`💰 Создан возвратный платеж на сумму ${refundAmount} ₽:`, {
          paymentId: refundPayment._id,
          amount: refundAmount,
          supplier: arrival.supplierName,
          arrivalId: deleteArrivalId
        });
        
        // Отправляем событие об удалении прихода для обновления покупок
        eventController.sendEvent({
          type: 'arrivalDeleted',
          arrivalId: deleteArrivalId,
          supplierName: arrival.supplierName,
          deletedAt: new Date().toISOString()
        });

        return res.json({ 
          message: 'Приход удален', 
          refund: {
            amount: refundAmount,
            description: `Возвращено в кассу ${refundAmount.toLocaleString('ru-RU')} ₽`
          }
        });
      } catch (refundError) {
        console.error('⚠️ Ошибка при создании возвратного платежа:', refundError);
        // Не прерываем выполнение, так как приход и долг уже удалены
        // Отправляем событие об удалении прихода для обновления покупок
        eventController.sendEvent({
          type: 'arrivalDeleted',
          arrivalId: deleteArrivalId,
          supplierName: arrival.supplierName,
          deletedAt: new Date().toISOString()
        });

        return res.json({ 
          message: 'Приход удален', 
          warning: 'Ошибка при создании возвратного платежа в кассу'
        });
      }
    }

    // Отправляем событие об удалении прихода для обновления покупок
    eventController.sendEvent({
      type: 'arrivalDeleted',
      arrivalId: deleteArrivalId,
      supplierName: arrival.supplierName,
      deletedAt: new Date().toISOString()
    });

    return res.json({ message: 'Приход удален' });
  } catch (error) {
    console.error('Error deleting arrival:', error);
    return res.status(500).json({ error: 'Ошибка при удалении прихода' });
  }
});

// Получить доступные товары для чека
router.get('/available-products', auth, admin, async (req, res) => {
  try {
    const { search } = req.query;
    const searchTerm = (search as string || '').toLowerCase();
    console.log('🔍 Searching for products with term:', searchTerm);

    // Получаем все приходы
    const arrivals = await Arrival.find({}).sort({ date: -1 });
    console.log(`📦 Found ${arrivals.length} arrivals`);
    
    // Собираем все доступные товары
    const availableProducts = [];
    
    for (const arrival of arrivals) {
      console.log(`🔄 Processing arrival ${arrival._id}`);
      for (const item of arrival.items) {
        if (item.serialNumbers && item.serialNumbers.length > 0) {
          // Для товаров с серийными номерами
          console.log(`📱 Processing item with serial numbers: ${item.productName}`);
          for (const serialNumber of item.serialNumbers) {
            if (
              !searchTerm || 
              serialNumber.toLowerCase() === searchTerm ||
              item.productName.toLowerCase().includes(searchTerm) ||
              (item.barcode && item.barcode.toLowerCase().includes(searchTerm))
            ) {
              console.log(`✅ Adding product with serial number: ${serialNumber}`);
              availableProducts.push({
                arrivalId: arrival._id,
                productName: item.productName,
                serialNumber,
                price: item.price,
                costPrice: item.costPrice,
                isAccessory: item.isAccessory,
                isService: item.isService,
                supplierId: arrival.supplierId,
                supplierName: arrival.supplierName,
                barcode: item.barcode
              });
            }
          }
        } else {
          // Для аксессуаров и услуг
          console.log(`🎁 Processing accessory/service: ${item.productName}`);
          if (
            !searchTerm || 
            item.productName.toLowerCase().includes(searchTerm) ||
            (item.barcode && item.barcode.toLowerCase().includes(searchTerm))
          ) {
            console.log(`✅ Adding accessory/service: ${item.productName}`);
            availableProducts.push({
              arrivalId: arrival._id,
              productName: item.productName,
              price: item.price,
              costPrice: item.costPrice,
              isAccessory: item.isAccessory,
              isService: item.isService,
              supplierId: arrival.supplierId,
              supplierName: arrival.supplierName,
              barcode: item.barcode,
              quantity: item.quantity
            });
          }
        }
      }
    }

    console.log(`📊 Total available products found: ${availableProducts.length}`);
    return res.json(availableProducts);
  } catch (error) {
    console.error('❌ Error fetching available products:', error);
    return res.status(500).json({ error: 'Ошибка при получении доступных товаров' });
  }
});

export default router; 