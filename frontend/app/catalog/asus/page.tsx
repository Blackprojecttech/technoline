import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Asus - Techno-line.store',
  description: 'Asus - качественные товары по выгодным ценам в Techno-line.store',
};

export default function AsusPage() {
  return <CategoryPage slug="asus" />;
}
