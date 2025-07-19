import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'iPhone 16 Plus - Techno-line.store',
  description: 'iPhone 16 Plus - качественные товары по выгодным ценам в Techno-line.store',
};

export default function iPhone16PlusPage() {
  return <CategoryPage slug="iphone-16-plus" />;
}
