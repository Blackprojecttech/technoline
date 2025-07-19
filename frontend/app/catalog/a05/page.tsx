import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'A05 - Techno-line.store',
  description: 'A05 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function A05Page() {
  return <CategoryPage slug="a05" />;
}
