import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { 
  Card, 
  Typography, 
  Table, 
  Button, 
  Descriptions, 
  Modal, 
  Tag, 
  Avatar, 
  Timeline, 
  List,
  Badge,
  Space,
  Divider,
  Row,
  Col,
  Statistic,
  Select,
  message,
  Popconfirm
} from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  PhoneOutlined, 
  CalendarOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  ShoppingOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLogin?: string;
  address?: string;
  password: string;
  isOnline: boolean;
}

interface Order {
  _id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
}

interface LoginHistory {
  date: string;
  ip: string;
  userAgent: string;
}

interface ViewedProduct {
  _id: string;
  name: string;
  category: string;
  viewedAt: string;
  price: number;
  isReal?: boolean;
  isDemo?: boolean;
  message?: string;
}

interface UserDetailResponse {
  user: User;
  orders: Order[];
  totalSpent: number;
  averageCheck: number;
  loginHistory: LoginHistory[];
  viewedProducts: ViewedProduct[];
}

async function fetchUserDetail(id: string): Promise<UserDetailResponse> {
  const token = localStorage.getItem('admin_token');
  if (!token) throw new Error('No auth token');
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/admin/users/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch user detail');
  return response.json();
}

const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isRoleModalVisible, setIsRoleModalVisible] = useState(false);
  const [newRole, setNewRole] = useState<string>('');
  const queryClient = useQueryClient();
  
  const { data, isLoading, error } = useQuery<UserDetailResponse>({
    queryKey: ['adminUserDetail', id],
    queryFn: () => fetchUserDetail(id!),
    enabled: !!id && !!localStorage.getItem('admin_token'),
  });

  const columns = [
    { title: 'Номер заказа', dataIndex: 'orderNumber', key: 'orderNumber' },
    { title: 'Сумма', dataIndex: 'total', key: 'total', render: (v: number) => `${v.toLocaleString()} ₽` },
    { title: 'Статус', dataIndex: 'status', key: 'status' },
    { title: 'Дата', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => new Date(v).toLocaleDateString('ru-RU') },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const handleRoleChange = async () => {
    if (!newRole) return;
    
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/admin/users/${id}/role`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ role: newRole })
        }
      );
      
      if (response.ok) {
        message.success('Роль успешно изменена');
        queryClient.invalidateQueries(['adminUserDetail', id]);
        queryClient.invalidateQueries(['adminUsers']);
        setIsRoleModalVisible(false);
        setNewRole('');
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Ошибка при изменении роли');
      }
    } catch (error) {
      message.error('Ошибка при изменении роли');
    }
  };

  const showRoleModal = () => {
    setNewRole(data?.user.role || '');
    setIsRoleModalVisible(true);
  };

  const handleDeleteUser = async () => {
    if (!data) return;
    
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/admin/users/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        message.success(`Пользователь ${data.user.firstName} ${data.user.lastName} успешно удален`);
        queryClient.invalidateQueries(['adminUsers']);
        navigate('/users');
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Ошибка при удалении пользователя');
      }
    } catch (error) {
      message.error('Ошибка сети');
    }
  };

  if (isLoading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка загрузки пользователя</div>;
  if (!data) return <div>Нет данных</div>;

  return (
    <div>
      <Button onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>Назад</Button>
      
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={24} align="middle">
          <Col>
            <Badge dot={data.user.isOnline} offset={[-5, 5]}>
              <Avatar size={64} icon={<UserOutlined />} />
            </Badge>
          </Col>
          <Col flex="1">
            <Title level={3} style={{ margin: 0 }}>
              {data.user.firstName} {data.user.lastName}
              {data.user.isOnline && (
                <Tag color="green" style={{ marginLeft: 8 }}>
                  <ClockCircleOutlined /> Онлайн
                </Tag>
              )}
            </Title>
            <Text type="secondary">{data.user.email}</Text>
          </Col>
          <Col>
            <Space>
              <Button type="primary" onClick={() => setIsModalVisible(true)}>
                <EyeOutlined /> Подробная информация
              </Button>
              <Button onClick={showRoleModal}>
                Изменить роль
              </Button>
              <Popconfirm
                title="Удалить пользователя"
                description={`Вы уверены, что хотите удалить пользователя ${data.user.firstName} ${data.user.lastName}? Это действие нельзя отменить.`}
                onConfirm={handleDeleteUser}
                okText="Удалить"
                cancelText="Отмена"
                okType="danger"
              >
                <Button danger icon={<DeleteOutlined />}>
                  Удалить
                </Button>
              </Popconfirm>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Всего заказов"
              value={data.orders.length}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Общая сумма"
              value={data.totalSpent}
              prefix={<DollarOutlined />}
              suffix="₽"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Средний чек"
              value={data.averageCheck}
              prefix={<DollarOutlined />}
              suffix="₽"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Статус"
              value={data.user.isActive ? 'Активен' : 'Заблокирован'}
              prefix={data.user.isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              valueStyle={{ color: data.user.isActive ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Заказы пользователя">
        <Table
          columns={columns}
          dataSource={data.orders}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={
          <Space>
            <UserOutlined />
            Подробная информация о пользователе
          </Space>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={800}
        centered
      >
        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Основная информация */}
          <Card title="Основная информация" style={{ marginBottom: 16 }}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Email">
                <Space>
                  <MailOutlined />
                  {data.user.email}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Пароль">
                <Text copyable={{ text: data.user.password }}>
                  <Text code>{data.user.password}</Text>
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Телефон">
                <Space>
                  <PhoneOutlined />
                  {data.user.phone || '-'}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Роль">
                <Tag color={data.user.role === 'admin' ? 'red' : 'blue'}>
                  {data.user.role}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Статус">
                <Tag color={data.user.isActive ? 'green' : 'red'}>
                  {data.user.isActive ? 'Активен' : 'Заблокирован'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Email подтверждён">
                <Tag color={data.user.emailVerified ? 'green' : 'orange'}>
                  {data.user.emailVerified ? 'Да' : 'Нет'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Дата регистрации">
                <Space>
                  <CalendarOutlined />
                  {new Date(data.user.createdAt).toLocaleDateString('ru-RU')}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Последний вход">
                {data.user.lastLogin ? (
                  <Space>
                    <ClockCircleOutlined />
                    {new Date(data.user.lastLogin).toLocaleString('ru-RU')}
                  </Space>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Адрес" span={2}>
                {data.user.address || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* История входов */}
          <Card title="История входов" style={{ marginBottom: 16 }}>
            <Timeline
              items={
                data.loginHistory.length === 0
                  ? [
                      {
                        children: <Text type="secondary">История входов пуста</Text>,
                      },
                    ]
                  : data.loginHistory.map((login) => ({
                      dot: <ClockCircleOutlined style={{ fontSize: '16px' }} />,
                      children: (
                        <>
                          <p><strong>{new Date(login.date).toLocaleString('ru-RU')}</strong></p>
                          <p>IP: {login.ip}</p>
                          <p>Браузер: {login.userAgent}</p>
                        </>
                      ),
                    }))
              }
            />
          </Card>

                     {/* Просмотренные товары */}
           <Card title="Просмотренные товары">
             {data.viewedProducts.length === 0 || (data.viewedProducts.length === 1 && data.viewedProducts[0]._id === 'no-views') ? (
               <div className="text-center py-8">
                 <ShoppingOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                 <div className="mt-4 text-gray-500">
                   Пользователь пока не просматривал товары
                 </div>
               </div>
             ) : (
               <List
                 dataSource={data.viewedProducts}
                 renderItem={(product) => (
                   <List.Item>
                     <List.Item.Meta
                       avatar={
                         <Avatar 
                           icon={<ShoppingOutlined />} 
                           style={{ 
                             backgroundColor: product.isReal ? '#52c41a' : '#faad14' 
                           }} 
                         />
                       }
                       title={
                         <Space>
                           {product.name}
                           {product.isReal && (
                             <Tag color="green">Реальный просмотр</Tag>
                           )}
                           {product.isDemo && (
                             <Tag color="orange">Демо данные</Tag>
                           )}
                         </Space>
                       }
                       description={
                         <Space direction="vertical" size="small">
                           <Text type="secondary">Категория: {product.category}</Text>
                           <Text type="secondary">
                             Просмотрено: {new Date(product.viewedAt).toLocaleString('ru-RU')}
                           </Text>
                           {product.price > 0 && (
                             <Text strong>{product.price.toLocaleString()} ₽</Text>
                           )}
                         </Space>
                       }
                     />
                   </List.Item>
                 )}
               />
             )}
           </Card>
        </div>
      </Modal>

      {/* Модальное окно для изменения роли */}
      <Modal
        title="Изменить роль пользователя"
        open={isRoleModalVisible}
        onOk={handleRoleChange}
        onCancel={() => {
          setIsRoleModalVisible(false);
          setNewRole('');
        }}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <div>
          <p><strong>Пользователь:</strong> {data.user.firstName} {data.user.lastName}</p>
          <p><strong>Email:</strong> {data.user.email}</p>
          <p><strong>Текущая роль:</strong> {data.user.role}</p>
          <br />
          <p><strong>Новая роль:</strong></p>
          <Select
            value={newRole}
            onChange={setNewRole}
            style={{ width: '100%' }}
            options={[
              { value: 'user', label: 'Пользователь' },
              { value: 'moderator', label: 'Модератор' },
              { value: 'admin', label: 'Администратор' }
            ]}
          />
        </div>
      </Modal>
    </div>
  );
};

export default UserDetail; 