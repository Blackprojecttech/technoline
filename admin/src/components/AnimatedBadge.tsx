import React from 'react';
import { Badge } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import './AnimatedBadge.css';

interface AnimatedBadgeProps {
  count: number;
  children: React.ReactNode;
}

const AnimatedBadge: React.FC<AnimatedBadgeProps> = ({ count, children }) => {
  if (count === 0) {
    return <>{children}</>;
  }

  return (
    <Badge
      count={
        <div className="animated-badge">
          <ExclamationCircleOutlined className="badge-icon" />
          <span className="badge-count">{count}</span>
        </div>
      }
      offset={[-8, 8]}
      size="small"
      style={{ 
        zIndex: 1000,
        position: 'relative'
      }}
    >
      {children}
    </Badge>
  );
};

export default AnimatedBadge; 