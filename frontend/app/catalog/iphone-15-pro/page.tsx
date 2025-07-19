import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'iPhone 15 Pro - Techno-line.store',
  description: 'iPhone 15 Pro - качественные товары по выгодным ценам в Techno-line.store',
};

export default function iPhone15ProPage() {
  return <CategoryPage slug="iphone-15-pro" />;
}
