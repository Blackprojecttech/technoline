import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'S22 Ultra - Techno-line.store',
  description: 'S22 Ultra - качественные товары по выгодным ценам в Techno-line.store',
};

export default function S22UltraPage() {
  return <CategoryPage slug="s22-ultra" />;
}
