import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'iPhone 11 - Techno-line.store',
  description: 'iPhone 11 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function iPhone11Page() {
  return <CategoryPage slug="iphone-11" />;
}
