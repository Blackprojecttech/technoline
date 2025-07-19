import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Ноутбуки и Планшеты - Techno-line.store',
  description: 'Ноутбуки и Планшеты - качественные товары по выгодным ценам в Techno-line.store',
};

export default function Page() {
  return <CategoryPage slug="noutbuki-i-planshety" />;
}
