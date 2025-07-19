import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'S21 Plus - Techno-line.store',
  description: 'S21 Plus - качественные товары по выгодным ценам в Techno-line.store',
};

export default function S21PlusPage() {
  return <CategoryPage slug="s21-plus" />;
}
