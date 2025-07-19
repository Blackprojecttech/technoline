import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: '128Gb - Techno-line.store',
  description: '128Gb - качественные товары по выгодным ценам в Techno-line.store',
};

export default function 128GbPage() {
  return <CategoryPage slug="128gb" />;
}
