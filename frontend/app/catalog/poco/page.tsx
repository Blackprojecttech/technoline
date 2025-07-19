import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'POCO - Techno-line.store',
  description: 'POCO - качественные товары по выгодным ценам в Techno-line.store',
};

export default function POCOPage() {
  return <CategoryPage slug="poco" />;
}
