import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CategoryProducts from '@/components/CategoryProducts';
import { ChevronRight } from 'lucide-react';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
}

interface CategoryPageProps {
  params: {
    slug: string;
  };
}

// Отключаем кэширование для динамических страниц
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = params;

  // Получаем данные категории
  let category: Category | null = null;
  let error: string | null = null;
  let debugInfo: any = {};

  try {
    const categoryResponse = await fetch(`http://127.0.0.1:5002/api/categories/${slug}`, { 
      cache: 'no-store',
      next: { revalidate: 0 },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    debugInfo.status = categoryResponse.status;
    if (categoryResponse.ok) {
      category = await categoryResponse.json();
      debugInfo.category = category;
    } else {
      error = `Failed to fetch category: ${categoryResponse.status}`;
      debugInfo.error = error;
    }
  } catch (err) {
    error = `Network error: ${err instanceof Error ? err.message : 'Unknown error'}`;
    debugInfo.error = error;
  }

  // Не вызываем notFound(), чтобы всегда видеть debug-блок

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-light-50 to-accent-50">
      <Header />
      <main className="pt-32 pb-16">
        <div className="container mx-auto px-4 py-8">
          {/* Debug Info */}
          <div className="mb-4 p-4 bg-blue-100 border border-blue-400 rounded">
            <p className="text-sm text-blue-800 font-bold">DEBUG PAGE INFO</p>
            <p className="text-sm text-blue-800">Slug: {slug}</p>
            <p className="text-sm text-blue-800">Error: {error ? error : 'нет'}</p>
            <p className="text-sm text-blue-800">Category: {category ? JSON.stringify(category) : 'нет'}</p>
            <p className="text-sm text-blue-800">Debug: {JSON.stringify(debugInfo)}</p>
          </div>

          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-sm text-secondary-600 mb-8">
            <a href="/" className="hover:text-primary-600">Главная</a>
            <ChevronRight size={16} />
            <a href="/catalog" className="hover:text-primary-600">Категории</a>
            <ChevronRight size={16} />
            <span className="text-secondary-800 font-medium">{category?.name || slug}</span>
          </nav>

          {/* Category Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-secondary-800 mb-4">{category?.name || slug}</h1>
            {category?.description && (
              <p className="text-lg text-secondary-600 max-w-3xl">{category.description}</p>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 rounded">
              <p className="text-sm text-red-800">
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}

          {/* Force Render CategoryProducts */}
          <div className="mb-4 p-4 bg-green-100 border border-green-400 rounded">
            <p className="text-sm text-green-800 font-bold">FORCE RENDER CATEGORY PRODUCTS</p>
            <p className="text-sm text-green-800">Category Slug: {slug}</p>
            <p className="text-sm text-green-800">Component should render below:</p>
          </div>

          {/* Products Grid */}
          <CategoryProducts categorySlug={slug} />

          {/* Force Render Debug */}
          <div className="mt-8 p-4 bg-purple-100 border border-purple-400 rounded">
            <p className="text-sm text-purple-800 font-bold">AFTER CATEGORY PRODUCTS RENDER</p>
            <p className="text-sm text-purple-800">If you see this, CategoryProducts rendered</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 