import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Select, 
  DatePicker, 
  Button,
  Row,
  Col,
  Statistic,
  Table,
  Space,
  message
} from 'antd';
import { 
  BarChartOutlined,
  DollarOutlined,
  TrophyOutlined,
  FileTextOutlined,
  CalendarOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { receiptsApi } from '../utils/baseApi';

const { Option } = Select;
const { RangePicker } = DatePicker;

type PeriodType = 'day' | 'week' | 'month' | 'range';

interface AnalyticsData {
  date: string;
  revenue: number; // выручка
  profit: number; // прибыль
  receiptsCount: number; // количество чеков
  averageCheck: number; // средний чек
}

interface ReceiptData {
  id: string;
  receiptNumber: string;
  totalAmount: number;
  total?: number; // Поле из бэкенда
  items: Array<{
    price: number;
    costPrice: number;
    quantity: number;
    total: number;
  }>;
  date: string;
  status: string;
  payments: Array<{
    method: string;
    amount: number;
  }>;
  deliveryPrice?: number; // Добавляем поле для цены доставки
  discountInfo?: { // Добавляем поле для информации о скидке
    type: 'percent' | 'fixed';
    value: number;
  };
}

const Analytics: React.FC = () => {
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(7, 'days'),
    dayjs()
  ]);
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [pageSize, setPageSize] = useState<number>(() => {
    const saved = localStorage.getItem('analyticsPageSize');
    return saved ? parseInt(saved) : 10;
  });

  // Загрузка чеков из API
  const loadReceipts = async () => {
    setLoading(true);
    try {
      const receiptsData = await receiptsApi.getAll();
      setReceipts(receiptsData);
      console.log(`📊 Загружено ${receiptsData.length} чеков для аналитики`);
    } catch (error) {
      console.error('Ошибка загрузки чеков:', error);
      message.error('Ошибка загрузки данных из чеков');
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  // Загружаем чеки при монтировании
  useEffect(() => {
    loadReceipts();
  }, []);

  // Функция для обработки изменения размера страницы
  const handlePageSizeChange = (current: number, size: number) => {
    setPageSize(size);
    localStorage.setItem('analyticsPageSize', size.toString());
  };

  // Пересчитываем аналитику при изменении чеков или периода
  useEffect(() => {
    calculateAnalytics();
  }, [receipts, periodType, selectedDate, dateRange]);

  const calculateAnalytics = () => {
    if (!receipts.length) {
      setAnalyticsData([]);
      return;
    }

    // Фильтруем чеки по выбранному периоду
    const filteredReceipts = getFilteredReceipts();
    
    // Группируем данные по дням
    const groupedData = new Map<string, AnalyticsData>();

    filteredReceipts.forEach(receipt => {
      const receiptDate = dayjs(receipt.date).format('YYYY-MM-DD');
      
      if (!groupedData.has(receiptDate)) {
        groupedData.set(receiptDate, {
          date: receiptDate,
          revenue: 0,
          profit: 0,
          receiptsCount: 0,
          averageCheck: 0
        });
      }

      const dayData = groupedData.get(receiptDate);
      if (!dayData) return; // Пропускаем если нет данных для этого дня
      
      // Считаем только не отмененные чеки
      if (receipt.status !== 'cancelled') {
        const totalAmount = receipt.totalAmount || receipt.total || 0;
        dayData.revenue += totalAmount;
        dayData.receiptsCount += 1;

        // Считаем прибыль с учетом скидок
        let receiptProfit = 0;
        
        // Используем totalAmount если есть (уже с учетом скидки)
        if (receipt.totalAmount || receipt.total) {
          const deliveryPrice = receipt.deliveryPrice || 0;
          const finalSalesTotal = ((receipt.totalAmount || receipt.total) || 0) - deliveryPrice; // Продажи без доставки
          
          // Считаем закупочную стоимость
          const costTotal = (receipt.items || []).reduce((sum: number, item: any) => {
            return sum + ((item.costPrice || 0) * item.quantity);
          }, 0);
          
          receiptProfit = finalSalesTotal - costTotal;
        } else {
          // Fallback - считаем из товаров с учетом скидки
          const salesTotal = (receipt.items || []).reduce((sum: number, item: any) => {
            return sum + (item.total || (item.price * item.quantity));
          }, 0);
          
          const costTotal = (receipt.items || []).reduce((sum: number, item: any) => {
            return sum + ((item.costPrice || 0) * item.quantity);
          }, 0);
          
          // Применяем скидку к продажной сумме
          let discountAmount = 0;
          const discountInfo = (receipt as any).discountInfo;
          if (discountInfo && discountInfo.value > 0) {
            if (discountInfo.type === 'percent') {
              discountAmount = salesTotal * (discountInfo.value / 100);
            } else {
              discountAmount = discountInfo.value;
            }
          }
          
          const finalSalesTotal = salesTotal - discountAmount;
          receiptProfit = finalSalesTotal - costTotal;
        }
        
        dayData.profit += receiptProfit;
      }
    });

    // Пересчитываем средний чек
    groupedData.forEach(data => {
      data.averageCheck = data.receiptsCount > 0 ? data.revenue / data.receiptsCount : 0;
    });

    // Сортируем по дате
    const sortedData = Array.from(groupedData.values()).sort((a, b) => 
      dayjs(a.date).valueOf() - dayjs(b.date).valueOf()
    );

    setAnalyticsData(sortedData);
  };

  const getFilteredReceipts = (): ReceiptData[] => {
    const now = dayjs();
    
    switch (periodType) {
      case 'day':
        const targetDate = selectedDate.format('YYYY-MM-DD');
        return receipts.filter(receipt => 
          dayjs(receipt.date).format('YYYY-MM-DD') === targetDate
        );
        
      case 'week':
        const weekStart = selectedDate.startOf('week');
        const weekEnd = selectedDate.endOf('week');
        return receipts.filter(receipt => {
          const receiptDate = dayjs(receipt.date);
          return receiptDate.isAfter(weekStart) && receiptDate.isBefore(weekEnd);
        });
        
      case 'month':
        const monthStart = selectedDate.startOf('month');
        const monthEnd = selectedDate.endOf('month');
        return receipts.filter(receipt => {
          const receiptDate = dayjs(receipt.date);
          return receiptDate.isAfter(monthStart) && receiptDate.isBefore(monthEnd);
        });
        
      case 'range':
        return receipts.filter(receipt => {
          const receiptDate = dayjs(receipt.date);
          return receiptDate.isAfter(dateRange[0]) && receiptDate.isBefore(dateRange[1]);
        });
        
      default:
        return receipts;
    }
  };

  // Общая статистика за выбранный период
  const totalStats = analyticsData.reduce(
    (acc, day) => ({
      revenue: acc.revenue + day.revenue,
      profit: acc.profit + day.profit,
      receiptsCount: acc.receiptsCount + day.receiptsCount,
      averageCheck: 0 // пересчитаем отдельно
    }),
    { revenue: 0, profit: 0, receiptsCount: 0, averageCheck: 0 }
  );
  
  totalStats.averageCheck = totalStats.receiptsCount > 0 
    ? totalStats.revenue / totalStats.receiptsCount 
    : 0;

  const getPeriodTitle = () => {
    switch (periodType) {
      case 'day':
        return `за ${selectedDate.format('DD.MM.YYYY')}`;
      case 'week':
        return `за неделю ${selectedDate.startOf('week').format('DD.MM')} - ${selectedDate.endOf('week').format('DD.MM.YYYY')}`;
      case 'month':
        return `за ${selectedDate.format('MMMM YYYY')}`;
      case 'range':
        return `за период ${dateRange[0].format('DD.MM.YYYY')} - ${dateRange[1].format('DD.MM.YYYY')}`;
      default:
        return '';
    }
  };

  const columns: ColumnsType<AnalyticsData> = [
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      render: (date) => (
        <div>
          <div>{dayjs(date).format('DD.MM.YYYY')}</div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
            {dayjs(date).format('HH:mm')}
          </div>
        </div>
      ),
      sorter: (a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf(),
    },
    {
      title: 'Выручка',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (value) => (
        <span style={{ color: '#52c41a', fontWeight: '600' }}>
          {value.toLocaleString('ru-RU')} ₽
        </span>
      ),
      sorter: (a, b) => a.revenue - b.revenue,
    },
    {
      title: 'Прибыль',
      dataIndex: 'profit',
      key: 'profit',
      render: (value) => (
        <span style={{ color: '#1890ff', fontWeight: '600' }}>
          {value.toLocaleString('ru-RU')} ₽
        </span>
      ),
      sorter: (a, b) => a.profit - b.profit,
    },
    {
      title: 'Количество чеков',
      dataIndex: 'receiptsCount',
      key: 'receiptsCount',
      render: (value) => (
        <span style={{ fontWeight: '500' }}>
          {value}
        </span>
      ),
      sorter: (a, b) => a.receiptsCount - b.receiptsCount,
    },
    {
      title: 'Средний чек',
      dataIndex: 'averageCheck',
      key: 'averageCheck',
      render: (value) => (
        <span style={{ color: '#722ed1', fontWeight: '500' }}>
          {value.toLocaleString('ru-RU')} ₽
        </span>
      ),
      sorter: (a, b) => a.averageCheck - b.averageCheck,
    },
  ];

  return (
    <div>
      {/* Заголовок */}
      <Card style={{ marginBottom: '24px', borderRadius: '12px', background: 'linear-gradient(135deg, #f0f2f5 0%, #e6f7ff 100%)', border: '1px solid #d9d9d9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BarChartOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          <div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#1890ff' }}>
              Аналитика и отчеты
            </div>
            <div style={{ fontSize: '14px', color: '#595959', marginTop: '4px' }}>
              Анализ выручки, прибыли и продаж по периодам
            </div>
          </div>
        </div>
      </Card>

      {/* Фильтры */}
      <Card style={{ marginBottom: '24px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarOutlined style={{ color: '#8c8c8c' }} />
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Период:</span>
          </div>
          
          <Select
            value={periodType}
            onChange={setPeriodType}
            style={{ minWidth: '120px' }}
          >
            <Option value="day">День</Option>
            <Option value="week">Неделя</Option>
            <Option value="month">Месяц</Option>
            <Option value="range">Интервал</Option>
          </Select>

          {periodType !== 'range' && (
            <DatePicker
              value={selectedDate}
              onChange={(date) => date && setSelectedDate(date)}
              picker={periodType === 'month' ? 'month' : 'date'}
              format={periodType === 'month' ? 'MMMM YYYY' : 'DD.MM.YYYY'}
              placeholder="Выберите дату"
            />
          )}

          {periodType === 'range' && (
            <RangePicker
              value={dateRange}
              onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
              format="DD.MM.YYYY"
              placeholder={['От', 'До']}
            />
          )}

          <Button
            icon={<ReloadOutlined />}
                          onClick={loadReceipts}
            loading={loading}
            style={{ borderRadius: '8px' }}
          >
            Обновить
          </Button>
        </div>
      </Card>

      {/* Общая статистика */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#595959', fontSize: '16px', fontWeight: '500' }}>
          📈 Итоги {getPeriodTitle()}
        </h3>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)', border: 'none' }}>
            <Statistic
              title="Выручка"
              value={totalStats.revenue}
              precision={0}
              valueStyle={{ color: '#52c41a', fontSize: '24px', fontWeight: 'bold' }}
              prefix={<DollarOutlined />}
              suffix="₽"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)', border: 'none' }}>
            <Statistic
              title="Прибыль"
              value={totalStats.profit}
              precision={0}
              valueStyle={{ color: '#1890ff', fontSize: '24px', fontWeight: 'bold' }}
              prefix={<TrophyOutlined />}
              suffix="₽"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #fff2e8 0%, #ffd8bf 100%)', border: 'none' }}>
            <Statistic
              title="Количество чеков"
              value={totalStats.receiptsCount}
              valueStyle={{ color: '#fa541c', fontSize: '24px', fontWeight: 'bold' }}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #f9f0ff 0%, #d3adf7 100%)', border: 'none' }}>
            <Statistic
              title="Средний чек"
              value={totalStats.averageCheck}
              precision={0}
              valueStyle={{ color: '#722ed1', fontSize: '24px', fontWeight: 'bold' }}
              prefix={<BarChartOutlined />}
              suffix="₽"
            />
          </Card>
        </Col>
      </Row>

      {/* Детальная таблица */}
      <Card style={{ borderRadius: '12px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>
            📊 Детализация по дням
          </h4>
        </div>
        <Table
          columns={columns}
          dataSource={analyticsData}
          rowKey="date"
          loading={loading}
          pagination={{
            pageSize: pageSize,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Всего ${total} дней`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onShowSizeChange: handlePageSizeChange,
          }}
          scroll={{ x: 800 }}
          locale={{
            emptyText: loading ? 'Загрузка...' : (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <BarChartOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                <div style={{ color: '#8c8c8c', fontSize: '16px' }}>Нет данных за выбранный период</div>
                <div style={{ color: '#bfbfbf', fontSize: '14px', marginTop: '8px' }}>
                  Попробуйте выбрать другой период или обновить данные
                </div>
              </div>
            )
          }}
        />
      </Card>
    </div>
  );
};

export default Analytics; 