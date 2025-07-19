import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'S25 Ultra - Techno-line.store',
  description: 'S25 Ultra - качественные товары по выгодным ценам в Techno-line.store',
};

export default function S25UltraPage() {
  return <CategoryPage slug="s25-ultra" />;
}
