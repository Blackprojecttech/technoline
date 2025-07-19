import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Внешние Аккумуляторы - Techno-line.store',
  description: 'Внешние Аккумуляторы - качественные товары по выгодным ценам в Techno-line.store',
};

export default function Page() {
  return <CategoryPage slug="vneshnie-akkumulyatory" />;
}
