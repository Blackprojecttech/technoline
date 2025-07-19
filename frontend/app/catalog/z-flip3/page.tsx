import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Z Flip3 - Techno-line.store',
  description: 'Z Flip3 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function ZFlip3Page() {
  return <CategoryPage slug="z-flip3" />;
}
