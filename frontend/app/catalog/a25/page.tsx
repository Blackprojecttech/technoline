import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'A25 - Techno-line.store',
  description: 'A25 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function A25Page() {
  return <CategoryPage slug="a25" />;
}
