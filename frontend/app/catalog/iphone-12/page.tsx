import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'iPhone 12 - Techno-line.store',
  description: 'iPhone 12 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function iPhone12Page() {
  return <CategoryPage slug="iphone-12" />;
}
