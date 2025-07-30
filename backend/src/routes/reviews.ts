import express from 'express';
import Review from '../models/Review';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { auth, AuthRequest } from '../middleware/auth';
import { uploadMultiple } from '../middleware/upload';
import { Request } from 'express';
import Notification from '../models/Notification';

// Функция для преобразования относительных путей в абсолютные URL
function makeFullUrl(req: Request, path: string) {
  if (!path) return path;
  if (path.startsWith('http')) return path;
  
  // Определяем протокол с учетом прокси (Nginx)
  const protocol = req.get('X-Forwarded-Proto') || req.protocol;
  const host = req.get('X-Forwarded-Host') || req.get('host');
  
  // В продакшене всегда используем HTTPS
  const finalProtocol = process.env.NODE_ENV === 'production' ? 'https' : protocol;
  
  const base = finalProtocol + '://' + host;
  return base + path;
}
function transformReviewImages(req: Request, review: any) {
  if (Array.isArray(review.images)) {
    review.images = review.images.map((img: string) => makeFullUrl(req, img));
  }
  return review;
}

const router = express.Router();

// Получить все отзывы (для админки)
router.get('/', async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('product', 'name slug')
      .populate('user', 'firstName lastName email');
    const transformed = reviews.map(r => transformReviewImages(req, r.toObject()));
    res.json(transformed);
    return;
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
    return;
  }
});

// Получить отзывы для товара (только одобренные, либо все если all=1)
router.get('/product/:productId', async (req, res) => {
  try {
    const filter: any = { product: req.params.productId };
    if (!req.query.all) filter.isApproved = true;
    const reviews = await Review.find(filter)
      .populate('user', 'firstName lastName');
    const transformed = reviews.map(r => transformReviewImages(req, r.toObject()));
    res.json(transformed);
    return;
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
    return;
  }
});

// Одобрить/скрыть отзыв (модерация)
router.patch('/:id/approve', auth, async (req, res) => {
  try {
    const { isApproved } = req.body;
    const review = await Review.findByIdAndUpdate(req.params.id, { $set: { isApproved } }, { new: true })
      .populate('product', 'name slug')
      .populate('user', 'firstName lastName email');
    if (review && review.user) {
      let productName = typeof review.product === 'object' && review.product && 'name' in review.product ? review.product.name : 'Товар';
      // Берём slug только из product.slug, если его нет — генерируем на лету из названия, если не удалось — подставляем 'unknown'
      let productSlug: string;
      if (
        review.product && typeof review.product === 'object' &&
        ('slug' in review.product) && typeof (review.product as any).slug === 'string' && (review.product as any).slug
      ) {
        productSlug = (review.product as any).slug;
      } else if (
        review.product && typeof review.product === 'object' &&
        ('name' in review.product) && typeof (review.product as any).name === 'string' && (review.product as any).name
      ) {
        productSlug = (review.product as any).name
          .toLowerCase()
          .replace(/[а-яё]/g, function(char: string) {
            const map: { [key: string]: string } = { 'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'c','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'};
            return map[char] || char;
          })
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '');
      } else {
        productSlug = 'unknown';
      }
      let text = isApproved
        ? `Ваш отзыв на товар "${productName}" опубликован!`
        : `Ваш отзыв на товар "${productName}" был скрыт модератором.`;
      let type = isApproved ? 'review_published' : 'review_moderated';
      let link = `/product/${productSlug}`;
      await Notification.create({
        user: review.user._id || review.user,
        type,
        text,
        link
      });
    }
    res.json(review);
    return;
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
    return;
  }
});

// Add review
router.post('/', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) { res.status(401).json({ message: 'Нет авторизации' }); return; }
    const { product, rating, text, authorName, createdAt } = req.body;
    if (!product || !rating || !text) { res.status(400).json({ message: 'Не все поля заполнены' }); return; }
    let createdDate = createdAt && /^\d{4}-\d{2}-\d{2}$/.test(createdAt) ? createdAt : new Date().toISOString().slice(0, 10);
    const review = await Review.create({
      product,
      user: req.user._id,
      authorName: authorName || (req.user.firstName + ' ' + req.user.lastName),
      rating,
      text,
      status: 'new',
      isApproved: false,
      createdAt: createdDate
    });
    const populated = await Review.findById(review._id)
      .populate('product', 'name slug')
      .populate('user', 'firstName lastName email');
    if (!populated) { res.status(404).json({ message: 'Отзыв не найден' }); return; }
    res.status(201).json(transformReviewImages(req, populated.toObject()));
    return;
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
    return;
  }
});

// Загрузка фото к отзыву
router.post('/:id/upload-image', auth, uploadMultiple, async (req, res) => {
  try {
    const reviewId = req.params.id;
    if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
      res.status(400).json({ message: 'Файлы не были загружены' });
      return;
    }
    const fileUrls = req.files.map((file: any) => `/uploads/${file.filename}`);
    // Добавляем фото к images
    const review = await Review.findByIdAndUpdate(
      reviewId,
      { $push: { images: { $each: fileUrls } } },
      { new: true }
    );
    if (!review) { res.status(404).json({ message: 'Отзыв не найден' }); return; }
    res.json(transformReviewImages(req, review.toObject()));
    return;
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при загрузке фото' });
    return;
  }
});

// Update review
router.put('/:reviewId', auth, async (req, res) => {
  try {
    const update: any = {};
    if (typeof req.body.text === 'string') update.text = req.body.text;
    if (typeof req.body.rating === 'number' || typeof req.body.rating === 'string') update.rating = Number(req.body.rating);
    if (typeof req.body.authorName === 'string') update.authorName = req.body.authorName;
    if (typeof req.body.answer === 'string') update.answer = req.body.answer;
    if (typeof req.body.status === 'string') update.status = req.body.status; // <--- добавлено
    if (req.body.createdAt && /^\d{4}-\d{2}-\d{2}$/.test(req.body.createdAt)) {
      update.createdAt = req.body.createdAt;
    }
    if (req.body.product) update.product = req.body.product; // <--- добавлено
    if (req.body.user) update.user = req.body.user;           // <--- добавлено
    console.log('Обновление отзыва', req.params.reviewId, 'body:', req.body, 'update:', update);
    let review = await Review.findByIdAndUpdate(req.params.reviewId, update, { new: true });
    if (!review) { res.status(404).json({ message: 'Отзыв не найден' }); return; }
    review = await Review.findById(review._id)
      .populate('product', 'name slug')
      .populate('user', 'firstName lastName email');
    if (!review) { res.status(404).json({ message: 'Отзыв не найден (populate)' }); return; }
    res.json(transformReviewImages(req, review.toObject()));
    return;
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
    return;
  }
});

// Delete review
router.delete('/:reviewId', auth, async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.reviewId);
    if (!review) {
      res.status(404).json({ message: 'Отзыв не найден' });
      return;
    }
    res.json({ message: 'Отзыв удалён', review });
    return;
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
    return;
  }
});

export default router; 