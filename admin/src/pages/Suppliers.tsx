import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Modal, Form, message } from 'antd';
import { suppliersApi, debtsApi, arrivalsApi } from '../utils/baseApi';
import { EditOutlined, DeleteOutlined, BarChartOutlined } from '@ant-design/icons';

const { Search } = Input;

interface Supplier {
  _id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  inn?: string;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [arrivals, setArrivals] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await suppliersApi.getAll();
      setSuppliers(data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      message.error('Ошибка при загрузке поставщиков');
    } finally {
      setLoading(false);
    }
  };

  const loadDebts = async () => {
    try {
      const data = await debtsApi.getAll();
      setDebts(data);
    } catch (error) {
      console.error('Error loading debts:', error);
    }
  };

  const loadArrivals = async () => {
    try {
      const data = await arrivalsApi.getAll();
      setArrivals(data);
    } catch (error) {
      console.error('Error loading arrivals:', error);
    }
  };

  const loadReceipts = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/receipts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReceipts(data);
      }
    } catch (error) {
      console.error('Error loading receipts:', error);
    }
  };

  useEffect(() => {
    loadSuppliers();
    loadDebts();
    loadArrivals();
    loadReceipts();
  }, []);

  // Обновляем данные при изменениях долгов, приходов и чеков
  useEffect(() => {
    const handleDebtUpdated = () => {
      loadDebts();
    };

    const handleArrivalUpdated = () => {
      loadArrivals();
    };

    const handleReceiptUpdated = () => {
      loadReceipts();
    };

    window.addEventListener('debtUpdated', handleDebtUpdated);
    window.addEventListener('debtPaid', handleDebtUpdated);
    window.addEventListener('debtCreated', handleDebtUpdated);
    window.addEventListener('arrivalDeleted', handleArrivalUpdated);
    window.addEventListener('arrivalUpdated', handleArrivalUpdated);
    window.addEventListener('receiptCreated', handleReceiptUpdated);
    window.addEventListener('receiptUpdated', handleReceiptUpdated);
    window.addEventListener('receiptCancelled', handleReceiptUpdated);
    window.addEventListener('receiptDeleted', handleReceiptUpdated);
    
    return () => {
      window.removeEventListener('debtUpdated', handleDebtUpdated);
      window.removeEventListener('debtPaid', handleDebtUpdated);
      window.removeEventListener('debtCreated', handleDebtUpdated);
      window.removeEventListener('arrivalDeleted', handleArrivalUpdated);
      window.removeEventListener('arrivalUpdated', handleArrivalUpdated);
      window.removeEventListener('receiptCreated', handleReceiptUpdated);
      window.removeEventListener('receiptUpdated', handleReceiptUpdated);
      window.removeEventListener('receiptCancelled', handleReceiptUpdated);
      window.removeEventListener('receiptDeleted', handleReceiptUpdated);
    };
  }, []);

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  // Функция для расчета неоплаченных долгов поставщика
  const getUnpaidDebtsAmount = (supplierId: string): number => {
    return debts
      .filter(debt => debt.supplierId === supplierId && debt.status !== 'paid')
      .reduce((sum, debt) => sum + (debt.amount - debt.paidAmount), 0);
  };

  // Функция для расчета суммы товаров на приходе, которые еще не проданы
  const getUnsoldItemsAmount = (supplierId: string): number => {
    // Находим все приходы этого поставщика
    const supplierArrivals = arrivals.filter(arrival => arrival.supplierId === supplierId);
    
    let totalAmount = 0;
    
    supplierArrivals.forEach(arrival => {
      // Проверяем каждый товар в приходе
      arrival.items?.forEach((item: any) => {
        // Проверяем, есть ли чеки с товарами из этого прихода
        const hasReceipts = receipts.some(receipt => {
          if (receipt.status === 'cancelled') return false;
          return receipt.items && receipt.items.some((receiptItem: any) => 
            receiptItem.arrivalId === (arrival._id || arrival.id)
          );
        });
        
        // Если товар не продан (нет чеков), добавляем его стоимость
        if (!hasReceipts) {
          totalAmount += (item.costPrice || 0) * (item.quantity || 1);
        }
      });
    });
    
    return totalAmount;
  };

  const filteredSuppliers = suppliers.filter(supplier => 
    supplier.name.toLowerCase().includes(searchText.toLowerCase()) ||
    supplier.contactPerson?.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    form.setFieldsValue(supplier);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await suppliersApi.delete(id);
      message.success('Поставщик удален');
      loadSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      message.error('Ошибка при удалении поставщика');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingSupplier) {
        await suppliersApi.update(editingSupplier._id, values);
        message.success('Поставщик обновлен');
      } else {
        await suppliersApi.create(values);
        message.success('Поставщик создан');
      }
      setModalVisible(false);
      form.resetFields();
      loadSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      message.error('Ошибка при сохранении поставщика');
    }
  };

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Контактное лицо',
      dataIndex: 'contactPerson',
      key: 'contactPerson',
    },
    {
      title: 'Долг',
      key: 'debt',
      render: (_: any, record: Supplier) => {
        const amount = getUnpaidDebtsAmount(record._id);
        return amount > 0 ? (
          <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
            {amount.toLocaleString('ru-RU')} ₽
          </span>
        ) : (
          <span style={{ color: '#52c41a' }}>Нет долгов</span>
        );
      },
    },
    {
      title: 'На приходе',
      key: 'onArrival',
      render: (_: any, record: Supplier) => {
        const amount = getUnsoldItemsAmount(record._id);
        return amount > 0 ? (
          <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
            {amount.toLocaleString('ru-RU')} ₽
          </span>
        ) : (
          <span style={{ color: '#8c8c8c' }}>0 ₽</span>
        );
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Supplier) => (
        <Space>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Редактировать
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record._id)}
          >
            Удалить
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h1>Поставщики</h1>
      <Space style={{ marginBottom: 16 }}>
        <Search
          placeholder="Поиск поставщиков"
          allowClear
          onSearch={handleSearch}
          style={{ width: 300 }}
        />
        <Button
          type="primary"
          onClick={() => {
            setEditingSupplier(null);
            form.resetFields();
            setModalVisible(true);
          }}
        >
          Добавить поставщика
        </Button>
        <Button
          type="default"
          icon={<BarChartOutlined />}
          onClick={() => window.location.href = '/inventory'}
          style={{ marginLeft: 'auto' }}
        >
          Инвентаризация
        </Button>
      </Space>

      <Table
        loading={loading}
        dataSource={filteredSuppliers}
        columns={columns}
        rowKey="_id"
      />

      <Modal
        title={editingSupplier ? 'Редактировать поставщика' : 'Добавить поставщика'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="contactPerson" label="Контактное лицо">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Телефон">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Адрес">
            <Input />
          </Form.Item>
          <Form.Item name="inn" label="ИНН">
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="Примечания">
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="status" label="Статус" initialValue="active">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Suppliers; 