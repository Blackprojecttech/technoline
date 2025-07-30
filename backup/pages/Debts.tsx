import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Tag,
  Space,
  message,
  Tooltip,
  Popconfirm,
  Typography,
  Card
} from 'antd';
import { 
  DollarOutlined,
  CalendarOutlined,
  CheckOutlined,
  ReloadOutlined,
  CopyOutlined,
  SearchOutlined,
  PlusOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;

interface DebtItem {
  _id?: string; // MongoDB ID
  id: string;
  arrivalId: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  date: string;
  dueDate?: string;
  status: 'active' | 'partially_paid' | 'paid' | 'overdue';
  notes?: string;
  items: {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    costPrice: number;
    serialNumbers?: string[];
    barcode?: string;
    isAccessory: boolean;
    isService?: boolean;
  }[];
}

interface ArrivalItemDetail {
  id: string;
  productName: string;
  quantity: number;
  costPrice: number;
  serialNumbers?: string[];
  barcode?: string;
  isAccessory: boolean;
}

interface ArrivalItem {
  id: string;
  supplierId: string;
  supplierName: string;
  costPrice: number;
  quantity: number;
  date: string;
}

import { debtsApi, arrivalsApi } from '../utils/baseApi';
import { useAuth } from '../hooks/useAuth';

interface DebtProps {
  isBaseMode?: boolean;
}

const Debts: React.FC<DebtProps> = ({ isBaseMode = false }) => {
  const { canDeleteAnything } = useAuth();
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [loadingDebts, setLoadingDebts] = useState(true);
  const [receipts, setReceipts] = useState<any[]>([]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtItem | null>(null);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  // Состояние для чекбоксов
  const [selectedDebtIds, setSelectedDebtIds] = useState<Set<string>>(new Set());
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<number>(() => {
    const savedPageSize = localStorage.getItem('debtsPageSize');
    return savedPageSize ? parseInt(savedPageSize) : 10;
  });

  // Сохраняем размер страницы при изменении
  useEffect(() => {
    localStorage.setItem('debtsPageSize', pageSize.toString());
  }, [pageSize]);

  // Состояние для хранения ширины колонок
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const savedWidths = localStorage.getItem('debtsTableColumnWidths');
    return savedWidths ? JSON.parse(savedWidths) : {
      supplierName: 180,
      amount: 120,
      paidAmount: 120,
      date: 100,
      dueDate: 100,
      status: 100,
      actions: 120
    };
  });

  // Сохраняем ширину колонок при изменении
  useEffect(() => {
    localStorage.setItem('debtsTableColumnWidths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  // Обработчик изменения ширины колонки
  const handleResize = (width: number, column: string) => {
    setColumnWidths(prev => ({
      ...prev,
      [column]: width
    }));
  };

  const copyToClipboard = async (text: string) => {
    if (!text) {
      message.error('Нечего копировать');
      return;
    }

    try {
      // Проверяем поддержку нового API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        message.success('Скопировано в буфер обмена');
      } else {
        // Fallback для старых браузеров или небезопасного контекста
        const textArea = document.createElement('textarea');
        textArea.value = text;
        
        // Делаем элемент невидимым
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        
        textArea.focus();
        textArea.select();

        try {
          document.execCommand('copy');
          textArea.remove();
          message.success('Скопировано в буфер обмена');
        } catch (err: any) {
          console.error('Fallback: Ошибка копирования в буфер:', err);
          message.error('Не удалось скопировать: ' + (err?.message || 'Неизвестная ошибка'));
        }
      }
    } catch (err: any) {
      console.error('Ошибка копирования в буфер:', err);
      message.error('Не удалось скопировать: ' + (err?.message || 'Неизвестная ошибка'));
    }
  };

  // Долги теперь генерируются из приходов, не сохраняем их отдельно

  // Загрузка долгов из API
  useEffect(() => {
    const loadDebts = async () => {
      try {
        setLoadingDebts(true);
        const data = await debtsApi.getAll();
        console.log('💰 Загружено долгов из API:', data.length);
        
        // Проверяем уникальность ID долгов
        const ids = data.map((debt: any) => debt.id);
        const uniqueIds = new Set(ids);
        if (ids.length !== uniqueIds.size) {
          console.warn('⚠️ Обнаружены дублирующиеся ID долгов!', {
            totalDebts: ids.length,
            uniqueIds: uniqueIds.size,
            duplicates: ids.filter((id: string, index: number) => ids.indexOf(id) !== index)
          });
        }
        
        if (data && data.length > 0) {
          setDebts(data);
        } else {
          console.log('💰 API вернул пустые долги, создаем из приходов');
          // Если API не вернул долги, создаем их из приходов через API arrivals
          await loadDebtsFromArrivals();
        }
      } catch (error) {
        console.error('Error loading debts from API:', error);
        console.log('💰 Ошибка API долгов, пытаемся создать из приходов');
        // Если API долгов не работает, пытаемся создать долги из приходов
        await loadDebtsFromArrivals();
      } finally {
        setLoadingDebts(false);
      }
    };

    loadDebts();
    loadReceipts();
  }, []);

  // Обработка событий удаления и обновления приходов
  useEffect(() => {
    const handleArrivalDeleted = (e: CustomEvent) => {
      console.log('💰 Получено событие удаления прихода, обновляем долги...', e.detail);
      // Обновляем долги после удаления прихода
      refreshDebts();
    };

    const handleArrivalUpdated = (e: CustomEvent) => {
      console.log('💰 Получено событие обновления прихода, обновляем долги...', e.detail);
      const { arrivalId, arrival } = e.detail;

      // Обновляем соответствующий долг
      setDebts(prev => prev.map(debt => {
        if (debt.arrivalId === arrivalId) {
          // Пересчитываем сумму долга на основе обновленных данных прихода
          const totalAmount = arrival.items.reduce((sum: number, item: any) => 
            sum + (item.costPrice * item.quantity), 0);

          return {
            ...debt,
            amount: totalAmount,
            remainingAmount: totalAmount - debt.paidAmount,
            items: arrival.items.map((item: any) => ({
              id: item.id,
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              price: item.price,
              costPrice: item.costPrice,
              serialNumbers: item.serialNumbers || [],
              barcode: item.barcode,
              isAccessory: item.isAccessory || false,
              isService: item.isService || false
            }))
          };
        }
        return debt;
      }));
    };

    const handleReceiptCreated = () => {
      loadReceipts();
    };

    const handleReceiptUpdated = () => {
      loadReceipts();
    };

    window.addEventListener('arrivalDeleted', handleArrivalDeleted as EventListener);
    window.addEventListener('arrivalUpdated', handleArrivalUpdated as EventListener);
    window.addEventListener('receiptCreated', handleReceiptCreated as EventListener);
    window.addEventListener('receiptUpdated', handleReceiptUpdated as EventListener);
    window.addEventListener('receiptCancelled', handleReceiptUpdated as EventListener);
    
    return () => {
      window.removeEventListener('arrivalDeleted', handleArrivalDeleted as EventListener);
      window.removeEventListener('arrivalUpdated', handleArrivalUpdated as EventListener);
      window.removeEventListener('receiptCreated', handleReceiptCreated as EventListener);
      window.removeEventListener('receiptUpdated', handleReceiptUpdated as EventListener);
      window.removeEventListener('receiptCancelled', handleReceiptUpdated as EventListener);
    };
  }, []);

  // Функция для загрузки долгов из приходов через API
  const loadDebtsFromArrivals = async () => {
    try {
      console.log('💰 Загружаем приходы через API для создания долгов');
      
      // Загружаем приходы через API
      const fullArrivals = await arrivalsApi.getAll();
      
      console.log('💰 Получено приходов через API:', fullArrivals.length);

      if (!fullArrivals || fullArrivals.length === 0) {
        console.log('💰 Нет приходов через API');
        setDebts([]);
        return;
      }

      // Создаем долг для каждого прихода отдельно
      const newDebts: DebtItem[] = [];

      fullArrivals.forEach((arrival: any) => {
        const arrivalId = arrival._id?.toString() || `arrival_${Date.now()}`;
        
        console.log(`💰 Обрабатываем приход ${arrivalId}:`, {
          supplierId: arrival.supplierId,
          supplierName: arrival.supplierName,
          itemsLength: arrival.items?.length || 0,
          items: arrival.items
        });
        
        if (!arrival.supplierId || !arrival.supplierName || !arrival.items || arrival.items.length === 0) {
          console.log(`💰 Пропускаем приход ${arrivalId}: не хватает данных`);
          return;
        }

        // Используем totalValue из прихода или вычисляем если его нет
        const totalAmount = arrival.totalValue || (arrival.items || []).reduce((sum: number, item: any) => sum + (item.costPrice * item.quantity), 0);
        const dueDate = new Date(arrival.date);
        dueDate.setDate(dueDate.getDate() + 4); // Срок оплаты через 4 дня

        newDebts.push({
          id: `debt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          arrivalId,
          supplierId: arrival.supplierId,
          supplierName: arrival.supplierName,
          amount: totalAmount,
          paidAmount: 0,
          remainingAmount: totalAmount,
          date: arrival.date,
          dueDate: dueDate.toISOString(),
          status: 'active' as const,
          notes: `Долг по приходу от ${new Date(arrival.date).toLocaleDateString('ru-RU')}`,
          items: (arrival.items || []).map((item: any) => ({
            id: item._id?.toString() || `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            costPrice: item.costPrice,
            serialNumbers: item.serialNumbers || [],
            barcode: item.barcode,
            isAccessory: item.isAccessory || false,
            isService: item.isService || false
          }))
        });
      });

      setDebts(newDebts);
      console.log(`💰 Загружено ${newDebts.length} долгов из приходов`);
    } catch (error) {
      console.error('Ошибка при загрузке долгов из приходов:', error);
      setDebts([]);
    }
  };

  // Функция для обновления долгов (можно вызвать извне)
  const refreshDebts = async () => {
    try {
      setLoadingDebts(true);
      const data = await debtsApi.getAll();
      
      if (data && data.length > 0) {
        setDebts(data);
        console.log('💰 Долги обновлены из API');
      } else {
        await loadDebtsFromArrivals();
        console.log('💰 Долги обновлены из приходов');
      }
    } catch (error) {
      console.error('Error refreshing debts:', error);
      await loadDebtsFromArrivals();
    } finally {
      setLoadingDebts(false);
    }
  };

  // Загрузка чеков
  const loadReceipts = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/receipts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch receipts');
      }
      
      const data = await response.json();
      setReceipts(data);
    } catch (error) {
      console.error('Error loading receipts:', error);
    }
  };

  // Проверка наличия чеков с товарами из прихода
  const hasReceiptsWithArrivalItems = (arrivalId: string): boolean => {
    return receipts.some(receipt => {
      if (receipt.status === 'cancelled') return false;
      return receipt.items && receipt.items.some((item: any) => 
        item.arrivalId === arrivalId
      );
    });
  };

  const getStatusColor = (status: DebtItem['status']) => {
    switch (status) {
      case 'active': return 'blue';
      case 'partially_paid': return 'orange';
      case 'paid': return 'green';
      case 'overdue': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status: DebtItem['status']) => {
    switch (status) {
      case 'active': return 'Активный';
      case 'partially_paid': return 'Частично оплачен';
      case 'paid': return 'Оплачен';
      case 'overdue': return 'Просрочен';
      default: return status;
    }
  };

  const handleCreateDebt = () => {
    setEditingDebt(null);
    form.resetFields();
    setIsModalVisible(true);
  };



  const handleDeleteDebt = async (debtId: string) => {
    try {
      // Находим долг для отображения в подтверждении
      const debt = debts.find(d => d.id === debtId);
      
      Modal.confirm({
        title: 'Удалить долг?',
        content: debt ? (
          <div>
            <p>Вы уверены, что хотите удалить долг поставщику?</p>
            <p><strong>Поставщик:</strong> {debt.supplierName}</p>
            <p><strong>Сумма:</strong> {debt.amount.toLocaleString('ru-RU')} ₽</p>
            <p><strong>Оплачено:</strong> {debt.paidAmount.toLocaleString('ru-RU')} ₽</p>
            {debt.paidAmount > 0 && (
              <p style={{ color: '#fa8c16' }}>
                <strong>Внимание:</strong> При удалении оплаченного долга, оплаченная сумма будет возвращена в кассу.
              </p>
            )}
          </div>
        ) : 'Вы уверены, что хотите удалить этот долг?',
        okText: 'Удалить',
        okType: 'danger',
        cancelText: 'Отмена',
        onOk: async () => {
          try {
            console.log('🗑️ Удаляем долг через API:', debtId);
            
            // Вызываем API удаления
            await debtsApi.delete(debtId);
            
            // Обновляем локальное состояние
            setDebts(prev => prev.filter(d => d.id !== debtId));
            message.success('Долг удален вместе со связанными платежами');
            
            // Отправляем событие для обновления платежей на других страницах
            console.log('📤 Отправляем событие paymentUpdated после удаления долга:', { debtId });
            window.dispatchEvent(new CustomEvent('paymentUpdated', {
              detail: {
                type: 'debtDeleted',
                debtId: debtId
              }
            }));
          } catch (error) {
            console.error('❌ Ошибка при удалении долга:', error);
            message.error('Ошибка при удалении долга');
          }
        }
      });
    } catch (error) {
      console.error('❌ Ошибка при подготовке удаления долга:', error);
      message.error('Ошибка при удалении долга');
    }
  };

  // Обработчик открытия модального окна оплаты
  const handlePaymentClick = (debt: DebtItem) => {
    setEditingDebt(debt);
    form.setFieldsValue({
      amount: debt.remainingAmount
    });
    setIsPaymentModalVisible(true);
  };



  // Обработчик оплаты
  const handlePayment = async (debt: DebtItem, amount: number) => {
    try {
      if (amount <= 0) {
        message.error('Сумма оплаты должна быть больше 0');
        return;
      }

      if (amount > debt.remainingAmount) {
        message.error(`Сумма оплаты не может быть больше оставшейся суммы долга (${debt.remainingAmount.toLocaleString('ru-RU')} ₽)`);
        return;
      }

      // Проверяем, есть ли чеки с товарами из этого прихода (только для не-бухгалтеров)
      if (!canDeleteAnything() && !hasReceiptsWithArrivalItems(debt.arrivalId)) {
        Modal.error({
          title: 'Нельзя оплатить долг',
          content: (
            <div>
              <p>Долг по этому приходу нельзя оплатить, поскольку товары из него еще не проданы.</p>
              <p><strong>Детали прихода:</strong></p>
              <ul>
                <li>Поставщик: {debt.supplierName}</li>
                <li>Дата прихода: {new Date(debt.date).toLocaleDateString('ru-RU')}</li>
                <li>Сумма долга: {debt.amount.toLocaleString('ru-RU')} ₽</li>
                <li>Количество товаров: {debt.items?.length || 0}</li>
              </ul>
              <p>Для оплаты долга необходимо сначала создать чеки с продажей товаров из этого прихода на странице "Чек".</p>
            </div>
          ),
          okText: 'Понятно',
          width: 500
        });
        return;
      }

      // Используем специальный эндпоинт для оплаты
      const updatedDebt = await debtsApi.pay(debt.id, { amount });

      setDebts(prev => prev.map(d => d.id === debt.id ? updatedDebt : d));
      message.success(
        `Оплата проведена успешно. Из наличных кассы списано ${amount.toLocaleString('ru-RU')} ₽`,
        5 // Показываем уведомление 5 секунд
      );
      
      // Отправляем событие для обновления кассы и платежей
      console.log('📤 Отправляем событие paymentUpdated:', {
        type: 'debtPayment',
        amount: amount,
        supplier: debt.supplierName,
        debtId: debt.id
      });
      
      // Даем время для сохранения в базе данных, затем отправляем событие
      setTimeout(() => {
        console.log('📤 Отправляем событие paymentUpdated через 500мс...');
        window.dispatchEvent(new CustomEvent('paymentUpdated', { 
          detail: { 
            type: 'debtPayment',
            amount: amount,
            supplier: debt.supplierName,
            debtId: debt.id
          } 
        }));
      }, 500);
      
      setIsPaymentModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Ошибка при проведении оплаты:', error);
      message.error('Не удалось провести оплату');
    }
  };

  // Обработчик подтверждения в модальном окне
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      // Создаем новый долг
      const newDebt = {
        supplierName: values.supplierName,
        amount: values.amount,
        paidAmount: values.paidAmount || 0,
        date: values.date,
        dueDate: values.dueDate,
        notes: values.notes
      };

      // Вызываем API создания долга
      const createdDebt = await debtsApi.create(newDebt);
      
      // Добавляем новый долг в список
      setDebts(prev => [...prev, createdDebt]);
      
      // Закрываем модальное окно и очищаем форму
      setIsModalVisible(false);
      form.resetFields();
      
      message.success('Долг успешно создан');
    } catch (error) {
      console.error('Ошибка при создании долга:', error);
      message.error('Не удалось создать долг');
    }
  };

  const handlePaymentModalOk = async () => {
    if (!editingDebt) return;

    try {
      const values = await form.validateFields();
      await handlePayment(editingDebt, values.amount);
    } catch (error) {
      console.error('Ошибка валидации формы:', error);
    }
  };

  // Обработчик выбора одного долга
  const handleSelect = (record: DebtItem, selected: boolean) => {
    setSelectedDebtIds(prev => {
      const newSelected = new Set(prev);
      if (selected) {
        newSelected.add(record.id);
      } else {
        newSelected.delete(record.id);
      }
      return newSelected;
    });
  };

  // Обработчик выбора всех долгов
  const handleSelectAll = (selected: boolean, selectedRows: DebtItem[]) => {
    if (selected) {
      setSelectedDebtIds(new Set(selectedRows.map(row => row.id)));
    } else {
      setSelectedDebtIds(new Set());
    }
  };

  // Фильтрация долгов (нужно определить до колонок для чекбоксов)
  const filteredDebts = debts.filter(debt => {
    const searchLower = searchText.toLowerCase();
    const matchesSupplier = debt.supplierName.toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === 'all' || debt.status === statusFilter;
    
    // Поиск по товарам и серийным номерам
    const matchesItems = debt.items.some(item => {
      const matchesProduct = item.productName.toLowerCase().includes(searchLower);
      const matchesSerial = item.serialNumbers?.some(sn => 
        sn.toLowerCase().includes(searchLower)
      );
      return matchesProduct || matchesSerial;
    });

    return (matchesSupplier || matchesItems) && matchesStatus;
  });

  // Обработчик массовой оплаты долгов
  const handleBulkPayment = () => {
    Modal.confirm({
      title: 'Массовая оплата долгов',
      content: (
        <div>
          <p>Отметить как оплаченные {selectedDebtIds.size} долг{selectedDebtIds.size === 1 ? '' : selectedDebtIds.size < 5 ? 'а' : 'ов'}?</p>
          <p>Общая сумма: {
            filteredDebts
              .filter(debt => selectedDebtIds.has(debt.id))
              .reduce((sum, debt) => sum + debt.remainingAmount, 0)
              .toLocaleString('ru-RU')
          } ₽</p>
        </div>
      ),
      okText: 'Оплатить все',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          // Получаем выбранные долги
          const selectedDebts = filteredDebts.filter(debt => selectedDebtIds.has(debt.id));
          
          // Оплачиваем каждый долг
          for (const debt of selectedDebts) {
            if (debt.remainingAmount > 0) {
              await debtsApi.pay(debt.id, { amount: debt.remainingAmount });
            }
          }

          // Обновляем список долгов
          const updatedDebts = await debtsApi.getAll();
          setDebts(updatedDebts);
          
          // Очищаем выбранные долги
          setSelectedDebtIds(new Set());
          
          message.success(`Оплачено ${selectedDebts.length} долг${selectedDebts.length === 1 ? '' : selectedDebts.length < 5 ? 'а' : 'ов'}`);
        } catch (error) {
          console.error('Ошибка при массовой оплате:', error);
          message.error('Не удалось провести массовую оплату');
        }
      }
    });
  };

  const columns: ColumnsType<DebtItem> = [
    {
      title: 'Поставщик / Приход',
      dataIndex: 'supplierName',
      width: columnWidths.supplierName,
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: '500' }}>{name}</div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
            Приход от {new Date(record.date).toLocaleDateString('ru-RU')}
          </div>
          <div style={{ fontSize: '12px', color: '#1890ff' }}>
            {(() => {
              const itemsCount = record.items?.length || 0;
              if (itemsCount === 0) {
                return 'Нет товаров';
              } else if (itemsCount === 1) {
                return '1 товар';
              } else if (itemsCount < 5) {
                return `${itemsCount} товара`;
              } else {
                return `${itemsCount} товаров`;
              }
            })()}
          </div>
        </div>
      )
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      width: columnWidths.amount,
      align: 'right',
      render: (amount) => (
        <div style={{ fontWeight: '600', color: '#52c41a' }}>
          {amount.toLocaleString('ru-RU')} ₽
        </div>
      )
    },
    {
      title: 'Оплачено',
      dataIndex: 'paidAmount',
      width: columnWidths.paidAmount,
      align: 'right',
      render: (paid, record) => (
        <div>
          <div style={{ fontWeight: '500', color: '#1890ff' }}>
            {paid.toLocaleString('ru-RU')} ₽
          </div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
            Остаток: {record.remainingAmount.toLocaleString('ru-RU')} ₽
          </div>
        </div>
      )
    },
    {
      title: 'Дата',
      dataIndex: 'date',
      width: columnWidths.date,
      render: (date) => (
        <div>
          <div>{new Date(date).toLocaleDateString('ru-RU')}</div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
            {new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      )
    },
    {
      title: 'Срок',
      dataIndex: 'dueDate',
      width: columnWidths.dueDate,
      render: (date) => date ? (
        <div>
          <div>{new Date(date).toLocaleDateString('ru-RU')}</div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
            {new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ) : '-'
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const statusConfig: Record<string, { text: string; color: string }> = {
          active: { text: 'Активный', color: '#ff4d4f' },
          paid: { text: 'Оплачен', color: '#52c41a' },
          partially_paid: { text: 'Частично оплачен', color: '#faad14' },
          cancelled: { text: 'Отменен', color: '#d9d9d9' }
        };
        
        const config = statusConfig[status] || { text: status, color: '#d9d9d9' };
        
        return (
          <Tag color={config.color}>
            {config.text}
          </Tag>
        );
      }
    },
    {
      title: 'Действия',
      key: 'actions',
      width: columnWidths.actions,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          {record.status !== 'paid' && (
            (canDeleteAnything() || hasReceiptsWithArrivalItems(record.arrivalId)) ? (
              <Button 
                type="primary"
                icon={<DollarOutlined />}
                onClick={() => handlePaymentClick(record)}
              >
                Оплата
              </Button>
            ) : (
              <Tooltip title="Нельзя оплатить долг без продажи товаров из прихода">
                <Button 
                  type="primary"
                  icon={<DollarOutlined />}
                  disabled
                >
                  Оплата
                </Button>
              </Tooltip>
            )
          )}

        </Space>
      )
    }
  ];

  // Расчет статистики
  const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0);
  const totalPaid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
  const totalRemaining = debts.reduce((sum, d) => sum + d.remainingAmount, 0);
  const activeDebts = debts.filter(d => d.status === 'active' || d.status === 'partially_paid').length;

  return (
    <div>
      {/* Статистика */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <Card style={{ flex: 1, borderRadius: '12px', background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)', border: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1890ff' }}>
              {totalDebt.toLocaleString('ru-RU')} ₽
            </div>
            <div style={{ color: '#595959', fontWeight: '500' }}>Общая сумма долгов</div>
          </div>
        </Card>
        <Card style={{ flex: 1, borderRadius: '12px', background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)', border: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#52c41a' }}>
              {totalPaid.toLocaleString('ru-RU')} ₽
            </div>
            <div style={{ color: '#595959', fontWeight: '500' }}>Оплачено</div>
          </div>
        </Card>
        <Card style={{ flex: 1, borderRadius: '12px', background: 'linear-gradient(135deg, #fff7e6 0%, #ffd591 100%)', border: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#fa8c16' }}>
              {totalRemaining.toLocaleString('ru-RU')} ₽
            </div>
            <div style={{ color: '#595959', fontWeight: '500' }}>Остаток к оплате</div>
          </div>
        </Card>
        <Card style={{ flex: 1, borderRadius: '12px', background: 'linear-gradient(135deg, #f9f0ff 0%, #d3adf7 100%)', border: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#722ed1' }}>
              {activeDebts}
            </div>
            <div style={{ color: '#595959', fontWeight: '500' }}>Активных долгов</div>
          </div>
        </Card>
      </div>

      {/* Фильтры и поиск */}
      <Card style={{ marginBottom: '24px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Search
            placeholder="Поиск по поставщику"
            style={{ width: 300 }}
            onChange={(e) => {
              setSearchText(e.target.value);
              setSelectedDebtIds(new Set());
            }}
            prefix={<SearchOutlined />}
          />
          <Select
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setSelectedDebtIds(new Set());
            }}
            style={{ minWidth: 150 }}
          >
            <Option value="all">Все статусы</Option>
            <Option value="active">Активные</Option>
            <Option value="partially_paid">Частично оплаченные</Option>
            <Option value="paid">Оплаченные</Option>
            <Option value="overdue">Просроченные</Option>
          </Select>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            {selectedDebtIds.size > 0 && (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={handleBulkPayment}
                style={{ borderRadius: '8px', backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Оплатить выбранные ({selectedDebtIds.size})
              </Button>
            )}
            <Button
              icon={<ReloadOutlined />}
              onClick={refreshDebts}
              loading={loadingDebts}
              style={{ borderRadius: '8px' }}
            >
              Обновить
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateDebt}
              style={{ borderRadius: '8px' }}
            >
              Добавить долг
            </Button>
          </div>
        </div>
      </Card>

      {/* Таблица долгов */}
      <Card style={{ borderRadius: '12px' }}>
        <Table
          columns={columns}
          dataSource={filteredDebts}
          rowKey={record => record.id}
          rowClassName={(record) => {
            const baseClass = record.status === 'active' ? 'debt-row-unpaid' : '';
            return `${baseClass} ${expandedRowKeys.includes(record.id) ? 'debt-row-expanded' : ''}`;
          }}
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys: Array.from(selectedDebtIds),
            onSelect: handleSelect,
            onSelectAll: handleSelectAll
          }}
          expandable={{
            expandedRowRender: (record) => {
              console.log('Expanded record:', record);
              if (!record) {
                console.warn('Record is undefined');
                return null;
              }

              return (
                <div style={{ 
                  padding: '4px 8px',
                  background: record.status === 'active' ? '#fff1f0' : '#fafafa',
                  margin: '-8px -8px'
                }}>
                  {Array.isArray(record.items) ? record.items.map((item, index) => {
                    if (!item) {
                      console.warn(`Item at index ${index} is undefined`);
                      return null;
                    }

                    return (
                      <div key={index} style={{ 
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: index < (record.items?.length || 0) - 1 ? '4px' : 0
                      }}>
                        <span style={{ fontWeight: 500 }}>{item.productName || 'Без названия'}</span>
                        {item.isAccessory && <Tag color="blue">Аксессуар</Tag>}
                        {Array.isArray(item.serialNumbers) && item.serialNumbers.map((sn, idx) => (
                          <Tag 
                            key={idx}
                            color="default"
                            style={{ cursor: 'pointer' }}
                            icon={<CopyOutlined />}
                            onClick={() => copyToClipboard(sn)}
                          >
                            {sn}
                          </Tag>
                        ))}
                        {item.barcode && (
                          <Tag
                            color="default"
                            style={{ cursor: 'pointer' }}
                            icon={<CopyOutlined />}
                            onClick={() => copyToClipboard(item.barcode || '')}
                          >
                            {item.barcode}
                          </Tag>
                        )}
                        <span>Кол-во: {item.quantity || 0}</span>
                        <span>Цена: {typeof item.price === 'number' ? item.price.toLocaleString('ru-RU') : '0'} ₽</span>
                      </div>
                    );
                  }) : <div>Нет товаров</div>}
                  <div style={{ 
                    marginTop: '8px',
                    display: 'flex',
                    gap: '16px',
                    color: record.status === 'active' ? '#cf1322' : 'rgba(0, 0, 0, 0.85)'
                  }}>
                    <span>Общая сумма: {record.amount.toLocaleString('ru-RU')} ₽</span>
                    <span>Оплачено: {record.paidAmount.toLocaleString('ru-RU')} ₽</span>
                    <span>Остаток: {record.remainingAmount.toLocaleString('ru-RU')} ₽</span>
                  </div>
                </div>
              );
            },
            expandRowByClick: true,
            expandedRowKeys: expandedRowKeys,
            onExpand: (expanded, record) => {
              setExpandedRowKeys(expanded ? [record.id] : []);
            },
            showExpandColumn: false
          }}
          pagination={{
            pageSize: pageSize,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Всего ${total} долгов`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onShowSizeChange: (current, size) => {
              setPageSize(size);
            }
          }}
          size="small"
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <style>{`
        :global(.debt-row-unpaid) {
          background-color: #fff1f0 !important;
        }
        :global(.debt-row-unpaid:hover) {
          background-color: #ffa39e !important;
        }
        :global(.debt-row-expanded) {
          background-color: white !important;
        }
        :global(.ant-table-row-selected) {
          background-color: #e6f7ff !important;
        }
        :global(.ant-table-row-selected:hover) {
          background-color: #bae7ff !important;
        }
      `}</style>

      {/* Модальное окно создания долга */}
      <Modal
        title="Создать долг"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        width={600}
        okText="Создать"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="supplierName"
            label="Поставщик"
            rules={[{ required: true, message: 'Введите название поставщика' }]}
          >
            <Input placeholder="Название поставщика" />
          </Form.Item>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="amount"
              label="Сумма долга"
              rules={[{ required: true, message: 'Введите сумму' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="10000"
                min={0}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>

            <Form.Item
              name="paidAmount"
              label="Оплачено"
              initialValue={0}
              style={{ flex: 1 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0"
                min={0}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="date"
              label="Дата"
              rules={[{ required: true, message: 'Выберите дату' }]}
              style={{ flex: 1 }}
            >
              <Input type="date" />
            </Form.Item>

            <Form.Item
              name="dueDate"
              label="Срок оплаты"
              style={{ flex: 1 }}
            >
              <Input type="date" />
            </Form.Item>
          </div>

          <Form.Item
            name="notes"
            label="Примечания"
          >
            <Input.TextArea rows={3} placeholder="Дополнительная информация" />
          </Form.Item>
        </Form>
      </Modal>



      {/* Модальное окно оплаты */}
      <Modal
        title="Оплата долга"
        open={isPaymentModalVisible}
        onOk={handlePaymentModalOk}
        onCancel={() => {
          setIsPaymentModalVisible(false);
          setEditingDebt(null);
          form.resetFields();
        }}
        okText="Оплатить"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="amount"
            label="Сумма оплаты"
            rules={[
              { required: true, message: 'Введите сумму оплаты' },
              { 
                type: 'number',
                min: 1,
                message: 'Сумма должна быть больше 0'
              },
              {
                validator: async (_, value) => {
                  if (editingDebt && value > editingDebt.remainingAmount) {
                    throw new Error(`Сумма не может быть больше ${editingDebt.remainingAmount.toLocaleString('ru-RU')} ₽`);
                  }
                }
              }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              parser={value => value!.replace(/\s?/g, '')}
              addonAfter="₽"
            />
          </Form.Item>

          {editingDebt && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">Общая сумма долга: </Text>
                <Text strong>{editingDebt.amount.toLocaleString('ru-RU')} ₽</Text>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">Уже оплачено: </Text>
                <Text strong type="success">{editingDebt.paidAmount.toLocaleString('ru-RU')} ₽</Text>
              </div>
              <div>
                <Text type="secondary">Осталось оплатить: </Text>
                <Text strong type="warning">{editingDebt.remainingAmount.toLocaleString('ru-RU')} ₽</Text>
              </div>
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default Debts; 