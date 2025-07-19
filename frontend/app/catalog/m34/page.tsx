import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'M34 - Techno-line.store',
  description: 'M34 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function M34Page() {
  return <CategoryPage slug="m34" />;
}
