import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Игровые приставки - Techno-line.store',
  description: 'Игровые приставки - качественные товары по выгодным ценам в Techno-line.store',
};

export default function Page() {
  return <CategoryPage slug="igrovye-pristavki" />;
}
