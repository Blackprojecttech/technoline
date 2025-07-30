import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Typography, 
  Button, 
  Tag, 
  Modal, 
  Form, 
  Input, 
  message, 
  Tabs, 
  Statistic, 
  Row, 
  Col,
  Space,
  Tooltip,
  Select,
  Badge,
  Divider,
  Collapse,
  List
} from 'antd';
import { 
  DollarOutlined, 
  UserOutlined, 
  TrophyOutlined, 
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  MoneyCollectOutlined,
  LinkOutlined,
  TeamOutlined,
  DownOutlined,
  UpOutlined,
  ShoppingCartOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../hooks/useAuth';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

interface ReferralStats {
  clicks: number;
  registrations: number;
  orders: number;
  totalCommission: number;
  pendingCommission: number;
  availableCommission: number;
  withdrawnCommission: number;
}

interface ReferralUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  referralCode: string;
  createdAt: string;
}

interface Referral {
  user: ReferralUser;
  stats: ReferralStats;
}

interface WithdrawalRequest {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  requestDate: string;
  processedDate?: string;
  paymentMethod: string;
  paymentDetails: string;
  notes?: string;
  processedBy?: {
    firstName: string;
    lastName: string;
  };
}

interface ReferralOrder {
  _id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  items: Array<{
    productId: {
      name: string;
      price: number;
      images?: string[];
    };
    quantity: number;
    price: number;
  }>;
}

interface ReferralDetails {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    createdAt: string;
  };
  orders: ReferralOrder[];
  totalSpent: number;
  totalCommission: number;
  ordersCount: number;
}

interface UserReferralDetails {
  user: ReferralUser;
  referrals: ReferralDetails[];
  totalReferrals: number;
  totalOrders: number;
  totalCommission: number;
}

const Referrals: React.FC = () => {
  const { isAdmin } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [withdrawalFilter, setWithdrawalFilter] = useState<string>('');
  const [processModalVisible, setProcessModalVisible] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [form] = Form.useForm();
  
  // Новые состояния для деталей рефералов
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [userReferralDetails, setUserReferralDetails] = useState<Map<string, UserReferralDetails>>(new Map());
  const [detailsLoading, setDetailsLoading] = useState<Set<string>>(new Set());

  // Получение рефералов
  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/referrals/admin/all?page=${currentPage}&limit=${pageSize}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReferrals(data.referrals);
        setTotal(data.total);
      } else {
        throw new Error('Ошибка при загрузке рефералов');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      message.error('Ошибка при загрузке рефералов');
    } finally {
      setLoading(false);
    }
  };

  // Получение деталей рефералов пользователя
  const fetchUserReferralDetails = async (userId: string) => {
    if (userReferralDetails.has(userId)) {
      return; // Данные уже загружены
    }

    setDetailsLoading(prev => new Set(prev).add(userId));
    
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/referrals/admin/user/${userId}/details`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data: UserReferralDetails = await response.json();
        setUserReferralDetails(prev => new Map(prev).set(userId, data));
      } else {
        throw new Error('Ошибка при загрузке деталей рефералов');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      message.error('Ошибка при загрузке деталей рефералов');
    } finally {
      setDetailsLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  // Получение заявок на вывод
  const fetchWithdrawals = async () => {
    setWithdrawalsLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const url = `${import.meta.env.VITE_API_URL}/referrals/admin/withdrawals?page=1&limit=50${withdrawalFilter ? `&status=${withdrawalFilter}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data.withdrawals);
      } else {
        throw new Error('Ошибка при загрузке заявок');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      message.error('Ошибка при загрузке заявок на вывод');
    } finally {
      setWithdrawalsLoading(false);
    }
  };

  // Обработка заявки на вывод
  const processWithdrawal = async (withdrawalId: string, status: string, notes?: string) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/referrals/admin/withdrawals/${withdrawalId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status, notes })
        }
      );

      if (response.ok) {
        message.success('Заявка обработана');
        fetchWithdrawals();
        setProcessModalVisible(false);
        form.resetFields();
      } else {
        throw new Error('Ошибка при обработке заявки');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      message.error('Ошибка при обработке заявки');
    }
  };

  // Обработка клика по строке пользователя
  const handleRowExpand = async (userId: string) => {
    const newExpandedRows = new Set(expandedRows);
    
    if (expandedRows.has(userId)) {
      newExpandedRows.delete(userId);
    } else {
      newExpandedRows.add(userId);
      await fetchUserReferralDetails(userId);
    }
    
    setExpandedRows(newExpandedRows);
  };

  useEffect(() => {
    fetchReferrals();
  }, [currentPage, pageSize]);

  useEffect(() => {
    fetchWithdrawals();
  }, [withdrawalFilter]);

  const referralsColumns = [
    {
      title: 'Пользователь',
      key: 'user',
      render: (record: Referral) => (
        <div 
          style={{ cursor: 'pointer' }}
          onClick={() => handleRowExpand(record.user._id)}
        >
          <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {record.user.firstName} {record.user.lastName}
            {expandedRows.has(record.user._id) ? 
              <UpOutlined style={{ fontSize: '12px', color: '#1890ff' }} /> : 
              <DownOutlined style={{ fontSize: '12px', color: '#1890ff' }} />
            }
            {detailsLoading.has(record.user._id) && (
              <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            )}
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.user.email}
          </Text>
          {record.user.phone && (
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.user.phone}
              </Text>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Реферальный код',
      key: 'code',
      render: (record: Referral) => (
        <Tag color="blue" style={{ fontFamily: 'monospace' }}>
          {record.user.referralCode}
        </Tag>
      )
    },
    {
      title: 'Статистика',
      key: 'stats',
      render: (record: Referral) => (
        <Space direction="vertical" size="small">
          <Text style={{ fontSize: '12px' }}>
            <LinkOutlined /> Переходы: {record.stats.clicks}
          </Text>
          <Text style={{ fontSize: '12px' }}>
            <UserOutlined /> Регистрации: {record.stats.registrations}
          </Text>
          <Text style={{ fontSize: '12px' }}>
            <TrophyOutlined /> Заказы: {record.stats.orders}
          </Text>
        </Space>
      )
    },
    {
      title: 'Комиссии',
      key: 'commission',
      render: (record: Referral) => (
        <Space direction="vertical" size="small">
          <Text style={{ fontSize: '12px', color: '#52c41a' }}>
            Общая: {record.stats.totalCommission.toFixed(2)} ₽
          </Text>
          <Text style={{ fontSize: '12px', color: '#1890ff' }}>
            Доступно: {record.stats.availableCommission.toFixed(2)} ₽
          </Text>
          <Text style={{ fontSize: '12px', color: '#722ed1' }}>
            Выведено: {record.stats.withdrawnCommission.toFixed(2)} ₽
          </Text>
        </Space>
      )
    },
    {
      title: 'Дата регистрации',
      key: 'date',
      render: (record: Referral) => (
        <Text style={{ fontSize: '12px' }}>
          {dayjs(record.user.createdAt).format('DD.MM.YYYY HH:mm')}
        </Text>
      )
    }
  ];

  // Компонент для отображения деталей рефералов пользователя
  const renderReferralDetails = (userId: string) => {
    const details = userReferralDetails.get(userId);
    
    if (!details) {
      return null;
    }

    return (
      <div style={{ padding: '16px', backgroundColor: '#fafafa', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
        <Title level={5} style={{ marginBottom: '16px', color: '#1890ff' }}>
          📊 Рефералы пользователя {details.user.firstName} {details.user.lastName}
        </Title>
        
        <Row gutter={16} style={{ marginBottom: '16px' }}>
          <Col span={6}>
            <Statistic
              title="Всего рефералов"
              value={details.totalReferrals}
              prefix={<TeamOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Заказов"
              value={details.totalOrders}
              prefix={<ShoppingCartOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Общая комиссия"
              value={details.totalCommission.toFixed(2)}
              prefix={<DollarOutlined />}
              suffix="₽"
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
        </Row>

        {details.referrals.length > 0 ? (
          <Collapse ghost>
            {details.referrals.map((referral, index) => (
              <Collapse.Panel
                header={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{referral.user.firstName} {referral.user.lastName}</strong>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {referral.user.email}
                        {referral.user.phone && ` • ${referral.user.phone}`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>
                        {referral.ordersCount} заказов
                      </div>
                      <div style={{ fontSize: '12px', color: '#52c41a' }}>
                        {referral.totalSpent.toFixed(2)} ₽ • Комиссия: {referral.totalCommission.toFixed(2)} ₽
                      </div>
                    </div>
                  </div>
                }
                key={referral.user._id}
              >
                {referral.orders.length > 0 ? (
                  <List
                    dataSource={referral.orders}
                    renderItem={(order) => (
                      <List.Item>
                        <div style={{ width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                         <div>
                               <strong>Заказ #{order.orderNumber}</strong>
                               <Tag 
                                 color={
                                   order.status === 'delivered' ? 'green' : 
                                   order.status === 'completed' ? 'blue' :
                                   order.status === 'shipped' ? 'orange' :
                                   order.status === 'processing' ? 'purple' : 'default'
                                 } 
                                 style={{ marginLeft: '8px' }}
                               >
                                 {
                                   order.status === 'delivered' ? '✅ Доставлен' : 
                                   order.status === 'completed' ? '✅ Завершен' :
                                   order.status === 'shipped' ? '🚚 Отправлен' :
                                   order.status === 'processing' ? '⏳ Обрабатывается' :
                                   order.status
                                 }
                               </Tag>
                             </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 500, color: '#52c41a' }}>
                                {order.total.toFixed(2)} ₽
                              </div>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                {dayjs(order.createdAt).format('DD.MM.YYYY HH:mm')}
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            <strong>Товары:</strong>
                            {order.items.map((item, idx) => (
                              <div key={idx} style={{ marginLeft: '8px' }}>
                                • {item.productId.name} × {item.quantity} = {(item.price * item.quantity).toFixed(2)} ₽
                              </div>
                            ))}
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Text type="secondary">Заказов пока нет</Text>
                )}
              </Collapse.Panel>
            ))}
          </Collapse>
        ) : (
          <Text type="secondary">Рефералов пока нет</Text>
        )}
      </div>
    );
  };

  const withdrawalsColumns = [
    {
      title: 'Пользователь',
      key: 'user',
      render: (record: WithdrawalRequest) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {record.userId.firstName} {record.userId.lastName}
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.userId.email}
          </Text>
        </div>
      )
    },
    {
      title: 'Сумма',
      key: 'amount',
      render: (record: WithdrawalRequest) => (
        <Text strong style={{ color: '#52c41a' }}>
          {record.amount.toFixed(2)} ₽
        </Text>
      )
    },
    {
      title: 'Статус',
      key: 'status',
      render: (record: WithdrawalRequest) => {
        const statusConfig = {
          pending: { color: 'orange', text: 'Ожидает' },
          approved: { color: 'blue', text: 'Одобрено' },
          rejected: { color: 'red', text: 'Отклонено' },
          paid: { color: 'green', text: 'Выплачено' }
        };
        const config = statusConfig[record.status];
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Способ оплаты',
      key: 'method',
      render: (record: WithdrawalRequest) => (
        <div>
          <Text style={{ fontSize: '12px' }}>{record.paymentMethod}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {record.paymentDetails}
            </Text>
          </div>
        </div>
      )
    },
    {
      title: 'Дата заявки',
      key: 'date',
      render: (record: WithdrawalRequest) => (
        <Text style={{ fontSize: '12px' }}>
          {dayjs(record.requestDate).format('DD.MM.YYYY HH:mm')}
        </Text>
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (record: WithdrawalRequest) => (
        <Space>
          {record.status === 'pending' && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => {
                  setSelectedWithdrawal(record);
                  setProcessModalVisible(true);
                }}
              >
                Обработать
              </Button>
            </>
          )}
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              Modal.info({
                title: 'Детали заявки',
                width: 600,
                content: (
                  <div>
                    <p><strong>Пользователь:</strong> {record.userId.firstName} {record.userId.lastName}</p>
                    <p><strong>Email:</strong> {record.userId.email}</p>
                    <p><strong>Сумма:</strong> {record.amount.toFixed(2)} ₽</p>
                    <p><strong>Способ оплаты:</strong> {record.paymentMethod}</p>
                    <p><strong>Реквизиты:</strong> {record.paymentDetails}</p>
                    <p><strong>Дата заявки:</strong> {dayjs(record.requestDate).format('DD.MM.YYYY HH:mm')}</p>
                    {record.processedDate && (
                      <p><strong>Дата обработки:</strong> {dayjs(record.processedDate).format('DD.MM.YYYY HH:mm')}</p>
                    )}
                    {record.processedBy && (
                      <p><strong>Обработал:</strong> {record.processedBy.firstName} {record.processedBy.lastName}</p>
                    )}
                    {record.notes && (
                      <p><strong>Комментарий:</strong> {record.notes}</p>
                    )}
                  </div>
                )
              });
            }}
          >
            Детали
          </Button>
        </Space>
      )
    }
  ];

  // Подсчет общей статистики
  const totalStats = referrals.reduce((acc, ref) => ({
    totalClicks: acc.totalClicks + ref.stats.clicks,
    totalRegistrations: acc.totalRegistrations + ref.stats.registrations,
    totalOrders: acc.totalOrders + ref.stats.orders,
    totalCommission: acc.totalCommission + ref.stats.totalCommission,
    availableCommission: acc.availableCommission + ref.stats.availableCommission,
    withdrawnCommission: acc.withdrawnCommission + ref.stats.withdrawnCommission
  }), {
    totalClicks: 0,
    totalRegistrations: 0,
    totalOrders: 0,
    totalCommission: 0,
    availableCommission: 0,
    withdrawnCommission: 0
  });

  const pendingWithdrawalsCount = withdrawals.filter(w => w.status === 'pending').length;

  // Проверяем права доступа
  if (!isAdmin()) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Title level={3}>Доступ запрещен</Title>
        <Text>У вас нет прав для просмотра этой страницы</Text>
      </div>
    );
  }

  return (
    <div className="referrals-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}>Реферальная система</Title>
        <Badge count={pendingWithdrawalsCount} offset={[10, 0]}>
          <MoneyCollectOutlined style={{ fontSize: 24, color: pendingWithdrawalsCount > 0 ? '#ff4d4f' : '#666' }} />
        </Badge>
      </div>

      {/* Общая статистика */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card>
            <Statistic
              title="Переходы"
              value={totalStats.totalClicks}
              prefix={<LinkOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Регистрации"
              value={totalStats.totalRegistrations}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Заказы"
              value={totalStats.totalOrders}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Общая комиссия"
              value={totalStats.totalCommission.toFixed(2)}
              prefix={<DollarOutlined />}
              suffix="₽"
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="К выводу"
              value={totalStats.availableCommission.toFixed(2)}
              prefix={<DollarOutlined />}
              suffix="₽"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Выведено"
              value={totalStats.withdrawnCommission.toFixed(2)}
              prefix={<DollarOutlined />}
              suffix="₽"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="1">
        <TabPane tab={<span><TeamOutlined />Рефералы</span>} key="1">
          <Card>
            <Table
              columns={referralsColumns}
              dataSource={referrals}
              rowKey={(record) => record.user._id}
              loading={loading}
              expandable={{
                expandedRowKeys: Array.from(expandedRows),
                onExpand: (expanded, record) => {
                  handleRowExpand(record.user._id);
                },
                expandedRowRender: (record) => renderReferralDetails(record.user._id),
                expandIcon: () => null, // Скрываем стандартную иконку, используем свою
              }}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: total,
                onChange: (page, size) => {
                  setCurrentPage(page);
                  setPageSize(size || 20);
                },
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} из ${total} рефералов`
              }}
            />
          </Card>
        </TabPane>

        <TabPane tab={
          <span>
            <MoneyCollectOutlined />
            Заявки на вывод
            {pendingWithdrawalsCount > 0 && (
              <Badge count={pendingWithdrawalsCount} style={{ marginLeft: 8 }} />
            )}
          </span>
        } key="2">
          <Card>
            <div style={{ marginBottom: 16 }}>
              <Select
                placeholder="Фильтр по статусу"
                style={{ width: 200 }}
                allowClear
                value={withdrawalFilter}
                onChange={setWithdrawalFilter}
              >
                <Option value="pending">Ожидает</Option>
                <Option value="approved">Одобрено</Option>
                <Option value="rejected">Отклонено</Option>
                <Option value="paid">Выплачено</Option>
              </Select>
            </div>
            
            <Table
              columns={withdrawalsColumns}
              dataSource={withdrawals}
              rowKey="_id"
              loading={withdrawalsLoading}
              pagination={false}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* Модальное окно обработки заявки */}
      <Modal
        title="Обработка заявки на вывод"
        open={processModalVisible}
        onCancel={() => setProcessModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedWithdrawal && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <p><strong>Пользователь:</strong> {selectedWithdrawal.userId.firstName} {selectedWithdrawal.userId.lastName}</p>
              <p><strong>Сумма:</strong> {selectedWithdrawal.amount.toFixed(2)} ₽</p>
              <p><strong>Способ оплаты:</strong> {selectedWithdrawal.paymentMethod}</p>
              <p><strong>Реквизиты:</strong> {selectedWithdrawal.paymentDetails}</p>
            </div>
            
            <Form form={form} layout="vertical">
              <Form.Item
                name="notes"
                label="Комментарий (необязательно)"
              >
                <Input.TextArea rows={3} placeholder="Комментарий к обработке заявки" />
              </Form.Item>
            </Form>

            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setProcessModalVisible(false)}>
                Отмена
              </Button>
              <Button
                danger
                onClick={() => {
                  const notes = form.getFieldValue('notes');
                  processWithdrawal(selectedWithdrawal._id, 'rejected', notes);
                }}
              >
                Отклонить
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  const notes = form.getFieldValue('notes');
                  processWithdrawal(selectedWithdrawal._id, 'approved', notes);
                }}
              >
                Одобрить
              </Button>
              <Button
                type="primary"
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                onClick={() => {
                  const notes = form.getFieldValue('notes');
                  processWithdrawal(selectedWithdrawal._id, 'paid', notes);
                }}
              >
                Выплачено
              </Button>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Referrals; 