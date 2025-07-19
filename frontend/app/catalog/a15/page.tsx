import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'A15 - Techno-line.store',
  description: 'A15 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function A15Page() {
  return <CategoryPage slug="a15" />;
}
