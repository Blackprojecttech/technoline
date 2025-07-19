import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Умные Часы - Techno-line.store',
  description: 'Умные Часы - качественные товары по выгодным ценам в Techno-line.store',
};

export default function Page() {
  return <CategoryPage slug="umnye-chasy" />;
}
