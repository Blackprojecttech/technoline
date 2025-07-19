import React, { useState } from 'react';
import { Table, Card, Typography, Button, Tag, Avatar, Badge, Select, message, Modal, Popconfirm } from 'antd';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { UserOutlined, ClockCircleOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface UserRow {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  ordersCount: number;
  totalSpent: number;
  isOnline?: boolean;
}

async function fetchUsers(): Promise<UserRow[]> {
  const token = localStorage.getItem('admin_token');
  if (!token) throw new Error('No auth token');
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/admin/users`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
}

const Users: React.FC = () => {
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const queryClient = useQueryClient();
  
  const { data, isLoading, error } = useQuery<UserRow[]>({
    queryKey: ['adminUsers'],
    queryFn: fetchUsers,
    retry: 1,
    retryDelay: 1000,
    enabled: !!localStorage.getItem('admin_token'),
  });
  const navigate = useNavigate();

  const handleRoleChange = async () => {
    if (!editingUser || !newRole) return;
    
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/admin/users/${editingUser._id}/role`,
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

  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/admin/users/${userId}`,
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
            <div>{record.firstName} {record.lastName}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{record.email}</div>
          </div>
        </div>
      )
    },
    { 
      title: 'Роль', 
      dataIndex: 'role', 
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {role}
        </Tag>
      )
    },
    { title: 'Заказов', dataIndex: 'ordersCount', key: 'ordersCount' },
    { title: 'Сумма покупок', dataIndex: 'totalSpent', key: 'totalSpent', render: (v: number) => `${v.toLocaleString()} ₽` },
    {
      title: 'Статус',
      key: 'status',
      render: (_: any, record: UserRow) => (
        record.isOnline ? (
          <Tag color="green" icon={<ClockCircleOutlined />}>
            Онлайн
          </Tag>
        ) : null
      )
    },
    {
      title: 'Действия',
      key: 'action',
      render: (_: any, record: UserRow) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button 
            type="primary" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => showRoleModal(record)}
          >
            Роль
          </Button>
          <Button type="link" onClick={() => navigate(`/users/${record._id}`)}>
            Подробнее
          </Button>
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
        </div>
      ),
    },
  ];

  if (isLoading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка загрузки пользователей</div>;

  return (
    <div>
      <Title level={2}>Пользователи</Title>
      <Card>
        <Table
          columns={columns}
          dataSource={data || []}
          rowKey="_id"
          pagination={{ pageSize: 20 }}
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
                { value: 'admin', label: 'Администратор' }
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Users; 