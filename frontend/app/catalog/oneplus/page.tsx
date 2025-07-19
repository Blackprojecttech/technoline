import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'OnePlus - Techno-line.store',
  description: 'OnePlus - качественные товары по выгодным ценам в Techno-line.store',
};

export default function OnePlusPage() {
  return <CategoryPage slug="oneplus" />;
}
