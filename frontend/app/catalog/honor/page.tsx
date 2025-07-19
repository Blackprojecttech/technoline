import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Honor - Techno-line.store',
  description: 'Honor - качественные товары по выгодным ценам в Techno-line.store',
};

export default function HonorPage() {
  return <CategoryPage slug="honor" />;
}
