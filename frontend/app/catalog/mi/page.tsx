import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Mi - Techno-line.store',
  description: 'Mi - качественные товары по выгодным ценам в Techno-line.store',
};

export default function MiPage() {
  return <CategoryPage slug="mi" />;
}
