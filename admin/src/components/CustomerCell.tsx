import React from 'react';
import { Tag, Tooltip } from 'antd';
import { UserOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './CustomerCell.css';

interface CustomerCellProps {
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    isPartiallyRegistered?: boolean;
  };
  userId?: string; // Fallback для случая, когда user отсутствует
  deliveredOrdersCount?: number; // Количество доставленных заказов
  shippingAddress?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

const CustomerCell: React.FC<CustomerCellProps> = ({ user, userId, deliveredOrdersCount, shippingAddress }) => {
  const navigate = useNavigate();
  
  // Отладочная информация
  console.log('📋 CustomerCell - данные пользователя:', {
    user,
    userId,
    deliveredOrdersCount,
    isVIP: deliveredOrdersCount && deliveredOrdersCount >= 3,
    shippingAddress,
    hasUserId: !!user?._id,
    fallbackUserId: userId,
    isPartiallyRegistered: user?.isPartiallyRegistered
  });
  
  // Используем данные из user или shippingAddress
  const firstName = user?.firstName || shippingAddress?.firstName || '';
  const lastName = user?.lastName || shippingAddress?.lastName || '';
  const email = user?.email || shippingAddress?.email || '';
  const phone = user?.phone || shippingAddress?.phone || '';
  const isPartiallyRegistered = user?.isPartiallyRegistered;

  // Функция для перехода в профиль пользователя
  const handleNavigateToProfile = () => {
    
    console.log('🖱️ Клик на имя пользователя:', {
      userObjectId: user?._id,
      fallbackUserId: userId,
      targetUserId,
      isPartiallyRegistered,
      canNavigate: targetUserId && !isPartiallyRegistered,
      userData: user
    });
    
    if (targetUserId && !isPartiallyRegistered) {
      console.log('✅ Переходим в профиль пользователя:', `/admin/users/${targetUserId}`);
      try {
        navigate(`/admin/users/${targetUserId}`);
        console.log('✅ Навигация выполнена успешно');
      } catch (error) {
        console.error('❌ Ошибка навигации:', error);
        // Попробуем альтернативный способ
        window.location.href = `/admin/users/${targetUserId}`;
      }
    } else {
      console.log('❌ Переход невозможен - нет ID пользователя или это гостевой аккаунт');
    }
  };

  const customerCellStyle: React.CSSProperties = {
    lineHeight: '1.4',
    fontSize: '13px'
  };

  const nameStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '6px'
  };

  const contactStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: '#8c8c8c',
    textDecoration: 'none',
    fontSize: '12px',
    marginBottom: '2px'
  };

  const targetUserId = user?._id || userId;
  const canNavigate = targetUserId && !isPartiallyRegistered;
  
  const nameClickableStyle: React.CSSProperties = {
    fontWeight: 500,
    cursor: canNavigate ? 'pointer' : 'default',
    color: canNavigate ? '#1890ff' : 'inherit',
    textDecoration: canNavigate ? 'underline' : 'none',
    transition: 'all 0.2s ease',
    borderRadius: '2px',
    padding: '1px 2px'
  };

  return (
    <div style={customerCellStyle}>
      {/* Имя клиента */}
      <div style={nameStyle}>
        <UserOutlined style={{ color: '#8c8c8c', fontSize: '12px' }} />
        <span 
          style={nameClickableStyle}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleNavigateToProfile();
          }}
          onMouseEnter={(e) => {
            if (canNavigate) {
              e.currentTarget.style.backgroundColor = '#e6f7ff';
              e.currentTarget.style.color = '#096dd9';
            }
          }}
          onMouseLeave={(e) => {
            if (canNavigate) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#1890ff';
            }
          }}
          title={canNavigate ? 'Перейти в профиль пользователя' : ''}
        >
          {firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Гость'}
        </span>
        {isPartiallyRegistered && (
          <Tag color="orange" style={{ fontSize: '10px', marginLeft: '4px', lineHeight: '16px' }}>
            Гостевой
          </Tag>
        )}
        {(deliveredOrdersCount && deliveredOrdersCount >= 3) && (
          <Tag 
            color="gold" 
            style={{ 
              fontSize: '9px', 
              marginLeft: '4px', 
              lineHeight: '16px',
              animation: 'vip-pulse 2s infinite',
              background: 'linear-gradient(45deg, #FFD700, #FFA500)',
              color: '#8B4513',
              fontWeight: 'bold',
              textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              border: '1px solid #FFD700',
              boxShadow: '0 0 8px rgba(255, 215, 0, 0.5)'
            }}
          >
            ⭐ ПОСТОЯННИК
          </Tag>
        )}
      </div>

      {/* Телефон */}
      {phone && (
        <div style={{ marginBottom: '2px' }}>
          <Tooltip title="Позвонить">
            <a 
              href={`tel:${phone}`} 
              style={contactStyle}
              onMouseEnter={(e) => e.currentTarget.style.color = '#1890ff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#8c8c8c'}
            >
              <PhoneOutlined style={{ fontSize: '11px' }} />
              <span>{phone}</span>
            </a>
          </Tooltip>
        </div>
      )}

      {/* Email */}
      {email && (
        <div>
          <Tooltip title="Написать">
            <a 
              href={`mailto:${email}`} 
              style={contactStyle}
              onMouseEnter={(e) => e.currentTarget.style.color = '#1890ff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#8c8c8c'}
            >
              <MailOutlined style={{ fontSize: '11px' }} />
              <span>{email}</span>
            </a>
          </Tooltip>
        </div>
      )}
    </div>
  );
};

export default CustomerCell; 