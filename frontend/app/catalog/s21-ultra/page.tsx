import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'S21 Ultra - Techno-line.store',
  description: 'S21 Ultra - качественные товары по выгодным ценам в Techno-line.store',
};

export default function S21UltraPage() {
  return <CategoryPage slug="s21-ultra" />;
}
