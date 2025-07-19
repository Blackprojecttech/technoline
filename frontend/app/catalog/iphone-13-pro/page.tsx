import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'iPhone 13 Pro - Techno-line.store',
  description: 'iPhone 13 Pro - качественные товары по выгодным ценам в Techno-line.store',
};

export default function iPhone13ProPage() {
  return <CategoryPage slug="iphone-13-pro" />;
}
