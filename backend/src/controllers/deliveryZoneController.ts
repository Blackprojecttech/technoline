import { Request, Response } from 'express';
import DeliveryZone, { IDeliveryZone } from '../models/DeliveryZone';

// Получить все зоны
export const getAllZones = async (req: Request, res: Response) => {
  try {
    const zones = await DeliveryZone.find().sort({ sortOrder: 1, name: 1 });
    return res.json({ zones });
  } catch (error) {
    return res.status(500).json({ message: 'Ошибка при получении зон доставки' });
  }
};

// Создать зону
export const createZone = async (req: Request, res: Response) => {
  try {
    const { key, name, price, sortOrder } = req.body;
    if (!key || !name || price === undefined) {
      return res.status(400).json({ message: 'Необходимо указать key, name и price' });
    }
    const zone = new DeliveryZone({ key, name, price, sortOrder });
    await zone.save();
    return res.status(201).json(zone);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Зона с таким ключом уже существует' });
    }
    return res.status(500).json({ message: 'Ошибка при создании зоны', error: error.message });
  }
};

// Обновить зону
export const updateZone = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { key, name, price, sortOrder } = req.body;
    const zone = await DeliveryZone.findByIdAndUpdate(
      id,
      { key, name, price, sortOrder },
      { new: true, runValidators: true }
    );
    if (!zone) return res.status(404).json({ message: 'Зона не найдена' });
    return res.json(zone);
  } catch (error) {
    return res.status(500).json({ message: 'Ошибка при обновлении зоны' });
  }
};

// Удалить зону
export const deleteZone = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const zone = await DeliveryZone.findByIdAndDelete(id);
    if (!zone) return res.status(404).json({ message: 'Зона не найдена' });
    return res.json({ message: 'Зона успешно удалена' });
  } catch (error) {
    return res.status(500).json({ message: 'Ошибка при удалении зоны' });
  }
}; 