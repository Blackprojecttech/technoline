'use client';

import { ReactNode, useState } from 'react';
import Header from './Header';
import CategoryMenu from './CategoryMenu';
import PopularCategories from './PopularCategories';
import Footer from './Footer';
import LoginModal from '../auth/LoginModal';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-light-50 to-accent-50 flex flex-col">
      <Header onLoginClick={() => setIsLoginModalOpen(true)} />
      <CategoryMenu />
      <PopularCategories />
      <main className="relative overflow-hidden w-full flex-1">
        {children}
        <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      </main>
      <Footer />
    </div>
  );
} 