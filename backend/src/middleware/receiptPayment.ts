import { Request, Response, NextFunction } from 'express';
import { Payment } from '../models/Payment';

export const handleReceiptPayment = async (req: Request, res: Response, next: NextFunction) => {
  const originalEnd = res.end;
  const chunks: Buffer[] = [];

  // Перехватываем ответ
  res.end = function (chunk?: any) {
    if (chunk) {
      chunks.push(Buffer.from(chunk));
    }
    
    // Восстанавливаем оригинальный буфер
    const body = Buffer.concat(chunks).toString('utf8');
    let receipt;
    
    try {
      receipt = JSON.parse(body);
      
      // Если это создание чека и сумма положительная
      if (receipt && receipt.total > 0) {
        // Создаем платеж для чека
        const payment = new Payment({
          type: 'income',
          apiType: 'income',
          category: 'Продажа',
          amount: receipt.total,
          date: receipt.date,
          description: `Чек ${receipt.receiptNumber}`,
          paymentMethod: receipt.paymentMethod,
          notes: receipt.notes,
          inCashRegister: receipt.payments?.[0]?.inCashRegister,
          cashRegisterDate: receipt.payments?.[0]?.cashRegisterDate,
          createdBy: receipt.createdBy
        });
        
        payment.save().catch(error => {
          console.error('Ошибка при создании платежа для чека:', error);
        });
      }
    } catch (error) {
      console.error('Ошибка при обработке ответа:', error);
    }

    // Вызываем оригинальный метод end
    return originalEnd.apply(res, arguments as any);
  };

  next();
}; 