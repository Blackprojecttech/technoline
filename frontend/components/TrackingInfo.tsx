'use client';

import React, { useState, useEffect } from 'react';
import { getStatusDescription, getStatusColor } from '../lib/trackingUtils';

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

export default function TrackingInfo({ trackingNumber }: TrackingInfoProps) {
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrackingInfo = async () => {
    if (!trackingNumber) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://technoline-api.loca.lt/api'}/orders/tracking/${trackingNumber}`);

      if (!response.ok) {
        throw new Error('Не удалось получить информацию о трекинге');
      }

      const data = await response.json();
      setTrackingInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
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
        return '✅';
      case '8': // Отменен
      case '9': // Возвращен
      case '11': // Не вручен
        return '❌';
      default:
        return '⏳';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="tracking-card" style={{ 
        background: 'white', 
        borderRadius: '8px', 
        padding: '16px', 
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3>Отслеживание заказа</h3>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: 16 }}>Загружаем информацию о доставке...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tracking-card" style={{ 
        background: 'white', 
        borderRadius: '8px', 
        padding: '16px', 
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3>Отслеживание заказа</h3>
        <div style={{ 
          background: '#fff2f0', 
          border: '1px solid #ffccc7', 
          borderRadius: '6px', 
          padding: '12px',
          marginBottom: '12px'
        }}>
          <p style={{ margin: 0, color: '#cf1322' }}>Ошибка загрузки: {error}</p>
          <button 
            onClick={fetchTrackingInfo}
            style={{
              background: '#1890ff',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '8px'
            }}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!trackingInfo) {
    return null;
  }

  return (
    <div className="tracking-card" style={{ 
      background: 'white', 
      borderRadius: '8px', 
      padding: '16px', 
      marginBottom: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>🚚 Отслеживание заказа</h3>
        <span style={{
          background: getStatusColor(trackingInfo.statusCode) === 'green' ? '#52c41a' : 
                     getStatusColor(trackingInfo.statusCode) === 'red' ? '#ff4d4f' : '#1890ff',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          {getStatusDescription(trackingInfo.statusCode)}
        </span>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <p><strong>Трек-номер:</strong> {trackingInfo.trackingNumber}</p>
        {trackingInfo.estimatedDelivery && (
          <p><strong>Ожидаемая дата доставки:</strong> {formatDate(trackingInfo.estimatedDelivery)}</p>
        )}
        <p><strong>Последнее обновление:</strong> {formatDate(trackingInfo.lastUpdate)}</p>
      </div>

      <div className="timeline">
        {trackingInfo.history.map((status, index) => (
          <div key={index} style={{ 
            display: 'flex', 
            marginBottom: '16px',
            position: 'relative'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: getStatusColor(status.statusCode) === 'green' ? '#52c41a' : 
                         getStatusColor(status.statusCode) === 'red' ? '#ff4d4f' : '#1890ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              marginRight: '12px',
              flexShrink: 0
            }}>
              {getStatusIcon(status.statusCode)}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 500 }}>
                {getStatusDescription(status.statusCode)}
              </p>
              <p style={{ margin: '4px 0', color: '#666', fontSize: '12px' }}>
                {formatDate(status.date)}
              </p>
              {status.location && (
                <p style={{ margin: '4px 0', color: '#666', fontSize: '12px' }}>
                  📍 {status.location}
                </p>
              )}
              {status.description && status.description !== getStatusDescription(status.statusCode) && (
                <p style={{ margin: '4px 0', color: '#666', fontSize: '12px' }}>
                  {status.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {trackingInfo.history.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
          <p>История статусов пока недоступна</p>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
} 