import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'SE/SE2 - Techno-line.store',
  description: 'SE/SE2 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function SESE2Page() {
  return <CategoryPage slug="sese2" />;
}
