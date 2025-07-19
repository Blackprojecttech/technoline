import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'M24 - Techno-line.store',
  description: 'M24 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function M24Page() {
  return <CategoryPage slug="m24" />;
}
