import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Z Fold4 - Techno-line.store',
  description: 'Z Fold4 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function ZFold4Page() {
  return <CategoryPage slug="z-fold4" />;
}
