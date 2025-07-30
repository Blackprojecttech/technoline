import React, { useState, useEffect } from 'react';
import { Card, Timeline, Tag, Spin, Alert, Typography, Space, Button } from 'antd';
import { 
  CarOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  ExclamationCircleOutlined,
  ReloadOutlined 
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface TrackingStatus {
  status: string;
  statusCode: string;
  description: string;
  date: string;
  location?: string;
}

interface TrackingInfo {
  trackingNumber: string;
  status: string;
  statusCode: string;
  description: string;
  lastUpdate: string;
  estimatedDelivery?: string;
  history: TrackingStatus[];
}

interface TrackingInfoProps {
  trackingNumber: string;
}

// Утилиты для статусов CDEK
const getStatusDescription = (statusCode: string): string => {
  const statusMap: { [key: string]: string } = {
    // CDEK API статусы
    'CREATED': 'Заказ создан',
    'ACCEPTED': 'Заказ принят',
    'RECEIVED_AT_SHIPMENT_WAREHOUSE': 'Принят на склад отправителя',
    'READY_FOR_SHIPMENT_IN_SENDER_CITY': 'Выдан на отправку в г. отправителе',
    'TAKEN_BY_TRANSPORTER_FROM_SENDER_CITY': 'Сдан перевозчику в г. отправителе',
    'SENT_TO_TRANSIT_CITY': 'Отправлен в г. транзит',
    'ACCEPTED_IN_TRANSIT_CITY': 'Встречен в г. транзите',
    'ACCEPTED_AT_TRANSIT_WAREHOUSE': 'Принят на склад транзита',
    'READY_FOR_SHIPMENT_IN_TRANSIT_CITY': 'Выдан на отправку в г. транзите',
    'TAKEN_BY_TRANSPORTER_FROM_TRANSIT_CITY': 'Сдан перевозчику в г. транзите',
    'DELIVERED': 'Заказ доставлен',
    'CANCELLED': 'Заказ отменен',
    'RETURNED': 'Заказ возвращен',
    'NOT_DELIVERED': 'Заказ не вручен',
    'IN_DELIVERY_POINT': 'Заказ в пункте выдачи',
    'ON_WAY_TO_RECIPIENT': 'Заказ в пути к получателю',
    'DELIVERED_TO_RECIPIENT': 'Заказ вручен получателю',
    'RETURNED_TO_DELIVERY_POINT': 'Заказ возвращен в пункт выдачи',
    'RETURNED_TO_SENDER': 'Заказ возвращен отправителю',
    'ON_WAY_TO_SENDER': 'Заказ в пути к отправителю',
    'DELIVERED_TO_SENDER': 'Заказ вручен отправителю',
    
    // Старые числовые коды (для совместимости)
    '1': 'Заказ создан',
    '2': 'Заказ принят',
    '3': 'Заказ в обработке',
    '4': 'Заказ передан в доставку',
    '5': 'Заказ в пути',
    '6': 'Заказ прибыл в пункт выдачи',
    '7': 'Заказ доставлен',
    '8': 'Заказ отменен',
    '9': 'Заказ возвращен',
    '10': 'Заказ вручен',
    '11': 'Заказ не вручен',
    '12': 'Заказ в пункте выдачи',
    '13': 'Заказ в пути к получателю',
    '14': 'Заказ вручен получателю',
    '15': 'Заказ возвращен в пункт выдачи',
    '16': 'Заказ возвращен отправителю',
    '17': 'Заказ в пути к отправителю',
    '18': 'Заказ вручен отправителю',
    '19': 'Заказ в пути к получателю',
    '20': 'Заказ в пути к отправителю'
  };

  return statusMap[statusCode] || statusCode;
};

const getStatusColor = (statusCode: string): string => {
  const colorMap: { [key: string]: string } = {
    // CDEK API статусы
    'CREATED': 'blue',
    'ACCEPTED': 'blue',
    'RECEIVED_AT_SHIPMENT_WAREHOUSE': 'blue',
    'READY_FOR_SHIPMENT_IN_SENDER_CITY': 'orange',
    'TAKEN_BY_TRANSPORTER_FROM_SENDER_CITY': 'purple',
    'SENT_TO_TRANSIT_CITY': 'cyan',
    'ACCEPTED_IN_TRANSIT_CITY': 'blue',
    'ACCEPTED_AT_TRANSIT_WAREHOUSE': 'blue',
    'READY_FOR_SHIPMENT_IN_TRANSIT_CITY': 'orange',
    'TAKEN_BY_TRANSPORTER_FROM_TRANSIT_CITY': 'purple',
    'DELIVERED': 'green',
    'CANCELLED': 'red',
    'RETURNED': 'red',
    'NOT_DELIVERED': 'red',
    'IN_DELIVERY_POINT': 'green',
    'ON_WAY_TO_RECIPIENT': 'cyan',
    'DELIVERED_TO_RECIPIENT': 'green',
    'RETURNED_TO_DELIVERY_POINT': 'orange',
    'RETURNED_TO_SENDER': 'red',
    'ON_WAY_TO_SENDER': 'purple',
    'DELIVERED_TO_SENDER': 'green',
    
    // Старые числовые коды (для совместимости)
    '1': 'blue',
    '2': 'blue',
    '3': 'orange',
    '4': 'purple',
    '5': 'cyan',
    '6': 'green',
    '7': 'green',
    '8': 'red',
    '9': 'red',
    '10': 'green',
    '11': 'red',
    '12': 'green',
    '13': 'cyan',
    '14': 'green',
    '15': 'orange',
    '16': 'red',
    '17': 'purple',
    '18': 'green',
    '19': 'cyan',
    '20': 'purple'
  };

  return colorMap[statusCode] || 'default';
};

const TrackingInfo: React.FC<TrackingInfoProps> = ({ trackingNumber }) => {
  const [trackingData, setTrackingData] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrackingInfo = async () => {
    if (!trackingNumber) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/orders/tracking/${trackingNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTrackingData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Ошибка получения информации об отслеживании');
      }
    } catch (err) {
      setError('Ошибка сети при получении информации об отслеживании');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (trackingNumber) {
      fetchTrackingInfo();
    }
  }, [trackingNumber]);

  const getStatusIcon = (statusCode: string) => {
    switch (statusCode) {
      case '7': // Доставлен
      case '10': // Вручен
      case '14': // Вручен получателю
      case 'DELIVERED':
      case 'DELIVERED_TO_RECIPIENT':
      case 'DELIVERED_TO_SENDER':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case '8': // Отменен
      case '9': // Возвращен
      case '11': // Не вручен
      case 'CANCELLED':
      case 'RETURNED':
      case 'NOT_DELIVERED':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className="tracking-section">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text>Загрузка информации об отслеживании...</Text>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="tracking-section">
        <Alert
          message="Ошибка получения информации об отслеживании"
          description={error}
          type="error"
          showIcon
          action={
            <Button 
              size="small" 
              danger 
              icon={<ReloadOutlined />}
              onClick={fetchTrackingInfo}
            >
              Повторить
            </Button>
          }
        />
      </Card>
    );
  }

  if (!trackingData) {
    return null;
  }

  return (
    <Card 
      className="tracking-section"
      title={
        <Space>
          <CarOutlined className="icon-animate" />
          <span>Отслеживание заказа</span>
          <Tag color="blue">{trackingNumber}</Tag>
        </Space>
      }
      extra={
        <Button 
          icon={<ReloadOutlined />} 
          onClick={fetchTrackingInfo}
          size="small"
        >
          Обновить
        </Button>
      }
    >
      <div style={{ marginBottom: '16px' }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div>
            <Text strong>Статус: </Text>
            <Tag 
              color={getStatusColor(trackingData.statusCode)}
              icon={getStatusIcon(trackingData.statusCode)}
            >
              {getStatusDescription(trackingData.statusCode)}
            </Tag>
          </div>
          {trackingData.estimatedDelivery && (
            <div>
              <Text strong>Ожидаемая доставка: </Text>
              <Text type="secondary">
                {formatDate(trackingData.estimatedDelivery)}
              </Text>
            </div>
          )}
          <div>
            <Text strong>Последнее обновление: </Text>
            <Text type="secondary">
              {formatDate(trackingData.lastUpdate)}
            </Text>
          </div>
        </Space>
      </div>

      {trackingData.history && trackingData.history.length > 0 && (
        <div>
          <Title level={5} style={{ marginBottom: '16px' }}>
            История доставки
          </Title>
          <Timeline className="tracking-timeline">
            {trackingData.history.map((status, index) => (
              <Timeline.Item
                key={index}
                className={`tracking-item ${index === 0 ? 'completed' : ''}`}
                color={getStatusColor(status.statusCode)}
                dot={getStatusIcon(status.statusCode)}
              >
                <div>
                  <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                    {getStatusDescription(status.statusCode)}
                  </div>
                  <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>
                    {formatDate(status.date)}
                  </div>
                  {status.location && (
                    <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>
                      📍 {status.location}
                    </div>
                  )}
                  {status.description && status.description !== getStatusDescription(status.statusCode) && (
                    <div style={{ color: '#666', fontSize: '12px' }}>
                      {status.description}
                    </div>
                  )}
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        </div>
      )}

      {(!trackingData.history || trackingData.history.length === 0) && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          <ClockCircleOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
          <div>История статусов пока недоступна</div>
        </div>
      )}
    </Card>
  );
};

export default TrackingInfo; 