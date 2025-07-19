import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'S21 FE - Techno-line.store',
  description: 'S21 FE - качественные товары по выгодным ценам в Techno-line.store',
};

export default function S21FEPage() {
  return <CategoryPage slug="s21-fe" />;
}
