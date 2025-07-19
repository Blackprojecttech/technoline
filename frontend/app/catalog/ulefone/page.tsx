import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Ulefone - Techno-line.store',
  description: 'Ulefone - качественные товары по выгодным ценам в Techno-line.store',
};

export default function UlefonePage() {
  return <CategoryPage slug="ulefone" />;
}
