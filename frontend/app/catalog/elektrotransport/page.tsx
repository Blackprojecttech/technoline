import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Электротранспорт - Techno-line.store',
  description: 'Электротранспорт - качественные товары по выгодным ценам в Techno-line.store',
};

export default function Page() {
  return <CategoryPage slug="elektrotransport" />;
}
