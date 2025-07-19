import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'HOTWAV - Techno-line.store',
  description: 'HOTWAV - качественные товары по выгодным ценам в Techno-line.store',
};

export default function HOTWAVPage() {
  return <CategoryPage slug="hotwav" />;
}
