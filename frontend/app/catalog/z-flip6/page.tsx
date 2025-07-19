import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Z Flip6 - Techno-line.store',
  description: 'Z Flip6 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function ZFlip6Page() {
  return <CategoryPage slug="z-flip6" />;
}
