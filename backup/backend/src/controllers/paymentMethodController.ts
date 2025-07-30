import PaymentMethod from '../models/PaymentMethod';
import { Request, Response } from 'express';

export const getAllPaymentMethods = async (req: Request, res: Response) => {
  const methods = await PaymentMethod.find();
  return res.json({ paymentMethods: methods });
};

export const getPaymentMethod = async (req: Request, res: Response) => {
  const method = await PaymentMethod.findById(req.params.id);
  if (!method) return res.status(404).json({ message: 'Способ оплаты не найден' });
  return res.json({ paymentMethod: method });
};

export const createPaymentMethod = async (req: Request, res: Response) => {
  const method = new PaymentMethod(req.body);
  await method.save();
  return res.status(201).json({ paymentMethod: method });
};

export const updatePaymentMethod = async (req: Request, res: Response) => {
  const method = await PaymentMethod.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!method) return res.status(404).json({ message: 'Способ оплаты не найден' });
  return res.json({ paymentMethod: method });
};

export const deletePaymentMethod = async (req: Request, res: Response) => {
  const method = await PaymentMethod.findByIdAndDelete(req.params.id);
  if (!method) return res.status(404).json({ message: 'Способ оплаты не найден' });
  return res.json({ message: 'Способ оплаты удалён' });
};

// Получить способы оплаты по способу доставки
export const getPaymentMethodsByDelivery = async (req: Request, res: Response) => {
  try {
    const { deliveryMethodId } = req.params;
    
    // Находим способы оплаты, которые привязаны к данному способу доставки
    const paymentMethods = await PaymentMethod.find({
      isActive: true,
      $or: [
        { deliveryTypes: { $in: [deliveryMethodId] } }, // Привязанные к конкретному способу доставки
        { deliveryTypes: { $size: 0 } } // Или доступные для всех способов доставки (пустой массив)
      ]
    }).sort({ name: 1 });
    
    return res.json({ paymentMethods });
  } catch (error) {
    console.error('Ошибка при получении способов оплаты по доставке:', error);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
}; 