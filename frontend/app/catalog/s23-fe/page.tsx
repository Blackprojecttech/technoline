import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'S23 FE - Techno-line.store',
  description: 'S23 FE - качественные товары по выгодным ценам в Techno-line.store',
};

export default function S23FEPage() {
  return <CategoryPage slug="s23-fe" />;
}
