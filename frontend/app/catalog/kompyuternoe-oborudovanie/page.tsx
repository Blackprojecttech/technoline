import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Компьютерное оборудование - Techno-line.store',
  description: 'Компьютерное оборудование - качественные товары по выгодным ценам в Techno-line.store',
};

export default function Page() {
  return <CategoryPage slug="kompyuternoe-oborudovanie" />;
}
