import { Metadata } from 'next';
import CategoryPage from '@/components/CategoryPage';

export const metadata: Metadata = {
  title: 'Huawei - Techno-line.store',
  description: 'Huawei - качественные товары по выгодным ценам в Techno-line.store',
};

export default function HuaweiPage() {
  return <CategoryPage slug="huawei" />;
}
