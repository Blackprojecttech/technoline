import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'MicroSD - Techno-line.store',
  description: 'MicroSD - качественные товары по выгодным ценам в Techno-line.store',
};

export default function MicroSDPage() {
  return <CategoryPage slug="microsd" />;
}
