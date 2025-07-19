import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'S24 FE - Techno-line.store',
  description: 'S24 FE - качественные товары по выгодным ценам в Techno-line.store',
};

export default function S24FEPage() {
  return <CategoryPage slug="s24-fe" />;
}
