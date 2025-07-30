import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, InputNumber, Tag, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { clientsApi, clientRecordsApi, receiptsApi } from '../utils/baseApi';
import { logReceiptAction } from '../utils/actionLogger';
import { useAuth } from '../hooks/useAuth';

const { Search } = Input;

interface ClientDebt {
  id: string;
  clientName: string;
  receiptNumber?: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  date: string;
  status: 'active' | 'paid';
  notes?: string;
  isManualRecord?: boolean;
}

const Clients: React.FC = () => {
  const [form] = Form.useForm();
  const [isAddRecordModalVisible, setIsAddRecordModalVisible] = useState(false);
  const [debts, setDebts] = useState<ClientDebt[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<ClientDebt | null>(null);
  const [paymentForm] = Form.useForm();
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<ClientDebt | null>(null);
  const { user } = useAuth();

  // Проверка прав на удаление
  const canDelete = user?.role === 'admin' || user?.role === 'accountant';

  // Загрузка всех долгов (из чеков и записей)
  const loadAllDebts = async () => {
    setLoading(true);
    try {
      // Загружаем долги из чеков
      const receipts = await receiptsApi.getAll();
      const receiptDebts: ClientDebt[] = [];

      receipts.forEach((receipt: any) => {
        if (receipt.isDebt && receipt.customerName && receipt.status !== 'cancelled') {
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

          receiptDebts.push({
            id: `receipt_${receipt._id}`,
            clientName: receipt.customerName || '',
            receiptNumber: receipt.receiptNumber || '',
            amount: receipt.total || 0,
            paidAmount: receipt.paidAmount || 0,
            remainingAmount: receipt.total - (receipt.paidAmount || 0),
            date: receipt.date || new Date().toISOString(),
            status: receipt.debtPaid ? 'paid' : 'active',
            notes: itemsDescription ? `Товары: ${itemsDescription}` : `Чек ${receipt.receiptNumber || 'без номера'}`
          });
        }
      });

      // Загружаем ручные записи
      const manualRecords = await clientRecordsApi.getAll();
      const manualDebts: ClientDebt[] = manualRecords.map((record: any) => ({
        ...record,
        isManualRecord: true
      }));

      // Объединяем все долги
      const allDebts = [...receiptDebts, ...manualDebts];
      setDebts(allDebts);
    } catch (error) {
      console.error('Ошибка при загрузке долгов:', error);
      message.error('Не удалось загрузить список долгов');
    } finally {
      setLoading(false);
    }
  };

  // Загружаем долги при монтировании
  useEffect(() => {
    loadAllDebts();

    // Слушаем изменения в чеках
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'receipts') {
        loadAllDebts();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Обработчик создания записи
  const handleCreateRecord = async (values: any) => {
    try {
      const newRecord = {
        id: `CR-${Date.now()}`,
        clientName: values.clientName,
        amount: values.amount,
        date: new Date().toISOString(),
        status: 'active',
        notes: values.notes,
        type: 'manual_client_debt', // Специальный тип для ручных записей со страницы клиентов
        isManualRecord: true
      };

      await clientRecordsApi.create(newRecord);
      message.success('Запись успешно создана');
      form.resetFields();
      setIsAddRecordModalVisible(false);
      loadAllDebts();
    } catch (error) {
      console.error('Ошибка при создании записи:', error);
      message.error('Не удалось создать запись');
    }
  };

  // Обработчик открытия модального окна оплаты
  const handleOpenPaymentModal = (debt: ClientDebt) => {
    setSelectedDebt(debt);
    setIsPaymentModalVisible(true);
    paymentForm.resetFields();
  };

  // Обработчик оплаты
  const handlePayDebt = async (values: { amount: number }) => {
    if (!selectedDebt) return;

    try {
      if (selectedDebt.isManualRecord) {
        // Для ручных записей
        await clientRecordsApi.patch(`${selectedDebt.id}/pay`, {
          paymentAmount: values.amount
        });
      } else {
        // Для долгов из чеков
        const receiptId = selectedDebt.id.replace('receipt_', '');
        await receiptsApi.update(receiptId, { 
          debtPaid: values.amount >= selectedDebt.remainingAmount,
          paidAmount: (selectedDebt.paidAmount || 0) + values.amount
        });
        
        // Логируем действие для чеков
        logReceiptAction(
          'Оплата долга',
          `Внесена оплата ${values.amount.toLocaleString('ru-RU')} ₽ по долгу клиента "${selectedDebt.clientName}"${selectedDebt.receiptNumber ? ` (чек ${selectedDebt.receiptNumber})` : ''}`,
          selectedDebt.receiptNumber || ''
        );
      }
      
      message.success('Оплата успешно внесена');
      setIsPaymentModalVisible(false);
      loadAllDebts();
    } catch (error) {
      console.error('Ошибка при оплате долга:', error);
      message.error('Не удалось внести оплату');
    }
  };

  // Обработчик открытия модального окна удаления
  const handleOpenDeleteModal = (record: ClientDebt) => {
    setRecordToDelete(record);
    setIsDeleteModalVisible(true);
  };

  // Обработчик удаления
  const handleDeleteRecord = async (debt: ClientDebt) => {
    if (!canDelete) {
      message.error('У вас нет прав на удаление записей');
      return;
    }

    try {
      await clientRecordsApi.delete(debt.id);
      message.success('Запись удалена');
      loadAllDebts();
      setIsDeleteModalVisible(false);
      setRecordToDelete(null);
    } catch (error) {
      console.error('Ошибка при удалении записи:', error);
      message.error('Не удалось удалить запись');
    }
  };

  const columns: ColumnsType<ClientDebt> = [
    {
      title: 'Клиент',
      dataIndex: 'clientName',
      key: 'clientName',
    },
    {
      title: 'Чек',
      dataIndex: 'receiptNumber',
      key: 'receiptNumber',
      render: (number) => number ? <Tag color="blue">{number}</Tag> : '-',
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `${amount.toLocaleString()} ₽`,
    },
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'paid' ? 'green' : 'orange'}>
          {status === 'paid' ? 'Оплачен' : 'Активен'}
        </Tag>
      ),
    },
    {
      title: 'Оплачено',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      render: (paidAmount: number, record) => (
        <div>
          <div>{paidAmount?.toLocaleString() || 0} ₽</div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
            Осталось: {record.remainingAmount?.toLocaleString() || 0} ₽
          </div>
        </div>
      ),
    },
    {
      title: 'Примечания',
      dataIndex: 'notes',
      key: 'notes',
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.status === 'active' && (
            <Button 
              type="primary"
              onClick={() => handleOpenPaymentModal(record)}
            >
              Внести оплату
            </Button>
          )}
          {record.isManualRecord && canDelete && (
            <Button 
              type="link" 
              danger
              onClick={() => handleOpenDeleteModal(record)}
            >
              Удалить
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // Фильтрация долгов
  const filteredDebts = debts.filter(debt => {
    const searchLower = searchText.toLowerCase();
    return (
      debt.clientName.toLowerCase().includes(searchLower) ||
      (debt.receiptNumber || '').toLowerCase().includes(searchLower) ||
      (debt.notes || '').toLowerCase().includes(searchLower)
    );
  });

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Search
          placeholder="Поиск по имени клиента, номеру чека или примечаниям"
          style={{ width: 400 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Button
          type="primary"
          onClick={() => setIsAddRecordModalVisible(true)}
        >
          Добавить запись
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={filteredDebts}
        loading={loading}
        rowKey="id"
      />

      <Modal
        title="Добавить запись"
        open={isAddRecordModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          form.resetFields();
          setIsAddRecordModalVisible(false);
        }}
      >
        <Form
          form={form}
          onFinish={handleCreateRecord}
          layout="vertical"
        >
          <Form.Item
            name="clientName"
            label="Имя клиента"
            rules={[{ required: true, message: 'Пожалуйста, введите имя клиента' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="amount"
            label="Сумма"
            rules={[{ required: true, message: 'Пожалуйста, введите сумму' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value!.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>
          <Form.Item
            name="notes"
            label="Примечания"
          >
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно оплаты */}
      <Modal
        title="Внести оплату"
        open={isPaymentModalVisible}
        onOk={() => paymentForm.submit()}
        onCancel={() => {
          setIsPaymentModalVisible(false);
          setSelectedDebt(null);
          paymentForm.resetFields();
        }}
      >
        {selectedDebt && (
          <div style={{ marginBottom: 16 }}>
            <div><strong>Клиент:</strong> {selectedDebt.clientName}</div>
            {selectedDebt.receiptNumber && (
              <div><strong>Чек:</strong> {selectedDebt.receiptNumber}</div>
            )}
            <div><strong>Сумма долга:</strong> {selectedDebt.amount.toLocaleString()} ₽</div>
            <div><strong>Оплачено:</strong> {selectedDebt.paidAmount?.toLocaleString() || 0} ₽</div>
            <div><strong>Осталось оплатить:</strong> {selectedDebt.remainingAmount?.toLocaleString() || 0} ₽</div>
          </div>
        )}
        <Form
          form={paymentForm}
          onFinish={handlePayDebt}
          layout="vertical"
        >
          <Form.Item
            name="amount"
            label="Сумма оплаты"
            rules={[
              { required: true, message: 'Пожалуйста, введите сумму' },
              {
                validator: (_, value) => {
                  if (!selectedDebt) return Promise.resolve();
                  if (value <= 0) {
                    return Promise.reject('Сумма должна быть больше 0');
                  }
                  if (value > selectedDebt.remainingAmount) {
                    return Promise.reject('Сумма не может превышать остаток долга');
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, ''))}
              max={selectedDebt?.remainingAmount}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно подтверждения удаления */}
      <Modal
        title="Подтверждение удаления"
        open={isDeleteModalVisible}
        onOk={() => recordToDelete && handleDeleteRecord(recordToDelete)}
        onCancel={() => {
          setIsDeleteModalVisible(false);
          setRecordToDelete(null);
        }}
        okText="Удалить"
        cancelText="Отмена"
        okButtonProps={{ danger: true }}
      >
        <div style={{ fontSize: '16px', marginBottom: '16px' }}>
          Вы действительно хотите удалить эту запись?
        </div>
        {recordToDelete && (
          <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
            <div><strong>Клиент:</strong> {recordToDelete.clientName}</div>
            <div><strong>Сумма:</strong> {recordToDelete.amount.toLocaleString()} ₽</div>
            {recordToDelete.notes && (
              <div><strong>Примечания:</strong> {recordToDelete.notes}</div>
            )}
          </div>
        )}
        <div style={{ marginTop: '16px', color: '#ff4d4f' }}>
          ⚠️ Это действие нельзя будет отменить. Запись будет удалена из расчетов.
        </div>
      </Modal>
    </div>
  );
};

export default Clients; 