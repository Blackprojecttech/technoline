import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'M54 - Techno-line.store',
  description: 'M54 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function M54Page() {
  return <CategoryPage slug="m54" />;
}
