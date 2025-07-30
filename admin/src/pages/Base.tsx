import React, { useState, useEffect } from 'react';
import { Layout, Button, Card, Alert, message, Row, Col, Dropdown, Menu } from 'antd';
import { FileTextOutlined, CreditCardOutlined, InboxOutlined, UserOutlined, CalculatorOutlined, BarChartOutlined, HistoryOutlined, TeamOutlined, CloudUploadOutlined, DownOutlined } from '@ant-design/icons';
import { migrateFromLocalStorage, checkLocalStorageForMigration } from '../utils/migrateToDatabaseFromLocalStorage';
import Receipts from './Receipts';
import Debts from './Debts';
import Arrivals from './Arrivals';
import Suppliers from './Suppliers';
import Payments from './Payments';
import Analytics from './Analytics';
import Actions from './Actions';
import Clients from './Clients';

const { Content } = Layout;

const Base: React.FC = () => {
  // Восстанавливаем активную вкладку из localStorage или используем 'receipts' по умолчанию
  const [activeTab, setActiveTab] = useState<'receipts' | 'debts' | 'arrivals' | 'suppliers' | 'payments' | 'analytics' | 'actions' | 'clients'>(() => {
    const savedTab = localStorage.getItem('baseActiveTab');
    const validTabs = ['receipts', 'debts', 'arrivals', 'suppliers', 'payments', 'analytics', 'actions', 'clients'];
    return validTabs.includes(savedTab!) ? (savedTab as any) : 'receipts';
  });
  const [hasLocalStorageData, setHasLocalStorageData] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Проверка размера экрана
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Проверяем наличие данных в localStorage при загрузке
  useEffect(() => {
    setHasLocalStorageData(checkLocalStorageForMigration());
  }, []);

  // Сохраняем активную вкладку в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('baseActiveTab', activeTab);
  }, [activeTab]);

  const handleMigration = async () => {
    setIsMigrating(true);
    try {
      await migrateFromLocalStorage();
      message.success('Данные успешно перенесены в базу данных');
      setHasLocalStorageData(false);
    } catch (error) {
      console.error('Ошибка миграции:', error);
      message.error('Ошибка при переносе данных');
    } finally {
      setIsMigrating(false);
    }
  };

  // Конфигурация вкладок
  const tabs = [
    { key: 'receipts', label: 'Чеки', icon: <FileTextOutlined /> },
    { key: 'debts', label: 'Долги', icon: <CreditCardOutlined /> },
    { key: 'arrivals', label: 'Приход', icon: <InboxOutlined /> },
    { key: 'suppliers', label: 'Поставщики', icon: <UserOutlined /> },
    { key: 'payments', label: 'Расчеты', icon: <CalculatorOutlined /> },
    { key: 'analytics', label: 'Аналитика', icon: <BarChartOutlined /> },
    { key: 'actions', label: 'Действия', icon: <HistoryOutlined /> },
    { key: 'clients', label: 'Клиенты', icon: <TeamOutlined /> },
  ];

  const getCurrentTabLabel = () => {
    const currentTab = tabs.find(tab => tab.key === activeTab);
    return currentTab ? currentTab.label : 'Выберите раздел';
  };

  const renderMobileNavigation = () => {
    const menu = (
      <Menu>
        {tabs.map(tab => (
          <Menu.Item 
            key={tab.key} 
            icon={tab.icon}
            onClick={() => setActiveTab(tab.key as any)}
            style={{ 
              backgroundColor: activeTab === tab.key ? '#e6f7ff' : 'transparent',
              color: activeTab === tab.key ? '#1890ff' : 'inherit'
            }}
          >
            {tab.label}
          </Menu.Item>
        ))}
      </Menu>
    );

    return (
      <Card style={{ marginBottom: '16px', borderRadius: '12px' }}>
        <Dropdown overlay={menu} trigger={['click']} placement="bottomCenter">
          <Button 
            size="large" 
            style={{ 
              width: '100%', 
              textAlign: 'left',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>
              {tabs.find(tab => tab.key === activeTab)?.icon}
              <span style={{ marginLeft: '8px' }}>{getCurrentTabLabel()}</span>
            </span>
            <DownOutlined />
          </Button>
        </Dropdown>
      </Card>
    );
  };

  const renderDesktopNavigation = () => (
    <Card style={{ marginBottom: '24px', borderRadius: '12px' }}>
      <Row gutter={[12, 12]} justify="center">
        {tabs.map(tab => (
          <Col key={tab.key} xs={24} sm={12} md={8} lg={6} xl={3}>
            <Button
              type={activeTab === tab.key ? 'primary' : 'default'}
              icon={tab.icon}
              onClick={() => setActiveTab(tab.key as any)}
              size="large"
              style={{
                borderRadius: '8px',
                fontWeight: '500',
                width: '100%',
                minHeight: '48px',
              }}
            >
              {tab.label}
            </Button>
          </Col>
        ))}
      </Row>
    </Card>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Content style={{ padding: isMobile ? '16px' : '24px' }}>
        {/* Предупреждение о миграции */}
        {hasLocalStorageData && (
          <Alert
            message="Обнаружены данные в локальном хранилище"
            description={
              <div>
                <p style={{ fontSize: isMobile ? '14px' : '16px' }}>
                  Найдены данные базы в локальном хранилище браузера. Для работы с общей базой данных необходимо их перенести.
                </p>
                <Button
                  type="primary"
                  icon={<CloudUploadOutlined />}
                  onClick={handleMigration}
                  loading={isMigrating}
                  size={isMobile ? 'middle' : 'large'}
                  style={{ marginTop: 8 }}
                >
                  {isMigrating ? 'Переносим данные...' : 'Перенести в базу данных'}
                </Button>
              </div>
            }
            type="warning"
            showIcon
            closable
            onClose={() => setHasLocalStorageData(false)}
            style={{ marginBottom: isMobile ? '16px' : '24px' }}
          />
        )}

        {/* Навигация */}
        {isMobile ? renderMobileNavigation() : renderDesktopNavigation()}

        {/* Контент */}
        <div style={{ 
          background: '#fff', 
          borderRadius: '12px',
          minHeight: '400px'
        }}>
          {activeTab === 'receipts' && <Receipts />}
          {activeTab === 'debts' && <Debts />}
          {activeTab === 'arrivals' && <Arrivals />}
          {activeTab === 'suppliers' && <Suppliers />}
          {activeTab === 'payments' && <Payments />}
          {activeTab === 'analytics' && <Analytics />}
          {activeTab === 'actions' && <Actions />}
          {activeTab === 'clients' && <Clients />}
        </div>
      </Content>
    </Layout>
  );
};

export default Base; 