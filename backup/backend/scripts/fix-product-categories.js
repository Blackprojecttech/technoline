const mongoose = require('mongoose');
const path = require('path');

require('ts-node/register');

// Определяем схему Category
const categorySchema = new mongoose.Schema({
  ymlId: String,
  name: String,
  slug: String,
  description: String,
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

// Определяем схему Product
const productSchema = new mongoose.Schema({
  ymlId: String,
  name: String,
  slug: String,
  description: String,
  price: Number,
  costPrice: Number,
  currency: { type: String, default: 'RUR' },
  sku: String,
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  images: [String],
  mainImage: String,
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  inStock: { type: Boolean, default: true },
  isAvailable: { type: Boolean, default: true },
  stockQuantity: { type: Number, default: 0 },
  tags: [String],
  specifications: [{ name: String, value: String }],
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema, 'products');
const Category = mongoose.model('Category', categorySchema, 'categories');

// Подключение к базе данных
mongoose.connect('mongodb://localhost:27017/technoline-store', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function fixProductCategories() {
  try {
    console.log('🔧 Начинаем исправление связей товаров с категориями...');

    // Получаем все товары
    const products = await Product.find({});
    console.log(`📦 Найдено товаров: ${products.length}`);

    // Получаем все категории
    const categories = await Category.find({});
    console.log(`📂 Найдено категорий: ${categories.length}`);

    // Создаем мапу категорий по slug
    const categoryMap = {};
    categories.forEach(category => {
      categoryMap[category.slug] = category._id;
    });

    let updatedCount = 0;
    let skippedCount = 0;

    for (const product of products) {
      console.log(`\n🔍 Обрабатываем товар: ${product.name}`);
      
      // Определяем категорию на основе названия товара
      let categoryId = null;
      
      // Проверяем различные варианты категорий
      if (product.name.toLowerCase().includes('iphone')) {
        if (product.name.toLowerCase().includes('16 pro max')) {
          categoryId = categoryMap['iphone-16-pro-max'];
        } else if (product.name.toLowerCase().includes('16 pro')) {
          categoryId = categoryMap['iphone-16-pro'];
        } else if (product.name.toLowerCase().includes('16 plus')) {
          categoryId = categoryMap['iphone-16-plus'];
        } else if (product.name.toLowerCase().includes('16')) {
          categoryId = categoryMap['iphone-16'];
        } else if (product.name.toLowerCase().includes('15 pro max')) {
          categoryId = categoryMap['iphone-15-pro-max'];
        } else if (product.name.toLowerCase().includes('15 pro')) {
          categoryId = categoryMap['iphone-15-pro'];
        } else if (product.name.toLowerCase().includes('15 plus')) {
          categoryId = categoryMap['iphone-15-plus'];
        } else if (product.name.toLowerCase().includes('15')) {
          categoryId = categoryMap['iphone-15'];
        } else if (product.name.toLowerCase().includes('14 pro max')) {
          categoryId = categoryMap['iphone-14-pro-max'];
        } else if (product.name.toLowerCase().includes('14 pro')) {
          categoryId = categoryMap['iphone-14-pro'];
        } else if (product.name.toLowerCase().includes('14 plus')) {
          categoryId = categoryMap['iphone-14-plus'];
        } else if (product.name.toLowerCase().includes('14')) {
          categoryId = categoryMap['iphone-14'];
        } else if (product.name.toLowerCase().includes('se')) {
          categoryId = categoryMap['iphone-se'];
        } else if (product.name.toLowerCase().includes('13 pro max')) {
          categoryId = categoryMap['iphone-13-pro-max'];
        } else if (product.name.toLowerCase().includes('13 pro')) {
          categoryId = categoryMap['iphone-13-pro'];
        } else if (product.name.toLowerCase().includes('13 mini')) {
          categoryId = categoryMap['iphone-13-mini'];
        } else if (product.name.toLowerCase().includes('13')) {
          categoryId = categoryMap['iphone-13'];
        } else if (product.name.toLowerCase().includes('12 pro max')) {
          categoryId = categoryMap['iphone-12-pro-max'];
        } else if (product.name.toLowerCase().includes('12 pro')) {
          categoryId = categoryMap['iphone-12-pro'];
        } else if (product.name.toLowerCase().includes('12 mini')) {
          categoryId = categoryMap['iphone-12-mini'];
        } else if (product.name.toLowerCase().includes('12')) {
          categoryId = categoryMap['iphone-12'];
        } else if (product.name.toLowerCase().includes('11')) {
          categoryId = categoryMap['iphone-11'];
        } else {
          // Если не удалось определить конкретную модель, привязываем к общей категории iPhone
          categoryId = categoryMap['apple-iphone'];
        }
      } else if (product.name.toLowerCase().includes('samsung') || 
                 product.name.toLowerCase().includes('s25') || 
                 product.name.toLowerCase().includes('s24') || 
                 product.name.toLowerCase().includes('s23') || 
                 product.name.toLowerCase().includes('s22') || 
                 product.name.toLowerCase().includes('s21') || 
                 product.name.toLowerCase().includes('s20')) {
        if (product.name.toLowerCase().includes('ultra')) {
          if (product.name.toLowerCase().includes('s25')) {
            categoryId = categoryMap['s25-ultra'];
          } else if (product.name.toLowerCase().includes('s24')) {
            categoryId = categoryMap['s24-ultra'];
          } else if (product.name.toLowerCase().includes('s23')) {
            categoryId = categoryMap['s23-ultra'];
          } else if (product.name.toLowerCase().includes('s22')) {
            categoryId = categoryMap['s22-ultra'];
          } else if (product.name.toLowerCase().includes('s21')) {
            categoryId = categoryMap['s21-ultra'];
          }
        } else if (product.name.toLowerCase().includes('plus')) {
          if (product.name.toLowerCase().includes('s25')) {
            categoryId = categoryMap['s25-plus'];
          } else if (product.name.toLowerCase().includes('s24')) {
            categoryId = categoryMap['s24-plus'];
          } else if (product.name.toLowerCase().includes('s23')) {
            categoryId = categoryMap['s23-plus'];
          } else if (product.name.toLowerCase().includes('s22')) {
            categoryId = categoryMap['s22-plus'];
          } else if (product.name.toLowerCase().includes('s21')) {
            categoryId = categoryMap['s21-plus'];
          }
        } else if (product.name.toLowerCase().includes('fe')) {
          if (product.name.toLowerCase().includes('s24')) {
            categoryId = categoryMap['s24-fe'];
          } else if (product.name.toLowerCase().includes('s23')) {
            categoryId = categoryMap['s23-fe'];
          } else if (product.name.toLowerCase().includes('s21')) {
            categoryId = categoryMap['s21-fe'];
          } else if (product.name.toLowerCase().includes('s20')) {
            categoryId = categoryMap['s20-fe'];
          }
        } else {
          // Обычные модели S-серии
          if (product.name.toLowerCase().includes('s25')) {
            categoryId = categoryMap['s25'];
          } else if (product.name.toLowerCase().includes('s24')) {
            categoryId = categoryMap['s24'];
          } else if (product.name.toLowerCase().includes('s23')) {
            categoryId = categoryMap['s23'];
          } else if (product.name.toLowerCase().includes('s22')) {
            categoryId = categoryMap['s22'];
          } else if (product.name.toLowerCase().includes('s21')) {
            categoryId = categoryMap['s21'];
          }
        }
        
        // Если не удалось определить конкретную модель, привязываем к общей категории Samsung
        if (!categoryId) {
          categoryId = categoryMap['samsung'];
        }
      } else if (product.name.toLowerCase().includes('xiaomi') || 
                 product.name.toLowerCase().includes('redmi') || 
                 product.name.toLowerCase().includes('mi') || 
                 product.name.toLowerCase().includes('poco')) {
        if (product.name.toLowerCase().includes('redmi note')) {
          categoryId = categoryMap['redmi-note'];
        } else if (product.name.toLowerCase().includes('redmi')) {
          categoryId = categoryMap['redmi'];
        } else if (product.name.toLowerCase().includes('mi')) {
          categoryId = categoryMap['mi'];
        } else if (product.name.toLowerCase().includes('poco')) {
          categoryId = categoryMap['poco'];
        } else {
          categoryId = categoryMap['xiaomi'];
        }
      } else if (product.name.toLowerCase().includes('nokia')) {
        categoryId = categoryMap['nokia'];
      } else if (product.name.toLowerCase().includes('itel')) {
        categoryId = categoryMap['itel'];
      } else if (product.name.toLowerCase().includes('ulefone')) {
        categoryId = categoryMap['ulefone'];
      } else if (product.name.toLowerCase().includes('hotwav')) {
        categoryId = categoryMap['hotwav'];
      } else if (product.name.toLowerCase().includes('oukitel')) {
        categoryId = categoryMap['oukitel'];
      } else if (product.name.toLowerCase().includes('oppo')) {
        categoryId = categoryMap['oppo'];
      } else if (product.name.toLowerCase().includes('honor')) {
        categoryId = categoryMap['honor'];
      } else if (product.name.toLowerCase().includes('huawei')) {
        categoryId = categoryMap['huawei'];
      } else if (product.name.toLowerCase().includes('meizu')) {
        categoryId = categoryMap['meizu'];
      } else if (product.name.toLowerCase().includes('oneplus')) {
        categoryId = categoryMap['oneplus'];
      } else if (product.name.toLowerCase().includes('asus')) {
        categoryId = categoryMap['asus'];
      } else if (product.name.toLowerCase().includes('adata')) {
        categoryId = categoryMap['adata'];
      } else if (product.name.toLowerCase().includes('umiio')) {
        categoryId = categoryMap['umiio'];
      } else if (product.name.toLowerCase().includes('apple') && 
                 (product.name.toLowerCase().includes('watch') || 
                  product.name.toLowerCase().includes('ultra') || 
                  product.name.toLowerCase().includes('se'))) {
        if (product.name.toLowerCase().includes('ultra')) {
          categoryId = categoryMap['ultra-12'];
        } else if (product.name.toLowerCase().includes('s8') || 
                   product.name.toLowerCase().includes('s9') || 
                   product.name.toLowerCase().includes('s10')) {
          categoryId = categoryMap['s8910'];
        } else if (product.name.toLowerCase().includes('se')) {
          categoryId = categoryMap['sese2'];
        }
      } else if (product.name.toLowerCase().includes('microsd') || 
                 product.name.toLowerCase().includes('sd card') || 
                 product.name.toLowerCase().includes('карта памяти')) {
        if (product.name.toLowerCase().includes('2gb') || product.name.toLowerCase().includes('2 gb')) {
          categoryId = categoryMap['2gb'];
        } else if (product.name.toLowerCase().includes('4gb') || product.name.toLowerCase().includes('4 gb')) {
          categoryId = categoryMap['4gb'];
        } else if (product.name.toLowerCase().includes('8gb') || product.name.toLowerCase().includes('8 gb')) {
          categoryId = categoryMap['8gb'];
        } else if (product.name.toLowerCase().includes('16gb') || product.name.toLowerCase().includes('16 gb')) {
          categoryId = categoryMap['16gb'];
        } else if (product.name.toLowerCase().includes('32gb') || product.name.toLowerCase().includes('32 gb')) {
          categoryId = categoryMap['32gb'];
        } else if (product.name.toLowerCase().includes('64gb') || product.name.toLowerCase().includes('64 gb')) {
          categoryId = categoryMap['64gb'];
        } else if (product.name.toLowerCase().includes('128gb') || product.name.toLowerCase().includes('128 gb')) {
          categoryId = categoryMap['128gb'];
        } else if (product.name.toLowerCase().includes('256gb') || product.name.toLowerCase().includes('256 gb')) {
          categoryId = categoryMap['256gb'];
        } else if (product.name.toLowerCase().includes('512gb') || product.name.toLowerCase().includes('512 gb')) {
          categoryId = categoryMap['512gb'];
        } else {
          categoryId = categoryMap['microsd'];
        }
      } else if (product.name.toLowerCase().includes('держатель') || 
                 product.name.toLowerCase().includes('holder') || 
                 product.name.toLowerCase().includes('mount')) {
        if (product.name.toLowerCase().includes('автомобильный') || product.name.toLowerCase().includes('car')) {
          categoryId = categoryMap['avtomobilnye-derzhateli'];
        } else if (product.name.toLowerCase().includes('настольный') || product.name.toLowerCase().includes('desk')) {
          categoryId = categoryMap['nastolnye-derzhateli'];
        } else if (product.name.toLowerCase().includes('на руку') || product.name.toLowerCase().includes('arm')) {
          categoryId = categoryMap['derzhatel-na-ruku'];
        } else if (product.name.toLowerCase().includes('на ремешок') || product.name.toLowerCase().includes('strap')) {
          categoryId = categoryMap['derzhatel-na-remeshok'];
        }
      } else if (product.name.toLowerCase().includes('зарядка') || 
                 product.name.toLowerCase().includes('charger') || 
                 product.name.toLowerCase().includes('power')) {
        if (product.name.toLowerCase().includes('автомобильная') || product.name.toLowerCase().includes('car')) {
          categoryId = categoryMap['avtomobilnye-zaryadki'];
        } else if (product.name.toLowerCase().includes('аккумулятор') || product.name.toLowerCase().includes('powerbank')) {
          categoryId = categoryMap['vneshnie-akkumulyatory'];
        }
      } else if (product.name.toLowerCase().includes('наушники') || 
                 product.name.toLowerCase().includes('headphones') || 
                 product.name.toLowerCase().includes('колонки') || 
                 product.name.toLowerCase().includes('speaker')) {
        categoryId = categoryMap['naushniki-i-kolonki'];
      } else if (product.name.toLowerCase().includes('игровая') || 
                 product.name.toLowerCase().includes('консоль') || 
                 product.name.toLowerCase().includes('game')) {
        categoryId = categoryMap['igrovye-pristavki'];
      } else if (product.name.toLowerCase().includes('ноутбук') || 
                 product.name.toLowerCase().includes('laptop') || 
                 product.name.toLowerCase().includes('планшет') || 
                 product.name.toLowerCase().includes('tablet')) {
        categoryId = categoryMap['noutbuki-i-planshety'];
      } else if (product.name.toLowerCase().includes('компьютер') || 
                 product.name.toLowerCase().includes('монитор') || 
                 product.name.toLowerCase().includes('computer')) {
        categoryId = categoryMap['kompyuternoe-oborudovanie'];
      } else if (product.name.toLowerCase().includes('электротранспорт') || 
                 product.name.toLowerCase().includes('самокат') || 
                 product.name.toLowerCase().includes('велосипед')) {
        categoryId = categoryMap['elektrotransport'];
      } else if (product.name.toLowerCase().includes('техника для дома') || 
                 product.name.toLowerCase().includes('бытовая')) {
        categoryId = categoryMap['tehnika-dlya-doma'];
      }

      // Если не удалось определить категорию, привязываем к мобильным телефонам
      if (!categoryId) {
        categoryId = categoryMap['mobilnye-telefony'];
      }

      if (categoryId) {
        // Обновляем товар
        await Product.findByIdAndUpdate(product._id, {
          categoryId: categoryId
        });
        
        console.log(`✅ Товар "${product.name}" привязан к категории: ${categoryId}`);
        updatedCount++;
      } else {
        console.log(`⚠️ Не удалось определить категорию для товара: ${product.name}`);
        skippedCount++;
      }
    }

    console.log(`\n🎉 Исправление завершено!`);
    console.log(`✅ Обновлено товаров: ${updatedCount}`);
    console.log(`⚠️ Пропущено товаров: ${skippedCount}`);

  } catch (error) {
    console.error('❌ Ошибка при исправлении категорий:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Запускаем скрипт
fixProductCategories(); 