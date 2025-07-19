import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'A-Серия - Techno-line.store',
  description: 'A-Серия - качественные товары по выгодным ценам в Techno-line.store',
};

export default function APage() {
  return <CategoryPage slug="a-seriya" />;
}
