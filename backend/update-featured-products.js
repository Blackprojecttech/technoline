const mongoose = require('mongoose');

// Подключение к MongoDB
mongoose.connect('mongodb://localhost:27017/technoline-store', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Схема товара
const productSchema = new mongoose.Schema({
  name: String,
  slug: String,
  description: String,
  price: Number,
  costPrice: Number,
  currency: String,
  sku: String,
  categoryId: {
    _id: String,
    name: String,
    slug: String
  },
  images: [String],
  mainImage: String,
  isActive: Boolean,
  isFeatured: Boolean,
  inStock: Boolean,
  isAvailable: Boolean,
  stockQuantity: Number,
  tags: [String],
  specifications: [Object],
  createdAt: Date,
  updatedAt: Date
});

const Product = mongoose.model('Product', productSchema);

async function updateFeaturedProducts() {
  try {
    console.log('🔄 Обновление товаров как featured...');
    
    // Получаем все товары
    const products = await Product.find({});
    console.log(`📦 Найдено товаров: ${products.length}`);
    
    // Обновляем первые 3 товара как featured
    const productsToUpdate = products.slice(0, 3);
    
    for (const product of productsToUpdate) {
      await Product.findByIdAndUpdate(product._id, { isFeatured: true });
      console.log(`✅ Товар "${product.name}" помечен как featured`);
    }
    
    console.log('🎉 Все товары обновлены!');
    
  } catch (error) {
    console.error('❌ Ошибка при обновлении товаров:', error);
  } finally {
    mongoose.connection.close();
  }
}

updateFeaturedProducts(); 