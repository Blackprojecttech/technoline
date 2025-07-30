import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ProductView } from '../src/models/ProductView';
import { User } from '../src/models/User';
import { Product } from '../src/models/Product';

dotenv.config();

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/technoline');

async function checkProductViews() {
  try {
    console.log('🔍 Проверка записей о просмотрах товаров...\n');

    // Получаем общее количество записей
    const totalViews = await ProductView.countDocuments();
    console.log(`📊 Общее количество записей о просмотрах: ${totalViews}`);

    if (totalViews === 0) {
      console.log('❌ Записей о просмотрах товаров не найдено');
      return;
    }

    // Получаем последние 10 записей
    const recentViews = await ProductView.find()
      .sort({ viewedAt: -1 })
      .limit(10)
      .populate('userId', 'firstName lastName email')
      .populate('productId', 'name price');

    console.log('\n📋 Последние 10 записей о просмотрах:');
    recentViews.forEach((view, index) => {
      const user = view.userId as any;
      const product = view.productId as any;
      console.log(`${index + 1}. Пользователь: ${user ? `${user.firstName} ${user.lastName} (${user.email})` : 'Неизвестный'}`);
      console.log(`   Товар: ${product ? product.name : 'Удаленный товар'}`);
      console.log(`   Дата: ${view.viewedAt.toLocaleString('ru-RU')}`);
      console.log(`   IP: ${view.ip || 'Не указан'}`);
      console.log('');
    });

    // Статистика по пользователям
    const userStats = await ProductView.aggregate([
      {
        $group: {
          _id: '$userId',
          viewCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          firstName: '$user.firstName',
          lastName: '$user.lastName',
          email: '$user.email',
          viewCount: 1
        }
      },
      {
        $sort: { viewCount: -1 }
      }
    ]);

    console.log('👥 Статистика по пользователям:');
    userStats.forEach((stat, index) => {
      console.log(`${index + 1}. ${stat.firstName} ${stat.lastName} (${stat.email}): ${stat.viewCount} просмотров`);
    });

  } catch (error) {
    console.error('❌ Ошибка при проверке:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkProductViews(); 