import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Samsung - Techno-line.store',
  description: 'Samsung - качественные товары по выгодным ценам в Techno-line.store',
};

export default function SamsungPage() {
  return <CategoryPage slug="samsung" />;
}
