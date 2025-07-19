import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'S20 FE - Techno-line.store',
  description: 'S20 FE - качественные товары по выгодным ценам в Techno-line.store',
};

export default function S20FEPage() {
  return <CategoryPage slug="s20-fe" />;
}
