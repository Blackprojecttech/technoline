import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Meizu - Techno-line.store',
  description: 'Meizu - качественные товары по выгодным ценам в Techno-line.store',
};

export default function MeizuPage() {
  return <CategoryPage slug="meizu" />;
}
