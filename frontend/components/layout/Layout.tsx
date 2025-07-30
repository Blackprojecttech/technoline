'use client';

import { ReactNode, useState } from 'react';
import Header from './Header';
import CategoryMenu from './CategoryMenu';
import PopularCategories from './PopularCategories';
import Footer from './Footer';
import LoginModal from '../auth/LoginModal';
import NotificationDrawer from './NotificationDrawer';
import MobileNavigation from './MobileNavigation';
import CartHydration from '../CartHydration';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-light-50 to-accent-50 flex flex-col">
      <CartHydration />
      <Header onLoginClick={() => setIsLoginModalOpen(true)} onNotificationClick={() => setIsNotificationDrawerOpen(true)} />
      <CategoryMenu />
      <PopularCategories />
      
      <main className="relative overflow-x-hidden w-full flex-1 pb-20 md:pb-0">
        {children}
        <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
        <NotificationDrawer open={isNotificationDrawerOpen} onClose={() => setIsNotificationDrawerOpen(false)} />
      </main>
      
      {/* Футер - скрыт на мобильных */}
      <div className="hidden md:block">
        <Footer />
      </div>
      
      <MobileNavigation />
    </div>
  );
} 