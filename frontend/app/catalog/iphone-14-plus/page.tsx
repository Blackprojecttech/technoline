import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'iPhone 14 Plus - Techno-line.store',
  description: 'iPhone 14 Plus - качественные товары по выгодным ценам в Techno-line.store',
};

export default function iPhone14PlusPage() {
  return <CategoryPage slug="iphone-14-plus" />;
}
