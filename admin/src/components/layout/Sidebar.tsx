import React from 'react'
import { Layout, Menu } from 'antd'
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
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { useAuth } from '../../hooks/useAuth'
import { useOrderStats } from '../../hooks/useOrderStats'

const { Sider } = Layout

const Sidebar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  const { data: orderStats } = useOrderStats()

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Дашборд',
    },
    {
      key: '/products',
      icon: <ShoppingOutlined />,
      label: 'Товары',
    },
    {
      key: '/orders',
      icon: orderStats?.pending && orderStats.pending > 0 ? (
        <div className="flex items-center" style={{ gap: '4px' }}>
          <ExclamationCircleOutlined 
            className="exclamation-icon"
            style={{ 
              color: '#ff4d4f', 
              fontSize: '16px'
            }} 
          />
          <span className="pending-count">{orderStats.pending}</span>
        </div>
      ) : (
        <ShoppingCartOutlined />
      ),
      label: 'Заказы',
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: 'Пользователи',
    },
    {
      key: '/categories',
      icon: <TagsOutlined />,
      label: 'Категории',
    },
    {
      key: '/delivery',
      icon: <CarOutlined />,
      label: 'Доставка',
    },
    {
      key: '/payment-methods',
      icon: <span role="img" aria-label="pay">💳</span>,
      label: 'Способы оплаты',
    },
    {
      key: '/change-history',
      icon: <HistoryOutlined />,
      label: 'История изменений',
    },
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <Sider 
      width={180} 
      theme="dark"
      style={{
        background: 'linear-gradient(180deg, #1e293b 0%, #334155 50%, #475569 100%)',
        boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
        position: 'relative',
        overflow: 'hidden',
        left: 0,
        minWidth: 0,
      }}
    >
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
      
      <div className="logo" style={{
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
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <span style={{ fontSize: '14px' }}>TechnoLine</span>
      </div>
      
      <div style={{ position: 'relative', zIndex: 1 }}>
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
              label: 'Выйти',
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
}

export default Sidebar 