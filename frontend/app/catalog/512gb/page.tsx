import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: '512Gb - Techno-line.store',
  description: '512Gb - качественные товары по выгодным ценам в Techno-line.store',
};

export default function 512GbPage() {
  return <CategoryPage slug="512gb" />;
}
