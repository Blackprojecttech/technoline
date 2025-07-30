import express from 'express';
import {
  getProducts,
  getProduct,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  getProductsByCategory,
  transformProductImages
} from '../controllers/productController';
import { auth, adminOrAccountant, adminOrModerator } from '../middleware/auth';
import { uploadMultiple } from '../middleware/upload';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { ProductView } from '../models/ProductView';

const router = express.Router();

// Public routes
router.get('/', async (req, res) => {
  const { ids, limit } = req.query;
  if (ids) {
    const idsArray = Array.isArray(ids) ? ids : String(ids).split(',');
    let products = await Product.find({ _id: { $in: idsArray } }).limit(Number(limit) || 100);
    products = products.map(product => transformProductImages(req, product.toObject()));
    return res.json({ products });
  }
  return getProducts(req, res);
});
router.get('/featured', getFeaturedProducts);
router.get('/category/:categorySlug', getProductsByCategory);
router.get('/slug/:slug', getProductBySlug);
router.get('/:id', getProduct);

// Admin routes
router.post('/', auth, adminOrAccountant, uploadMultiple, createProduct);
router.put('/:id', auth, adminOrAccountant, updateProduct);
router.delete('/:id', auth, adminOrAccountant, deleteProduct);

// Validate product IDs (for favorites)
router.post('/validate', async (req, res) => {
  try {
    const { productIds } = req.body;
    
    if (!Array.isArray(productIds)) {
      return res.status(400).json({ message: 'productIds должен быть массивом' });
    }
    
    // Проверяем существование товаров в базе данных
    const validProducts = await Product.find({ 
      _id: { $in: productIds },
      isActive: true // Проверяем, что товар активен
    }).select('_id');
    
    const validIds = validProducts.map(product => (product as any)._id.toString());
    
    return res.json({ validIds });
  } catch (error) {
    console.error('Error validating product IDs:', error);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
});

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