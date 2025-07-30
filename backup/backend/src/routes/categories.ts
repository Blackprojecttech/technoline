import express from 'express';
import { Category } from '../models/Category';
import { auth, adminOnly, adminOrAccountant } from '../middleware/auth';

const router = express.Router();

// Get all categories (tree)
router.get('/', async (req, res) => {
  try {
    // Получаем только категории без ymlId (созданные вручную)
    const categories = await Category.find({ 
      isActive: true, 
      ymlId: { $exists: false } 
    }).sort({ sortOrder: 1, name: 1 }).lean();
    
    // Собираем дерево
    type CatWithChildren = typeof categories[0] & { children: any[] };
    const map = new Map<string, CatWithChildren>();
    (categories as any[]).forEach(cat => {
      (cat as CatWithChildren).children = [];
      map.set(cat._id.toString(), cat as CatWithChildren);
    });
    const tree: CatWithChildren[] = [];
    map.forEach(cat => {
      if (cat.parentId && map.has(cat.parentId.toString())) {
        map.get(cat.parentId.toString())!.children.push(cat);
      } else {
        tree.push(cat);
      }
    });
    res.json(tree);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Get category by slug
router.get('/:slug', async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug, isActive: true });
    if (category) {
      res.json(category);
    } else {
      res.status(404).json({ message: 'Категория не найдена' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Admin routes
router.post('/', auth, adminOrAccountant, async (req, res) => {
  try {
    const category = new Category(req.body);
    const createdCategory = await category.save();
    
    res.status(201).json(createdCategory);
  } catch (error) {
    res.status(400).json({ message: 'Ошибка при создании категории' });
  }
});

router.put('/:id', auth, adminOrAccountant, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (category) {
      Object.assign(category, req.body);
      const updatedCategory = await category.save();
      
      res.json(updatedCategory);
    } else {
      res.status(404).json({ message: 'Категория не найдена' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Ошибка при обновлении категории' });
  }
});

router.delete('/:id', auth, adminOrAccountant, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (category) {
      // Рекурсивно удаляем все подкатегории
      const deleteSubcategories = async (parentId: string) => {
        const subcategories = await Category.find({ parentId });
        for (const subcategory of subcategories) {
          await deleteSubcategories((subcategory as any)._id.toString());
          await subcategory.deleteOne();
        }
      };
      
      await deleteSubcategories(req.params.id);
      await category.deleteOne();
      
      res.json({ message: 'Категория и все подкатегории удалены' });
    } else {
      res.status(404).json({ message: 'Категория не найдена' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Move category to new parent
router.post('/:id/move', auth, adminOnly, async (req, res) => {
  try {
    const { parentId } = req.body;
    const category = await Category.findById(req.params.id);
    if (category) {
      category.parentId = parentId || null;
      const updatedCategory = await category.save();
      
      res.json(updatedCategory);
    } else {
      res.status(404).json({ message: 'Категория не найдена' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

export default router; 