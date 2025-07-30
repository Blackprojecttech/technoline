import React, { useCallback, useState } from 'react'
import { Layout, Avatar, Popover, Button } from 'antd'
import { UserOutlined, LogoutOutlined, SettingOutlined, MenuOutlined } from '@ant-design/icons'
import { useAuth } from '../../hooks/useAuth'
import { useLocation } from 'react-router-dom'

console.log('RENDER: Header');

const { Header: AntHeader } = Layout

interface HeaderProps {
  isMobile?: boolean;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = React.memo(({ 
  isMobile = false,
  mobileMenuOpen = false,
  setMobileMenuOpen
}) => {
  const { user, logout } = useAuth()
  const [profileVisible, setProfileVisible] = useState(false)
  const location = useLocation();

  const handleLogout = useCallback(() => {
    logout()
  }, [logout])

  const handleProfileOpenChange = (open: boolean) => {
    setProfileVisible(open);
  };

  // Сброс поповера при смене маршрута
  React.useEffect(() => {
    setProfileVisible(false);
  }, [location.pathname]);

  return (
    <AntHeader style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: isMobile ? '0 16px' : '0 24px', 
      height: isMobile ? '60px' : '70px', 
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      position: 'relative'
    }}>
      {/* Декоративный фон */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
          pointerEvents: 'none'
        }}
      />
      
      <div className="flex items-center justify-between h-full relative z-10">
        <div className="flex items-center">
          {/* Мобильная кнопка меню */}
          {isMobile && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileMenuOpen && setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-menu-button"
              style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '18px',
                marginRight: '12px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          )}
          
          {/* Логотип для мобильной версии */}
          {isMobile && (
            <span style={{ 
              color: '#fff', 
              fontSize: '16px', 
              fontWeight: 'bold',
              marginLeft: '8px'
            }}>
              TechnoLine
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Профиль пользователя */}
          <Popover
            content={
              <div className="min-w-[160px]">
                <Button 
                  type="text" 
                  icon={<UserOutlined />} 
                  className="w-full text-left mb-2"
                  onClick={() => setProfileVisible(false)}
                >
                  Профиль
                </Button>
                <Button 
                  type="text" 
                  icon={<SettingOutlined />} 
                  className="w-full text-left mb-2"
                  onClick={() => setProfileVisible(false)}
                >
                  Настройки
                </Button>
                <div className="border-t border-gray-200 my-2" />
                <Button 
                  type="text" 
                  icon={<LogoutOutlined />} 
                  className="w-full text-left text-red-500 hover:text-red-600"
                  onClick={() => {
                    setProfileVisible(false)
                    handleLogout()
                  }}
                >
                  Выйти
                </Button>
              </div>
            }
            trigger="click"
            open={profileVisible}
            onOpenChange={handleProfileOpenChange}
            placement="topLeft"
            overlayStyle={{
              zIndex: 9999
            }}
          >
            <div className={`flex items-center ${isMobile ? 'space-x-2' : 'space-x-3'} cursor-pointer bg-white bg-opacity-20 backdrop-blur-sm hover:bg-white hover:bg-opacity-30 ${isMobile ? 'px-3 py-2' : 'px-4 py-2'} rounded-xl transition-all duration-200 border border-white border-opacity-30`}>
              <Avatar 
                size={isMobile ? "small" : "default"} 
                icon={<UserOutlined />} 
                style={{ 
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  border: '2px solid rgba(255,255,255,0.3)'
                }}
              />
              {!isMobile && (
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span className="text-xs text-white text-opacity-80">
                    Администратор
                  </span>
                </div>
              )}
            </div>
          </Popover>
        </div>
      </div>
    </AntHeader>
  )
})

export default Header