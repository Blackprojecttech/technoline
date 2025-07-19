import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'S22 Plus - Techno-line.store',
  description: 'S22 Plus - качественные товары по выгодным ценам в Techno-line.store',
};

export default function S22PlusPage() {
  return <CategoryPage slug="s22-plus" />;
}
