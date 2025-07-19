import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Наушники и Колонки - Techno-line.store',
  description: 'Наушники и Колонки - качественные товары по выгодным ценам в Techno-line.store',
};

export default function Page() {
  return <CategoryPage slug="naushniki-i-kolonki" />;
}
