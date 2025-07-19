import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'iPhone 12 Pro - Techno-line.store',
  description: 'iPhone 12 Pro - качественные товары по выгодным ценам в Techno-line.store',
};

export default function iPhone12ProPage() {
  return <CategoryPage slug="iphone-12-pro" />;
}
