import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Настольные держатели - Techno-line.store',
  description: 'Настольные держатели - качественные товары по выгодным ценам в Techno-line.store',
};

export default function Page() {
  return <CategoryPage slug="nastolnye-derzhateli" />;
}
