import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Oukitel - Techno-line.store',
  description: 'Oukitel - качественные товары по выгодным ценам в Techno-line.store',
};

export default function OukitelPage() {
  return <CategoryPage slug="oukitel" />;
}
