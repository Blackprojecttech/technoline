import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'iPhone 14 Pro - Techno-line.store',
  description: 'iPhone 14 Pro - качественные товары по выгодным ценам в Techno-line.store',
};

export default function iPhone14ProPage() {
  return <CategoryPage slug="iphone-14-pro" />;
}
