import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'S25 - Techno-line.store',
  description: 'S25 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function S25Page() {
  return <CategoryPage slug="s25" />;
}
