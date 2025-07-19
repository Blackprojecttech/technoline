import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ShoppingCart, Star, Heart, Eye } from 'lucide-react';

interface Product {
  _id: string;
  name: string;
  categoryId: {
    _id: string;
    name: string;
    slug: string;
  };
  price: number;
  comparePrice?: number;
  rating?: number;
  reviews?: number;
  mainImage: string;
  images: string[];
  isActive: boolean;
  isFeatured: boolean;
  slug: string;
  description?: string;
  sku: string;
  stockQuantity: number;
  inStock: boolean;
  createdAt: string;
}

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  children?: Category[];
}

export async function generateStaticParams() {
  // Получаем все категории с бэка
  const res = await fetch('http://localhost:5002/api/categories', { cache: 'no-store' });
  const categories: Category[] = await res.json();

  // Рекурсивно собираем все slug
  function collectSlugs(cats: Category[]): string[] {
    return cats.flatMap((cat: Category) =>
      [cat.slug, ...(cat.children ? collectSlugs(cat.children) : [])]
    );
  }

  const slugs = collectSlugs(categories);
  return slugs.map((slug: string) => ({ slug }));
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  
  // Получаем данные на сервере
  let products: Product[] = [];
  let category: Category | null = null;
  let error: string | null = null;

  try {
    // Получаем категорию
    const categoryResponse = await fetch(`http://localhost:5002/api/categories/${slug}`, { cache: 'no-store' });
    if (categoryResponse.ok) {
      category = await categoryResponse.json();
    }

    // Получаем товары категории
    const productsResponse = await fetch(`http://localhost:5002/api/products/category/${slug}`, { cache: 'no-store' });
    if (productsResponse.ok) {
      const productsData = await productsResponse.json();
      products = productsData.products || [];
    } else {
      error = 'Не удалось загрузить товары';
    }
  } catch (err) {
    console.error('Error fetching category products:', err);
    error = 'Ошибка загрузки данных';
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-light-50 to-accent-50">
        <Header />
        <main className="pt-32 pb-16">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-light-50 to-accent-50">
      <Header />
      <main className="pt-32 pb-16">
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <nav className="mb-8">
            <ol className="flex items-center space-x-2 text-sm text-secondary-600">
              <li><a href="/" className="hover:text-primary-600">Главная</a></li>
              <li>/</li>
                              <li><a href="/catalog" className="hover:text-primary-600">Категории</a></li>
              <li>/</li>
              <li className="text-secondary-800 font-medium">{category?.name}</li>
            </ol>
          </nav>

          {/* Category Header */}
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary-800 mb-4">
              {category?.name}
            </h1>
            {category?.description && (
              <p className="text-lg text-secondary-600 max-w-3xl">
                {category.description}
              </p>
            )}
          </div>

          {/* Products Count */}
          <div className="mb-6">
            <p className="text-secondary-600">
              Найдено товаров: <span className="font-semibold text-secondary-800">{products.length}</span>
            </p>
          </div>

          {/* Products Grid */}
          {products.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-secondary-400 mb-4">
                <ShoppingCart size={64} className="mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-secondary-800 mb-2">Товары не найдены</h3>
              <p className="text-secondary-600">В данной категории пока нет товаров</p>
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <div
                  key={product._id}
                  className="group bg-white border border-light-200 rounded-2xl p-6 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-primary-500/25"
                >
                  {/* Product Image */}
                  <div className="relative mb-6">
                    <div className="w-full h-64 bg-gradient-to-br from-primary-100 to-accent-100 rounded-xl flex items-center justify-center border border-light-200">
                      {product.mainImage ? (
                        <img
                          src={product.mainImage}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <div className="text-6xl">📱</div>
                      )}
                    </div>
                    
                    {/* Quick actions */}
                    <div className="absolute top-4 right-4 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <button className="w-10 h-10 bg-primary-500/80 hover:bg-primary-600 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110 shadow-lg">
                        <Heart size={18} />
                      </button>
                      <a href={`/product/${product.slug}`}>
                        <button className="w-10 h-10 bg-primary-500/80 hover:bg-primary-600 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110 shadow-lg">
                          <Eye size={18} />
                        </button>
                      </a>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-secondary-500 text-sm font-medium mb-1">
                        {product.categoryId?.name || 'Категория'}
                      </p>
                      <h3 className="text-xl font-bold text-secondary-800 mb-2 group-hover:text-primary-600 transition-colors duration-300">
                        {product.name}
                      </h3>
                    </div>

                    {/* Rating */}
                    {product.rating && (
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={16}
                              className={`${
                                i < Math.floor(product.rating || 0)
                                  ? 'text-warning-400 fill-current'
                                  : 'text-secondary-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-secondary-500 text-sm">
                          {product.rating} ({product.reviews || 0})
                        </span>
                      </div>
                    )}

                    {/* Price */}
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl font-bold text-secondary-800">
                        {product.price.toLocaleString()} ₽
                      </span>
                      {product.comparePrice && product.comparePrice > product.price && (
                        <span className="text-lg text-secondary-500 line-through">
                          {product.comparePrice.toLocaleString()} ₽
                        </span>
                      )}
                    </div>

                    {/* Stock Status */}
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${
                        product.inStock ? 'text-success-600' : 'text-error-600'
                      }`}>
                        {product.inStock ? 'В наличии' : 'Нет в наличии'}
                      </span>
                      <span className="text-xs text-secondary-500">SKU: {product.sku}</span>
                    </div>

                    {/* Add to cart button */}
                    <button 
                      disabled={!product.inStock}
                      className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ShoppingCart size={20} />
                      <span>{product.inStock ? 'В корзину' : 'Нет в наличии'}</span>
                    </button>
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-accent-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}