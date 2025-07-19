import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'iPhone 14 Pro Max - Techno-line.store',
  description: 'iPhone 14 Pro Max - качественные товары по выгодным ценам в Techno-line.store',
};

export default function iPhone14ProMaxPage() {
  return <CategoryPage slug="iphone-14-pro-max" />;
}
