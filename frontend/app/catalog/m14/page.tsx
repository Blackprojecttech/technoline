import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'M14 - Techno-line.store',
  description: 'M14 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function M14Page() {
  return <CategoryPage slug="m14" />;
}
