import { Request, Response } from 'express';
import { Product, IProduct } from '../models/Product';
import { Category } from '../models/Category';
import mongoose from 'mongoose';

// Функция для генерации уникального SKU
const generateUniqueSku = async (): Promise<string> => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  let sku = `SKU-${timestamp}-${random}`;
  
  // Проверяем, не занят ли SKU
  let attempts = 0;
  while (attempts < 10) {
    const existingProduct = await Product.findOne({ sku });
    if (!existingProduct) {
      return sku;
    }
    // Если SKU занят, генерируем новый
    const newRandom = Math.floor(Math.random() * 1000);
    sku = `SKU-${timestamp}-${newRandom}`;
    attempts++;
  }
  
  // Если не удалось найти уникальный SKU за 10 попыток, добавляем больше случайности
  return `SKU-${timestamp}-${Math.floor(Math.random() * 10000)}`;
};

// Функция для преобразования относительных путей в полные URL
const makeFullUrl = (req: Request, path: string) => {
  if (!path) return path;
  if (path.startsWith('http')) return path;
  return `${req.protocol}://${req.get('host')}${path}`;
};

// Функция для преобразования изображений в товаре
const transformProductImages = (req: Request, product: any) => {
  if (product.mainImage) {
    product.mainImage = makeFullUrl(req, product.mainImage);
  }
  if (product.images && Array.isArray(product.images)) {
    product.images = product.images.map((img: string) => makeFullUrl(req, img));
  }
  return product;
};

// Функция для получения всех дочерних категорий (включая вложенные)
const getAllChildCategoryIds = async (categoryId: string): Promise<string[]> => {
  const childCategories = await Category.find({ parentId: categoryId });
  let allChildIds = childCategories.map((cat: any) => cat._id.toString());
  
  // Рекурсивно получаем дочерние категории для каждой дочерней категории
  for (const childCategory of childCategories) {
    const nestedChildIds = await getAllChildCategoryIds((childCategory as any)._id.toString());
    allChildIds = [...allChildIds, ...nestedChildIds];
  }
  
  return allChildIds;
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const skip = (page - 1) * limit;
    
    const category = req.query.category as string;
    const search = req.query.search as string;
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder as string || 'desc';

    // Build filter
    const filter: any = { isActive: true };
    
    if (category) {
      // Находим категорию по slug
      const categoryDoc = await Category.findOne({ slug: category });
      if (categoryDoc) {
        filter.categoryId = categoryDoc._id;
      }
    }
    
    if (search) {
      filter.$text = { $search: search };
    }
    
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = minPrice;
      if (maxPrice !== undefined) filter.price.$lte = maxPrice;
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(filter)
      .populate('categoryId', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(filter);

    // Преобразуем URL изображений для всех товаров
    const transformedProducts = products.map(product => transformProductImages(req, product.toObject()));

    res.json({
      products: transformedProducts,
      page,
      pages: Math.ceil(total / limit),
      total,
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
export const getProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('categoryId', 'name slug');

    if (product) {
      const transformedProduct = transformProductImages(req, product.toObject());
      res.json(transformedProduct);
    } else {
      res.status(404).json({ message: 'Товар не найден' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// @desc    Get product by slug
// @route   GET /api/products/slug/:slug
// @access  Public
export const getProductBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findOne({ slug: req.params.slug })
      .populate('categoryId', 'name slug');

    if (product) {
      const transformedProduct = transformProductImages(req, product.toObject());
      res.json(transformedProduct);
    } else {
      res.status(404).json({ message: 'Товар не найден' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Creating product with data:', req.body);
    
    // Обрабатываем mainImage - извлекаем URL из объекта
    if (req.body.mainImage && typeof req.body.mainImage === 'object') {
      console.log('Processing mainImage object:', JSON.stringify(req.body.mainImage, null, 2));
      
      // Проверяем различные структуры объекта
      if (req.body.mainImage.file && req.body.mainImage.file.response) {
        // Если есть file.response, извлекаем URL
        const response = req.body.mainImage.file.response;
        if (typeof response === 'string') {
          try {
            const parsed = JSON.parse(response);
            req.body.mainImage = parsed.file?.url || parsed.url || response;
          } catch {
            req.body.mainImage = response;
          }
        } else {
          req.body.mainImage = response.file?.url || response.url || JSON.stringify(response);
        }
      } else if (req.body.mainImage.response) {
        // Если есть response, извлекаем URL
        const response = req.body.mainImage.response;
        if (typeof response === 'string') {
          try {
            const parsed = JSON.parse(response);
            req.body.mainImage = parsed.file?.url || parsed.url || response;
          } catch {
            req.body.mainImage = response;
          }
        } else {
          req.body.mainImage = response.file?.url || response.url || JSON.stringify(response);
        }
      } else if (req.body.mainImage.file) {
        // Если есть только file, извлекаем URL
        const file = req.body.mainImage.file;
        if (file.response) {
          if (typeof file.response === 'string') {
            try {
              const parsed = JSON.parse(file.response);
              req.body.mainImage = parsed.file?.url || parsed.url || file.response;
            } catch {
              req.body.mainImage = file.response;
            }
          } else {
            req.body.mainImage = file.response.file?.url || file.response.url || JSON.stringify(file.response);
          }
        } else {
          req.body.mainImage = file.url || JSON.stringify(file);
        }
      } else {
        // Если ничего не подходит, преобразуем в строку
        req.body.mainImage = JSON.stringify(req.body.mainImage);
      }
    }
    
    // Обрабатываем images - извлекаем URL из объектов
    if (req.body.images && Array.isArray(req.body.images)) {
      req.body.images = req.body.images.map((image: any) => {
        if (typeof image === 'object') {
          if (image.file && image.file.response) {
            const response = image.file.response;
            if (typeof response === 'string') {
              try {
                const parsed = JSON.parse(response);
                return parsed.file?.url || parsed.url || response;
              } catch {
                return response;
              }
            } else {
              return response.file?.url || response.url || JSON.stringify(response);
            }
          } else if (image.response) {
            const response = image.response;
            if (typeof response === 'string') {
              try {
                const parsed = JSON.parse(response);
                return parsed.file?.url || parsed.url || response;
              } catch {
                return response;
              }
            } else {
              return response.file?.url || response.url || JSON.stringify(response);
            }
          } else if (image.file) {
            const file = image.file;
            if (file.response) {
              if (typeof file.response === 'string') {
                try {
                  const parsed = JSON.parse(file.response);
                  return parsed.file?.url || parsed.url || file.response;
                } catch {
                  return file.response;
                }
              } else {
                return file.response.file?.url || file.response.url || JSON.stringify(file.response);
              }
            } else {
              return file.url || JSON.stringify(file);
            }
          } else {
            return JSON.stringify(image);
          }
        }
        return image;
      });
    }
    
    // Генерируем slug из названия, если его нет
    if (!req.body.slug && req.body.name) {
      console.log('Generating slug in backend for:', req.body.name);
      req.body.slug = req.body.name
        .toLowerCase()
        .replace(/[а-яё]/g, (char: string) => {
          const map: { [key: string]: string } = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
            'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
            'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
            'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
            'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
          };
          return map[char] || char;
        })
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
      console.log('Generated slug in backend:', req.body.slug);
    }
    
    // Устанавливаем значения по умолчанию
    if (req.body.isActive === undefined) req.body.isActive = true;
    if (req.body.inStock === undefined) req.body.inStock = true;
    
    // Генерируем SKU, если он не указан
    if (!req.body.sku || req.body.sku.trim() === '') {
      req.body.sku = await generateUniqueSku();
      console.log('Generated SKU:', req.body.sku);
    }
    
    const product = new Product(req.body);
    const createdProduct = await product.save();
    
    const populatedProduct = await Product.findById(createdProduct._id)
      .populate('categoryId', 'name slug');
    
    if (!populatedProduct) {
      res.status(500).json({ message: 'Ошибка при создании товара' });
      return;
    }
    
    const transformedProduct = transformProductImages(req, populatedProduct.toObject());
    res.status(201).json(transformedProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(400).json({ 
      message: 'Ошибка при создании товара',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      // Генерируем slug из названия, если его нет
      if (!req.body.slug && req.body.name) {
        console.log('Generating slug in update for:', req.body.name);
        req.body.slug = req.body.name
          .toLowerCase()
          .replace(/[а-яё]/g, (char: string) => {
            const map: { [key: string]: string } = {
              'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
              'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
              'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
              'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
              'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
            };
            return map[char] || char;
          })
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '');
        console.log('Generated slug in update:', req.body.slug);
      }
      
      // Не преобразуем пути изображений в полные URL - сохраняем как есть
      
      // Генерируем SKU, если он не указан
      if (!req.body.sku || req.body.sku.trim() === '') {
        req.body.sku = await generateUniqueSku();
        console.log('Generated SKU in update:', req.body.sku);
      }
      
      Object.assign(product, req.body);
      const updatedProduct = await product.save();
      
      const populatedUpdatedProduct = await Product.findById(updatedProduct._id)
        .populate('categoryId', 'name slug');
      
      if (!populatedUpdatedProduct) {
        res.status(500).json({ message: 'Ошибка при обновлении товара' });
        return;
      }
      
      const transformedUpdatedProduct = transformProductImages(req, populatedUpdatedProduct.toObject());
      res.json(transformedUpdatedProduct);
    } else {
      res.status(404).json({ message: 'Товар не найден' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Ошибка при обновлении товара' });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      await product.deleteOne();
      res.json({ message: 'Товар удален' });
    } else {
      res.status(404).json({ message: 'Товар не найден' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
export const getFeaturedProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 8;
    
    const products = await Product.find({ 
      isActive: true, 
      isFeatured: true 
    })
      .populate('categoryId', 'name slug')
      .sort({ createdAt: -1 })
      .limit(limit);

    // Преобразуем URL изображений для всех товаров
    const transformedProducts = products.map(product => transformProductImages(req, product.toObject()));

    res.json(transformedProducts);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// @desc    Get products by category
// @route   GET /api/products/category/:categorySlug
// @access  Public
export const getProductsByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const skip = (page - 1) * limit;

    const category = await Category.findOne({ slug: req.params.categorySlug });
    
    if (!category) {
      res.status(404).json({ message: 'Категория не найдена' });
      return;
    }

    // Получаем все дочерние категории
    const childCategoryIds = await getAllChildCategoryIds((category as any)._id.toString());
    
    // Создаем массив ID категорий для поиска (текущая категория + все дочерние)
    const categoryIds = [(category as any)._id, ...childCategoryIds.map(id => new mongoose.Types.ObjectId(id))];

    const products = await Product.find({ 
      categoryId: { $in: categoryIds },
      isActive: true 
    })
      .populate('categoryId', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments({ 
      categoryId: { $in: categoryIds },
      isActive: true 
    });

    // Преобразуем URL изображений для всех товаров
    const transformedProducts = products.map(product => transformProductImages(req, product.toObject()));

    res.json({
      products: transformedProducts,
      category,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('Error in getProductsByCategory:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}; 