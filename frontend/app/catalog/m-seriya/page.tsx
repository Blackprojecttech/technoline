import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'M-Серия - Techno-line.store',
  description: 'M-Серия - качественные товары по выгодным ценам в Techno-line.store',
};

export default function MPage() {
  return <CategoryPage slug="m-seriya" />;
}
