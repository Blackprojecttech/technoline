import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'ADATA - Techno-line.store',
  description: 'ADATA - качественные товары по выгодным ценам в Techno-line.store',
};

export default function ADATAPage() {
  return <CategoryPage slug="adata" />;
}
