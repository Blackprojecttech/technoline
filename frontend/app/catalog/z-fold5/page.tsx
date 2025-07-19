import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Z Fold5 - Techno-line.store',
  description: 'Z Fold5 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function ZFold5Page() {
  return <CategoryPage slug="z-fold5" />;
}
