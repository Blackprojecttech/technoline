import express from 'express';
import {
  getProducts,
  getProduct,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  getProductsByCategory
} from '../controllers/productController';
import { auth, adminOnly } from '../middleware/auth';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { ProductView } from '../models/ProductView';

const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/category/:categorySlug', getProductsByCategory);
router.get('/slug/:slug', getProductBySlug);
router.get('/:id', getProduct);

// Admin routes
router.post('/', auth, adminOnly, createProduct);
router.put('/:id', auth, adminOnly, updateProduct);
router.delete('/:id', auth, adminOnly, deleteProduct);

// Track product view
router.post('/:id/view', auth, async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = (req as any).user.id;
    
    // Проверяем, что товар существует
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Товар не найден' });
    }
    
    // Создаем запись о просмотре
    await ProductView.create({
      userId,
      productId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return res.json({ message: 'Просмотр зафиксирован' });
  } catch (error) {
    console.error('Error tracking product view:', error);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
});

export default router; 