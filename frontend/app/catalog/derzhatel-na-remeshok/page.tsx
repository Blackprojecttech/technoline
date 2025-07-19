import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Держатель на ремешок - Techno-line.store',
  description: 'Держатель на ремешок - качественные товары по выгодным ценам в Techno-line.store',
};

export default function Page() {
  return <CategoryPage slug="derzhatel-na-remeshok" />;
}
