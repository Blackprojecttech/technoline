import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: '8Gb - Techno-line.store',
  description: '8Gb - качественные товары по выгодным ценам в Techno-line.store',
};

export default function EightGbPage() {
  return <CategoryPage slug="8gb" />;
}
