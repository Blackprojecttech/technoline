import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Мобильные телефоны - Techno-line.store',
  description: 'Мобильные телефоны - качественные товары по выгодным ценам в Techno-line.store',
};

export default function Page() {
  return <CategoryPage slug="mobilnye-telefony" />;
}
