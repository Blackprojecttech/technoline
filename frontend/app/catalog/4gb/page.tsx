import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: '4Gb - Techno-line.store',
  description: '4Gb - качественные товары по выгодным ценам в Techno-line.store',
};

export default function FourGbPage() {
  return <CategoryPage slug="4gb" />;
}
