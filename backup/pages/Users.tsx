import React, { useState, useEffect, useCallback } from 'react';
import { Table, Card, Typography, Button, Tag, Avatar, Badge, Select, message, Modal, Popconfirm, Space, Row, Col, Statistic, Tooltip, Form, Input } from 'antd';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { 
  UserOutlined, 
  ClockCircleOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  CrownOutlined,
  StarOutlined,
  FilterOutlined,
  ClearOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { CSSTransition } from 'react-transition-group';
import { useAuth } from '../hooks/useAuth';
import './Users.css';

const { Title } = Typography;
const { Option } = Select;

interface UserRow {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  ordersCount: number;
  totalSpent: number;
  isOnline?: boolean;
  isRegular?: boolean; // Постоянный клиент
  lastOrderDate?: string; // Дата последнего заказа
  authProvider?: 'google' | 'yandex' | 'telegram' | 'local';
  linkedAccounts?: {
    google?: boolean;
    yandex?: boolean;
    telegram?: boolean;
  };
}

async function fetchUsers(): Promise<UserRow[]> {
  const token = localStorage.getItem('admin_token');
  if (!token) throw new Error('No auth token');
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/admin/users`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
}

// Функция для форматирования ФИО
function formatFullName(user: any) {
  return [user?.lastName, user?.firstName, user?.middleName].filter(Boolean).join(' ');
}

const Users: React.FC = () => {
  const { isAdmin, hasFullAccess } = useAuth();
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserRow | null>(null);
  const [passwordForm] = Form.useForm();
  const [selectedUserType, setSelectedUserType] = useState<string>('');
  const [sortField, setSortField] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend'>('descend');
  const [createForm] = Form.useForm();
  const queryClient = useQueryClient();
  
  const { data, isLoading, error } = useQuery<UserRow[]>({
    queryKey: ['adminUsers'],
    queryFn: fetchUsers,
    retry: 1,
    retryDelay: 1000,
    enabled: !!localStorage.getItem('admin_token'),
  });
  const navigate = useNavigate();

  // Автоматическая прокрутка вверх при загрузке страницы
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Фильтрация и сортировка данных
  const filteredAndSortedData = useCallback(() => {
    if (!data) return [];
    
    let filtered = [...data];
    
    // Фильтрация по типу пользователя
    if (selectedUserType) {
      switch (selectedUserType) {
        case 'regular':
          filtered = filtered.filter(user => user.ordersCount >= 3);
          break;
        case 'online':
          filtered = filtered.filter(user => user.isOnline);
          break;
        case 'with_orders':
          filtered = filtered.filter(user => user.ordersCount > 0);
          break;
        case 'no_orders':
          filtered = filtered.filter(user => user.ordersCount === 0);
          break;
        case 'high_spenders':
          filtered = filtered.filter(user => user.ordersCount > 10);
          break;
      }
    }
    
    // Сортировка
    if (sortField) {
      filtered.sort((a, b) => {
        let aValue: any = a[sortField as keyof UserRow];
        let bValue: any = b[sortField as keyof UserRow];
        
        if (sortField === 'firstName' || sortField === 'lastName') {
          aValue = `${a.firstName} ${a.lastName}`;
          bValue = `${b.firstName} ${b.lastName}`;
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder === 'ascend' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortOrder === 'ascend' ? aValue - bValue : bValue - aValue;
        }
        
        return 0;
      });
    }
    
    return filtered;
  }, [data, selectedUserType, sortField, sortOrder]);

  const handleRoleChange = async () => {
    if (!editingUser || !newRole) return;
    
    // Проверяем права доступа
    if (!hasFullAccess()) {
      message.error('Только администратор или бухгалтер может изменять роли пользователей');
      return;
    }
    
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/admin/users/${editingUser._id}/role`,
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
        queryClient.invalidateQueries(['adminUsers']);
        setIsModalVisible(false);
        setEditingUser(null);
        setNewRole('');
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Ошибка при изменении роли');
      }
    } catch (error) {
      message.error('Ошибка при изменении роли');
    }
  };

  const showRoleModal = (user: UserRow) => {
    setEditingUser(user);
    setNewRole(user.role);
    setIsModalVisible(true);
  };

  const showPasswordModal = (user: UserRow) => {
    setSelectedUserForPassword(user);
    setIsPasswordModalVisible(true);
    passwordForm.resetFields();
  };

  const handlePasswordChange = async (values: { password: string }) => {
    if (!selectedUserForPassword) return;
    
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/admin/users/${selectedUserForPassword._id}/password`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ password: values.password })
        }
      );
      
      if (response.ok) {
        message.success('Пароль успешно изменен');
        setIsPasswordModalVisible(false);
        setSelectedUserForPassword(null);
        passwordForm.resetFields();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Ошибка при изменении пароля');
      }
    } catch (error) {
      message.error('Ошибка при изменении пароля');
    }
  };

  const handleCreateUser = async (values: any) => {
    // Проверяем права доступа
    if (!hasFullAccess()) {
      message.error('Только администратор или бухгалтер может создавать пользователей');
      return;
    }
    
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/admin/users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(values)
        }
      );

      if (response.ok) {
        const result = await response.json();
        message.success('Пользователь успешно создан');
        queryClient.invalidateQueries(['adminUsers']);
        setIsCreateModalVisible(false);
        createForm.resetFields();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Ошибка при создании пользователя');
      }
    } catch (error) {
      message.error('Ошибка сети');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    // Проверяем права доступа
    if (!hasFullAccess()) {
      message.error('Только администратор или бухгалтер может удалять пользователей');
      return;
    }
    
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/admin/users/${userId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        message.success(`Пользователь ${userName} успешно удален`);
        queryClient.invalidateQueries(['adminUsers']);
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Ошибка при удалении пользователя');
      }
    } catch (error) {
      message.error('Ошибка сети');
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'ascend' ? 'descend' : 'ascend');
    } else {
      setSortField(field);
      setSortOrder('descend');
    }
  };

  const handleClearFilters = () => {
    setSelectedUserType('');
    setSortField('');
    setSortOrder('descend');
  };

  const columns = [
    { 
      title: 'Пользователь', 
      key: 'user',
      render: (_: any, record: UserRow) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge dot={record.isOnline} offset={[-5, 5]}>
            <Avatar size="small" icon={<UserOutlined />} />
          </Badge>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {record.firstName} {record.lastName}
              {record.ordersCount >= 3 && (
                <Tooltip title="Постоянный клиент">
                  <CrownOutlined className="crown-icon" style={{ color: '#faad14', fontSize: '14px' }} />
                </Tooltip>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>{record.email}</div>
          </div>
        </div>
      )
    },
    { 
      title: 'ФИО',
      dataIndex: 'firstName',
      key: 'fullName',
      render: (_: any, record: any) => formatFullName(record),
    },
    { 
      title: 'Роль', 
      dataIndex: 'role', 
      key: 'role',
      render: (role: string) => {
        const roleConfig = {
          admin: { color: 'red', label: 'Администратор' },
          accountant: { color: 'green', label: 'Бухгалтер' },
          moderator: { color: 'blue', label: 'Модератор' },
          user: { color: 'default', label: 'Пользователь' }
        };
        
        const config = roleConfig[role as keyof typeof roleConfig] || { color: 'default', label: role };
        
        return (
          <Tag color={config.color}>
            {config.label}
          </Tag>
        );
      }
    },
    { 
      title: 'Заказов', 
      dataIndex: 'ordersCount', 
      key: 'ordersCount',
      sorter: true,
      sortOrder: sortField === 'ordersCount' ? sortOrder : null,
      onHeaderCell: () => ({
        onClick: () => handleSort('ordersCount'),
      }),
    },
    { 
      title: 'Сумма покупок', 
      dataIndex: 'totalSpent', 
      key: 'totalSpent', 
      render: (v: number) => `${v.toLocaleString()} ₽`,
      sorter: true,
      sortOrder: sortField === 'totalSpent' ? sortOrder : null,
      onHeaderCell: () => ({
        onClick: () => handleSort('totalSpent'),
      }),
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_: any, record: UserRow) => (
        <Space>
          {record.isOnline && (
            <Tag color="green" icon={<ClockCircleOutlined />}>
              Онлайн
            </Tag>
          )}
          {record.ordersCount >= 3 && (
            <Tag color="gold" icon={<StarOutlined />}>
              Постоянный
            </Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Регистрация/Привязки',
      key: 'authProvider',
      render: (_: any, record: UserRow) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 12, color: '#555' }}>
            <span style={{ fontWeight: 500 }}>Регистрация:</span>{' '}
            {record.authProvider === 'google' && <><img src="/google.png" alt="Google" style={{ width: 16, height: 16, verticalAlign: 'middle' }} /> Google</>}
            {record.authProvider === 'yandex' && <><img src="/yandex.png" alt="Yandex" style={{ width: 16, height: 16, verticalAlign: 'middle' }} /> Яндекс</>}
            {record.authProvider === 'telegram' && <><img src="/telegram.png" alt="Telegram" style={{ width: 16, height: 16, verticalAlign: 'middle' }} /> Telegram</>}
            {(!record.authProvider || record.authProvider === 'local') && <>Email/Телефон</>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#888' }}>Привязки:</span>
            <span>
              <img src="/google.png" alt="Google" style={{ width: 16, height: 16, verticalAlign: 'middle', opacity: record.linkedAccounts?.google ? 1 : 0.3 }} />
              {record.linkedAccounts?.google && <span style={{ color: 'green', fontWeight: 500, marginLeft: 2 }}>✓</span>}
            </span>
            <span>
              <img src="/yandex.png" alt="Yandex" style={{ width: 16, height: 16, verticalAlign: 'middle', opacity: record.linkedAccounts?.yandex ? 1 : 0.3 }} />
              {record.linkedAccounts?.yandex && <span style={{ color: 'green', fontWeight: 500, marginLeft: 2 }}>✓</span>}
            </span>
            <span>
              <img src="/telegram.png" alt="Telegram" style={{ width: 16, height: 16, verticalAlign: 'middle', opacity: record.linkedAccounts?.telegram ? 1 : 0.3 }} />
              {record.linkedAccounts?.telegram && <span style={{ color: 'green', fontWeight: 500, marginLeft: 2 }}>✓</span>}
            </span>
          </div>
        </div>
      )
    },
    {
      title: 'Действия',
      key: 'action',
      render: (_: any, record: UserRow) => (
        <div style={{ display: 'flex', gap: 8 }}>
          {hasFullAccess() && (
            <Button 
              type="primary" 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => showRoleModal(record)}
            >
              Роль
            </Button>
          )}
          <Button 
            type="default" 
            size="small" 
            onClick={() => showPasswordModal(record)}
          >
            Пароль
          </Button>
          <Button type="link" onClick={() => navigate(`/admin/users/${record._id}`)}>
            Подробнее
          </Button>
          {hasFullAccess() && (
            <Popconfirm
              title="Удалить пользователя"
              description={`Вы уверены, что хотите удалить пользователя ${record.firstName} ${record.lastName}? Это действие нельзя отменить.`}
              onConfirm={() => handleDeleteUser(record._id, `${record.firstName} ${record.lastName}`)}
              okText="Удалить"
              cancelText="Отмена"
              okType="danger"
            >
              <Button 
                type="text" 
                size="small" 
                danger
                icon={<DeleteOutlined />}
              >
                Удалить
              </Button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка загрузки пользователей</div>;

  const filteredData = filteredAndSortedData();
  const totalUsers = data?.length || 0;
  const regularUsers = data?.filter(user => user.ordersCount >= 3).length || 0;
  const onlineUsers = data?.filter(user => user.isOnline).length || 0;
  const usersWithOrders = data?.filter(user => user.ordersCount > 0).length || 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Пользователи</Title>
        {hasFullAccess() && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalVisible(true)}
          >
            Создать пользователя
          </Button>
        )}
      </div>
      
      {/* Статистика */}
      <Row gutter={16} style={{ marginBottom: 24 }} className="users-stats">
        <Col span={6}>
          <Card>
            <Statistic
              title="Всего пользователей"
              value={totalUsers}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Постоянных клиентов"
              value={regularUsers}
              prefix={<CrownOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Онлайн"
              value={onlineUsers}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="С заказами"
              value={usersWithOrders}
              prefix={<StarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Фильтры */}
      <Card style={{ marginBottom: 16 }} className="users-filters">
        <Space wrap>
          <Select
            placeholder="Тип пользователя"
            value={selectedUserType}
            onChange={setSelectedUserType}
            style={{ width: 200 }}
            allowClear
          >
            <Option value="regular">Постоянные клиенты</Option>
            <Option value="online">Онлайн</Option>
            <Option value="with_orders">С заказами</Option>
            <Option value="no_orders">Без заказов</Option>
            <Option value="high_spenders">Крупные покупатели</Option>
          </Select>
          
          <Button 
            icon={<ClearOutlined />} 
            onClick={handleClearFilters}
            disabled={!selectedUserType && !sortField}
          >
            Очистить фильтры
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="_id"
          pagination={{ pageSize: 20 }}
          className="users-table"
          rowClassName={(record) => {
            if (record.ordersCount >= 3) return 'regular-user-row';
            if (record.isOnline) return 'online-user-row';
            return '';
          }}
        />
      </Card>
      
      <Modal
        title="Изменить роль пользователя"
        open={isModalVisible}
        onOk={handleRoleChange}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingUser(null);
          setNewRole('');
        }}
        okText="Сохранить"
        cancelText="Отмена"
      >
        {editingUser && (
          <div>
            <p><strong>Пользователь:</strong> {editingUser.firstName} {editingUser.lastName}</p>
            <p><strong>Email:</strong> {editingUser.email}</p>
            <p><strong>Текущая роль:</strong> {editingUser.role}</p>
            <br />
            <p><strong>Новая роль:</strong></p>
            <Select
              value={newRole}
              onChange={setNewRole}
              style={{ width: '100%' }}
              options={[
                { value: 'user', label: 'Пользователь' },
                { value: 'moderator', label: 'Модератор' },
                { value: 'accountant', label: 'Бухгалтер' },
                { value: 'admin', label: 'Администратор' }
              ]}
            />
          </div>
        )}
      </Modal>

      <Modal
        title="Создать нового пользователя"
        open={isCreateModalVisible}
        onOk={() => createForm.submit()}
        onCancel={() => {
          setIsCreateModalVisible(false);
          createForm.resetFields();
        }}
        okText="Создать"
        cancelText="Отмена"
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateUser}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Имя"
                name="firstName"
                rules={[{ required: true, message: 'Введите имя' }]}
              >
                <Input placeholder="Введите имя" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Фамилия"
                name="lastName"
                rules={[{ required: true, message: 'Введите фамилию' }]}
              >
                <Input placeholder="Введите фамилию" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Отчество"
            name="middleName"
          >
            <Input placeholder="Введите отчество (необязательно)" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Введите корректный email' }
            ]}
          >
            <Input placeholder="Введите email" />
          </Form.Item>

          <Form.Item
            label="Телефон"
            name="phone"
          >
            <Input placeholder="Введите телефон (необязательно)" />
          </Form.Item>

          <Form.Item
            label="Пароль"
            name="password"
            rules={[
              { required: true, message: 'Введите пароль' },
              { min: 6, message: 'Пароль должен содержать минимум 6 символов' }
            ]}
          >
            <Input.Password placeholder="Введите пароль" />
          </Form.Item>

          <Form.Item
            label="Роль"
            name="role"
            initialValue="user"
            rules={[{ required: true, message: 'Выберите роль' }]}
          >
            <Select
              options={[
                { value: 'user', label: 'Пользователь' },
                { value: 'moderator', label: 'Модератор' },
                { value: 'accountant', label: 'Бухгалтер' },
                { value: 'admin', label: 'Администратор' }
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Изменить пароль пользователя"
        open={isPasswordModalVisible}
        onOk={() => passwordForm.submit()}
        onCancel={() => {
          setIsPasswordModalVisible(false);
          setSelectedUserForPassword(null);
          passwordForm.resetFields();
        }}
        okText="Изменить пароль"
        cancelText="Отмена"
        width={500}
      >
        {selectedUserForPassword && (
          <div>
            <p><strong>Пользователь:</strong> {selectedUserForPassword.firstName} {selectedUserForPassword.lastName}</p>
            <p><strong>Email:</strong> {selectedUserForPassword.email}</p>
            <br />
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handlePasswordChange}
            >
              <Form.Item
                label="Новый пароль"
                name="password"
                rules={[
                  { required: true, message: 'Введите новый пароль' },
                  { min: 6, message: 'Пароль должен содержать минимум 6 символов' }
                ]}
              >
                <Input.Password placeholder="Введите новый пароль" />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Users; 