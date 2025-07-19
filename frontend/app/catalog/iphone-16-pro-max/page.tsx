import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'iPhone 16 Pro Max - Techno-line.store',
  description: 'iPhone 16 Pro Max - качественные товары по выгодным ценам в Techno-line.store',
};

export default function iPhone16ProMaxPage() {
  return <CategoryPage slug="iphone-16-pro-max" />;
}
