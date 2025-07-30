import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Input, 
  Select, 
  Button,
  Tag,
  Space,
  DatePicker,
  message
} from 'antd';
import { 
  HistoryOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface ActionItem {
  id: string;
  adminName: string;
  action: string;
  page: 'receipts' | 'debts' | 'arrivals' | 'suppliers' | 'payments';
  details: string;
  entityId?: string;
  entityName?: string;
  timestamp: string;
  ip?: string;
}

const Actions: React.FC = () => {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [pageFilter, setPageFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [pageSize, setPageSize] = useState<number>(() => {
    const savedPageSize = localStorage.getItem('actionsPageSize');
    return savedPageSize ? parseInt(savedPageSize) : 50;
  });

  // Принудительная сортировка - новые записи первые
  const [sortedColumn, setSortedColumn] = useState<any>({
    field: 'timestamp',
    order: 'descend'
  });

  // Загрузка действий с сервера
  const loadActions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const params = new URLSearchParams();
      
      if (pageFilter !== 'all') {
        params.append('pageFilter', pageFilter);
      }
      if (searchText) {
        params.append('search', searchText);
      }
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.append('dateFrom', dateRange[0].toISOString());
        params.append('dateTo', dateRange[1].toISOString());
      }
      params.append('limit', '5000'); // Загружаем много записей для полной истории
      
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';
      const response = await fetch(`${baseUrl}/admin-actions?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      // Преобразуем формат данных для совместимости
      const formattedActions = data.actions.map((action: any) => ({
        id: action._id,
        adminName: action.adminName,
        action: action.action,
        page: action.page,
        details: action.details,
        entityId: action.entityId,
        entityName: action.entityName,
        timestamp: action.createdAt,
        ip: action.ip
      }));
      
      // Принудительная сортировка для гарантии правильного порядка
      const sortedActions = formattedActions.sort((a: ActionItem, b: ActionItem) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setActions(sortedActions);
      console.log(`📋 Загружено ${sortedActions.length} действий с сервера (лимит: 5000)`);
      
      // Проверяем правильность сортировки
      if (sortedActions.length > 1) {
        const firstAction = new Date(sortedActions[0].timestamp);
        const lastAction = new Date(sortedActions[sortedActions.length - 1].timestamp);
        console.log(`🕐 Первое действие: ${firstAction.toLocaleString('ru-RU')}`);
        console.log(`🕐 Последнее действие: ${lastAction.toLocaleString('ru-RU')}`);
        console.log(`✅ Сортировка правильная: ${firstAction >= lastAction ? 'да' : 'нет'}`);
      }
    } catch (error) {
      console.error('❌ Ошибка при загрузке действий:', error);
      message.error('Не удалось загрузить историю действий');
      setActions([]);
    } finally {
      setLoading(false);
    }
  };

  // Сохраняем размер страницы при изменении
  useEffect(() => {
    localStorage.setItem('actionsPageSize', pageSize.toString());
  }, [pageSize]);

  // Загружаем действия при монтировании и изменении фильтров
  useEffect(() => {
    loadActions();
  }, [pageFilter, searchText, dateRange]);

  const getPageColor = (page: ActionItem['page']) => {
    switch (page) {
      case 'receipts': return 'blue';
      case 'debts': return 'red';
      case 'arrivals': return 'green';
      case 'suppliers': return 'orange';
      case 'payments': return 'purple';
      default: return 'default';
    }
  };

  const getPageText = (page: ActionItem['page']) => {
    switch (page) {
      case 'receipts': return 'Чеки';
      case 'debts': return 'Долги';
      case 'arrivals': return 'Приход';
      case 'suppliers': return 'Поставщики';
      case 'payments': return 'Расчеты';
      default: return page;
    }
  };

  const getActionIcon = (page: ActionItem['page']) => {
    switch (page) {
      case 'receipts': return <FileTextOutlined />;
      case 'debts': return <HistoryOutlined />;
      case 'arrivals': return <SearchOutlined />;
      case 'suppliers': return <UserOutlined />;
      case 'payments': return <CalendarOutlined />;
      default: return <HistoryOutlined />;
    }
  };

  const columns: ColumnsType<ActionItem> = [
    {
      title: (
        <div 
          style={{ 
            cursor: 'pointer', 
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          onClick={() => {
            const newOrder = sortedColumn?.order === 'descend' ? 'ascend' : 'descend';
            setSortedColumn({ field: 'timestamp', order: newOrder });
            console.log('🔄 Переключение сортировки на:', newOrder);
          }}
        >
          <span>Время</span>
          <span style={{ 
            fontSize: '12px', 
            color: '#1890ff',
            fontWeight: 'bold' 
          }}>
            {sortedColumn?.order === 'descend' ? '↓' : '↑'}
          </span>
        </div>
      ),
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CalendarOutlined style={{ color: '#8c8c8c' }} />
          <div>
            <div>{new Date(timestamp).toLocaleDateString('ru-RU')}</div>
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
              {new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        </div>
      ),
      // Сортировка управляется программно
    },
    {
      title: 'Администратор',
      dataIndex: 'adminName',
      key: 'adminName',
      width: 150,
      render: (name) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <UserOutlined style={{ color: '#1890ff' }} />
          <span style={{ fontWeight: '500' }}>{name}</span>
        </div>
      ),
    },
    {
      title: 'Раздел',
      dataIndex: 'page',
      key: 'page',
      width: 120,
      render: (page) => (
        <Tag color={getPageColor(page)} icon={getActionIcon(page)}>
          {getPageText(page)}
        </Tag>
      ),
    },
    {
      title: 'Действие',
      dataIndex: 'action',
      key: 'action',
      width: 150,
      render: (action) => (
        <span style={{ fontWeight: '500' }}>{action}</span>
      ),
    },
    {
      title: 'Детали',
      dataIndex: 'details',
      key: 'details',
      render: (details, record) => (
        <div>
          <div>{details}</div>
          {record.entityName && (
            <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '2px' }}>
              {record.entityName}
            </div>
          )}
        </div>
      ),
    },
  ];

  // Фильтрация и сортировка действий
  const filteredActions = actions.filter(action => {
    const matchesSearch = 
      action.adminName.toLowerCase().includes(searchText.toLowerCase()) ||
      action.action.toLowerCase().includes(searchText.toLowerCase()) ||
      action.details.toLowerCase().includes(searchText.toLowerCase()) ||
      (action.entityName && action.entityName.toLowerCase().includes(searchText.toLowerCase()));
    
    const matchesPage = pageFilter === 'all' || action.page === pageFilter;
    
    let matchesDate = true;
    if (dateRange && dateRange[0] && dateRange[1]) {
      const actionDate = dayjs(action.timestamp);
      matchesDate = actionDate.isAfter(dateRange[0].startOf('day')) && 
                   actionDate.isBefore(dateRange[1].endOf('day'));
    }
    
    return matchesSearch && matchesPage && matchesDate;
  }).sort((a, b) => {
    // Применяем сортировку в соответствии с текущим состоянием
    if (sortedColumn?.field === 'timestamp') {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortedColumn.order === 'descend' ? timeB - timeA : timeA - timeB;
    }
    // По умолчанию сортируем по времени (новые первые)
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Логирование для отладки
  if (filteredActions.length > 1) {
    console.log('📋 Отфильтрованные и отсортированные действия (первые 5):');
    console.log('🔄 Текущая сортировка:', sortedColumn);
    filteredActions.slice(0, 5).forEach((action, index) => {
      const date = new Date(action.timestamp);
      console.log(`  ${index + 1}. ${date.toLocaleDateString('ru-RU')} ${date.toLocaleTimeString('ru-RU')} - ${action.action}`);
    });
  }

  // Статистика
  const totalActions = actions.length;
  const todayActions = actions.filter(action => 
    dayjs(action.timestamp).isSame(dayjs(), 'day')
  ).length;
  const uniqueAdmins = new Set(actions.map(action => action.adminName)).size;

  return (
    <div>
      {/* Заголовок */}
      <Card style={{ marginBottom: '24px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <HistoryOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          <div>
            <h2 style={{ margin: 0, color: '#262626' }}>История действий</h2>
            <p style={{ margin: 0, color: '#8c8c8c' }}>
              Отслеживание всех действий администраторов в системе
            </p>
          </div>
        </div>
      </Card>

      {/* Статистика */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <Card style={{ flex: 1, borderRadius: '12px', background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)', border: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1890ff' }}>
              {totalActions}
            </div>
            <div style={{ color: '#595959', fontWeight: '500' }}>Всего действий</div>
          </div>
        </Card>
        <Card style={{ flex: 1, borderRadius: '12px', background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)', border: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#52c41a' }}>
              {todayActions}
            </div>
            <div style={{ color: '#595959', fontWeight: '500' }}>Сегодня</div>
          </div>
        </Card>
        <Card style={{ flex: 1, borderRadius: '12px', background: 'linear-gradient(135deg, #fff7e6 0%, #ffd591 100%)', border: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#fa8c16' }}>
              {uniqueAdmins}
            </div>
            <div style={{ color: '#595959', fontWeight: '500' }}>Администраторов</div>
          </div>
        </Card>
      </div>

      {/* Фильтры */}
      <Card style={{ marginBottom: '24px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Search
            placeholder="Поиск по администратору, действию или деталям"
            style={{ width: 350 }}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          <Select
            value={pageFilter}
            onChange={setPageFilter}
            style={{ minWidth: 150 }}
            placeholder="Все разделы"
          >
            <Option value="all">Все разделы</Option>
            <Option value="receipts">Чеки</Option>
            <Option value="debts">Долги</Option>
            <Option value="arrivals">Приход</Option>
            <Option value="suppliers">Поставщики</Option>
            <Option value="payments">Расчеты</Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            placeholder={['Дата от', 'Дата до']}
            style={{ width: 250 }}
          />
          <div style={{ marginLeft: 'auto' }}>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadActions}
              loading={loading}
              style={{ borderRadius: '8px' }}
            >
              Обновить
            </Button>
          </div>
        </div>
      </Card>

      {/* Таблица действий */}
      <Card style={{ borderRadius: '12px' }}>
        <Table
          columns={columns}
          dataSource={filteredActions}
          rowKey="id"
          loading={loading}
          showSorterTooltip={false}
          pagination={{
            pageSize: pageSize,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Всего ${total} действий`,
            pageSizeOptions: ['25', '50', '100', '200', '500'],
            onShowSizeChange: (current, size) => {
              setPageSize(size);
            }
          }}
          scroll={{ x: 1000 }}
          locale={{
            emptyText: loading ? 'Загрузка...' : (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <HistoryOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                <div style={{ color: '#8c8c8c', fontSize: '16px' }}>История действий пуста</div>
                <div style={{ color: '#bfbfbf', fontSize: '14px', marginTop: '8px' }}>
                  Действия будут отображаться после выполнения операций в системе
                </div>
              </div>
            )
          }}
        />
      </Card>
    </div>
  );
};

export default Actions; 