import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Ultra 1/2 - Techno-line.store',
  description: 'Ultra 1/2 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function Ultra12Page() {
  return <CategoryPage slug="ultra-12" />;
}
