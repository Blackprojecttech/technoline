import axios from 'axios';
import { Parser } from 'xml2js';
import cron from 'node-cron';
import { Category } from '../models/Category';
import { Product } from '../models/Product';

interface YMLOffer {
  $: {
    id: string;
    available?: string;
  };
  name: string;
  categoryId: string;
  price: string;
  currencyId: string;
  description?: string;
  picture?: string[];
  param?: Array<{
    $: { name: string };
    _: string;
  }>;
}

interface YMLCategory {
  $: {
    id: string;
    parentId?: string;
  };
  _: string;
}

interface YMLCatalog {
  shop: {
    name: string;
    company: string;
    url: string;
    currencies: {
      currency: Array<{
        $: { id: string; rate?: string };
      }>;
    };
    categories: {
      category: YMLCategory[];
    };
    offers: {
      offer: YMLOffer[];
    };
  };
}

class SyncService {
  private parser: Parser;
  private ymlUrl: string;
  private isDemoMode: boolean = false;

  constructor() {
    this.parser = new Parser({ explicitArray: false });
    this.ymlUrl = 'https://techno-line.store/export/yandex_market/33821/259caaea';
  }

  // Запуск синхронизации раз в час
  startSync() {
    console.log('🔄 Starting automatic sync service...');
    
    // Проверяем доступность MongoDB
    this.checkDatabaseConnection();
    
    // Запускаем синхронизацию сразу при старте
    this.syncProducts();
    
    // Запускаем синхронизацию каждый час
    cron.schedule('0 * * * *', () => {
      console.log('⏰ Running scheduled sync...');
      this.syncProducts();
    });
  }

  // Проверка подключения к базе данных
  private async checkDatabaseConnection() {
    try {
      // Проверяем, подключена ли MongoDB
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        this.isDemoMode = false;
        console.log('✅ Database connection available');
      } else {
        this.isDemoMode = true;
        console.log('⚠️ Running in demo mode without database');
      }
    } catch (error) {
      this.isDemoMode = true;
      console.log('⚠️ Running in demo mode without database');
    }
  }

  // Основной метод синхронизации
  async syncProducts() {
    try {
      console.log('📥 Fetching YML data from:', this.ymlUrl);
      
      const response = await axios.get(this.ymlUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TechnoLineSync/1.0)'
        }
      });

      const xmlData = response.data;
      const result = await this.parser.parseStringPromise(xmlData);
      const catalog: YMLCatalog = result.yml_catalog;

      console.log('📊 Parsed YML data:', {
        shopName: catalog.shop.name,
        categoriesCount: catalog.shop.categories.category?.length || 0,
        offersCount: catalog.shop.offers.offer?.length || 0
      });

      if (this.isDemoMode) {
        console.log('📝 Demo mode: Parsing completed, data not saved to database');
        return;
      }

      // Синхронизируем категории
      await this.syncCategories(catalog.shop.categories.category || []);
      
      // Синхронизируем товары
      await this.syncOffers(catalog.shop.offers.offer || []);

      console.log('✅ Sync completed successfully');
    } catch (error) {
      console.error('❌ Sync failed:', error);
    }
  }

  // Синхронизация категорий
  async syncCategories(ymlCategories: YMLCategory[]) {
    if (this.isDemoMode) {
      console.log('📝 Demo mode: Skipping category sync');
      return;
    }

    console.log('🔄 Syncing categories...');
    
    for (const ymlCategory of ymlCategories) {
      try {
        const categoryData = {
          ymlId: ymlCategory.$.id,
          name: ymlCategory._,
          slug: this.generateSlug(ymlCategory._),
          parentId: ymlCategory.$.parentId || null,
          description: '',
          image: '',
          isActive: true
        };

        // Проверяем, существует ли категория
        let category = await Category.findOne({ ymlId: categoryData.ymlId });
        
        if (category) {
          // Обновляем существующую категорию
          await Category.updateOne(
            { ymlId: categoryData.ymlId },
            { $set: categoryData }
          );
          console.log(`📝 Updated category: ${categoryData.name}`);
        } else {
          // Создаем новую категорию
          category = new Category(categoryData);
          await category.save();
          console.log(`➕ Created category: ${categoryData.name}`);
        }
      } catch (error) {
        console.error(`❌ Error syncing category ${ymlCategory._}:`, error);
      }
    }
  }

  // Синхронизация товаров
  async syncOffers(ymlOffers: YMLOffer[]) {
    if (this.isDemoMode) {
      console.log('📝 Demo mode: Skipping product sync');
      return;
    }

    console.log('🔄 Syncing products...');
    
    for (const ymlOffer of ymlOffers) {
      try {
        const productData = {
          ymlId: ymlOffer.$.id,
          name: ymlOffer.name,
          slug: this.generateSlug(ymlOffer.name),
          description: ymlOffer.description || '',
          price: parseFloat(ymlOffer.price),
          currency: ymlOffer.currencyId,
          categoryId: ymlOffer.categoryId,
          images: ymlOffer.picture ? (Array.isArray(ymlOffer.picture) ? ymlOffer.picture : [ymlOffer.picture]) : [],
          isAvailable: ymlOffer.$.available !== 'false',
          sku: ymlOffer.$.id,
          specifications: ymlOffer.param ? ymlOffer.param.map(param => ({
            name: param.$.name,
            value: param._
          })) : [],
          isActive: true
        };

        // Проверяем, существует ли товар
        let product = await Product.findOne({ ymlId: productData.ymlId });
        
        if (product) {
          // Обновляем существующий товар
          await Product.updateOne(
            { ymlId: productData.ymlId },
            { $set: productData }
          );
          console.log(`📝 Updated product: ${productData.name}`);
        } else {
          // Создаем новый товар
          product = new Product(productData);
          await product.save();
          console.log(`➕ Created product: ${productData.name}`);
        }
      } catch (error) {
        console.error(`❌ Error syncing product ${ymlOffer.name}:`, error);
      }
    }
  }

  // Генерация slug из названия
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^а-яa-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  // Ручной запуск синхронизации
  async manualSync() {
    console.log('🔄 Manual sync started...');
    await this.syncProducts();
  }
}

export const syncService = new SyncService(); 