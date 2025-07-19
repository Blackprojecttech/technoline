import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Z Fold3 - Techno-line.store',
  description: 'Z Fold3 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function ZFold3Page() {
  return <CategoryPage slug="z-fold3" />;
}
