import React, { useState, useEffect } from 'react';
import { Table, Card, Row, Col, Button, Space, Tag, Typography } from 'antd';
import { TableProps } from 'antd/es/table';

const { Text } = Typography;

interface MobileTableProps extends TableProps<any> {
  mobileCardRender?: (record: any, index: number) => React.ReactNode;
  mobileCols?: number;
}

const MobileTable: React.FC<MobileTableProps> = ({
  mobileCardRender,
  mobileCols = 1,
  ...tableProps
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Если не мобильная версия, показываем обычную таблицу
  if (!isMobile) {
    return <Table {...tableProps} />;
  }

  // Мобильная версия с карточками
  if (mobileCardRender && tableProps.dataSource) {
    return (
      <div className="mobile-table-cards">
        <Row gutter={[16, 16]}>
          {(tableProps.dataSource as any[]).map((record, index) => (
            <Col key={record.key || index} span={24 / mobileCols}>
              {mobileCardRender(record, index)}
            </Col>
          ))}
        </Row>
        
        {/* Пагинация */}
        {tableProps.pagination && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <Table
              {...tableProps}
              showHeader={false}
              size="small"
              style={{ display: 'none' }}
            />
          </div>
        )}
      </div>
    );
  }

  // Стандартная таблица с горизонтальной прокруткой для мобильных
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <Table
        {...tableProps}
        size="small"
        scroll={{ x: 'max-content' }}
        style={{ minWidth: '600px' }}
      />
    </div>
  );
};

export default MobileTable; 