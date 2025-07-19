import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: '16Gb - Techno-line.store',
  description: '16Gb - качественные товары по выгодным ценам в Techno-line.store',
};

export default function SixteenGbPage() {
  return <CategoryPage slug="16gb" />;
}
