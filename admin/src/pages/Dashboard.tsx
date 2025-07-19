import React from 'react'
import { Row, Col, Card, Statistic, Table, Typography, Badge } from 'antd'
import { useQuery } from 'react-query'
import {
  ShoppingCartOutlined,
  UserOutlined,
  ShoppingOutlined,
  DollarOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { useOrderStats } from '../hooks/useOrderStats'

const { Title } = Typography

interface DashboardStats {
  totalOrders: number
  totalUsers: number
  totalProducts: number
  totalRevenue: number
  recentOrders: any[]
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const token = localStorage.getItem('admin_token')
  if (!token) {
    throw new Error('No auth token')
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/admin/dashboard`, {
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
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
    retry: 1,
    retryDelay: 1000,
    enabled: !!localStorage.getItem('admin_token'), // Загружаем данные только если есть токен
  })

  const { data: orderStats } = useOrderStats()

  const columns = [
    {
      title: 'Номер заказа',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
    },
    {
      title: 'Клиент',
      dataIndex: 'customerName',
      key: 'customerName',
    },
    {
      title: 'Сумма',
      dataIndex: 'total',
      key: 'total',
      render: (value: number) => `${value.toLocaleString()} ₽`,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: 'Дата',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => new Date(value).toLocaleDateString('ru-RU'),
    },
  ]

  if (isLoading) {
    return <div>Загрузка...</div>
  }

  if (error) {
    return <div>Ошибка загрузки данных</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Дашборд</h1>
        <p className="text-sm text-gray-600">Обзор статистики магазина</p>
      </div>
      
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card className="shadow-sm border border-gray-100">
            <Statistic
              title={
                <div className="flex items-center justify-between">
                  <span>Всего заказов</span>
                  {orderStats?.pending && orderStats.pending > 0 && (
                    <Badge
                      count={
                        <div className="flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                          <ExclamationCircleOutlined />
                          <span>{orderStats.pending}</span>
                        </div>
                      }
                      offset={[-5, 5]}
                    />
                  )}
                </div>
              }
              value={stats?.totalOrders || 0}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border border-gray-100">
            <Statistic
              title="Пользователей"
              value={stats?.totalUsers || 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border border-gray-100">
            <Statistic
              title="Товаров"
              value={stats?.totalProducts || 0}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border border-gray-100">
            <Statistic
              title="Общая выручка"
              value={stats?.totalRevenue || 0}
              prefix={<DollarOutlined />}
              suffix="₽"
            />
          </Card>
        </Col>
      </Row>

      <Card 
        title="Последние заказы" 
        className="shadow-sm border border-gray-100"
      >
        <Table
          columns={columns}
          dataSource={stats?.recentOrders || []}
          rowKey="orderNumber"
          pagination={false}
        />
      </Card>
    </div>
  )
}

export default Dashboard 