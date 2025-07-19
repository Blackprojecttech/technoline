import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'S24 - Techno-line.store',
  description: 'S24 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function S24Page() {
  return <CategoryPage slug="s24" />;
}
