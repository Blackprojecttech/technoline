import React, { useEffect, useCallback, useMemo, useState } from 'react'
import { Row, Col, Card, Statistic, Typography, Badge, Button, Space, Tag, Tooltip, Avatar, Progress, Select, DatePicker, Tabs } from 'antd'
import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingCartOutlined,
  UserOutlined,
  ShoppingOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  EditOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PhoneOutlined,
  CloseOutlined,
  RiseOutlined,
  CalendarOutlined,
  BarChartOutlined,
  TrophyOutlined,
  LineChartOutlined,
  PieChartOutlined,
  AreaChartOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Legend, ComposedChart
} from 'recharts'
import { useOrderStats } from '../hooks/useOrderStats'

const { Title, Text } = Typography
const { Option } = Select
const { RangePicker } = DatePicker
const { TabPane } = Tabs

interface DashboardStats {
  totalOrders: number
  totalUsers: number
  totalProducts: number
  totalRevenue: number
  newOrders: number
  pendingOrders: number
  completedOrders: number
  todayRevenue: number
  monthRevenue: number
  recentOrders: Array<{
    _id: string
    orderNumber: string
    status: string
    totalAmount: number
    createdAt: string
    user: {
      firstName: string
      lastName: string
      phone: string
    }
    items: Array<{
      product: {
        name: string
        images: string[]
      }
      quantity: number
      price: number
    }>
  }>
  topProducts: Array<{
    _id: string
    name: string
    sales: number
    revenue: number
    images: string[]
  }>
  monthlyRevenue: Array<{
    _id: { year: number, month: number }
    revenue: number
    orders: number
  }>
  dailyStats: Array<{
    _id: string
    orders: number
    revenue: number
  }>
  statusStats: Array<{
    _id: string
    count: number
  }>
  visitStats: Array<{
    _id: string
    count: number
  }>
  userGrowth: Array<{
    _id: { year: number, month: number }
    count: number
  }>
  topCategories: Array<{
    _id: string
    name: string
    sales: number
    revenue: number
  }>
  avgOrderValue: number
  conversionRate: number
  returnRate: number
  customerSatisfaction: number
}

// Функция для получения данных дашборда
const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const token = localStorage.getItem('admin_token')
  const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/dashboard`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (!response.ok) {
    throw new Error('Ошибка загрузки данных дашборда')
  }

  return response.json()
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedChart, setSelectedChart] = useState('revenue');
  const [isMobile, setIsMobile] = useState(false);
  
  // Проверка размера экрана
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
    retry: 1,
    retryDelay: 1000,
    enabled: !!localStorage.getItem('admin_token'),
  })

  const { data: orderStats } = useOrderStats()

  // Автоматическая прокрутка вверх при загрузке страницы
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Функции для работы со статусами
  const getStatusColor = useCallback((status: string) => {
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
  }, []);

  const getStatusText = useCallback((status: string) => {
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
  }, []);

  // Форматирование чисел
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(amount);
  }, []);

  const formatNumber = useCallback((num: number) => {
    return new Intl.NumberFormat('ru-RU').format(num);
  }, []);

  // Подготовка данных для графиков
  const visitChartData = useMemo(() => {
    if (!stats?.visitStats) return [];
    return stats.visitStats.map(item => ({
      date: item._id,
      visits: item.count
    }));
  }, [stats?.visitStats]);

  const monthlyChartData = useMemo(() => {
    if (!stats?.monthlyRevenue) return [];
    return stats.monthlyRevenue.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      revenue: item.revenue,
      orders: item.orders
    }));
  }, [stats?.monthlyRevenue]);

  const statusChartData = useMemo(() => {
    if (!stats?.statusStats) return [];
    return stats.statusStats.map(item => ({
      name: getStatusText(item._id),
      value: item.count,
      color: getStatusColor(item._id)
    }));
  }, [stats?.statusStats, getStatusText, getStatusColor]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Адаптивные размеры колонок
  const getColProps = (desktop: number, tablet: number = desktop, mobile: number = 24) => ({
    xs: mobile,
    sm: tablet,
    md: desktop,
    lg: desktop,
    xl: desktop,
  });

  if (isLoading) {
    return (
      <div className="dashboard-page-responsive">
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4].map(i => (
            <Col key={i} {...getColProps(6, 12)}>
              <Card loading style={{ borderRadius: '12px', height: '120px' }} />
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page-responsive">
        <Card style={{ borderRadius: '12px', textAlign: 'center', padding: '40px' }}>
          <Title level={4} type="danger">Ошибка загрузки данных</Title>
          <Text>Не удалось загрузить данные дашборда. Попробуйте обновить страницу.</Text>
        </Card>
      </div>
    );
  }

  return (
    <div className="dashboard-page-responsive">
      {/* Заголовок */}
      <Row style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <Title level={isMobile ? 3 : 2} style={{ margin: 0, color: '#1890ff' }}>
            📊 Панель управления
          </Title>
          <Text type="secondary" style={{ fontSize: isMobile ? '14px' : '16px' }}>
            Добро пожаловать в административную панель
          </Text>
        </Col>
      </Row>

      {/* Основная статистика */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col {...getColProps(6, 12)}>
          <Card style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.8)', fontSize: isMobile ? '12px' : '14px' }}>Всего заказов</span>}
              value={stats?.totalOrders || 0}
              valueStyle={{ color: 'white', fontSize: isMobile ? '20px' : '24px' }}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col {...getColProps(6, 12)}>
          <Card style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.8)', fontSize: isMobile ? '12px' : '14px' }}>Пользователей</span>}
              value={stats?.totalUsers || 0}
              valueStyle={{ color: 'white', fontSize: isMobile ? '20px' : '24px' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col {...getColProps(6, 12)}>
          <Card style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.8)', fontSize: isMobile ? '12px' : '14px' }}>Товаров</span>}
              value={stats?.totalProducts || 0}
              valueStyle={{ color: 'white', fontSize: isMobile ? '20px' : '24px' }}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col {...getColProps(6, 12)}>
          <Card style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.8)', fontSize: isMobile ? '12px' : '14px' }}>Выручка</span>}
              value={stats?.totalRevenue || 0}
              valueStyle={{ color: 'white', fontSize: isMobile ? '18px' : '20px' }}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(Number(value))}
            />
          </Card>
        </Col>
      </Row>

      {/* Уведомления и быстрые действия */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        {/* Уведомления */}
        <Col {...getColProps(12, 24)}>
          <Card 
            title={
              <span style={{ fontSize: isMobile ? '16px' : '18px' }}>
                🔔 Уведомления
              </span>
            } 
            style={{ borderRadius: '12px', height: '200px' }}
          >
                         <Space direction="vertical" style={{ width: '100%' }}>
               {(orderStats?.newOrders && orderStats.newOrders > 0) && (
                 <Badge count={orderStats.newOrders} offset={[10, 0]}>
                   <Button 
                     type="link" 
                     icon={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                     onClick={() => navigate('/admin/orders')}
                     style={{ padding: 0, height: 'auto', fontSize: isMobile ? '14px' : '16px' }}
                   >
                     Новые заказы требуют внимания
                   </Button>
                 </Badge>
               )}
               {(orderStats?.callRequests && orderStats.callRequests > 0) && (
                 <Badge count={orderStats.callRequests} offset={[10, 0]}>
                   <Button 
                     type="link" 
                     icon={<PhoneOutlined style={{ color: '#52c41a' }} />}
                     onClick={() => navigate('/admin/orders')}
                     style={{ padding: 0, height: 'auto', fontSize: isMobile ? '14px' : '16px' }}
                   >
                     Запросы обратного звонка
                   </Button>
                 </Badge>
               )}
               {(!orderStats?.newOrders && !orderStats?.callRequests) && (
                 <Text type="secondary" style={{ fontSize: isMobile ? '14px' : '16px' }}>
                   Новых уведомлений нет
                 </Text>
               )}
             </Space>
          </Card>
        </Col>

        {/* Быстрые действия */}
        <Col {...getColProps(12, 24)}>
          <Card 
            title={
              <span style={{ fontSize: isMobile ? '16px' : '18px' }}>
                🚀 Быстрые действия
              </span>
            } 
            style={{ borderRadius: '12px', height: '200px' }}
          >
            <Space wrap size={isMobile ? 'small' : 'middle'}>
              <Button 
                type="primary" 
                icon={<ShoppingCartOutlined />}
                onClick={() => navigate('/admin/orders')}
                size={isMobile ? 'small' : 'middle'}
              >
                {isMobile ? 'Заказы' : 'Управление заказами'}
              </Button>
              <Button 
                icon={<UserOutlined />}
                onClick={() => navigate('/admin/users')}
                size={isMobile ? 'small' : 'middle'}
              >
                Пользователи
              </Button>
              <Button 
                icon={<ShoppingOutlined />}
                onClick={() => navigate('/admin/products')}
                size={isMobile ? 'small' : 'middle'}
              >
                Товары
              </Button>
              <Button 
                icon={<EditOutlined />}
                onClick={() => navigate('/admin/categories')}
                size={isMobile ? 'small' : 'middle'}
              >
                Категории
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Графики и аналитика */}
      {!isMobile && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col span={12}>
            <Card title="📈 Выручка по месяцам" style={{ borderRadius: '12px' }}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="📊 Статусы заказов" style={{ borderRadius: '12px' }}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                                         label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>
      )}

      {/* Последние заказы */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card 
            title={
              <span style={{ fontSize: isMobile ? '16px' : '18px' }}>
                📦 Последние заказы
              </span>
            } 
            style={{ borderRadius: '12px' }}
          >
            <div style={{ overflowX: 'auto' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {stats?.recentOrders?.slice(0, isMobile ? 3 : 5).map(order => (
                  <Card 
                    key={order._id} 
                    size="small" 
                    style={{ 
                      borderRadius: '8px',
                      background: '#fafafa',
                      cursor: 'pointer'
                    }}
                    onClick={() => navigate(`/admin/orders/${order._id}`)}
                  >
                    <Row align="middle" gutter={[8, 8]}>
                      <Col {...getColProps(6, 24)}>
                        <Text strong style={{ fontSize: isMobile ? '12px' : '14px' }}>
                          #{order.orderNumber}
                        </Text>
                      </Col>
                      <Col {...getColProps(6, 24)}>
                        <Tag 
                          color={getStatusColor(order.status)}
                          style={{ fontSize: isMobile ? '11px' : '12px' }}
                        >
                          {getStatusText(order.status)}
                        </Tag>
                      </Col>
                      <Col {...getColProps(6, 24)}>
                        <Text style={{ fontSize: isMobile ? '12px' : '14px' }}>
                          {order.user?.firstName} {order.user?.lastName}
                        </Text>
                      </Col>
                      <Col {...getColProps(6, 24)} style={{ textAlign: 'right' }}>
                        <Text strong style={{ fontSize: isMobile ? '12px' : '14px' }}>
                          {formatCurrency(order.totalAmount)}
                        </Text>
                      </Col>
                    </Row>
                  </Card>
                ))}
              </Space>
            </div>
                         {(stats?.recentOrders?.length || 0) > (isMobile ? 3 : 5) && (
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <Button onClick={() => navigate('/admin/orders')}>
                  Показать все заказы
                </Button>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard 