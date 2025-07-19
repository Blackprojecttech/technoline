import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'iPhone 15 - Techno-line.store',
  description: 'iPhone 15 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function iPhone15Page() {
  return <CategoryPage slug="iphone-15" />;
}
