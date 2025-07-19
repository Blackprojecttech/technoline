import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Техника для Дома - Techno-line.store',
  description: 'Техника для Дома - качественные товары по выгодным ценам в Techno-line.store',
};

export default function Page() {
  return <CategoryPage slug="tehnika-dlya-doma" />;
}
