import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Nokia - Techno-line.store',
  description: 'Nokia - качественные товары по выгодным ценам в Techno-line.store',
};

export default function NokiaPage() {
  return <CategoryPage slug="nokia" />;
}
