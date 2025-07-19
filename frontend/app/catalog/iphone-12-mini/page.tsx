import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'iPhone 12 mini - Techno-line.store',
  description: 'iPhone 12 mini - качественные товары по выгодным ценам в Techno-line.store',
};

export default function iPhone12miniPage() {
  return <CategoryPage slug="iphone-12-mini" />;
}
