import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Redmi - Techno-line.store',
  description: 'Redmi - качественные товары по выгодным ценам в Techno-line.store',
};

export default function RedmiPage() {
  return <CategoryPage slug="redmi" />;
}
