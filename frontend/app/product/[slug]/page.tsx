import ProductClient from './ProductClient';

interface ProductPageProps {
  params: { slug: string };
}

// Генерация статических путей для всех товаров
export async function generateStaticParams() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';
  const pageSize = 1000; // Можно увеличить, если API выдержит
  let page = 1;
  let allProducts: { slug: string }[] = [];
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(`${API_URL}/products?page=${page}&limit=${pageSize}`);
    const data = await res.json();
    const products = data.products || [];
    allProducts = allProducts.concat(products);
    if (products.length < pageSize) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return allProducts
    .filter((product) => !!product.slug)
    .map((product) => ({ slug: product.slug }));
}

export default function ProductPage({ params }: ProductPageProps) {
  return <ProductClient slug={params.slug} />;
} 