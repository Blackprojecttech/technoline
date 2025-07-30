import React, { useState, useCallback } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Table, 
  Card, 
  Typography, 
  Button, 
  Tag, 
  Select, 
  Space, 
  Modal, 
  Form, 
  Input,
  message,
  Row,
  Col,
  Statistic,
  Progress,
  Tooltip,
  Divider,
  InputNumber,
  DatePicker,
  TimePicker,
  Upload,
  Image,
  Calendar,
  AutoComplete
} from 'antd';
import { 
  EyeOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  PlusOutlined, 
  SearchOutlined, 
  ExclamationCircleOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  ShoppingCartOutlined, 
  DollarOutlined, 
  UserOutlined,
  PhoneOutlined,
  HomeOutlined,
  TruckOutlined,
  CloseOutlined,
  SyncOutlined,
  PhoneTwoTone,
  HistoryOutlined,
  InboxOutlined
} from '@ant-design/icons';
import { useOrderStats } from '../hooks/useOrderStats';
import CustomerCell from '../components/CustomerCell';
import SearchInput from '../components/SearchInput';
import './Orders.css';
import { CSSTransition } from 'react-transition-group';
import dayjs from 'dayjs';
import { io, Socket } from 'socket.io-client';
import { useEffect, useRef } from 'react';
import { useOrdersPageLogic } from './hooks/useOrdersPageLogic';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Orders: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const [createOrderForm] = Form.useForm();
  
  // Используем хук useOrdersPageLogic для получения всех необходимых функций и состояний
  const {
    fetchOrders,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    selectedStatus,
    setSelectedStatus,
    deliveryFilter,
    setDeliveryFilter
  } = useOrdersPageLogic(form, createOrderForm);

  // Используем хук useQuery для получения данных
  const { data, isLoading, error, refetch } = useQuery(
    ['orders', currentPage, selectedStatus, pageSize, deliveryFilter, searchText],
    () => fetchOrders(currentPage, selectedStatus, pageSize, deliveryFilter),
    {
      keepPreviousData: true,
      retry: 1,
      retryDelay: 1000,
      enabled: !!localStorage.getItem('admin_token'),
      staleTime: 30 * 1000, // 30 секунд
      refetchOnWindowFocus: false
    }
  );

  // ... остальной код компонента ...

  return (
    <div className="orders-page">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'flex-start', flex: 2 }}>
        {/* Поиск */}
        <SearchInput
          placeholder="Поиск по номеру заказа, телефону, email, QR коду..."
          onSearch={(value: string) => {
            setSearchText(value);
            setCurrentPage(1);
            refetch();
          }}
          style={{ width: 400 }}
        />
        {/* ... остальные элементы интерфейса ... */}
      </div>
    </div>
  );
};

export default Orders; 