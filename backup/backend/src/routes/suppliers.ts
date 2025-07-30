import express from 'express';
import { Supplier } from '../models/Supplier';
import { auth } from '../middleware/auth';
import { admin } from '../middleware/admin';

const router = express.Router();

// Получить всех поставщиков
router.get('/', auth, admin, async (req, res) => {
  try {
    const { status, search } = req.query;
    
    let query: any = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const suppliers = await Supplier.find(query).sort({ createdAt: -1 });
    res.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: 'Ошибка при получении поставщиков' });
  }
});

// Получить поставщика по ID
router.get('/:id', auth, admin, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: 'Поставщик не найден' });
    }
    return res.json(supplier);
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return res.status(500).json({ error: 'Ошибка при получении поставщика' });
  }
});

// Создать нового поставщика
router.post('/', auth, admin, async (req, res) => {
  try {
    console.log('📝 Creating supplier with data:', req.body);
    const supplier = new Supplier(req.body);
    console.log('📝 Supplier model created, saving...');
    await supplier.save();
    console.log('✅ Supplier saved successfully:', supplier._id);
    return res.status(201).json(supplier);
  } catch (error) {
    console.error('❌ Error creating supplier:', error);
    console.error('❌ Error details:', (error as Error).message);
    return res.status(500).json({ error: 'Ошибка при создании поставщика' });
  }
});

// Обновить поставщика
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!supplier) {
      return res.status(404).json({ error: 'Поставщик не найден' });
    }
    return res.json(supplier);
  } catch (error) {
    console.error('Error updating supplier:', error);
    return res.status(500).json({ error: 'Ошибка при обновлении поставщика' });
  }
});

// Удалить поставщика
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: 'Поставщик не найден' });
    }
    return res.json({ message: 'Поставщик удален' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return res.status(500).json({ error: 'Ошибка при удалении поставщика' });
  }
});

export default router; 