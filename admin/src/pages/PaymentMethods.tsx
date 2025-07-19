import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Modal, message, Form, Input, Switch, Card, Typography, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

interface PaymentMethod {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  deliveryTypes: string[];
  systemCode: string;
  // Дополнительные поля для информации
  displayTitle?: string;
  displayDescription?: string;
  features?: string[];
  icon?: string;
  color?: string;
  specialNote?: string;
  noteType?: 'info' | 'warning' | 'success';
}

interface DeliveryMethodOption {
  _id: string;
  name: string;
}

const PaymentMethods: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [form] = Form.useForm();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryMethodOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentMethods = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/payment-methods`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Ошибка загрузки способов оплаты');
        setPaymentMethods([]);
      } else {
        const data = await res.json();
        setPaymentMethods(data.paymentMethods || []);
      }
    } catch (e) {
      setError('Ошибка сети при загрузке способов оплаты');
      setPaymentMethods([]);
    }
    setLoading(false);
  };

  const fetchDeliveryMethods = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/delivery`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setDeliveryOptions(data.deliveryMethods || []);
      } else {
        setDeliveryOptions([]);
      }
    } catch (error) {
      setDeliveryOptions([]);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
    fetchDeliveryMethods();
  }, []);

  useEffect(() => {
    if (isModalVisible) {
      if (editingMethod) {
        const formData = {
          name: editingMethod.name,
          description: editingMethod.description,
          systemCode: editingMethod.systemCode,
          isActive: editingMethod.isActive,
          deliveryTypes: editingMethod.deliveryTypes || [],
          displayTitle: editingMethod.displayTitle,
          displayDescription: editingMethod.displayDescription,
          features: editingMethod.features || [],
          icon: editingMethod.icon,
          color: editingMethod.color || 'blue',
          specialNote: editingMethod.specialNote,
          noteType: editingMethod.noteType || 'info'
        };
        form.setFieldsValue(formData);
      } else {
        form.resetFields();
        form.setFieldsValue({ 
          isActive: true,
          color: 'blue',
          noteType: 'info'
        });
      }
    }
  }, [isModalVisible, editingMethod]);

  const handleCreate = () => {
    setEditingMethod(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: PaymentMethod) => {
    setEditingMethod(record);
    
    // Правильно заполняем форму данными записи
    const formData = {
      name: record.name,
      description: record.description,
      systemCode: record.systemCode,
      isActive: record.isActive,
      deliveryTypes: record.deliveryTypes || [],
      displayTitle: record.displayTitle,
      displayDescription: record.displayDescription,
      features: record.features || [],
      icon: record.icon,
      color: record.color || 'blue',
      specialNote: record.specialNote,
      noteType: record.noteType || 'info'
    };
    
    // Проверяем, что форма существует
    // Заполняем форму
    form.setFieldsValue(formData);
    
    // Проверяем, что данные установлены
    setTimeout(() => {
      const currentValues = form.getFieldsValue();
    }, 100);
    
    setIsModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Подтверждение удаления',
      content: 'Вы уверены, что хотите удалить этот способ оплаты?',
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        const token = localStorage.getItem('admin_token');
        await fetch(`${API_URL}/payment-methods/${id}`, { 
          method: 'DELETE',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        message.success('Способ оплаты удалён');
        fetchPaymentMethods();
      },
    });
  };

  const handleModalOk = () => {
    form.validateFields().then(async (values) => {
      // Обработка массива features
      if (values.features && typeof values.features === 'string') {
        values.features = values.features.split(',').map((f: string) => f.trim()).filter((f: string) => f);
      }
      
      const headers = {
        'Content-Type': 'application/json'
      };
      const token = localStorage.getItem('admin_token');

      if (editingMethod) {
        await fetch(`${API_URL}/payment-methods/${editingMethod._id}`, {
          method: 'PUT',
          headers: token ? { ...headers, 'Authorization': `Bearer ${token}` } : headers,
          body: JSON.stringify(values),
        });
        message.success('Способ оплаты обновлён');
      } else {
        await fetch(`${API_URL}/payment-methods`, {
          method: 'POST',
          headers: token ? { ...headers, 'Authorization': `Bearer ${token}` } : headers,
          body: JSON.stringify(values),
        });
        message.success('Способ оплаты создан');
      }
      setIsModalVisible(false);
      fetchPaymentMethods();
    });
  };

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => text || <span style={{ color: '#aaa' }}>-</span>,
    },
    {
      title: 'Статус',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean) => active ? <Tag color="green">Активен</Tag> : <Tag color="red">Неактивен</Tag>,
    },
    {
      title: 'Доступные доставки',
      dataIndex: 'deliveryTypes',
      key: 'deliveryTypes',
      render: (ids: string[]) => ids.length ? ids.map(id => {
        const found = deliveryOptions.find(opt => opt._id === id);
        return found ? <Tag key={id}>{found.name}</Tag> : null;
      }) : <span style={{ color: '#aaa' }}>Все</span>,
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (record: PaymentMethod) => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} onClick={() => Modal.info({
            title: record.name,
            content: <div>
              <p><strong>Описание:</strong> {record.description || '-'}</p>
              <p><strong>Код:</strong> {record.systemCode}</p>
              <p><strong>Статус:</strong> {record.isActive ? 'Активен' : 'Неактивен'}</p>
              <p><strong>Заголовок:</strong> {record.displayTitle || '-'}</p>
              <p><strong>Описание для отображения:</strong> {record.displayDescription || '-'}</p>
              <p><strong>Иконка:</strong> {record.icon || '-'}</p>
              <p><strong>Цвет:</strong> {record.color || '-'}</p>
              <p><strong>Преимущества:</strong> {record.features ? record.features.join(', ') : '-'}</p>
              <p><strong>Особое примечание:</strong> {record.specialNote || '-'}</p>
              <p><strong>Тип примечания:</strong> {record.noteType || '-'}</p>
              <p><strong>Доступные доставки:</strong> {record.deliveryTypes.map(id => {
                const found = deliveryOptions.find(opt => opt._id === id);
                return found ? <Tag key={id}>{found.name}</Tag> : null;
              })}</p>
            </div>,
            width: 500
          })} />
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record._id)} />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '8px' }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <Typography.Title level={2} style={{ margin: 0 }}>
            Способы оплаты
          </Typography.Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Добавить способ оплаты
          </Button>
        </div>
        {error && (
          <div style={{ marginBottom: 16 }}>
            <Typography.Text type="danger">{error}</Typography.Text>
          </div>
        )}
        <Table
          columns={columns}
          dataSource={paymentMethods}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showQuickJumper: true }}
          scroll={{ y: 'calc(100vh - 320px)' }}
        />
      </Card>
      <Modal
        title={editingMethod ? 'Редактировать способ оплаты' : 'Добавить способ оплаты'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        width={500}
        okText={editingMethod ? 'Обновить' : 'Создать'}
        cancelText="Отмена"
      >
        <Form layout="vertical" form={form}>
          <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Введите название' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="systemCode" label="Код (уникальный)" rules={[{ required: true, message: 'Введите уникальный код' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="isActive" label="Статус" valuePropName="checked">
            <Switch checkedChildren="Активен" unCheckedChildren="Неактивен" />
          </Form.Item>
          <Form.Item name="deliveryTypes" label="Доступные способы доставки">
            <Select 
              mode="multiple" 
              allowClear 
              placeholder="Все" 
              options={deliveryOptions.map(opt => ({ value: opt._id, label: opt.name }))} 
            />
          </Form.Item>
          
          {/* Дополнительные поля для отображения */}
          <Form.Item name="displayTitle" label="Заголовок для отображения">
            <Input placeholder="Например: Оплата при получении" />
          </Form.Item>
          <Form.Item name="displayDescription" label="Описание для отображения">
            <Input.TextArea rows={2} placeholder="Подробное описание для пользователей" />
          </Form.Item>
          <Form.Item name="icon" label="Иконка (эмодзи)">
            <Input placeholder="💳" />
          </Form.Item>
          <Form.Item name="color" label="Цвет">
            <Select>
              <Select.Option value="blue">Синий</Select.Option>
              <Select.Option value="green">Зеленый</Select.Option>
              <Select.Option value="red">Красный</Select.Option>
              <Select.Option value="yellow">Желтый</Select.Option>
              <Select.Option value="purple">Фиолетовый</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="features" label="Преимущества (через запятую)">
            <Input.TextArea rows={2} placeholder="Без комиссии, Безопасно, Удобно" />
          </Form.Item>
          <Form.Item name="specialNote" label="Особое примечание">
            <Input.TextArea rows={2} placeholder="Дополнительная информация для пользователей" />
          </Form.Item>
          <Form.Item name="noteType" label="Тип примечания">
            <Select>
              <Select.Option value="info">Информация</Select.Option>
              <Select.Option value="warning">Предупреждение</Select.Option>
              <Select.Option value="success">Успех</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PaymentMethods; 