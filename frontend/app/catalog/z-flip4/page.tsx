import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Z Flip4 - Techno-line.store',
  description: 'Z Flip4 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function ZFlip4Page() {
  return <CategoryPage slug="z-flip4" />;
}
