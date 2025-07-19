import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'S22 - Techno-line.store',
  description: 'S22 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function S22Page() {
  return <CategoryPage slug="s22" />;
}
