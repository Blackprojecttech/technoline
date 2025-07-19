import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'iPhone 15 Pro Max - Techno-line.store',
  description: 'iPhone 15 Pro Max - качественные товары по выгодным ценам в Techno-line.store',
};

export default function iPhone15ProMaxPage() {
  return <CategoryPage slug="iphone-15-pro-max" />;
}
