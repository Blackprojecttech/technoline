import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'iPhone 13 Pro Max - Techno-line.store',
  description: 'iPhone 13 Pro Max - качественные товары по выгодным ценам в Techno-line.store',
};

export default function iPhone13ProMaxPage() {
  return <CategoryPage slug="iphone-13-pro-max" />;
}
