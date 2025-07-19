import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'ITEL - Techno-line.store',
  description: 'ITEL - качественные товары по выгодным ценам в Techno-line.store',
};

export default function ITELPage() {
  return <CategoryPage slug="itel" />;
}
