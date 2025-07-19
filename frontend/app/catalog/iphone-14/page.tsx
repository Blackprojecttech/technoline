import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'iPhone 14 - Techno-line.store',
  description: 'iPhone 14 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function iPhone14Page() {
  return <CategoryPage slug="iphone-14" />;
}
