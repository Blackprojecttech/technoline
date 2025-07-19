import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'A55 - Techno-line.store',
  description: 'A55 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function A55Page() {
  return <CategoryPage slug="a55" />;
}
