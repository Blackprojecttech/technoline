import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'iPhone 16 Pro - Techno-line.store',
  description: 'iPhone 16 Pro - качественные товары по выгодным ценам в Techno-line.store',
};

export default function iPhone16ProPage() {
  return <CategoryPage slug="iphone-16-pro" />;
}
