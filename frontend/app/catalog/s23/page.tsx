import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'S23 - Techno-line.store',
  description: 'S23 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function S23Page() {
  return <CategoryPage slug="s23" />;
}
