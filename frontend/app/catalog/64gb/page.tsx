import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: '64Gb - Techno-line.store',
  description: '64Gb - качественные товары по выгодным ценам в Techno-line.store',
};

export default function 64GbPage() {
  return <CategoryPage slug="64gb" />;
}
