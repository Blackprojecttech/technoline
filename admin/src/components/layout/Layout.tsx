import React, { useState, useEffect, useMemo } from 'react'
import { Layout as AntLayout } from 'antd'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

const { Content } = AntLayout

const Layout: React.FC = React.memo(() => {
  // Состояние сайдбара с сохранением в localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved ? JSON.parse(saved) : false; // По умолчанию развернут
  });

  // Состояние мобильного меню
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Проверка размера экрана
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      // На мобильных устройствах закрываем меню при изменении размера
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Сохраняем состояние в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Закрытие мобильного меню при клике вне его
  useEffect(() => {
    if (mobileMenuOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.mobile-sidebar') && !target.closest('.mobile-menu-button')) {
          setMobileMenuOpen(false);
        }
      };

      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [mobileMenuOpen]);

  const layoutStyle = useMemo(() => ({
    minHeight: '100vh', 
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    position: 'relative' as const
  }), [])

  const backgroundStyle = useMemo(() => ({
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    zIndex: 0
  }), [])

  const contentStyle = useMemo(() => ({
    overflowY: 'auto' as const,
    maxWidth: '100%',
    overflowX: 'hidden' as const,
    minHeight: isMobile ? 'calc(100vh - 60px)' : 'calc(100vh - 70px)',
    padding: isMobile ? '16px' : '32px', 
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: isMobile ? '16px' : '20px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    position: 'relative' as const,
    margin: isMobile ? '8px' : '0',
  }), [isMobile])

  const decorativeStyle = useMemo(() => ({
    position: 'absolute' as const,
    top: '-50%',
    right: '-50%',
    width: '200%',
    height: '200%',
    background: 'radial-gradient(circle at 30% 70%, rgba(102, 126, 234, 0.1) 0%, transparent 50%)',
    pointerEvents: 'none' as const
  }), [])

  return (
    <AntLayout style={layoutStyle}>
      {/* Фоновый градиент */}
      <div style={backgroundStyle} />
      
      {/* Мобильная версия */}
      {isMobile ? (
        <>
          {/* Мобильный overlay при открытом меню */}
          {mobileMenuOpen && (
            <div 
              className="mobile-overlay"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 998,
                backdropFilter: 'blur(4px)',
              }}
            />
          )}
          
          {/* Мобильный сайдбар */}
          <div 
            className="mobile-sidebar"
            style={{
              position: 'fixed',
              top: 0,
              left: mobileMenuOpen ? 0 : '-280px',
              width: '280px',
              height: '100vh',
              zIndex: 999,
              transition: 'left 0.3s ease',
              background: 'linear-gradient(180deg, #1e293b 0%, #334155 50%, #475569 100%)',
              boxShadow: '4px 0 20px rgba(0,0,0,0.3)',
            }}
          >
            <Sidebar 
              collapsed={false}
              onCollapse={() => {}}
              isMobile={true}
              mobileMenuOpen={mobileMenuOpen}
              setMobileMenuOpen={setMobileMenuOpen}
            />
          </div>
          
          <AntLayout style={{ position: 'relative', zIndex: 1 }}>
            <Header 
              isMobile={true}
              mobileMenuOpen={mobileMenuOpen}
              setMobileMenuOpen={setMobileMenuOpen}
            />
            <Content style={contentStyle}>
              <div style={decorativeStyle} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <Outlet />
              </div>
            </Content>
          </AntLayout>
        </>
      ) : (
        /* Десктопная версия */
        <>
          <Sidebar 
            collapsed={sidebarCollapsed}
            onCollapse={setSidebarCollapsed}
            isMobile={false}
          />
          <AntLayout style={{ position: 'relative', zIndex: 1 }}>
            <Header isMobile={false} />
            <Content style={contentStyle}>
              <div style={decorativeStyle} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <Outlet />
              </div>
            </Content>
          </AntLayout>
        </>
      )}
    </AntLayout>
  )
})

export default Layout 