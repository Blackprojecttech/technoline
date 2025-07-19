import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Z-Серия - Techno-line.store',
  description: 'Z-Серия - качественные товары по выгодным ценам в Techno-line.store',
};

export default function ZPage() {
  return <CategoryPage slug="z-seriya" />;
}
