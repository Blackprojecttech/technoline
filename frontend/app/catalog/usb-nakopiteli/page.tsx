import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'USB-накопители - Techno-line.store',
  description: 'USB-накопители - качественные товары по выгодным ценам в Techno-line.store',
};

export default function USBPage() {
  return <CategoryPage slug="usb-nakopiteli" />;
}
