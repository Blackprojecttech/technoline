import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Автомобильные зарядки - Techno-line.store',
  description: 'Автомобильные зарядки - качественные товары по выгодным ценам в Techno-line.store',
};

export default function Page() {
  return <CategoryPage slug="avtomobilnye-zaryadki" />;
}
