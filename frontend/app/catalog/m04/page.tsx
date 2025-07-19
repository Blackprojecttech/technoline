import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'M04 - Techno-line.store',
  description: 'M04 - качественные товары по выгодным ценам в Techno-line.store',
};

export default function M04Page() {
  return <CategoryPage slug="m04" />;
}
