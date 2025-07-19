import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Z Fold6 - Techno-line.store',
  description: 'Z Fold6 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function ZFold6Page() {
  return <CategoryPage slug="z-fold6" />;
}
