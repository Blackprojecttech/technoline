import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'iPhone 13 - Techno-line.store',
  description: 'iPhone 13 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function iPhone13Page() {
  return <CategoryPage slug="iphone-13" />;
}
