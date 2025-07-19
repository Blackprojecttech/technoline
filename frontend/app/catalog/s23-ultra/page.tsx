import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'S23 Ultra - Techno-line.store',
  description: 'S23 Ultra - качественные товары по выгодным ценам в Techno-line.store',
};

export default function S23UltraPage() {
  return <CategoryPage slug="s23-ultra" />;
}
