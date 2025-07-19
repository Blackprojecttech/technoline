import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'S-Серия - Techno-line.store',
  description: 'S-Серия - качественные товары по выгодным ценам в Techno-line.store',
};

export default function SPage() {
  return <CategoryPage slug="s-seriya" />;
}
