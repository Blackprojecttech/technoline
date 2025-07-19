import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Xiaomi - Techno-line.store',
  description: 'Xiaomi - качественные товары по выгодным ценам в Techno-line.store',
};

export default function XiaomiPage() {
  return <CategoryPage slug="xiaomi" />;
}
