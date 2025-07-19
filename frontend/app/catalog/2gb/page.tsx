import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: '2Gb - Techno-line.store',
  description: '2Gb - качественные товары по выгодным ценам в Techno-line.store',
};

export default function TwoGbPage() {
  return <CategoryPage slug="2gb" />;
}
