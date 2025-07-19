import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'iPhone SE - Techno-line.store',
  description: 'iPhone SE - качественные товары по выгодным ценам в Techno-line.store',
};

export default function iPhoneSEPage() {
  return <CategoryPage slug="iphone-se" />;
}
