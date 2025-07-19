import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Umiio - Techno-line.store',
  description: 'Umiio - качественные товары по выгодным ценам в Techno-line.store',
};

export default function UmiioPage() {
  return <CategoryPage slug="umiio" />;
}
