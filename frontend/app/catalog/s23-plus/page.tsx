import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'S23 Plus - Techno-line.store',
  description: 'S23 Plus - качественные товары по выгодным ценам в Techno-line.store',
};

export default function S23PlusPage() {
  return <CategoryPage slug="s23-plus" />;
}
