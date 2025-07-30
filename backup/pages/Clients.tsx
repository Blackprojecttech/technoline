import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Input, 
  Modal, 
  Form, 
  InputNumber,
  message,
  Space,
  Tooltip
} from 'antd';
import { 
  UserOutlined, 
  SearchOutlined, 
  DollarOutlined,
  CalendarOutlined,
  CheckOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { logReceiptAction } from '../utils/actionLogger';
import { clientsApi, receiptsApi } from '../utils/baseApi';

const { Search } = Input;

interface ClientDebt {
  id: string;
  clientName: string;
  receiptNumber: string;
  amount: number;
  date: string;
  status: 'active' | 'paid';
  notes?: string;
}

const Clients: React.FC = () => {
  const [clientDebts, setClientDebts] = useState<ClientDebt[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<ClientDebt | null>(null);
  const [paymentForm] = Form.useForm();
  const [isConfirmationModalVisible, setIsConfirmationModalVisible] = useState(false);
  const [debtToMarkPaid, setDebtToMarkPaid] = useState<ClientDebt | null>(null);

  // Загрузка долгов клиентов из API
  useEffect(() => {
    const loadClientDebts = async () => {
      try {
        setLoadingClients(true);
        const receipts = await receiptsApi.getAll();
        const debts: ClientDebt[] = [];

        receipts.forEach((receipt: any) => {
          if (receipt.isDebt && receipt.customerName && receipt.status !== 'cancelled') {
            // Формируем детальное описание товаров
            const itemsDescription = (receipt.items || []).map((item: any) => {
              let description = item.productName;
              if (item.quantity > 1) {
                description += ` (${item.quantity} шт.)`;
              }
              if (item.serialNumber) {
                description += ` [S/N: ${item.serialNumber}]`;
              }
              return description;
            }).join(', ');

            debts.push({
              id: `receipt_${receipt._id}`,
              clientName: receipt.customerName || '',
              receiptNumber: receipt.receiptNumber || '',
              amount: receipt.total || 0,
              date: receipt.date || new Date().toISOString(),
              status: receipt.debtPaid ? 'paid' : 'active',
              notes: itemsDescription ? `Товары: ${itemsDescription}` : `Чек ${receipt.receiptNumber || 'без номера'}`
            });
          }
        });

        console.log('✅ Загружено долгов клиентов:', debts.length);
        setClientDebts(debts);
      } catch (error) {
        console.error('❌ Error loading client debts:', error);
        setClientDebts([]);
      } finally {
        setLoadingClients(false);
      }
    };

    loadClientDebts();

    // Слушаем изменения в чеках
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'receipts') {
        loadClientDebts();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleMarkAsPaid = (debt: ClientDebt) => {
    setDebtToMarkPaid(debt);
    setIsConfirmationModalVisible(true);
  };

  const confirmMarkAsPaid = async () => {
    if (!debtToMarkPaid) return;
    
    try {
      const receiptId = debtToMarkPaid.id.replace('receipt_', '');
      
      // Обновляем чек через API
      await receiptsApi.update(receiptId, { debtPaid: true });
      
      setClientDebts(prev => prev.map(d => 
        d.id === debtToMarkPaid.id ? { ...d, status: 'paid' as const } : d
      ));
      
      message.success('Долг отмечен как оплаченный');
      
      // Логируем действие
      logReceiptAction(
        'Оплата долга',
        `Отмечен как оплаченный долг клиента "${debtToMarkPaid.clientName}" по чеку ${debtToMarkPaid.receiptNumber} на сумму ${(debtToMarkPaid.amount || 0).toLocaleString('ru-RU')} ₽`,
        debtToMarkPaid.receiptNumber
      );
      
      // Закрываем модальное окно и очищаем состояние
      setIsConfirmationModalVisible(false);
      setDebtToMarkPaid(null);
      
    } catch (error) {
      console.error('Error updating debt status:', error);
      message.error('Ошибка при обновлении статуса долга');
    }
  };

  const cancelMarkAsPaid = () => {
    setIsConfirmationModalVisible(false);
    setDebtToMarkPaid(null);
  };



  const columns: ColumnsType<ClientDebt> = [
    {
      title: 'Клиент',
      dataIndex: 'clientName',
      key: 'clientName',
      width: 200,
      render: (name) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserOutlined style={{ color: '#1890ff' }} />
          <span style={{ fontWeight: '500' }}>{name}</span>
        </div>
      ),
    },
    {
      title: 'Чек',
      dataIndex: 'receiptNumber',
      key: 'receiptNumber',
      width: 120,
      render: (number) => (
        <Tag color="blue">{number}</Tag>
      ),
    },
    {
      title: 'Товары',
      dataIndex: 'notes',
      key: 'notes',
      width: 300,
      render: (notes) => (
        <div style={{ fontSize: '13px', color: '#595959' }}>
          {notes?.replace('Товары: ', '') || '—'}
        </div>
      ),
    },
    {
      title: 'Сумма долга',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      render: (amount) => (
        <div style={{ fontWeight: '600', color: '#fa8c16' }}>
          {(amount || 0).toLocaleString('ru-RU')} ₽
        </div>
      ),
    },
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      width: 150,
      render: (date) => {
        if (!date) return <div style={{ color: '#8c8c8c' }}>—</div>;
        
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return <div style={{ color: '#8c8c8c' }}>—</div>;
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CalendarOutlined style={{ color: '#8c8c8c' }} />
            <div>
              <div>{dateObj.toLocaleDateString('ru-RU')}</div>
              <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                {dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={status === 'paid' ? 'green' : 'orange'}>
          {status === 'paid' ? 'Оплачен' : 'Активный'}
        </Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          {record.status === 'active' && (
            <Tooltip title="Отметить как оплаченный">
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => handleMarkAsPaid(record)}
              >
                Оплачен
              </Button>
            </Tooltip>
          )}
          {record.status === 'paid' && (
            <Tag color="green">Оплачен</Tag>
          )}
        </Space>
      ),
    },
  ];

  // Фильтрация долгов с дополнительной проверкой валидности данных
  const filteredDebts = clientDebts.filter(debt => {
    // Проверяем валидность данных
    if (!debt || typeof debt.amount !== 'number' || !debt.date) {
      console.warn('⚠️ Найден некорректный долг:', debt);
      return false;
    }
    
    return (
      debt.clientName.toLowerCase().includes(searchText.toLowerCase()) ||
      debt.receiptNumber.includes(searchText)
    );
  });

  // Статистика
  const totalDebts = filteredDebts.length;
  const activeDebts = filteredDebts.filter(d => d.status === 'active').length;
  const paidDebts = filteredDebts.filter(d => d.status === 'paid').length;
  const totalAmount = filteredDebts.filter(d => d.status === 'active').reduce((sum, d) => sum + (d.amount || 0), 0);

  return (
    <div>
      {/* Статистика */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <Card style={{ flex: 1, borderRadius: '12px', background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)', border: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1890ff' }}>
              {totalDebts}
            </div>
            <div style={{ color: '#595959', fontWeight: '500' }}>Всего клиентов</div>
          </div>
        </Card>
        <Card style={{ flex: 1, borderRadius: '12px', background: 'linear-gradient(135deg, #fff2e8 0%, #ffd591 100%)', border: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#fa8c16' }}>
              {activeDebts}
            </div>
            <div style={{ color: '#595959', fontWeight: '500' }}>Активных долгов</div>
          </div>
        </Card>
        <Card style={{ flex: 1, borderRadius: '12px', background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)', border: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#52c41a' }}>
              {paidDebts}
            </div>
            <div style={{ color: '#595959', fontWeight: '500' }}>Оплаченных долгов</div>
          </div>
        </Card>
        <Card style={{ flex: 1, borderRadius: '12px', background: 'linear-gradient(135deg, #f9f0ff 0%, #d3adf7 100%)', border: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#722ed1' }}>
              {(totalAmount || 0).toLocaleString('ru-RU')} ₽
            </div>
            <div style={{ color: '#595959', fontWeight: '500' }}>Сумма долгов</div>
          </div>
        </Card>
      </div>

      {/* Поиск */}
      <Card style={{ marginBottom: '24px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Search
            placeholder="Поиск по имени клиента или номеру чека"
            style={{ width: 400 }}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          <div style={{ fontSize: '14px', color: '#8c8c8c' }}>
            Найдено: {filteredDebts.length} из {totalDebts} долгов
          </div>
        </div>
      </Card>

      {/* Таблица клиентов */}
      <Card style={{ borderRadius: '12px' }}>
        <Table
          columns={columns}
          dataSource={filteredDebts}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Всего ${total} долгов`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Модальное окно подтверждения оплаты долга */}
      <Modal
        title="Подтверждение оплаты долга"
        open={isConfirmationModalVisible}
        onOk={confirmMarkAsPaid}
        onCancel={cancelMarkAsPaid}
        okText="Да, отметить как оплаченный"
        cancelText="Отмена"
        okButtonProps={{ 
          type: 'primary',
          icon: <CheckOutlined />
        }}
        width={500}
      >
        {debtToMarkPaid && (
          <div style={{ padding: '16px 0' }}>
            <div style={{ marginBottom: '16px' }}>
              <strong>Вы действительно хотите отметить этот долг как оплаченный?</strong>
            </div>
            
            <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>Клиент:</strong> {debtToMarkPaid.clientName}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Чек:</strong> <Tag color="blue">{debtToMarkPaid.receiptNumber}</Tag>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Сумма долга:</strong> 
                <span style={{ fontWeight: '600', color: '#fa8c16', marginLeft: '8px' }}>
                  {(debtToMarkPaid.amount || 0).toLocaleString('ru-RU')} ₽
                </span>
              </div>
              {debtToMarkPaid.notes && debtToMarkPaid.notes.startsWith('Товары:') && (
                <div>
                  <strong>Товары:</strong>
                  <div style={{ marginTop: '4px', fontSize: '13px', color: '#595959' }}>
                    {debtToMarkPaid.notes.replace('Товары: ', '')}
                  </div>
                </div>
              )}
            </div>
            
            <div style={{ marginTop: '16px', padding: '12px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: '6px' }}>
              <div style={{ fontSize: '13px', color: '#d46b08' }}>
                ⚠️ <strong>Внимание:</strong> После подтверждения это действие нельзя будет отменить. 
                Убедитесь, что долг действительно оплачен клиентом.
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Clients; 