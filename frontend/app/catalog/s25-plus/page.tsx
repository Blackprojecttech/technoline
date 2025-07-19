import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'S25 Plus - Techno-line.store',
  description: 'S25 Plus - качественные товары по выгодным ценам в Techno-line.store',
};

export default function S25PlusPage() {
  return <CategoryPage slug="s25-plus" />;
}
