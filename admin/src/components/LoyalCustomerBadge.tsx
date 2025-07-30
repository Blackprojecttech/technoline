import React from 'react';
import { CrownOutlined } from '@ant-design/icons';
import './LoyalCustomerBadge.css';

interface LoyalCustomerBadgeProps {
  customerName: string;
  orderCount: number;
}

const LoyalCustomerBadge: React.FC<LoyalCustomerBadgeProps> = ({ customerName, orderCount }) => {
  return (
    <div className="loyal-customer-container">
      <div className="loyal-customer-name">
        {customerName}
      </div>
      <div className="loyal-customer-badge">
        <CrownOutlined className="crown-icon" />
        <span className="badge-text">Постоянник</span>
        <span className="order-count">({orderCount} заказов)</span>
      </div>
    </div>
  );
};

export default LoyalCustomerBadge; 