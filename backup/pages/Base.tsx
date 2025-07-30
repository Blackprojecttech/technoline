import React, { useState, useEffect } from 'react';
import { Layout, Button, Card, Alert, message } from 'antd';
import { FileTextOutlined, CreditCardOutlined, InboxOutlined, UserOutlined, CalculatorOutlined, BarChartOutlined, HistoryOutlined, TeamOutlined, CloudUploadOutlined } from '@ant-design/icons';
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

  // Проверяем наличие данных в localStorage при загрузке
  useEffect(() => {
    setHasLocalStorageData(checkLocalStorageForMigration());
  }, []);

  // Сохраняем активную вкладку в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('baseActiveTab', activeTab);
  }, [activeTab]);

  const handleMigration = async () => {
    try {
      setIsMigrating(true);
      await migrateFromLocalStorage();
      setHasLocalStorageData(false);
      message.success('Данные успешно перенесены в базу данных!');
    } catch (error) {
      console.error('Migration error:', error);
      message.error('Ошибка при переносе данных');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Content style={{ padding: '24px' }}>
        {/* Предупреждение о миграции */}
        {hasLocalStorageData && (
          <Alert
            message="Обнаружены данные в локальном хранилище"
            description={
              <div>
                <p>Найдены данные базы в локальном хранилище браузера. Для работы с общей базой данных необходимо их перенести.</p>
                <Button
                  type="primary"
                  icon={<CloudUploadOutlined />}
                  onClick={handleMigration}
                  loading={isMigrating}
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
            style={{ marginBottom: '24px' }}
          />
        )}

        {/* Навигация */}
        <Card style={{ marginBottom: '24px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              type={activeTab === 'receipts' ? 'primary' : 'default'}
              icon={<FileTextOutlined />}
              onClick={() => setActiveTab('receipts')}
              size="large"
              style={{
                borderRadius: '8px',
                fontWeight: '500',
                minWidth: '120px',
              }}
            >
              Чек
            </Button>
            <Button
              type={activeTab === 'debts' ? 'primary' : 'default'}
              icon={<CreditCardOutlined />}
              onClick={() => setActiveTab('debts')}
              size="large"
              style={{
                borderRadius: '8px',
                fontWeight: '500',
                minWidth: '120px',
              }}
            >
              Долги
            </Button>
            <Button
              type={activeTab === 'arrivals' ? 'primary' : 'default'}
              icon={<InboxOutlined />}
              onClick={() => setActiveTab('arrivals')}
              size="large"
              style={{
                borderRadius: '8px',
                fontWeight: '500',
                minWidth: '120px',
              }}
            >
              Приход
            </Button>
            <Button
              type={activeTab === 'suppliers' ? 'primary' : 'default'}
              icon={<UserOutlined />}
              onClick={() => setActiveTab('suppliers')}
              size="large"
              style={{
                borderRadius: '8px',
                fontWeight: '500',
                minWidth: '120px',
              }}
            >
              Поставщики
            </Button>
            <Button
              type={activeTab === 'payments' ? 'primary' : 'default'}
              icon={<CalculatorOutlined />}
              onClick={() => setActiveTab('payments')}
              size="large"
              style={{
                borderRadius: '8px',
                fontWeight: '500',
                minWidth: '120px',
              }}
            >
              Расчеты
            </Button>
            <Button
              type={activeTab === 'analytics' ? 'primary' : 'default'}
              icon={<BarChartOutlined />}
              onClick={() => setActiveTab('analytics')}
              size="large"
              style={{
                borderRadius: '8px',
                fontWeight: '500',
                minWidth: '120px',
              }}
            >
              Аналитика
            </Button>
            <Button
              type={activeTab === 'actions' ? 'primary' : 'default'}
              icon={<HistoryOutlined />}
              onClick={() => setActiveTab('actions')}
              size="large"
              style={{
                borderRadius: '8px',
                fontWeight: '500',
                minWidth: '120px',
              }}
            >
              Действия
            </Button>
            <Button
              type={activeTab === 'clients' ? 'primary' : 'default'}
              icon={<TeamOutlined />}
              onClick={() => setActiveTab('clients')}
              size="large"
              style={{
                borderRadius: '8px',
                fontWeight: '500',
                minWidth: '120px',
              }}
            >
              Клиенты
            </Button>
          </div>
        </Card>

        {/* Контент */}
        {activeTab === 'receipts' && <Receipts />}
        {activeTab === 'debts' && <Debts />}
        {activeTab === 'arrivals' && <Arrivals />}
        {activeTab === 'suppliers' && <Suppliers />}
        {activeTab === 'payments' && <Payments />}
        {activeTab === 'analytics' && <Analytics />}
        {activeTab === 'actions' && <Actions />}
        {activeTab === 'clients' && <Clients />}
      </Content>
    </Layout>
  );
};

export default Base; 