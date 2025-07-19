import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Redmi Note - Techno-line.store',
  description: 'Redmi Note - качественные товары по выгодным ценам в Techno-line.store',
};

export default function RedmiNotePage() {
  return <CategoryPage slug="redmi-note" />;
}
