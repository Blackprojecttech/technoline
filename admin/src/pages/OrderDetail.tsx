import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Typography, 
  Button, 
  Tag, 
  Descriptions, 
  Table, 
  Space, 
  Modal, 
  Form, 
  Select, 
  Input,
  message,
  Image 
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  PrinterOutlined 
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  sku: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  deliveryMethod?: {
    _id: string;
    name: string;
    type: string;
    price: number;
  };
  shippingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  trackingNumber?: string;
  estimatedDelivery?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  cdekPvzAddress?: string;
  cdekDeliveryDate?: string; // Ожидаемая дата доставки СДЭК
}

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (id) {
      fetchOrder(id);
    }
  }, [id]);

  // Для отладки — выводим объект заказа
  useEffect(() => {
    if (order) {
      console.log('OrderDetail — заказ:', order);
    }
  }, [order]);

  const fetchOrder = async (orderId: string) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/orders/${orderId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      } else {
        message.error('Заказ не найден');
        navigate('/orders');
      }
    } catch (error) {
      message.error('Ошибка загрузки заказа');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'confirmed': return 'blue';
      case 'processing': return 'purple';
      case 'shipped': return 'indigo';
      case 'delivered': return 'green';
      case 'cancelled': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Ожидает подтверждения';
      case 'confirmed': return 'Подтвержден';
      case 'processing': return 'В обработке';
      case 'shipped': return 'Отправлен';
      case 'delivered': return 'Доставлен';
      case 'cancelled': return 'Отменен';
      default: return status;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'card': return 'Банковская карта';
      case 'cash': return 'Наличными при получении';
      case 'bank_transfer': return 'Банковский перевод';
      default: return method;
    }
  };

  const handleUpdateOrder = async (values: any) => {
    if (!order) return;

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/orders/${order._id}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            status: values.status,
            trackingNumber: values.trackingNumber,
            estimatedDelivery: values.estimatedDelivery,
            cdekPvzAddress: values.cdekPvzAddress
          })
        }
      );

      if (response.ok) {
        message.success('Заказ успешно обновлен');
        setIsUpdateModalVisible(false);
        form.resetFields();
        fetchOrder(order._id);
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Ошибка при обновлении заказа');
      }
    } catch (error) {
      message.error('Ошибка сети');
    }
  };

  const showUpdateModal = () => {
    if (!order) return;
    
    form.setFieldsValue({
      status: order.status,
      trackingNumber: order.trackingNumber || '',
      estimatedDelivery: order.estimatedDelivery ? new Date(order.estimatedDelivery).toISOString().split('T')[0] : '',
      cdekPvzAddress: order.cdekPvzAddress || ''
    });
    setIsUpdateModalVisible(true);
  };

  const printOrder = () => {
    window.print();
  };

  if (loading) {
    return <div>Загрузка заказа...</div>;
  }

  if (!order) {
    return <div>Заказ не найден</div>;
  }

  const itemColumns = [
    {
      title: 'Товар',
      key: 'product',
      render: (item: OrderItem) => (
        <div className="flex items-center space-x-3">
          <Image
            src={item.image}
            alt={item.name}
            width={50}
            height={50}
            className="rounded"
          />
          <div>
            <div className="font-medium">{item.name}</div>
            <div className="text-sm text-gray-600">SKU: {item.sku}</div>
          </div>
        </div>
      )
    },
    {
      title: 'Цена',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `${price.toLocaleString()} ₽`
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity: number) => quantity
    },
    {
      title: 'Сумма',
      key: 'total',
      render: (item: OrderItem) => `${(item.price * item.quantity).toLocaleString()} ₽`
    }
  ];

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/orders')}
          >
            Назад
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            Заказ #{order.orderNumber}
          </Title>
        </div>
        <Space>
          <Button icon={<EditOutlined />} onClick={showUpdateModal}>
            Изменить
          </Button>
          <Button icon={<PrinterOutlined />} onClick={printOrder}>
            Печать
          </Button>
        </Space>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Основная информация */}
        <div className="lg:col-span-2 space-y-6">
          {/* Статус и сумма */}
          <Card>
            <div className="flex justify-between items-start">
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Заказ #{order.orderNumber}
                </Title>
                <Text type="secondary">
                  Создан: {new Date(order.createdAt).toLocaleDateString('ru-RU')} в {new Date(order.createdAt).toLocaleTimeString('ru-RU')}
                </Text>
                {order.updatedAt !== order.createdAt && (
                  <div>
                    <Text type="secondary">
                      Обновлен: {new Date(order.updatedAt).toLocaleDateString('ru-RU')} в {new Date(order.updatedAt).toLocaleTimeString('ru-RU')}
                    </Text>
                  </div>
                )}
              </div>
              <div className="text-right">
                <Tag color={getStatusColor(order.status)}>
                  {getStatusText(order.status)}
                </Tag>
                <div className="mt-2">
                  <Text className="text-2xl font-bold">
                    {order.total.toLocaleString()} ₽
                  </Text>
                </div>
              </div>
            </div>
          </Card>

          {/* Товары */}
          <Card title="Товары в заказе">
            <Table
              columns={itemColumns}
              dataSource={order.items}
              rowKey={(record, index) => index?.toString() || '0'}
              pagination={false}
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={2}>
                      <strong>Подытог:</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}></Table.Summary.Cell>
                    <Table.Summary.Cell index={2}>
                      <strong>{order.subtotal.toLocaleString()} ₽</strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={2}>
                      <strong>Доставка:</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}></Table.Summary.Cell>
                    <Table.Summary.Cell index={2}>
                      <strong>{order.shipping === 0 ? 'Бесплатно' : `${order.shipping.toLocaleString()} ₽`}</strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={2}>
                      <strong>Итого:</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}></Table.Summary.Cell>
                    <Table.Summary.Cell index={2}>
                      <strong className="text-lg">{order.total.toLocaleString()} ₽</strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>
        </div>

        {/* Боковая панель */}
        <div className="space-y-6">
          {/* Информация о клиенте */}
          <Card title="Информация о клиенте">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Имя">
                {order.userId.firstName} {order.userId.lastName}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {order.userId.email}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Адрес доставки */}
          <Card title="Адрес доставки">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Получатель">
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              </Descriptions.Item>
              <Descriptions.Item label="Адрес">
                {order.shippingAddress.address}
              </Descriptions.Item>
              <Descriptions.Item label="Город">
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
              </Descriptions.Item>
              <Descriptions.Item label="Страна">
                {order.shippingAddress.country}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {order.shippingAddress.email}
              </Descriptions.Item>
              <Descriptions.Item label="Телефон">
                {order.shippingAddress.phone}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Информация о заказе */}
          <Card title="Информация о заказе">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Способ доставки">
                {order.deliveryMethod ? (
                  <div>
                    <div className="font-medium">{order.deliveryMethod.name}</div>
                    <div className="text-sm text-gray-600">
                      {order.deliveryMethod.price === 0 ? 'Бесплатно' : `${order.deliveryMethod.price} ₽`}
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-500">Не указан</span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Способ оплаты">
                {getPaymentMethodText(order.paymentMethod)}
              </Descriptions.Item>
              <Descriptions.Item label="Статус оплаты">
                <Tag color={order.paymentStatus === 'paid' ? 'green' : 'orange'}>
                  {order.paymentStatus === 'paid' ? 'Оплачен' : 'Не оплачен'}
                </Tag>
              </Descriptions.Item>
              {order.trackingNumber && (
                <Descriptions.Item label="Трек-номер">
                  {order.trackingNumber}
                </Descriptions.Item>
              )}
              {order.estimatedDelivery && (
                <Descriptions.Item label="Ожидаемая доставка">
                  {new Date(order.estimatedDelivery).toLocaleDateString('ru-RU')}
                </Descriptions.Item>
              )}
              {order.notes && (
                <Descriptions.Item label="Комментарий">
                  {order.notes}
                </Descriptions.Item>
              )}
              {order?.cdekPvzAddress && (
                <Descriptions.Item label="Пункт выдачи СДЭК">
                  <span style={{ color: '#667eea', fontWeight: 500 }}>{order.cdekPvzAddress}</span>
                </Descriptions.Item>
              )}
              {order?.cdekDeliveryDate && (
                <Descriptions.Item label="Ожидаемая дата доставки СДЭК">
                  <span style={{ color: '#52c41a', fontWeight: 500 }}>
                    {new Date(order.cdekDeliveryDate).toLocaleDateString('ru-RU')}
                  </span>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </div>
      </div>

      {/* Модальное окно обновления */}
      <Modal
        title="Обновить заказ"
        open={isUpdateModalVisible}
        onCancel={() => {
          setIsUpdateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateOrder}
        >
          <Form.Item
            name="status"
            label="Статус заказа"
            rules={[{ required: true, message: 'Выберите статус' }]}
          >
            <Select>
              <Option value="pending">Ожидает подтверждения</Option>
              <Option value="confirmed">Подтвержден</Option>
              <Option value="processing">В обработке</Option>
              <Option value="shipped">Отправлен</Option>
              <Option value="delivered">Доставлен</Option>
              <Option value="cancelled">Отменен</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="trackingNumber"
            label="Трек-номер"
          >
            <Input placeholder="Введите трек-номер" />
          </Form.Item>

          <Form.Item
            name="estimatedDelivery"
            label="Ожидаемая дата доставки"
          >
            <Input type="date" />
          </Form.Item>

          <Form.Item
            name="cdekPvzAddress"
            label="Адрес ПВЗ"
          >
            <Input 
              placeholder="Введите адрес пункта выдачи СДЭК" 
              style={{ color: '#667eea', fontWeight: 500 }} 
            />
          </Form.Item>
          {order?.cdekDeliveryDate && (
            <Form.Item label="Ожидаемая дата доставки СДЭК">
              <Input 
                value={new Date(order.cdekDeliveryDate).toLocaleDateString('ru-RU')} 
                readOnly 
                style={{ color: '#52c41a', fontWeight: 500 }} 
              />
            </Form.Item>
          )}

          <div className="flex justify-end space-x-4">
            <Button onClick={() => {
              setIsUpdateModalVisible(false);
              form.resetFields();
            }}>
              Отмена
            </Button>
            <Button type="primary" htmlType="submit">
              Обновить
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default OrderDetail; 