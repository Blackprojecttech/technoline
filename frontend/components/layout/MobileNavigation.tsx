'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Grid3X3, ShoppingCart, Truck, User } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

export default function MobileNavigation() {
  const pathname = usePathname();
  const { itemCount } = useSelector((state: RootState) => state.cart);
  const { isAuthenticated } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const mobileNavItems = [
    { 
      name: 'Главная', 
      href: '/', 
      icon: Home,
      isActive: isClient && pathname === '/'
    },
    { 
      name: 'Каталог', 
      href: '/catalog', 
      icon: Grid3X3,
      isActive: isClient && pathname.startsWith('/catalog')
    },
    { 
      name: 'Корзина', 
      href: '/cart', 
      icon: ShoppingCart,
      badge: isClient && itemCount > 0 ? itemCount : undefined,
      isActive: isClient && pathname === '/cart'
    },
    { 
      name: 'Доставка', 
      href: '/delivery', 
      icon: Truck,
      isActive: isClient && pathname === '/delivery'
    },
    { 
      name: 'Профиль', 
      href: isAuthenticated ? '/profile' : '/auth/login', 
      icon: User,
      isActive: isClient && (pathname.startsWith('/profile') || pathname.startsWith('/auth'))
    },
  ];

  // Не рендерим навигацию до гидратации на клиенте
  if (!isClient) {
    return null;
  }

  return (
    <nav className="mobile-nav safe-area-bottom mobile-only">
      <div className="grid grid-cols-5 h-full">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`mobile-nav-item ${item.isActive ? 'active' : ''}`}
            >
              <div className="relative">
                <Icon className="w-7 h-7" />
                {item.badge && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-semibold">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="mt-1">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
} 