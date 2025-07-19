import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'iPhone 15 Plus - Techno-line.store',
  description: 'iPhone 15 Plus - качественные товары по выгодным ценам в Techno-line.store',
};

export default function iPhone15PlusPage() {
  return <CategoryPage slug="iphone-15-plus" />;
}
