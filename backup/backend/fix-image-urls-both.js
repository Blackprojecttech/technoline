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

async function fixImageUrlsForBoth() {
  try {
    console.log('🔄 Исправление URL изображений для локальной и localtunnel работы...');
    
    // Получаем все товары
    const products = await Product.find({});
    console.log(`📦 Найдено товаров: ${products.length}`);
    
    for (const product of products) {
      let updated = false;
      
      // Исправляем mainImage - возвращаем к localhost для локальной работы
      if (product.mainImage && product.mainImage.includes('technoline-api.loca.lt')) {
        product.mainImage = product.mainImage.replace('https://technoline-api.loca.lt', 'http://localhost:5002');
        updated = true;
      }
      
      // Исправляем images - возвращаем к localhost для локальной работы
      if (product.images && product.images.length > 0) {
        product.images = product.images.map(img => 
          img.includes('technoline-api.loca.lt') ? img.replace('https://technoline-api.loca.lt', 'http://localhost:5002') : img
        );
        updated = true;
      }
      
      if (updated) {
        await product.save();
        console.log(`✅ Исправлены URL для товара "${product.name}" (локальные)`);
      }
    }
    
    console.log('🎉 Все URL изображений исправлены для локальной работы!');
    console.log('💡 Для localtunnel нужно будет обновить frontend для замены URL');
    
  } catch (error) {
    console.error('❌ Ошибка при исправлении URL:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixImageUrlsForBoth(); 