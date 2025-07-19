import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Z Flip5 - Techno-line.store',
  description: 'Z Flip5 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function ZFlip5Page() {
  return <CategoryPage slug="z-flip5" />;
}
