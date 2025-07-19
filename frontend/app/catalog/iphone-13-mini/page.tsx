import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'iPhone 13 mini - Techno-line.store',
  description: 'iPhone 13 mini - качественные товары по выгодным ценам в Techno-line.store',
};

export default function iPhone13miniPage() {
  return <CategoryPage slug="iphone-13-mini" />;
}
