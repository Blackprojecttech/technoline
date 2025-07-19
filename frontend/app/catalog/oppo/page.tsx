import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'OPPO - Techno-line.store',
  description: 'OPPO - качественные товары по выгодным ценам в Techno-line.store',
};

export default function OPPOPage() {
  return <CategoryPage slug="oppo" />;
}
