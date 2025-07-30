import express from 'express';
import { auth, adminOnly } from '../middleware/auth';

const router = express.Router();

// Временное хранилище для шаблонов услуг (в будущем можно заменить на MongoDB)
let serviceTemplates: Array<{
  id: string;
  name: string;
  price: number;
  costPrice: number;
  createdAt: string;
}> = [];

// GET /api/service-templates - получить все шаблоны услуг
router.get('/', auth, adminOnly, (req, res) => {
  try {
    console.log('📋 Запрос списка шаблонов услуг, найдено:', serviceTemplates.length);
    res.json(serviceTemplates);
  } catch (error) {
    console.error('Ошибка при получении шаблонов услуг:', error);
    res.status(500).json({ message: 'Ошибка при получении шаблонов услуг' });
    return;
  }
});

// POST /api/service-templates - добавить новые шаблоны услуг
router.post('/', auth, adminOnly, (req, res) => {
  try {
    const { templates } = req.body;
    
    if (!Array.isArray(templates)) {
      res.status(400).json({ message: 'Поле templates должно быть массивом' });
      return;
    }
    
    // Фильтруем только новые уникальные названия
    const newTemplates = templates.filter(template => 
      template.name && 
      template.name.trim() && 
      !serviceTemplates.find(existing => existing.name === template.name.trim())
    );
    
    // Добавляем новые шаблоны
    serviceTemplates.push(...newTemplates);
    
    console.log('✅ Добавлены новые шаблоны услуг:', newTemplates.map(t => t.name));
    console.log('📋 Всего шаблонов услуг:', serviceTemplates.length);
    
    res.json({ 
      message: 'Шаблоны услуг сохранены',
      added: newTemplates.length,
      total: serviceTemplates.length
    });
  } catch (error) {
    console.error('Ошибка при сохранении шаблонов услуг:', error);
    res.status(500).json({ message: 'Ошибка при сохранении шаблонов услуг' });
    return;
  }
});

// DELETE /api/service-templates/:id - удалить шаблон услуги
router.delete('/:id', auth, adminOnly, (req, res) => {
  try {
    const { id } = req.params;
    const initialLength = serviceTemplates.length;
    
    serviceTemplates = serviceTemplates.filter(template => template.id !== id);
    
    if (serviceTemplates.length < initialLength) {
      console.log('🗑️ Удален шаблон услуги с ID:', id);
      res.json({ message: 'Шаблон услуги удален' });
    } else {
      res.status(404).json({ message: 'Шаблон услуги не найден' });
      return;
    }
  } catch (error) {
    console.error('Ошибка при удалении шаблона услуги:', error);
    res.status(500).json({ message: 'Ошибка при удалении шаблона услуги' });
    return;
  }
});

export default router; 