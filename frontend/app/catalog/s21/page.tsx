import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'S21 - Techno-line.store',
  description: 'S21 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function S21Page() {
  return <CategoryPage slug="s21" />;
}
