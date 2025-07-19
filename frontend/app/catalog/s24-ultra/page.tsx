import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'S24 Ultra - Techno-line.store',
  description: 'S24 Ultra - качественные товары по выгодным ценам в Techno-line.store',
};

export default function S24UltraPage() {
  return <CategoryPage slug="s24-ultra" />;
}
