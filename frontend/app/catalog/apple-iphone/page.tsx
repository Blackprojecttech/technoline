import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Apple iPhone - Techno-line.store',
  description: 'Apple iPhone - качественные товары по выгодным ценам в Techno-line.store',
};

export default function AppleiPhonePage() {
  return <CategoryPage slug="apple-iphone" />;
}
