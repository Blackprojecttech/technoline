import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'S8/9/10 - Techno-line.store',
  description: 'S8/9/10 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function S8910Page() {
  return <CategoryPage slug="s8910" />;
}
