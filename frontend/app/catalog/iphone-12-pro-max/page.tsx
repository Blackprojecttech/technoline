import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'iPhone 12 Pro Max - Techno-line.store',
  description: 'iPhone 12 Pro Max - качественные товары по выгодным ценам в Techno-line.store',
};

export default function iPhone12ProMaxPage() {
  return <CategoryPage slug="iphone-12-pro-max" />;
}
