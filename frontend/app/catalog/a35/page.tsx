import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'A35 - Techno-line.store',
  description: 'A35 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function A35Page() {
  return <CategoryPage slug="a35" />;
}
