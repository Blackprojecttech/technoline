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
  averageOrderValue: number
  activeUsers: number
  orderStatusStats: {
    pending?: number
    confirmed?: number
    processing?: number
    shipped?: number
    delivered?: number
    cancelled?: number
    with_courier?: number
  }
  today: {
    orders: number
    revenue: number
  }
  week: {
    orders: number
    revenue: number
  }
  month: {
    orders: number
    revenue: number
  }
  visitStats: Array<{
    _id: string
    count: number
  }>
  monthlyRevenue: Array<{
    _id: {
      year: number
      month: number
    }
    revenue: number
    orders: number
  }>
  yearlyRevenue: Array<{
    _id: {
      year: number
    }
    revenue: number
    orders: number
  }>
  weeklyStats: Array<{
    _id: number
    revenue: number
    orders: number
  }>
  hourlyStats: Array<{
    _id: number
    revenue: number
    orders: number
  }>
  dailyStats: Array<{
    _id: string
    revenue: number
    orders: number
  }>
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const token = localStorage.getItem('admin_token')
  if (!token) {
    throw new Error('No auth token')
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/admin/dashboard`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('admin_token')
      throw new Error('Unauthorized')
    }
    throw new Error('Failed to fetch dashboard stats')
  }
  
  return response.json()
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedChart, setSelectedChart] = useState('revenue');
  
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

  const yearlyChartData = useMemo(() => {
    if (!stats?.yearlyRevenue) return [];
    return stats.yearlyRevenue.map(item => ({
      year: item._id.year,
      revenue: item.revenue,
      orders: item.orders
    }));
  }, [stats?.yearlyRevenue]);

  const weeklyChartData = useMemo(() => {
    if (!stats?.weeklyStats) return [];
    const dayNames = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    return stats.weeklyStats.map(item => ({
      day: dayNames[item._id] || `День ${item._id}`,
      revenue: item.revenue,
      orders: item.orders
    }));
  }, [stats?.weeklyStats]);

  const hourlyChartData = useMemo(() => {
    if (!stats?.hourlyStats) return [];
    return stats.hourlyStats.map(item => ({
      hour: `${item._id}:00`,
      revenue: item.revenue,
      orders: item.orders
    }));
  }, [stats?.hourlyStats]);

  const dailyChartData = useMemo(() => {
    if (!stats?.dailyStats) return [];
    return stats.dailyStats.map(item => ({
      date: item._id,
      revenue: item.revenue,
      orders: item.orders
    }));
  }, [stats?.dailyStats]);

  const pieChartData = useMemo(() => {
    if (!stats?.orderStatusStats) return [];
    return Object.entries(stats.orderStatusStats).map(([status, count]) => ({
      name: getStatusText(status),
      value: count,
      color: getStatusColor(status)
    }));
  }, [stats?.orderStatusStats, getStatusText, getStatusColor]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

  // Функция для получения данных в зависимости от выбранного периода
  // Функция для получения данных выручки в зависимости от выбранного периода
  const getRevenueData = useCallback(() => {
    const now = new Date();
    
    switch (selectedPeriod) {
      case 'day':
        // Показать только сегодня
        const today = now.toISOString().split('T')[0];
        return dailyChartData.filter(item => item.date === today);
      case 'week':
        // Показать последние 7 дней
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return dailyChartData.filter(item => {
          const itemDate = new Date(item.date);
          return itemDate >= weekAgo;
        });
      case 'month':
        // Показать последние 30 дней
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return dailyChartData.filter(item => {
          const itemDate = new Date(item.date);
          return itemDate >= monthAgo;
        });
      case 'year':
        // Показать месячную статистику
        return monthlyChartData;
      default:
        return dailyChartData;
    }
  }, [dailyChartData, selectedPeriod, monthlyChartData]);

  // Функция для получения данных статистики по дням
  const getDailyStatsData = useCallback(() => {
    if (!dailyChartData.length) return [];
    
    const now = new Date();
    
    switch (selectedPeriod) {
      case 'day':
        // Показать только сегодня
        const today = now.toISOString().split('T')[0];
        return dailyChartData.filter(item => item.date === today);
      case 'week':
        // Показать последние 7 дней
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return dailyChartData.filter(item => {
          const itemDate = new Date(item.date);
          return itemDate >= weekAgo;
        });
      case 'month':
        // Показать последние 30 дней
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return dailyChartData.filter(item => {
          const itemDate = new Date(item.date);
          return itemDate >= monthAgo;
        });
      case 'year':
        // Для года показываем месячную статистику
        return monthlyChartData;
      default:
        return dailyChartData;
    }
  }, [dailyChartData, selectedPeriod, monthlyChartData]);

  if (isLoading) {
    return <div>Загрузка...</div>
  }

  if (error) {
    return <div>Ошибка загрузки данных: {(error as Error).message}</div>
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: '#1f1f1f' }}>
          📊 Панель управления
        </Title>
        <Text type="secondary">
          Расширенная аналитика и статистика
        </Text>
      </div>

      {/* Основная статистика */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card 
            style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '12px'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <Statistic
              title={<span style={{ color: 'white', fontSize: '14px' }}>Всего заказов</span>}
              value={stats?.totalOrders || 0}
              valueStyle={{ color: 'white', fontSize: '28px', fontWeight: 'bold' }}
              prefix={<ShoppingCartOutlined style={{ color: 'white' }} />}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card 
            style={{ 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              border: 'none',
              borderRadius: '12px'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <Statistic
              title={<span style={{ color: 'white', fontSize: '14px' }}>Общая выручка</span>}
              value={formatCurrency(stats?.totalRevenue || 0)}
              valueStyle={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}
              prefix={<DollarOutlined style={{ color: 'white' }} />}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card 
            style={{ 
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              border: 'none',
              borderRadius: '12px'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <Statistic
              title={<span style={{ color: 'white', fontSize: '14px' }}>Пользователи</span>}
              value={stats?.totalUsers || 0}
              valueStyle={{ color: 'white', fontSize: '28px', fontWeight: 'bold' }}
              prefix={<UserOutlined style={{ color: 'white' }} />}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card 
            style={{ 
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              border: 'none',
              borderRadius: '12px'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <Statistic
              title={<span style={{ color: 'white', fontSize: '14px' }}>Товары</span>}
              value={stats?.totalProducts || 0}
              valueStyle={{ color: 'white', fontSize: '28px', fontWeight: 'bold' }}
              prefix={<ShoppingOutlined style={{ color: 'white' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Настройки графиков */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24}>
          <Card style={{ borderRadius: '12px' }}>
            <Space wrap>
              <Text strong>Период:</Text>
              <Select 
                value={selectedPeriod} 
                onChange={setSelectedPeriod}
                style={{ width: 120 }}
              >
                <Option value="day">День</Option>
                <Option value="week">Неделя</Option>
                <Option value="month">Месяц</Option>
                <Option value="year">Год</Option>
              </Select>
              
              <Text strong>Тип графика:</Text>
              <Select 
                value={selectedChart} 
                onChange={setSelectedChart}
                style={{ width: 120 }}
              >
                <Option value="revenue">Выручка</Option>
                <Option value="orders">Заказы</Option>
                <Option value="visits">Посещения</Option>
              </Select>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Графики */}
      <Tabs defaultActiveKey="1" style={{ marginBottom: '24px' }}>
        <TabPane tab={<span><LineChartOutlined /> Выручка</span>} key="1">
          <Card style={{ borderRadius: '12px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getRevenueData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={selectedPeriod === 'year' ? 'month' : 'date'} />
                <YAxis />
                <RechartsTooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Выручка']}
                  labelFormatter={(label) => {
                    if (selectedPeriod === 'year') return `Месяц: ${label}`;
                    if (selectedPeriod === 'month') return `День: ${label}`;
                    if (selectedPeriod === 'week') return `День: ${label}`;
                    return `Дата: ${label}`;
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabPane>

        <TabPane tab={<span><AreaChartOutlined /> Посещаемость</span>} key="2">
          <Card style={{ borderRadius: '12px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={visitChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip 
                  formatter={(value: number) => [value, 'Посещений']}
                  labelFormatter={(label) => `Дата: ${label}`}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="visits" 
                  stroke="#82ca9d" 
                  fill="#82ca9d" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </TabPane>

        <TabPane tab={<span><BarChartOutlined /> Статистика по дням недели</span>} key="3">
          <Card style={{ borderRadius: '12px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <RechartsTooltip 
                  formatter={(value: number, name: string) => [
                    name === 'revenue' ? formatCurrency(value) : value,
                    name === 'revenue' ? 'Выручка' : 'Заказы'
                  ]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="orders" fill="#8884d8" />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#82ca9d" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </TabPane>

        <TabPane tab={<span><PieChartOutlined /> Статусы заказов</span>} key="4">
          <Card style={{ borderRadius: '12px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: number) => [value, 'Заказов']}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </TabPane>

        <TabPane tab={<span><BarChartOutlined /> Статистика по дням</span>} key="5">
          <Card style={{ borderRadius: '12px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={getDailyStatsData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={selectedPeriod === 'year' ? 'month' : 'date'} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <RechartsTooltip 
                  formatter={(value: number, name: string) => [
                    name === 'revenue' ? formatCurrency(value) : value,
                    name === 'revenue' ? 'Выручка' : 'Заказы'
                  ]}
                  labelFormatter={(label) => {
                    if (selectedPeriod === 'year') return `Месяц: ${label}`;
                    return `Дата: ${label}`;
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="orders" fill="#8884d8" />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#82ca9d" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </TabPane>
      </Tabs>

      {/* Дополнительная статистика */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={8}>
          <Card 
            title={
              <Space>
                <CalendarOutlined />
                <span>Сегодня</span>
              </Space>
            }
            style={{ borderRadius: '12px' }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Заказов"
                  value={stats?.today.orders || 0}
                  valueStyle={{ color: '#1890ff', fontSize: '24px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Выручка"
                  value={formatCurrency(stats?.today.revenue || 0)}
                  valueStyle={{ color: '#52c41a', fontSize: '20px' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={8}>
          <Card 
            title={
              <Space>
                <RiseOutlined />
                <span>За неделю</span>
              </Space>
            }
            style={{ borderRadius: '12px' }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Заказов"
                  value={stats?.week.orders || 0}
                  valueStyle={{ color: '#1890ff', fontSize: '24px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Выручка"
                  value={formatCurrency(stats?.week.revenue || 0)}
                  valueStyle={{ color: '#52c41a', fontSize: '20px' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={8}>
          <Card 
            title={
              <Space>
                <BarChartOutlined />
                <span>За месяц</span>
              </Space>
            }
            style={{ borderRadius: '12px' }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Заказов"
                  value={stats?.month.orders || 0}
                  valueStyle={{ color: '#1890ff', fontSize: '24px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Выручка"
                  value={formatCurrency(stats?.month.revenue || 0)}
                  valueStyle={{ color: '#52c41a', fontSize: '20px' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Детальная статистика */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <TrophyOutlined />
                <span>Ключевые показатели</span>
              </Space>
            }
            style={{ borderRadius: '12px' }}
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="Средний чек"
                  value={formatCurrency(stats?.averageOrderValue || 0)}
                  valueStyle={{ color: '#722ed1', fontSize: '20px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Активные пользователи"
                  value={stats?.activeUsers || 0}
                  valueStyle={{ color: '#13c2c2', fontSize: '20px' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <CheckCircleOutlined />
                <span>Статусы заказов</span>
              </Space>
            }
            style={{ borderRadius: '12px' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {stats?.orderStatusStats && Object.entries(stats.orderStatusStats).map(([status, count]) => (
                <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space>
                    <Badge color={getStatusColor(status)} />
                    <Text>{getStatusText(status)}</Text>
                  </Space>
                  <Text strong>{count}</Text>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Кнопки быстрого доступа */}
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col xs={24}>
          <Card style={{ borderRadius: '12px' }}>
            <Title level={4} style={{ marginBottom: '16px' }}>
              🚀 Быстрые действия
            </Title>
            <Space wrap>
              <Button 
                type="primary" 
                icon={<ShoppingCartOutlined />}
                onClick={() => navigate('/orders')}
                size="large"
              >
                Управление заказами
              </Button>
              <Button 
                icon={<UserOutlined />}
                onClick={() => navigate('/users')}
                size="large"
              >
                Пользователи
              </Button>
              <Button 
                icon={<ShoppingOutlined />}
                onClick={() => navigate('/products')}
                size="large"
              >
                Товары
              </Button>
              <Button 
                icon={<EditOutlined />}
                onClick={() => navigate('/categories')}
                size="large"
              >
                Категории
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard 