import React from 'react'
import { Layout as AntLayout } from 'antd'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

const { Content } = AntLayout

const Layout: React.FC = () => {
  return (
    <AntLayout style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative'
    }}>
      {/* Фоновый градиент */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          zIndex: 0
        }}
      />
      
      <Sidebar />
      <AntLayout style={{ position: 'relative', zIndex: 1 }}>
        <Header />
        <Content style={{ 
          overflowY: 'auto',
          maxWidth: '100%',
          overflowX: 'hidden',
          minHeight: 'calc(100vh - 70px)',
          padding: '32px', 
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          position: 'relative',
        }}>
          {/* Дополнительный декоративный элемент */}
          <div 
            style={{
              position: 'absolute',
              top: '-50%',
              right: '-50%',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle, rgba(102, 126, 234, 0.05) 0%, transparent 70%)',
              pointerEvents: 'none'
            }}
          />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Outlet />
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  )
}

export default Layout 