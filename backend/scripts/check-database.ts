import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../src/models/User';
import { Product } from '../src/models/Product';
import { ProductView } from '../src/models/ProductView';

dotenv.config();

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/technoline-store');

async function checkDatabase() {
  try {
    console.log('🔍 Проверка содержимого базы данных...\n');

    // Проверяем пользователей
    const usersCount = await User.countDocuments();
    console.log(`👥 Количество пользователей: ${usersCount}`);

    if (usersCount > 0) {
      const users = await User.find().limit(5);
      console.log('\n📋 Первые 5 пользователей:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
      });
    }

    // Проверяем товары
    const productsCount = await Product.countDocuments();
    console.log(`\n📦 Количество товаров: ${productsCount}`);

    if (productsCount > 0) {
      const products = await Product.find().limit(5);
      console.log('\n📋 Первые 5 товаров:');
      products.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name} (${product.price} ₽)`);
      });
    }

    // Проверяем просмотры
    const viewsCount = await ProductView.countDocuments();
    console.log(`\n👀 Количество просмотров: ${viewsCount}`);

    if (viewsCount > 0) {
      const views = await ProductView.find().limit(5);
      console.log('\n📋 Первые 5 просмотров:');
      views.forEach((view, index) => {
        console.log(`${index + 1}. Пользователь: ${view.userId}, Товар: ${view.productId}, Дата: ${view.viewedAt}`);
      });
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkDatabase(); 