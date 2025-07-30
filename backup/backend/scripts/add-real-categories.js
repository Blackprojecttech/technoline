require('ts-node').register();
const mongoose = require('mongoose');
const Category = require('./Category');

// Функция для создания slug
const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[а-яё]/g, (char) => {
      const map = {
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
    .replace(/^-|-$/g, '');
};

// Структура категорий из HTML
const categoriesData = [
  {
    name: 'Мобильные телефоны',
    description: 'Смартфоны и мобильные телефоны',
    children: [
      {
        name: 'Apple iPhone',
        description: 'Смартфоны Apple iPhone',
        children: [
          { name: 'iPhone 16 Pro Max', description: 'iPhone 16 Pro Max' },
          { name: 'iPhone 16 Pro', description: 'iPhone 16 Pro' },
          { name: 'iPhone 16 Plus', description: 'iPhone 16 Plus' },
          { name: 'iPhone 16', description: 'iPhone 16' },
          { name: 'iPhone 15 Pro Max', description: 'iPhone 15 Pro Max' },
          { name: 'iPhone 15 Pro', description: 'iPhone 15 Pro' },
          { name: 'iPhone 15 Plus', description: 'iPhone 15 Plus' },
          { name: 'iPhone 15', description: 'iPhone 15' },
          { name: 'iPhone 14 Pro Max', description: 'iPhone 14 Pro Max' },
          { name: 'iPhone 14 Pro', description: 'iPhone 14 Pro' },
          { name: 'iPhone 14 Plus', description: 'iPhone 14 Plus' },
          { name: 'iPhone 14', description: 'iPhone 14' },
          { name: 'iPhone SE', description: 'iPhone SE' },
          { name: 'iPhone 13 Pro Max', description: 'iPhone 13 Pro Max' },
          { name: 'iPhone 13 Pro', description: 'iPhone 13 Pro' },
          { name: 'iPhone 13 mini', description: 'iPhone 13 mini' },
          { name: 'iPhone 13', description: 'iPhone 13' },
          { name: 'iPhone 12 Pro Max', description: 'iPhone 12 Pro Max' },
          { name: 'iPhone 12 Pro', description: 'iPhone 12 Pro' },
          { name: 'iPhone 12 mini', description: 'iPhone 12 mini' },
          { name: 'iPhone 12', description: 'iPhone 12' },
          { name: 'iPhone 11', description: 'iPhone 11' }
        ]
      },
      {
        name: 'Samsung',
        description: 'Смартфоны Samsung',
        children: [
          {
            name: 'S-Серия',
            description: 'Samsung S-серия',
            children: [
              { name: 'S25 Ultra', description: 'Samsung S25 Ultra' },
              { name: 'S25 Plus', description: 'Samsung S25 Plus' },
              { name: 'S25', description: 'Samsung S25' },
              { name: 'S24 Ultra', description: 'Samsung S24 Ultra' },
              { name: 'S24 Plus', description: 'Samsung S24 Plus' },
              { name: 'S24 FE', description: 'Samsung S24 FE' },
              { name: 'S24', description: 'Samsung S24' },
              { name: 'S23 Ultra', description: 'Samsung S23 Ultra' },
              { name: 'S23 Plus', description: 'Samsung S23 Plus' },
              { name: 'S23 FE', description: 'Samsung S23 FE' },
              { name: 'S23', description: 'Samsung S23' },
              { name: 'S22 Ultra', description: 'Samsung S22 Ultra' },
              { name: 'S22 Plus', description: 'Samsung S22 Plus' },
              { name: 'S22', description: 'Samsung S22' },
              { name: 'S21 Ultra', description: 'Samsung S21 Ultra' },
              { name: 'S21 Plus', description: 'Samsung S21 Plus' },
              { name: 'S21 FE', description: 'Samsung S21 FE' },
              { name: 'S21', description: 'Samsung S21' },
              { name: 'S20 FE', description: 'Samsung S20 FE' }
            ]
          },
          {
            name: 'A-Серия',
            description: 'Samsung A-серия',
            children: [
              { name: 'A55', description: 'Samsung A55' },
              { name: 'A35', description: 'Samsung A35' },
              { name: 'A25', description: 'Samsung A25' },
              { name: 'A15', description: 'Samsung A15' },
              { name: 'A05', description: 'Samsung A05' }
            ]
          },
          {
            name: 'Z-Серия',
            description: 'Samsung Z-серия',
            children: [
              { name: 'Z Fold6', description: 'Samsung Z Fold6' },
              { name: 'Z Fold5', description: 'Samsung Z Fold5' },
              { name: 'Z Fold4', description: 'Samsung Z Fold4' },
              { name: 'Z Fold3', description: 'Samsung Z Fold3' },
              { name: 'Z Flip6', description: 'Samsung Z Flip6' },
              { name: 'Z Flip5', description: 'Samsung Z Flip5' },
              { name: 'Z Flip4', description: 'Samsung Z Flip4' },
              { name: 'Z Flip3', description: 'Samsung Z Flip3' }
            ]
          },
          {
            name: 'M-Серия',
            description: 'Samsung M-серия',
            children: [
              { name: 'M54', description: 'Samsung M54' },
              { name: 'M34', description: 'Samsung M34' },
              { name: 'M24', description: 'Samsung M24' },
              { name: 'M14', description: 'Samsung M14' },
              { name: 'M04', description: 'Samsung M04' }
            ]
          }
        ]
      },
      {
        name: 'Xiaomi',
        description: 'Смартфоны Xiaomi',
        children: [
          { name: 'Redmi', description: 'Xiaomi Redmi' },
          { name: 'Redmi Note', description: 'Xiaomi Redmi Note' },
          { name: 'Mi', description: 'Xiaomi Mi' },
          { name: 'POCO', description: 'Xiaomi POCO' }
        ]
      },
      { name: 'Nokia', description: 'Смартфоны Nokia' },
      { name: 'ITEL', description: 'Смартфоны ITEL' },
      { name: 'Ulefone', description: 'Смартфоны Ulefone' },
      { name: 'HOTWAV', description: 'Смартфоны HOTWAV' },
      { name: 'Oukitel', description: 'Смартфоны Oukitel' },
      { name: 'OPPO', description: 'Смартфоны OPPO' }
    ]
  },
  {
    name: 'Умные Часы',
    description: 'Смарт-часы и фитнес-браслеты',
    children: [
      { name: 'Ultra 1/2', description: 'Apple Watch Ultra 1/2' },
      { name: 'S8/9/10', description: 'Apple Watch S8/9/10' },
      { name: 'SE/SE2', description: 'Apple Watch SE/SE2' }
    ]
  },
  {
    name: 'Ноутбуки и Планшеты',
    description: 'Ноутбуки, планшеты и аксессуары',
    children: [
      { name: 'Asus', description: 'Ноутбуки и планшеты Asus' },
      { name: 'ADATA', description: 'Продукция ADATA' },
      { name: 'Umiio', description: 'Продукция Umiio' }
    ]
  },
  {
    name: 'Аксессуары',
    description: 'Чехлы, зарядные устройства и другие аксессуары',
    children: [
      { name: 'Apple', description: 'Аксессуары Apple' },
      { name: 'Asus', description: 'Аксессуары Asus' },
      { name: 'Xiaomi', description: 'Аксессуары Xiaomi' },
      { name: 'Samsung', description: 'Аксессуары Samsung' },
      { name: 'Nokia', description: 'Аксессуары Nokia' },
      { name: 'Meizu', description: 'Аксессуары Meizu' },
      { name: 'Huawei', description: 'Аксессуары Huawei' },
      { name: 'OnePlus', description: 'Аксессуары OnePlus' },
      { name: 'Универсальные', description: 'Универсальные аксессуары' },
      { name: 'Apple', description: 'Аксессуары Apple' },
      { name: 'Samsung', description: 'Аксессуары Samsung' },
      { name: 'Huawei', description: 'Аксессуары Huawei' },
      { name: 'Honor', description: 'Аксессуары Honor' },
      { name: 'MicroSD', description: 'Карты памяти MicroSD' },
      { name: '2Gb', description: 'Карты памяти 2Gb' },
      { name: '4Gb', description: 'Карты памяти 4Gb' },
      { name: '8Gb', description: 'Карты памяти 8Gb' },
      { name: '16Gb', description: 'Карты памяти 16Gb' },
      { name: '32Gb', description: 'Карты памяти 32Gb' },
      { name: '64Gb', description: 'Карты памяти 64Gb' },
      { name: '128Gb', description: 'Карты памяти 128Gb' },
      { name: '256Gb', description: 'Карты памяти 256Gb' },
      { name: '512Gb', description: 'Карты памяти 512Gb' },
      { name: 'USB-накопители', description: 'USB-накопители' },
      { name: 'SD-карты', description: 'SD-карты' },
      { name: 'Автомобильные держатели', description: 'Автомобильные держатели' },
      { name: 'Настольные держатели', description: 'Настольные держатели' },
      { name: 'Держатель на руку', description: 'Держатель на руку' },
      { name: 'Держатель на ремешок', description: 'Держатель на ремешок' },
      { name: 'Внешние Аккумуляторы', description: 'Внешние аккумуляторы PowerBank' },
      { name: 'Автомобильные зарядки', description: 'Автомобильные зарядки' }
    ]
  },
  {
    name: 'Игровые приставки',
    description: 'Игровые консоли и аксессуары'
  },
  {
    name: 'Наушники и Колонки',
    description: 'Наушники, колонки и аудио оборудование'
  },
  {
    name: 'Техника для Дома',
    description: 'Бытовая техника для дома'
  },
  {
    name: 'Компьютерное оборудование',
    description: 'Компьютеры, мониторы и комплектующие'
  },
  {
    name: 'Электротранспорт',
    description: 'Электросамокаты, велосипеды и другой электротранспорт'
  }
];

// Функция для рекурсивного создания категорий
async function createCategories(categories, parentId = null) {
  for (let i = 0; i < categories.length; i++) {
    const categoryData = categories[i];
    const slug = createSlug(categoryData.name);
    
    // Проверяем, существует ли уже категория с таким slug
    let existingCategory = await Category.findOne({ slug });
    
    if (!existingCategory) {
      const category = new Category({
        name: categoryData.name,
        slug: slug,
        description: categoryData.description || '',
        parentId: parentId,
        isActive: true,
        sortOrder: i
      });
      
      existingCategory = await category.save();
      console.log(`✅ Создана категория: ${categoryData.name}`);
    } else {
      console.log(`⚠️ Категория уже существует: ${categoryData.name}`);
    }
    
    // Рекурсивно создаем дочерние категории
    if (categoryData.children && categoryData.children.length > 0) {
      await createCategories(categoryData.children, existingCategory._id);
    }
  }
}

// Основная функция
async function main() {
  try {
    // Подключение к MongoDB
    await mongoose.connect('mongodb://localhost:27017/technoline-store');
    console.log('✅ Подключение к MongoDB установлено');
    
    // Очищаем существующие категории без ymlId
    await Category.deleteMany({ ymlId: { $exists: false } });
    console.log('🗑️ Удалены старые категории');
    
    // Создаем новые категории
    await createCategories(categoriesData);
    console.log('✅ Все категории созданы успешно');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Отключение от MongoDB');
  }
}

// Запускаем скрипт
main(); 