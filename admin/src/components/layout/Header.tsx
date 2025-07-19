import React from 'react'
import { Layout, Avatar, Dropdown, Menu } from 'antd'
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons'
import { useAuth } from '../../hooks/useAuth'

const { Header: AntHeader } = Layout

const Header: React.FC = () => {
  const { user, logout } = useAuth()

  const menu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        Профиль
      </Menu.Item>
      <Menu.Item key="settings" icon={<SettingOutlined />}>
        Настройки
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={logout}>
        Выйти
      </Menu.Item>
    </Menu>
  )

  return (
    <AntHeader style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '0 24px', 
      height: '70px', 
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      position: 'relative',
      overflow: 'hidden'
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
          {/* Буква "т" в верхнем левом углу удалена */}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Профиль пользователя */}
          <Dropdown menu={{ items: [
            {
              key: 'profile',
              icon: <UserOutlined />,
              label: 'Профиль',
            },
            {
              key: 'settings',
              icon: <SettingOutlined />,
              label: 'Настройки',
            },
            { type: 'divider' },
            {
              key: 'logout',
              icon: <LogoutOutlined />,
              label: 'Выйти',
              onClick: logout,
            },
          ] }} placement="bottomRight">
            <div className="flex items-center space-x-3 cursor-pointer bg-white bg-opacity-20 backdrop-blur-sm hover:bg-white hover:bg-opacity-30 px-4 py-2 rounded-xl transition-all duration-200 border border-white border-opacity-30">
              <Avatar 
                size="default" 
                icon={<UserOutlined />} 
                style={{ 
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  border: '2px solid rgba(255,255,255,0.3)'
                }}
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="text-xs text-white text-opacity-80">
                  Администратор
                </span>
              </div>
            </div>
          </Dropdown>
        </div>
      </div>
    </AntHeader>
  )
}

export default Header 