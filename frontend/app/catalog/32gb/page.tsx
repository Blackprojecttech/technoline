import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: '32Gb - Techno-line.store',
  description: '32Gb - качественные товары по выгодным ценам в Techno-line.store',
};

export default function 32GbPage() {
  return <CategoryPage slug="32gb" />;
}
