const fs = require('fs');
const path = require('path');

// Функция для создания страницы категории
function createCategoryPage(slug, name) {
  const pageContent = `import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: '${name} - Techno-line.store',
  description: '${name} - качественные товары по выгодным ценам в Techno-line.store',
};

export default function ${name.replace(/[^a-zA-Z0-9]/g, '')}Page() {
  return <CategoryPage slug="${slug}" />;
}
`;

  const pageDir = path.join(__dirname, '..', 'app', 'catalog', slug);
  const pagePath = path.join(pageDir, 'page.tsx');

  // Создаем директорию если её нет
  if (!fs.existsSync(pageDir)) {
    fs.mkdirSync(pageDir, { recursive: true });
  }

  // Записываем файл
  fs.writeFileSync(pagePath, pageContent);
  console.log(`✅ Created page for: ${name} (${slug})`);
}

// Функция для получения всех категорий из API
async function fetchCategories() {
  try {
    const response = await fetch('http://localhost:5002/api/categories');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    return [];
  }
}

// Рекурсивная функция для создания страниц для всех категорий
function createPagesForCategories(categories) {
  categories.forEach(category => {
    // Создаем страницу для текущей категории
    createCategoryPage(category.slug, category.name);
    
    // Рекурсивно создаем страницы для дочерних категорий
    if (category.children && category.children.length > 0) {
      createPagesForCategories(category.children);
    }
  });
}

// Основная функция
async function main() {
  console.log('🚀 Starting category pages creation...');
  
  const categories = await fetchCategories();
  
  if (categories.length === 0) {
    console.log('❌ No categories found');
    return;
  }
  
  console.log(`📦 Found ${categories.length} root categories`);
  
  createPagesForCategories(categories);
  
  console.log('✅ All category pages created successfully!');
}

// Запускаем скрипт
main().catch(console.error); 