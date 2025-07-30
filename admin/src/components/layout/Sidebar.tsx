import React, { useCallback, useMemo, useState, useEffect } from 'react'
import { Layout, Menu, Button } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  ShoppingOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  TagsOutlined,
  CarOutlined,
  LogoutOutlined,
  HistoryOutlined,
  ExclamationCircleOutlined,
  PhoneOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  MessageOutlined,
  EditOutlined,
  CheckOutlined,
  DatabaseOutlined,
  TeamOutlined,
  DollarOutlined,
  CloseOutlined
} from '@ant-design/icons'
import { Tooltip } from 'antd';
import { useAuth } from '../../hooks/useAuth'
import { useOrderStats } from '../../hooks/useOrderStats'

console.log('RENDER: Sidebar');

const { Sider } = Layout

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  isMobile?: boolean;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = React.memo(({ 
  collapsed, 
  onCollapse, 
  isMobile = false,
  mobileMenuOpen = false,
  setMobileMenuOpen
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user, isAdmin, isAccountant } = useAuth()
  const { data: orderStats } = useOrderStats()
  const [editMode, setEditMode] = useState(false);
  const [menuOrder, setMenuOrder] = useState<string[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  
  // Сохраняем порядок в localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar_menu_order');
    if (saved) {
      setMenuOrder(JSON.parse(saved));
    }
  }, []);
  
  useEffect(() => {
    if (menuOrder.length > 0) {
      localStorage.setItem('sidebar_menu_order', JSON.stringify(menuOrder));
    }
  }, [menuOrder]);

  // Загрузка количества заявок на вывод
  useEffect(() => {
    const fetchPendingWithdrawals = async () => {
      if (!isAdmin()) return;
      
      try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/referrals/admin/withdrawals?status=pending&limit=1`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          setPendingWithdrawals(data.total || 0);
        }
      } catch (error) {
        console.error('Ошибка загрузки заявок на вывод:', error);
      }
    };

    fetchPendingWithdrawals();
    
    // Обновляем каждые 30 секунд
    const interval = setInterval(fetchPendingWithdrawals, 30000);
    
    return () => clearInterval(interval);
  }, [isAdmin]);

  const rawMenuItems = useMemo(() => [
    {
      key: '/admin/dashboard',
      icon: <DashboardOutlined />,
      label: 'Дашборд',
      title: 'Дашборд',
    },
    {
      key: '/admin/products',
      icon: <ShoppingOutlined />,
      label: 'Товары',
      title: 'Товары',
    },
    {
      key: '/admin/orders',
      icon: (() => {
        const hasNewOrders = orderStats?.newOrders && orderStats.newOrders > 0;
        const hasCallRequests = orderStats?.callRequests && orderStats.callRequests > 0;
        
        // Если есть и новые заказы, и запросы звонков - показываем только новые заказы
        if (hasNewOrders) {
          return (
            <div className="flex items-center" style={{ gap: '4px' }}>
              <ExclamationCircleOutlined 
                className="exclamation-icon"
                style={{ 
                  color: '#ff4d4f', 
                  fontSize: '16px'
                }} 
              />
              {(!collapsed || isMobile) && <span className="pending-count">{orderStats.newOrders}</span>}
            </div>
          );
        }
        
        // Если есть только запросы звонков
        if (hasCallRequests) {
          return (
            <div className="flex items-center" style={{ gap: '4px' }}>
              <PhoneOutlined 
                className="phone-icon"
                style={{ 
                  color: '#52c41a', 
                  fontSize: '16px'
                }} 
              />
              {(!collapsed || isMobile) && <span className="call-count">{orderStats.callRequests}</span>}
            </div>
          );
        }
        
        // По умолчанию обычная иконка
        return <ShoppingCartOutlined />;
      })(),
      label: 'Заказы',
      title: 'Заказы',
    },
    {
      key: '/admin/base',
      icon: <DatabaseOutlined />,
      label: 'База',
      title: 'База',
    },
    {
      key: '/admin/reviews',
      icon: <MessageOutlined />,
      label: 'Отзывы',
      title: 'Отзывы',
    },
    {
      key: '/admin/users',
      icon: <UserOutlined />,
      label: 'Пользователи',
      title: 'Пользователи',
    },
    {
      key: '/admin/categories',
      icon: <TagsOutlined />,
      label: 'Категории',
      title: 'Категории',
    },
    {
      key: '/admin/characteristics',
      icon: <SettingOutlined />,
      label: 'Характеристики',
      title: 'Характеристики',
    },
    {
      key: '/admin/delivery',
      icon: <CarOutlined />,
      label: 'Доставка',
      title: 'Доставка',
    },
    {
      key: '/admin/payment-methods',
      icon: <span role="img" aria-label="pay">💳</span>,
      label: 'Способы оплаты',
      title: 'Способы оплаты',
    },
    {
      key: '/admin/change-history',
      icon: <HistoryOutlined />,
      label: 'История изменений',
      title: 'История изменений',
    },
    {
      key: '/admin/referrals',
      icon: (() => {
        const hasPendingWithdrawals = pendingWithdrawals > 0;
        
        if (hasPendingWithdrawals) {
          return (
            <div className="flex items-center" style={{ gap: '4px' }}>
              <DollarOutlined 
                className="withdrawal-icon"
                style={{ 
                  color: '#ff4d4f', 
                  fontSize: '16px'
                }} 
              />
              {(!collapsed || isMobile) && <span className="withdrawal-count">{pendingWithdrawals}</span>}
            </div>
          );
        }
        
        return <TeamOutlined />;
      })(),
      label: 'Рефералы',
      title: 'Рефералы',
    },
  ], [orderStats, collapsed, isMobile])

  // Применяем порядок
  const menuItems = useMemo(() => {
    let items = rawMenuItems;
    
    if (menuOrder.length) {
      const map = Object.fromEntries(rawMenuItems.map(item => [item.key, item]));
      
      // Получаем пункты в сохраненном порядке
      const orderedItems = menuOrder.map(key => map[key]).filter(Boolean);
      
      // Добавляем новые пункты, которых нет в сохраненном порядке
      const existingKeys = new Set(menuOrder);
      const newItems = rawMenuItems.filter(item => !existingKeys.has(item.key));
      
      items = [...orderedItems, ...newItems];
    }
    
    // Фильтруем пункты меню для бухгалтера
    if (isAccountant()) {
      // Скрываем определенные пункты для бухгалтера
      const hiddenForAccountant = ['/admin/change-history', '/admin/payment-methods', '/admin/delivery', '/admin/characteristics', '/admin/categories', '/admin/referrals'];
      items = items.filter(item => !hiddenForAccountant.includes(item.key));
    }

    // Скрываем рефералы для всех, кроме администраторов
    if (!isAdmin()) {
      items = items.filter(item => item.key !== '/admin/referrals');
    }
    
    return items;
  }, [rawMenuItems, menuOrder, isAccountant]);

  const handleMenuClick = useCallback(({ key }: { key: string }) => {
    navigate(key)
    // Закрываем мобильное меню после клика
    if (isMobile && setMobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [navigate, isMobile, setMobileMenuOpen])

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login')
    // Закрываем мобильное меню
    if (isMobile && setMobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [logout, navigate, isMobile, setMobileMenuOpen])

  const handleToggleCollapse = useCallback(() => {
    onCollapse(!collapsed);
  }, [collapsed, onCollapse]);

  // Мобильная версия
  if (isMobile) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Мобильный хедер сайдбара */}
        <div style={{
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.05)',
        }}>
          <span style={{ 
            color: '#fff', 
            fontSize: '18px', 
            fontWeight: 'bold' 
          }}>
            TechnoLine
          </span>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={() => setMobileMenuOpen && setMobileMenuOpen(false)}
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '16px',
            }}
          />
        </div>

        {/* Мобильное меню */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '16px 8px',
              fontSize: '16px',
            }}
            className="mobile-menu"
          />
        </div>

        {/* Мобильный футер с выходом */}
        <div style={{ 
          padding: '16px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.05)',
        }}>
          <Menu
            theme="dark"
            mode="inline"
            items={[
              {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: 'Выйти',
                onClick: handleLogout,
              },
            ]}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '16px',
            }}
          />
        </div>
      </div>
    );
  }

  // Десктопная версия (существующий код)
  return (
    <Sider 
      width={180} 
      collapsed={collapsed}
      collapsedWidth={80}
      theme="dark"
      style={{
        background: 'linear-gradient(180deg, #1e293b 0%, #334155 50%, #475569 100%)',
        boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
        position: 'relative',
        left: 0,
        minWidth: 0,
      }}
    >
      {/* Кнопка drag-and-drop меню */}
      {!collapsed && (
        <div style={{ position: 'absolute', top: 8, left: 16, zIndex: 20 }}>
          <Tooltip title={editMode ? 'Сохранить порядок' : 'Редактировать меню'} placement="right">
            <Button
              size="small"
              shape="circle"
              type={editMode ? 'primary' : 'default'}
              icon={editMode ? <CheckOutlined /> : <EditOutlined />}
              onClick={() => setEditMode(e => !e)}
              style={{
                fontSize: 16,
                fontWeight: 500,
                borderRadius: '50%',
                boxShadow: editMode ? '0 2px 8px #8882' : undefined,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            />
          </Tooltip>
        </div>
      )}
      {/* Декоративный фон */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 80%, rgba(102, 126, 234, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none'
        }}
      />
      
      {/* Кнопка сворачивания */}
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        zIndex: 10,
      }}>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={handleToggleCollapse}
          className="sidebar-toggle-btn"
          style={{
            color: 'rgba(255, 255, 255, 0.8)',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          size="small"
        />
      </div>
      
      <div className="logo sidebar-logo" style={{
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '16px',
        fontWeight: 'bold',
        marginBottom: '8px',
        position: 'relative',
        zIndex: 1,
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingTop: '40px', // Место для кнопки
      }}>
        <span style={{ fontSize: collapsed ? '12px' : '14px' }}>
          {collapsed ? 'TL' : 'TechnoLine'}
        </span>
      </div>
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        {editMode ? (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {menuItems.map((item, idx) => (
              <li
                key={item.key}
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData('text/plain', String(idx));
                }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  const from = Number(e.dataTransfer.getData('text/plain'));
                  if (from === idx) return;
                  const newOrder = [...menuItems];
                  const [moved] = newOrder.splice(from, 1);
                  newOrder.splice(idx, 0, moved);
                  setMenuOrder(newOrder.map(i => i.key));
                }}
                style={{
                  padding: '8px 12px',
                  margin: '2px 0',
                  background: '#223',
                  borderRadius: 6,
                  cursor: 'grab',
                  color: '#fff',
                  fontWeight: 500,
                  opacity: 0.95,
                  border: '1px solid #334',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '0 4px',
              fontSize: '14px',
            }}
            className="custom-menu"
          />
        )}
      </div>
      
      <div style={{ 
        position: 'absolute', 
        bottom: 0, 
        width: '100%', 
        padding: '8px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)',
        zIndex: 1
      }}>
        <Menu
          theme="dark"
          mode="inline"
          items={[
            {
              key: 'logout',
              icon: <LogoutOutlined />,
              label: collapsed ? '' : 'Выйти',
              onClick: handleLogout,
            },
          ]}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '14px',
          }}
        />
      </div>
      
      {/* Дополнительные декоративные элементы */}
      <div 
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '120px',
          height: '120px',
          background: 'radial-gradient(circle, rgba(102, 126, 234, 0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
    </Sider>
  )
})

export default Sidebar 