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
  InputNumber,
  message,
  Image,
  Row,
  Col,
  Statistic,
  Divider,
  Badge,
  Tooltip,
  Progress
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  PrinterOutlined,
  UserOutlined,
  EnvironmentOutlined,
  ShoppingOutlined,
  CreditCardOutlined,
  TruckOutlined,
  CalendarOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CarOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import TrackingInfo from '../components/TrackingInfo';
import './OrderDetail.css';

const { Title, Text, Paragraph } = Typography;
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
  cdekPvzCode?: string; // Код ПВЗ CDEK
  cdekDeliveryDate?: string;
  callRequest?: boolean;
  callStatus?: string;
}

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Автоматическая прокрутка вверх при загрузке страницы
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (id) {
      fetchOrder(id);
    }
  }, [id]);

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
        console.log('📋 OrderDetail - Данные заказа получены:', data);
        console.log('🔍 OrderDetail - cdekPvzCode в данных:', data.cdekPvzCode);
        console.log('🔍 OrderDetail - cdekPvzAddress в данных:', data.cdekPvzAddress);
        console.log('🔍 OrderDetail - orderNumber в данных:', data.orderNumber);
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
      case 'with_courier': return 'cyan';
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
      case 'with_courier': return 'Передан курьеру';
      default: return status;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash_on_delivery': return 'Наличными при получении';
      case 'bank_card': return 'Банковская карта';
      case 'sberbank_transfer': return 'Банковский перевод';
      case 'credit_purchase': return 'Покупка в кредит';
      case 'usdt_payment': return 'Оплата USDT';
      default: return method;
    }
  };

  const getStatusProgress = (status: string) => {
    switch (status) {
      case 'pending': return 20;
      case 'confirmed': return 40;
      case 'processing': return 60;
      case 'shipped': return 80;
      case 'delivered': return 100;
      case 'with_courier': return 90;
      case 'cancelled': return 0;
      default: return 0;
    }
  };

  const handleUpdateOrder = async (values: any) => {
    if (!order) return;

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/orders/${order._id}`,
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
            cdekPvzAddress: values.cdekPvzAddress,
        cdekPvzCode: values.cdekPvzCode
          })
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log('✅ OrderDetail - Заказ обновлен успешно:', result);
        console.log('📦 OrderDetail - Трек-номер в ответе:', result.trackingNumber);
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
    
    console.log('🔍 OrderDetail - Открываем модальное окно для заказа:', order._id);
    console.log('📦 OrderDetail - Трек-номер заказа при открытии:', order.trackingNumber);
    console.log('🏪 OrderDetail - cdekPvzCode заказа при открытии:', order.cdekPvzCode);
    
    form.setFieldsValue({
      status: order.status,
      trackingNumber: order.trackingNumber || '',
      estimatedDelivery: order.estimatedDelivery ? new Date(order.estimatedDelivery).toISOString().split('T')[0] : '',
      cdekPvzAddress: order.cdekPvzAddress || '',
      cdekPvzCode: order.cdekPvzCode || ''
    });
    console.log('📝 OrderDetail - Установлены значения формы:', {
      cdekPvzAddress: order.cdekPvzAddress || '',
      cdekPvzCode: order.cdekPvzCode || ''
    });
    setIsUpdateModalVisible(true);
  };

  const printOrder = () => {
    window.print();
  };

  // Функция для форматирования ФИО
  function formatFullName(user: any) {
    return [user?.lastName, user?.firstName, user?.middleName].filter(Boolean).join(' ');
  }


  if (loading) {
    return (
      <div className="order-detail-container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <div className="loading-spinner">
          <div style={{ fontSize: '48px', color: '#1890ff' }}>⏳</div>
        </div>
        <Title level={3} style={{ marginTop: '24px' }}>Загрузка заказа...</Title>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-detail-container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <ExclamationCircleOutlined style={{ fontSize: '64px', color: '#ff4d4f' }} />
        <Title level={3} style={{ marginTop: '24px' }}>Заказ не найден</Title>
        <Button type="primary" onClick={() => navigate('/orders')}>
          Вернуться к заказам
        </Button>
      </div>
    );
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
            width={60}
            height={60}
            className="rounded"
            style={{ objectFit: 'cover' }}
          />
          <div>
            <div className="font-medium" style={{ fontSize: '14px' }}>{item.name}</div>
            <div className="text-sm text-gray-600">SKU: {item.sku}</div>
          </div>
        </div>
      )
    },
    {
      title: 'Цена',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => (
        <Text strong style={{ fontSize: '16px' }}>
          {price.toLocaleString()} ₽
        </Text>
      )
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity: number) => (
        <Badge count={quantity} style={{ backgroundColor: '#1890ff' }} />
      )
    },
    {
      title: 'Сумма',
      key: 'total',
      render: (item: OrderItem) => (
        <Text strong style={{ fontSize: '16px', color: '#52c41a' }}>
          {(item.price * item.quantity).toLocaleString()} ₽
        </Text>
      )
    }
  ];

  return (
    <div className="order-detail-container" style={{ padding: '24px' }}>
      {/* Заголовок */}
      <div className="order-header" style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="large">
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={() => navigate('/orders')}
                className="action-button"
                size="large"
              >
                Назад
              </Button>
              <div>
                <Title level={2} style={{ margin: 0 }}>
                  Заказ #{order.orderNumber}
                </Title>
                <Text type="secondary">
                  Создан {new Date(order.createdAt).toLocaleDateString('ru-RU')} в {new Date(order.createdAt).toLocaleTimeString('ru-RU')}
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<EditOutlined />} 
                onClick={showUpdateModal}
                className="action-button"
                type="primary"
              >
                Изменить
              </Button>
              <Button 
                icon={<PrinterOutlined />} 
                onClick={printOrder}
                className="action-button"
              >
                Печать
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Row gutter={[24, 24]}>
        {/* Основная информация */}
        <Col xs={24} lg={16}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Статус и прогресс */}
            <Card className="order-status-card order-card">
              <Row gutter={[24, 16]}>
                <Col xs={24} md={12}>
                  <div style={{ textAlign: 'center' }}>
                    <Title level={4} style={{ marginBottom: '16px' }}>
                      Статус заказа
                    </Title>
                    <Tag 
                      color={getStatusColor(order.status)}
                      className="status-badge"
                      style={{ fontSize: '16px', padding: '8px 16px' }}
                    >
                      {getStatusText(order.status)}
                    </Tag>
                  </div>
                </Col>
                <Col xs={24} md={12}>
                  <div style={{ textAlign: 'center' }}>
                    <Title level={4} style={{ marginBottom: '16px' }}>
                      Прогресс выполнения
                    </Title>
                    <Progress 
                      type="circle" 
                      percent={getStatusProgress(order.status)}
                      strokeColor={{
                        '0%': '#108ee9',
                        '100%': '#87d068',
                      }}
                      format={percent => `${percent}%`}
                    />
                  </div>
                </Col>
              </Row>
            </Card>

            {/* Статистика */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Card className="order-card" style={{ textAlign: 'center' }}>
                  <Statistic
                    title="Сумма заказа"
                    value={order.total}
                    precision={0}
                    valueStyle={{ color: '#3f8600' }}
                    suffix="₽"
                    prefix={<DollarOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card className="order-card" style={{ textAlign: 'center' }}>
                  <Statistic
                    title="Товаров"
                    value={order.items.length}
                    valueStyle={{ color: '#1890ff' }}
                    prefix={<ShoppingOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card className="order-card" style={{ textAlign: 'center' }}>
                  <Statistic
                    title="Доставка"
                    value={order.shipping}
                    precision={0}
                    valueStyle={{ color: order.shipping === 0 ? '#52c41a' : '#faad14' }}
                    suffix={order.shipping === 0 ? 'Бесплатно' : '₽'}
                    prefix={<TruckOutlined />}
                  />
                </Card>
              </Col>
            </Row>

            {/* Товары */}
            <Card 
              className="order-items-card order-card"
              title={
                <Space>
                  <ShoppingOutlined />
                  <span>Товары в заказе</span>
                  <Badge count={order.items.length} style={{ backgroundColor: '#1890ff' }} />
                </Space>
              }
            >
              <Table
                columns={itemColumns}
                dataSource={order.items}
                rowKey={(record, index) => index?.toString() || '0'}
                pagination={false}
                className="products-table"
                summary={() => (
                  <Table.Summary>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <Text strong>Подытог:</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1}></Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>
                        <Text strong>{order.subtotal.toLocaleString()} ₽</Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <Text strong>Доставка:</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1}></Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>
                        <Text strong>{order.shipping === 0 ? 'Бесплатно' : `${order.shipping.toLocaleString()} ₽`}</Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <Text strong style={{ fontSize: '18px' }}>Итого:</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1}></Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>
                        <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
                          {order.total.toLocaleString()} ₽
                        </Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </Card>

            {/* Отслеживание */}
            {order.trackingNumber && (
              <TrackingInfo trackingNumber={order.trackingNumber} />
            )}
          </Space>
        </Col>

        {/* Боковая панель */}
        <Col xs={24} lg={8}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Информация о клиенте */}
            <Card 
              className="order-sidebar order-card"
              title={
                <Space>
                  <UserOutlined />
                  <span>Информация о клиенте</span>
                </Space>
              }
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text strong>Имя:</Text>
                  <br />
                  <Text type="secondary">
                    {order?.userId ? formatFullName(order.userId) : ''}
                  </Text>
                </div>
                <div>
                  <Text strong>Email:</Text>
                  <br />
                  <Text copyable>{order.userId.email}</Text>
                </div>
                {order.callRequest && (
                  <div>
                    <Badge 
                      status="processing" 
                      text={
                        <Text type="warning">
                          <PhoneOutlined /> Запрос звонка
                        </Text>
                      }
                    />
                  </div>
                )}
              </Space>
            </Card>

            {/* Адрес доставки */}
            <Card 
              className="order-sidebar order-card"
              title={
                <Space>
                  <EnvironmentOutlined />
                  <span>Адрес доставки</span>
                </Space>
              }
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text strong>Получатель:</Text>
                  <br />
                  <Text>
                    {order?.shippingAddress ? formatFullName(order.shippingAddress) : ''}
                  </Text>
                </div>
                <div>
                  <Text strong>Адрес:</Text>
                  <br />
                  <Text>{order.shippingAddress.address}</Text>
                </div>
                <div>
                  <Text strong>Город:</Text>
                  <br />
                  <Text>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</Text>
                </div>
                <div>
                  <Text strong>Страна:</Text>
                  <br />
                  <Text>{order.shippingAddress.country}</Text>
                </div>
                <Divider />
                <div>
                  <Text strong>Email:</Text>
                  <br />
                  <Text copyable>{order.shippingAddress.email}</Text>
                </div>
                <div>
                  <Text strong>Телефон:</Text>
                  <br />
                  <Text copyable>{order.shippingAddress.phone}</Text>
                </div>
              </Space>
            </Card>

            {/* Информация о заказе */}
            <Card 
              className="order-sidebar order-card"
              title={
                <Space>
                  <CreditCardOutlined />
                  <span>Информация о заказе</span>
                </Space>
              }
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text strong>Способ доставки:</Text>
                  <br />
                  {order.deliveryMethod ? (
                    <div>
                      <Text strong>{order.deliveryMethod.name}</Text>
                      <br />
                      <Text type="secondary">
                        {order.deliveryMethod.price === 0 ? 'Бесплатно' : `${order.deliveryMethod.price} ₽`}
                      </Text>
                    </div>
                  ) : (
                    <Text type="secondary">Не указан</Text>
                  )}
                </div>
                <div>
                  <Text strong>Способ оплаты:</Text>
                  <br />
                  <Text>{getPaymentMethodText(order.paymentMethod)}</Text>
                </div>
                <div>
                  <Text strong>Статус оплаты:</Text>
                  <br />
                  <Tag color={order.paymentStatus === 'paid' ? 'green' : 'orange'}>
                    {order.paymentStatus === 'paid' ? 'Оплачен' : 'Не оплачен'}
                  </Tag>
                </div>
                <div>
                  <Text strong>Трек-номер:</Text>
                  <br />
                  {order.trackingNumber ? (
                    <Text copyable>{order.trackingNumber}</Text>
                  ) : (
                    <Text type="secondary">Не указан</Text>
                  )}
                </div>
                {order.estimatedDelivery && (
                  <div>
                    <Text strong>Ожидаемая доставка:</Text>
                    <br />
                    <Text>
                      <CalendarOutlined /> {new Date(order.estimatedDelivery).toLocaleDateString('ru-RU')}
                    </Text>
                  </div>
                )}
                {order.notes && (
                  <div>
                    <Text strong>Комментарий:</Text>
                    <br />
                    <Text type="secondary">{order.notes}</Text>
                  </div>
                )}
                {order?.cdekPvzAddress && (
                  <div>
                    <Text strong>Пункт выдачи СДЭК:</Text>
                    <br />
                    <Text style={{ color: '#667eea', fontWeight: 500 }}>
                      <HomeOutlined /> {order.cdekPvzAddress}
                    </Text>
                    {order?.cdekPvzCode && (
                      <Text style={{ color: '#1890ff', fontWeight: 500, marginLeft: '8px' }}>
                        (Код: {order.cdekPvzCode})
                      </Text>
                    )}
                  </div>
                )}
                {order?.cdekDeliveryDate && (
                  <div>
                    <Text strong>Ожидаемая дата доставки СДЭК:</Text>
                    <br />
                    <Text style={{ color: '#52c41a', fontWeight: 500 }}>
                      <CalendarOutlined /> {new Date(order.cdekDeliveryDate).toLocaleDateString('ru-RU')}
                    </Text>
                  </div>
                )}
              </Space>
            </Card>
          </Space>
        </Col>
      </Row>

      {/* Модальное окно обновления */}
      <Modal
        title={
          <Space>
            <EditOutlined />
            <span>Обновить заказ</span>
          </Space>
        }
        open={isUpdateModalVisible}
        onCancel={() => {
          setIsUpdateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
        className="update-modal"
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
            <Select size="large">
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
            <Input 
              placeholder="Введите трек-номер" 
              size="large"
              prefix={<CarOutlined />}
            />
          </Form.Item>

          <Form.Item
            name="estimatedDelivery"
            label="Ожидаемая дата доставки"
          >
            <Input 
              type="date" 
              size="large"
              prefix={<CalendarOutlined />}
            />
          </Form.Item>

          <Form.Item
            name="cdekPvzAddress"
            label="Адрес ПВЗ"
          >
            <Input 
              placeholder="Введите адрес пункта выдачи СДЭК" 
              size="large"
              prefix={<HomeOutlined />}
              style={{ color: '#667eea', fontWeight: 500 }} 
            />
          </Form.Item>

          <Form.Item
            name="cdekPvzCode"
            label="Код ПВЗ СДЭК"
          >
            <Input 
              placeholder="Введите код ПВЗ (например: RVD3)" 
              size="large"
              prefix={<HomeOutlined />}
              style={{ color: '#1890ff', fontWeight: 500 }} 
            />
          </Form.Item>
          
          {order?.cdekDeliveryDate && (
            <Form.Item label="Ожидаемая дата доставки СДЭК">
              <Input 
                value={new Date(order.cdekDeliveryDate).toLocaleDateString('ru-RU')} 
                readOnly 
                size="large"
                prefix={<CalendarOutlined />}
                style={{ color: '#52c41a', fontWeight: 500 }} 
              />
            </Form.Item>
          )}

          <div style={{ textAlign: 'right', marginTop: '24px' }}>
            <Space>
              <Button 
                onClick={() => {
                  setIsUpdateModalVisible(false);
                  form.resetFields();
                }}
                size="large"
              >
                Отмена
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                size="large"
                icon={<CheckCircleOutlined />}
              >
                Обновить
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>


    </div>
  );
};

export default OrderDetail; 