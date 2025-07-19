import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Apple - Techno-line.store',
  description: 'Apple - качественные товары по выгодным ценам в Techno-line.store',
};

export default function ApplePage() {
  return <CategoryPage slug="apple" />;
}
