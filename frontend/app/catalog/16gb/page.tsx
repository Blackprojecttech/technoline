import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: '16Gb - Techno-line.store',
  description: '16Gb - качественные товары по выгодным ценам в Techno-line.store',
};

export default function 16GbPage() {
  return <CategoryPage slug="16gb" />;
}
