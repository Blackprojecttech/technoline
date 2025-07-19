import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'SD-карты - Techno-line.store',
  description: 'SD-карты - качественные товары по выгодным ценам в Techno-line.store',
};

export default function SDPage() {
  return <CategoryPage slug="sd-karty" />;
}
