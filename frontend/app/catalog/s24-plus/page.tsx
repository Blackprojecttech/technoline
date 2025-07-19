import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'S24 Plus - Techno-line.store',
  description: 'S24 Plus - качественные товары по выгодным ценам в Techno-line.store',
};

export default function S24PlusPage() {
  return <CategoryPage slug="s24-plus" />;
}
