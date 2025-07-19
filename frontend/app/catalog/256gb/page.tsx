import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: '256Gb - Techno-line.store',
  description: '256Gb - качественные товары по выгодным ценам в Techno-line.store',
};

export default function TwoHundredFiftySixGbPage() {
  return <CategoryPage slug="256gb" />;
}
