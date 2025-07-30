import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Input, 
  Select, 
  Modal, 
  Form, 
  InputNumber,
  message,
  Space,
  Tooltip,
  Popconfirm,
  Switch,
  Tabs,
  Row,
  Col,
  TreeSelect,
  Spin,
  Radio
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  EditOutlined, 
  DeleteOutlined,
  DollarOutlined,
  CalendarOutlined,
  BankOutlined,
  WalletOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ShoppingCartOutlined,
  MinusCircleOutlined,
  ReloadOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { logPaymentAction } from '../utils/actionLogger';
import { paymentsApi, receiptsApi, incassateReceipts } from '../utils/baseApi';
import { calculateCashInRegister } from '../utils/cashCalculations';
import { debtsApi } from '../api/debts';
import { useAuth } from '../hooks/useAuth';
import { initializeProductEvents, closeProductEvents } from '../utils/productEvents';

const { Search } = Input;
const { Option } = Select;

interface PaymentItem {
  id: string;
  mongoId?: string; // MongoDB _id для API вызовов
  type: 'cash' | 'transfer' | 'keb'; // наличные, перевод или КЭБ
  amount: number; // может быть отрицательным для расходов
  description: string;
  date: string;
  supplier?: string;
  orderId?: string;
  inCashRegister: boolean; // положили в кассу или нет
  cashRegisterDate?: string; // дата поступления в кассы
  notes?: string;
  createdAt: string;
  // Дополнительные поля для интеграции с API
  category?: string;
  paymentMethod?: string;
  apiType?: 'income' | 'expense'; // оригинальный тип из API backend
  status?: 'active' | 'incassated'; // статус платежа
  incassationDate?: string; // дата инкассации
  adminName?: string; // имя администратора, создавшего запись
}

interface ExpenseItem {
  id: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  adminName: string;
  notes?: string;
  createdAt: string;
}

interface PurchaseItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  costPrice: number;
  supplier: string;
  date: string;
  adminName: string;
  addToArrival: boolean;
  notes?: string;
  createdAt: string;
  arrivalId?: string; // ID связанного прихода
}

// Компонент для основной вкладки с платежами
const PaymentsTab: React.FC<{
  payments: PaymentItem[];
  setPayments: React.Dispatch<React.SetStateAction<PaymentItem[]>>;
  refreshPayments: () => Promise<void>;
}> = ({ payments, setPayments, refreshPayments }) => {
  // Состояния для основного функционала
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentItem | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [incassationFilter, setIncassationFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [canEditPayments, setCanEditPayments] = useState(false);
  
  // Проверка роли пользователя для кнопки очистки
  const { hasFullAccess } = useAuth();
  
  // Состояние для сортировки
  const [sortField, setSortField] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend'>('descend');

  // Состояние для пагинации
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('payments_page_size');
    return saved ? parseInt(saved, 10) : 10;
  });

  // Состояния для инкассации
  const [incassationModalVisible, setIncassationModalVisible] = useState(false);
  const [incassationForm] = Form.useForm();
  const [incassationType, setIncassationType] = useState<'all' | 'partial'>('all');

  // Состояние для фильтра по месяцу
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Проверяем права при каждом запросе к API
  const checkPermissions = async () => {
    try {
      console.log('🔐 Проверяем права доступа...');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/payments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      
      // Получаем права из заголовков ответа
      const canEdit = response.headers.get('X-Can-Edit') === 'true';
      const userRole = response.headers.get('X-User-Role');
      console.log('🔐 Права доступа:', { canEdit, userRole });
      setCanEditPayments(canEdit);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  // Проверяем права при монтировании и при каждом обновлении платежей
  useEffect(() => {
    checkPermissions();
  }, [payments]); // Добавляем payments в зависимости

  // Сохраняем размер страницы в localStorage
  useEffect(() => {
    localStorage.setItem('payments_page_size', pageSize.toString());
  }, [pageSize]);

  const getTypeColor = (type: PaymentItem['type'], description?: string) => {
    // Определяем долги по описанию
    if (description && description.startsWith('ДОЛГ:')) {
      return 'red';
    }
    
    switch (type) {
      case 'cash': return 'green';
      case 'transfer': return 'blue';
      case 'keb': return 'purple';
      default: return 'default';
    }
  };

  const getTypeText = (type: PaymentItem['type'], description?: string) => {
    // Определяем долги по описанию
    if (description && description.startsWith('ДОЛГ:')) {
      return 'Долг';
    }
    
    switch (type) {
      case 'cash': return 'Наличные';
      case 'transfer': return 'Перевод';
      case 'keb': return 'КЭБ';
      default: return type;
    }
  };

  const getTypeIcon = (type: PaymentItem['type'], description?: string) => {
    // Определяем долги по описанию
    if (description && description.startsWith('ДОЛГ:')) {
      return <MinusCircleOutlined />;
    }
    
    switch (type) {
      case 'cash': return <WalletOutlined />;
      case 'transfer': return <BankOutlined />;
      case 'keb': return <DollarOutlined />;
      default: return <DollarOutlined />;
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingPayment) {
        // Обновляем платеж через API
        try {
          const updateData = {
            ...values,
            date: values.date,
            cashRegisterDate: values.inCashRegister && values.cashRegisterDate ? values.cashRegisterDate : undefined
          };
          
          if (editingPayment.mongoId) {
            await paymentsApi.update(editingPayment.mongoId, updateData);
          } else {
            await paymentsApi.update(editingPayment.id, updateData);
          }
          
          // Логируем действие
          logPaymentAction(
            'Редактирование платежа',
            `Обновлен платеж: ${values.description} на сумму ${values.amount.toLocaleString('ru-RU')} ₽`,
            editingPayment.id
          );
      
      // Обновляем данные из API
      await refreshPayments();
          message.success('Платеж обновлен');
    } catch (error) {
          console.error('Ошибка при обновлении платежа:', error);
          message.error('Ошибка при обновлении платежа');
      return;
    }
      } else {
        // Создаём новый платеж через API
        try {
                  // Если дата указана только как дата (без времени), добавляем текущее время
          const paymentDate = values.date ? 
            (values.date.includes('T') ? values.date : `${values.date}T${new Date().toTimeString().split(' ')[0]}`) :
            new Date().toISOString();

          const newPaymentData = {
          type: values.type === 'cash' ? 'наличные' : values.type === 'transfer' ? 'перевод' : 'кэб',
          apiType: 'income', // Это доход
          category: values.description || 'Прочие доходы',
          amount: values.amount,
          date: paymentDate,
          description: values.description,
          paymentMethod: values.type === 'cash' ? 'наличные' : values.type === 'transfer' ? 'перевод' : 'кэб',
          notes: values.notes,
          inCashRegister: values.inCashRegister || false,
          cashRegisterDate: values.inCashRegister && values.cashRegisterDate ? values.cashRegisterDate : undefined
        };
          
          const createdPayment = await paymentsApi.create(newPaymentData);
          
          // Логируем действие
          logPaymentAction(
            'Создание платежа',
            `Добавлен платеж: ${values.description} на сумму ${values.amount.toLocaleString('ru-RU')} ₽`,
            `manual_${Date.now()}`
          );
          
          // Добавляем созданный платеж локально вместо полной перезагрузки
          const newPayment: PaymentItem = {
            id: createdPayment.id,
            mongoId: createdPayment._id,
            type: createdPayment.type === 'наличные' ? 'cash' : createdPayment.type === 'перевод' ? 'transfer' : 'keb',
            amount: createdPayment.amount,
            description: createdPayment.description,
            date: createdPayment.date,
            supplier: createdPayment.supplier || '',
            inCashRegister: createdPayment.inCashRegister || false,
            notes: createdPayment.notes || '',
            createdAt: createdPayment.createdAt || new Date().toISOString(),
            category: createdPayment.category || '',
            paymentMethod: createdPayment.paymentMethod || '',
            apiType: createdPayment.apiType || 'income',
            status: createdPayment.status || 'active'
          };
          
          // Добавляем в начало списка
          setPayments(prevPayments => [newPayment, ...prevPayments]);
          message.success('Платеж добавлен');
        } catch (error) {
          console.error('Ошибка при создании платежа:', error);
          message.error('Ошибка при создании платежа');
          return;
        }
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleIncassation = async () => {
    // Используем утилиту для расчета наличных в кассе
    const totalAmount = calculateCashInRegister(payments);
    
    if (totalAmount <= 0) {
      message.info('Нет наличных в кассе для инкассации');
      return;
    }

    // Сбрасываем форму перед открытием
    incassationForm.resetFields();
    incassationForm.setFieldsValue({
      type: 'all'
    });

    // Открываем модальное окно для выбора типа инкассации
    Modal.confirm({
      title: 'Списание наличных из кассы',
      width: 600,
      content: (
        <div>
          <Form form={incassationForm} layout="vertical">
            <Form.Item
              label="Тип списания"
              name="incassationType"
              initialValue="all"
            >
              <Radio.Group defaultValue="all">
                <Space direction="vertical">
                  <Radio value="all">
                    <div>
                      <div style={{ fontWeight: 500 }}>Списать все наличные</div>
                      <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        Сумма: {totalAmount.toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                  </Radio>
                  <Radio value="partial">
                    <div>
                      <div style={{ fontWeight: 500 }}>Указать сумму списания</div>
                      <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        Максимум: {totalAmount.toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                  </Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => 
                prevValues?.incassationType !== currentValues?.incassationType
              }
            >
              {({ getFieldValue }) => 
                getFieldValue('incassationType') === 'partial' && (
                  <Form.Item
                    label="Сумма списания"
                    name="amount"
                    rules={[
                      { required: true, message: 'Введите сумму' },
                      { 
                        type: 'number',
                        min: 1,
                        max: totalAmount,
                        message: `Сумма должна быть от 1 до ${totalAmount.toLocaleString('ru-RU')} ₽`
                      }
                    ]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="Введите сумму"
                      min={1}
                      max={totalAmount}
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(value) => Number(value!.replace(/[^\d]/g, ''))}
                      addonAfter="₽"
                    />
                  </Form.Item>
                )
              }
            </Form.Item>
          </Form>
          <div style={{ marginTop: 16, padding: 8, background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 4 }}>
            <InfoCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
            Будет создана запись о списании наличных из кассы
          </div>
        </div>
      ),
      onOk: async (close) => {
        try {
          // Валидируем форму
          await incassationForm.validateFields();
          
          setLoadingPayments(true);
          
          // Получаем значения из формы
          const incassationType = incassationForm.getFieldValue('incassationType');
          const partialAmount = incassationForm.getFieldValue('amount');
          
          const incassationAmount = incassationType === 'all' ? totalAmount : partialAmount;

          // Генерируем уникальные идентификаторы для этой инкассации
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substring(2, 8);

          try {
            // Создаем совершенно новый объект только с нужными полями
            const now = new Date();
            const uniqueId = `incassation_${timestamp}_${randomSuffix}`;
            
            const finalPaymentData = {
              id: uniqueId, // Добавляем уникальный id для предотвращения дублирования
              type: 'наличные',
              amount: -Math.abs(incassationAmount),
              description: `Инкассация наличных ${now.toLocaleDateString('ru-RU')} ${now.toLocaleTimeString('ru-RU')} [${uniqueId}]`,
              date: now.toISOString(),
              paymentMethod: 'наличные',
              category: 'Инкассация',
              inCashRegister: false,
              notes: `Списано из кассы ${incassationAmount.toLocaleString('ru-RU')} ₽ - ID: ${uniqueId}`,
              apiType: 'expense',
              status: 'active',
              supplier: `Инкассация_${timestamp}` // Добавляем уникальное поле supplier
            };
            
            // Создаем запись через API
            console.log('💰 Создаем запись о списании (новый объект):', finalPaymentData);
            console.log('💰 Поля объекта:', Object.keys(finalPaymentData));
            console.log('💰 Есть ли поле id?', 'id' in finalPaymentData);
            console.log('💰 JSON данные:', JSON.stringify(finalPaymentData, null, 2));
            
            const createdIncassation = await paymentsApi.create(finalPaymentData);
            console.log('💰 Запись о списании создана:', createdIncassation);

            // Логируем действие
            logPaymentAction(
              'Списание наличных',
              `Списано из кассы ${incassationAmount.toLocaleString('ru-RU')} ₽`,
              createdIncassation._id || createdIncassation.id
            );

            message.success(`Списано из кассы ${incassationAmount.toLocaleString('ru-RU')} ₽`);
            
            // Добавляем новую запись в локальное состояние
            // Используем тот же формат, что возвращает API
            const typeMap: Record<string, 'cash' | 'transfer' | 'keb'> = {
              'cash': 'cash',
              'card': 'transfer', 
              'transfer': 'transfer',
              'наличные': 'cash',
              'перевод': 'transfer',
              'кэб': 'keb'
            };
            
            const newPayment: PaymentItem = {
              id: createdIncassation.id || createdIncassation._id || uniqueId,
              mongoId: createdIncassation._id,
              type: typeMap[createdIncassation.paymentMethod] || typeMap[createdIncassation.type] || 'cash',
              amount: createdIncassation.amount !== undefined ? createdIncassation.amount : -Math.abs(incassationAmount),
              description: createdIncassation.description || finalPaymentData.description,
              date: createdIncassation.date || finalPaymentData.date,
              inCashRegister: createdIncassation.inCashRegister !== undefined ? createdIncassation.inCashRegister : false,
              createdAt: createdIncassation.createdAt || new Date().toISOString(),
              category: createdIncassation.category || 'Инкассация',
              paymentMethod: typeMap[createdIncassation.paymentMethod] || typeMap[createdIncassation.type] || 'cash',
              apiType: createdIncassation.apiType || 'expense',
              status: createdIncassation.status || 'active',
              supplier: createdIncassation.supplier,
              notes: createdIncassation.notes
            };
            
            console.log('💰 Добавляем новую запись в состояние:', newPayment);
            
            // Добавляем новую запись в начало списка для лучшей видимости
            setPayments(prevPayments => {
              console.log('💰 Предыдущее состояние платежей:', prevPayments.length);
              console.log('💰 Добавляемая запись:', newPayment);
              const newState = [newPayment, ...prevPayments];
              console.log('💰 Новое состояние платежей:', newState.length);
              console.log('💰 Первая запись в новом состоянии:', newState[0]);
              return newState;
            });
            
            close();
          } catch (error) {
            console.error('Ошибка при создании записи о списании:', error);
            message.error('Ошибка при создании записи о списании');
          }
        } catch (error) {
          console.error('Ошибка:', error);
          message.error('Ошибка при списании наличных');
        } finally {
          setLoadingPayments(false);
        }
      },
      okText: 'Списать',
      cancelText: 'Отмена'
    });
  };

  const handleToggleCashRegister = async (payment: PaymentItem) => {
    console.log('🔄 handleToggleCashRegister вызван для платежа:', {
      id: payment.id,
      type: payment.type,
      amount: payment.amount,
      inCashRegister: payment.inCashRegister,
      description: payment.description
    });

    if (payment.type === 'cash' && payment.inCashRegister) {
      console.log('❌ Блокировка: наличные уже в кассе');
      message.info('Наличные нельзя убрать из кассы. Используйте кнопку "Инкассировать наличные"');
      return;
    }

    const newStatus = !payment.inCashRegister;
    const actionText = newStatus ? 'поместить в кассу' : 'убрать из кассы';
    const confirmTitle = newStatus ? 'Поместить в кассу?' : 'Убрать из кассы?';
    
    console.log('🔄 Новый статус будет:', newStatus, 'Действие:', actionText);
    
    let confirmContent = `Вы уверены, что хотите ${actionText} платеж "${payment.description}" на сумму ${payment.amount.toLocaleString('ru-RU')} ₽?`;
    
    if (newStatus && (payment.type === 'transfer' || payment.type === 'keb')) {
      const typeText = payment.type === 'keb' ? 'КЭБ' : 'перевод';
      confirmContent += `\n\nПри помещении в кассу ${typeText} будет преобразован в наличные.`;
    }

    Modal.confirm({
      title: confirmTitle,
      content: confirmContent,
      okText: newStatus ? 'Поместить' : 'Убрать',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          setLoadingPayments(true);
          let apiSuccess = false;

          // Если это платеж из чека - обновляем чек через API
          if (payment.id && payment.id.startsWith('receipt_')) {
            // Парсим ID: receipt_RECEIPT_ID_INDEX
            const match = payment.id.match(/^receipt_(.+)_(\d+)$/);
            if (match) {
              const [fullMatch, receiptId, paymentIndexStr] = match;
              const paymentIndex = parseInt(paymentIndexStr, 10);
              
              console.log('🔍 Парсинг ID платежа:', {
                fullId: payment.id,
                fullMatch,
                receiptId,
                paymentIndexStr,
                paymentIndex,
                isValidIndex: !isNaN(paymentIndex)
              });
              
              try {
                console.log('📡 Получаем чек для обновления:', receiptId);
                // Получаем чек для проверки текущего состояния
                const receipt = await receiptsApi.getById(receiptId);
                console.log('📦 Получен чек:', receipt);
                console.log('📦 Платежи в чеке:', receipt?.payments);
                console.log('📦 Нужный индекс платежа:', paymentIndex);
                
                if (receipt && Array.isArray(receipt.payments) && receipt.payments[paymentIndex]) {
                  console.log('✅ Платеж найден в чеке:', receipt.payments[paymentIndex]);
                  
                  // Обновляем конкретный платеж в чеке
                  const updatedPayments = [...receipt.payments];
                  const oldPayment = updatedPayments[paymentIndex];
                  
                  updatedPayments[paymentIndex] = {
                    ...updatedPayments[paymentIndex],
                    inCashRegister: newStatus,
                    cashRegisterDate: newStatus ? new Date().toISOString() : undefined,
                    method: newStatus && (payment.type === 'transfer' || payment.type === 'keb') ? 'cash' : oldPayment.method
                  };

                  // Обновляем чек с новыми данными платежа
                  console.log('📡 Обновляем чек через API:', receiptId, {
                    paymentIndex,
                    oldPayment: oldPayment,
                    newPayment: updatedPayments[paymentIndex],
                    fullUpdateData: { payments: updatedPayments }
                  });
                  
                  const updateResult = await receiptsApi.update(receiptId, {
                    payments: updatedPayments
                  });
                  
                  console.log('📦 Результат обновления чека:', updateResult);
                  
                  // После успешного обновления чека создаем/обновляем запись в коллекции payments
                  // чтобы при следующей интеграции платеж был найден как существующий
                  try {
                    // Определяем правильный тип согласно enum в модели Payment
                    let paymentType: string;
                    if (newStatus && (payment.type === 'transfer' || payment.type === 'keb')) {
                      paymentType = 'наличные'; // После помещения в кассу КЭБ/перевод становится наличными
                    } else {
                      switch (updatedPayments[paymentIndex].method) {
                        case 'cash':
                          paymentType = 'наличные';
                          break;
                        case 'card':
                        case 'transfer':
                        case 'sber_transfer':
                          paymentType = 'перевод';
                          break;
                        case 'keb':
                          paymentType = 'кэб';
                          break;
                        default:
                          paymentType = 'перевод';
                      }
                    }
                    
                    const paymentRecord = {
                      id: payment.id,
                      type: paymentType, // Используем валидное значение согласно enum
                      paymentMethod: newStatus && (payment.type === 'transfer' || payment.type === 'keb') ? 'cash' : updatedPayments[paymentIndex].method,
                      amount: updatedPayments[paymentIndex].amount,
                      description: payment.description, // Сохраняем ОРИГИНАЛЬНОЕ описание
                      date: receipt.date,
                      inCashRegister: newStatus,
                      cashRegisterDate: updatedPayments[paymentIndex].cashRegisterDate,
                      category: 'Платеж из чека',
                      notes: `Платеж из чека ${receipt.receiptNumber}, метод: ${updatedPayments[paymentIndex].method}`,
                      apiType: 'income' // Платежи из чеков всегда доходы
                    };
                    
                    console.log('💾 Создаем/обновляем запись платежа в коллекции payments:', paymentRecord);
                    
                    // Пытаемся найти существующую запись
                    const existingPaymentInDb = await paymentsApi.getAll()
                      .then(payments => payments.find((p: any) => p.id === payment.id));
                    
                    if (existingPaymentInDb) {
                      console.log('💾 Обновляем существующую запись платежа:', existingPaymentInDb._id);
                      await paymentsApi.update(existingPaymentInDb._id, paymentRecord);
                    } else {
                      console.log('💾 Создаем новую запись платежа');
                      await paymentsApi.create(paymentRecord);
                    }
                    
                    console.log('✅ Запись платежа в коллекции payments создана/обновлена');
                  } catch (paymentError) {
                    console.error('❌ Ошибка при создании записи платежа:', paymentError);
                    // Не критично - чек уже обновлен, просто запись для быстрого поиска не создалась
                  }
                  
                  apiSuccess = true;
                  console.log('✅ Платеж в чеке успешно обновлен через API');
                } else {
                  console.error('❌ Платеж не найден в чеке:', {
                    receiptExists: !!receipt,
                    paymentsIsArray: Array.isArray(receipt?.payments),
                    paymentsLength: receipt?.payments?.length,
                    paymentIndex,
                    requestedPayment: receipt?.payments?.[paymentIndex]
                  });
                  message.error('Платеж не найден в чеке');
                  return;
                }
              } catch (error) {
                console.error('❌ Ошибка при обновлении платежа в чеке:', error);
                message.error('Ошибка при обновлении платежа в чеке');
                return;
              }
            }
          } else {
            // Для обычных платежей - обновляем через API
            const updateData = {
              inCashRegister: newStatus,
              cashRegisterDate: newStatus ? new Date().toISOString() : undefined,
              paymentMethod: newStatus && (payment.type === 'transfer' || payment.type === 'keb') ? 'cash' : payment.paymentMethod,
              description: payment.description
            };

            try {
              if (payment.mongoId) {
                await paymentsApi.update(payment.mongoId, updateData);
              } else {
                await paymentsApi.update(payment.id, updateData);
              }
              
              apiSuccess = true;
              console.log('✅ Обычный платеж успешно обновлен через API');
            } catch (error) {
              console.error('❌ Ошибка при обновлении платежа через API:', error);
              message.error('Ошибка при обновлении платежа');
              return;
            }
          }
          
          // Обновляем локальное состояние ТОЛЬКО если API-вызов успешен
          if (apiSuccess) {
            console.log('🔄 API успешен, обновляем локальное состояние для:', payment.id);
            
            setPayments(prevPayments => {
              console.log('🔄 Предыдущее состояние платежей:', prevPayments.length);
              const updatedPayments = prevPayments.map(p => {
                if (p.id === payment.id) {
                  const updatedPayment = {
                    ...p,
                    inCashRegister: newStatus,
                    cashRegisterDate: newStatus ? new Date().toISOString() : undefined,
                    type: newStatus && (p.type === 'transfer' || p.type === 'keb') ? 'cash' : p.type,
                    // Сохраняем оригинальное описание
                    description: p.description
                  };
                  console.log('🔄 Обновляем платеж:', p.id, 'со старого:', p, 'на новый:', updatedPayment);
                  return updatedPayment;
                }
                return p;
              });
              console.log('🔄 Новое состояние платежей:', updatedPayments.length);
              return updatedPayments;
            });
            
            // Показываем успешное сообщение
            if (newStatus && (payment.type === 'transfer' || payment.type === 'keb')) {
              const typeText = payment.type === 'keb' ? 'КЭБ' : 'Перевод';
              message.success(`${typeText} помещен в кассу и преобразован в наличные`);
            } else {
              message.success(newStatus ? 'Платеж помещен в кассу' : 'Платеж убран из кассы');
            }
            
            // Логируем действие
            logPaymentAction(
              newStatus ? 'Помещение в кассу' : 'Изъятие из кассы',
              `${payment.description} - ${payment.amount.toLocaleString('ru-RU')} ₽${newStatus && (payment.type === 'transfer' || payment.type === 'keb') ? ' (преобразовано в наличные)' : ''}`,
              payment.id
            );
            
            // Отправляем специальное событие, чтобы избежать автоматической перезагрузки
            window.dispatchEvent(new CustomEvent('paymentUpdated', { 
              detail: { 
                type: 'cashRegisterToggle',
                paymentId: payment.id,
                newStatus: newStatus,
                description: payment.description
              } 
            }));
            
            console.log('✅ Локальное состояние обновлено и событие отправлено');
          } else {
            console.error('❌ API неуспешен, локальное состояние НЕ обновляется');
          }

        } catch (error) {
          console.error('Ошибка при обновлении статуса платежа:', error);
          message.error('Ошибка при обновлении статуса платежа');
        } finally {
          setLoadingPayments(false);
        }
      }
    });
  };

  const handleEditPayment = (payment: PaymentItem) => {
    if (!payment.id) {
      message.error('Невозможно редактировать платеж без ID');
          return;
        }
    
    if (payment.id.startsWith('debt_')) {
      message.info('Долги нельзя редактировать. Отметьте оплату долга на странице "Клиенты".');
      return;
    }
    
    if (payment.id.startsWith('receipt_')) {
      message.info('Платежи из чеков можно редактировать только в разделе "Чеки". Здесь доступно только управление кассой.');
      return;
    }
    
    setEditingPayment(payment);
    form.setFieldsValue({
      ...payment,
      date: payment.date.split('T')[0],
      cashRegisterDate: payment.cashRegisterDate ? payment.cashRegisterDate.split('T')[0] : undefined
    });
    setIsModalVisible(true);
  };

  const handleClearAllPayments = async () => {
    if (payments.length === 0) {
      message.info('Нет платежей для удаления');
      return;
    }

    Modal.confirm({
      title: 'Удалить все платежи?',
      content: (
        <div>
          <p>Вы уверены, что хотите удалить <strong>ВСЕ {payments.length} платежей</strong>?</p>
          <p style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
            ⚠️ Это действие нельзя отменить!
          </p>
          <p style={{ fontSize: '12px', color: '#8c8c8c' }}>
            Будут удалены все платежи включая расходы, доходы и платежи из чеков.
            Чеки останутся, но их статус оплаты сбросится.
          </p>
        </div>
      ),
      okText: 'Да, удалить все',
      cancelText: 'Отмена',
      okType: 'danger',
      width: 500,
      onOk: async () => {
        try {
          setLoadingPayments(true);
          console.log('🗑️ Начинаем массовое удаление всех платежей...');
          
          const result = await paymentsApi.clearAll();
          console.log('✅ Результат массового удаления:', result);
          
          // Очищаем локальное состояние
          setPayments([]);
          
          message.success(`Удалено ${result.deletedCount || payments.length} платежей`, 5);
          
          // Логируем действие
          logPaymentAction(
            'Массовое удаление',
            `Удалено всех платежей: ${result.deletedCount || payments.length}`,
            'clear_all'
          );
          
        } catch (error) {
          console.error('❌ Ошибка при массовом удалении:', error);
          message.error('Ошибка при удалении платежей');
        } finally {
          setLoadingPayments(false);
        }
      }
    });
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!paymentId) {
      message.error('Невозможно удалить платеж без ID');
      return;
    }
    
    if (paymentId.startsWith('debt_')) {
      message.error('Нельзя удалить долг. Отметьте оплату долга на странице "Клиенты" или отмените чек.');
      return;
    }

    const payment = payments.find(p => p.id === paymentId);
    
    if (payment && (
      payment.category === 'Оплата долга поставщику' || 
      payment.description?.includes('Оплата долга поставщику') ||
      (payment.apiType === 'expense' && payment.supplier && payment.supplier !== 'Продажа')
    )) {
      message.error('Нельзя удалить оплату долга поставщику. Удалите сам долг на странице "Долги", и оплата удалится автоматически.');
      return;
    }
    
    if (paymentId.startsWith('receipt_')) {
      const match = paymentId.match(/^receipt_(.+)_(\d+)$/);
      if (match) {
        const receiptId = match[1];
        try {
          const receiptsData = await receiptsApi.getAll();
          const receiptExists = receiptsData.some((r: any) => r._id === receiptId || r.id === receiptId);
          
          if (receiptExists) {
            message.error('Нельзя удалить платеж из чека. Отмените чек в разделе "Чеки".');
            return;
          }
        } catch (error) {
          console.error('Ошибка при проверке существования чека:', error);
          message.error('Ошибка при проверке чека');
          return;
        }
      }
    }
    
    try {
      if (payment?.mongoId) {
        await paymentsApi.delete(payment.mongoId);
      } else {
        await paymentsApi.delete(paymentId);
      }

      // Если это инкассация, просто удаляем запись из состояния
      if (payment?.category === 'Инкассация') {
        setPayments(prevPayments => prevPayments.filter(p => p.id !== paymentId));
        message.success('Запись об инкассации удалена');
      } else {
        // Для других типов платежей обновляем все данные
        await refreshPayments();
        message.success('Платеж удален');
      }
    } catch (error) {
      console.error('Ошибка при удалении платежа:', error);
      message.error('Ошибка при удалении платежа');
    }
  };

  const columns: ColumnsType<PaymentItem> = [
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type, record) => {
        const typeText = getTypeText(type, record.description);
        const icon = getTypeIcon(type, record.description);
        const isIncassated = record.status === 'incassated';
        
        return (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            opacity: isIncassated ? 0.5 : 1 
          }}>
            {icon}
            <Tag color={getTypeColor(type, record.description)}>
              {typeText}
            </Tag>
            {isIncassated && (
              <Tag color="purple">Инкассирован</Tag>
            )}
          </div>
        );
      },
    },
    {
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <DollarOutlined />
          Сумма
        </div>
      ),
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      sorter: (a, b) => {
        // Учитываем знак для расходов
        const amountA = a.apiType === 'expense' || a.category === 'Инкассация' ? -Math.abs(a.amount) : Math.abs(a.amount);
        const amountB = b.apiType === 'expense' || b.category === 'Инкассация' ? -Math.abs(b.amount) : Math.abs(b.amount);
        return amountA - amountB;
      },
      sortDirections: ['ascend', 'descend'],
      render: (amount, record) => {
        const isIncassated = record.status === 'incassated';
        
        // ДОЛГ КЛИЕНТА: supplier = 'Долг' AND amount = 0 AND description содержит 'ДОЛГ:'
        const isClientDebt = record.supplier === 'Долг' && 
                            amount === 0 && 
                            record.description?.startsWith('ДОЛГ:');
        
        if (isClientDebt) {
          return (
            <div style={{ 
              fontWeight: '600', 
              color: '#ff4d4f', 
              fontSize: '16px' 
            }}>
              ДОЛГ
            </div>
          );
        }
        
        // ДОЛГ ПОСТАВЩИКУ: показываем как обычный расход (отрицательная сумма)
        const isSupplierDebt = record.description?.includes('Долг по приходу от') ||
                              record.category === 'Оплата долга поставщику' ||
                              record.description?.includes('Оплата долга поставщику');
        
        const isExpense = record.apiType === 'expense' || 
                         isSupplierDebt ||
                         record.category === 'Инкассация';
        
        const displayAmount = isExpense ? -Math.abs(amount) : Math.abs(amount);
        const isNegative = displayAmount < 0;

        return (
          <div style={{ 
            fontWeight: '600', 
            color: isNegative ? '#ff4d4f' : '#52c41a', 
            fontSize: '16px',
            opacity: isIncassated ? 0.5 : 1
          }}>
            {isNegative ? '-' : ''}{Math.abs(displayAmount).toLocaleString('ru-RU')} ₽
          </div>
        );
      },
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      render: (description, record) => {
        const isIncassated = record.status === 'incassated';
        return (
          <div style={{ opacity: isIncassated ? 0.5 : 1 }}>
            <div style={{ fontWeight: '500' }}>{description}</div>
            {record.supplier && (
              <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                Поставщик: {record.supplier}
              </div>
            )}
            {isIncassated && record.incassationDate && (
              <div style={{ fontSize: '12px', color: '#722ed1' }}>
                Инкассирован: {new Date(record.incassationDate).toLocaleDateString('ru-RU')}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <CalendarOutlined />
          Дата
        </div>
      ),
      dataIndex: 'date',
      key: 'date',
      width: 120,
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      sortDirections: ['ascend', 'descend'],
      defaultSortOrder: 'descend',
      render: (date, record) => {
        const dateObj = new Date(date);
        
        // Проверяем, если дата только в формате даты (без времени), показываем только дату
        const isDateOnly = date && typeof date === 'string' && !date.includes('T') && !date.includes(' ');
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CalendarOutlined style={{ color: '#8c8c8c' }} />
            <div>
              <div>{dateObj.toLocaleDateString('ru-RU')}</div>
              {!isDateOnly && (
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  {dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              {isDateOnly && (
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  без времени
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <WalletOutlined />
          В кассе
        </div>
      ),
      dataIndex: 'inCashRegister',
      key: 'inCashRegister',
      width: 140,
      sorter: (a, b) => {
        // Сначала инкассация (всегда внизу), потом в кассе, потом не в кассе
        if (a.category === 'Инкассация' && b.category !== 'Инкассация') return 1;
        if (b.category === 'Инкассация' && a.category !== 'Инкассация') return -1;
        if (a.category === 'Инкассация' && b.category === 'Инкассация') return 0;
        
        return (a.inCashRegister ? 1 : 0) - (b.inCashRegister ? 1 : 0);
      },
      sortDirections: ['ascend', 'descend'],
      render: (inCashRegister, record) => {
        // Для записей об инкассации показываем прочерк
        if (record.category === 'Инкассация') {
          return <span>-</span>;
        }

        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {inCashRegister ? (
                <>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <Tag color="green">В кассе</Tag>
                </>
              ) : (
                <>
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                  <Tag color="red">Не в кассе</Tag>
                </>
              )}
            </div>
          </div>
        );
      }
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_, record) => {
        const isDebt = record.id && record.id.startsWith('debt_');
        const isReceipt = record.id && record.id.startsWith('receipt_');
        const isIncassation = record.category === 'Инкассация';
        
        return (
          <Space size="small">
            {/* Для долгов показываем индикатор */}
            {isDebt && (
              <Tooltip title="Долг - оплата на странице Клиенты">
                <Tag color="red" icon={<CloseCircleOutlined />}>Долг</Tag>
              </Tooltip>
            )}
            
            {/* Логика показа кнопок кассы */}
            {(() => {
              // Долги - только индикатор
              if (isDebt) return null;
              
              // Инкассация - прочерк
              if (isIncassation) return <span>-</span>;
              
              // Наличные в кассе - прочерк (нельзя убрать)
              if (record.type === 'cash' && record.inCashRegister) {
                return <span>-</span>;
              }
              
              // Для всех остальных (наличные не в кассе, переводы, КЭБ) - кнопка
              return (
                <Tooltip title={record.inCashRegister ? "Убрать из кассы" : "Положить в кассу"}>
                  <Button
                    type={record.inCashRegister ? "default" : "primary"}
                    size="small"
                    icon={record.inCashRegister ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
                    onClick={() => {
                      console.log('🎯 Нажата кнопка кассы для платежа:', record.id, record.type, record.inCashRegister);
                      handleToggleCashRegister(record);
                    }}
                    style={{ padding: '0 4px' }}
                  />
                </Tooltip>
              );
            })()}

            {/* Кнопки редактирования и удаления для админов и бухгалтеров */}
            {canEditPayments && !isDebt && !isReceipt && (
              <>
                <Tooltip title="Редактировать">
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    size="small"
                    onClick={() => handleEditPayment(record)}
                    style={{ padding: '0 4px' }}
                  />
                </Tooltip>
                <Popconfirm
                  title="Удалить платеж?"
                  description="Это действие нельзя отменить"
                  onConfirm={() => handleDeletePayment(record.id)}
                  okText="Да"
                  cancelText="Нет"
                >
                  <Tooltip title="Удалить">
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      size="small"
                      danger
                      style={{ padding: '0 4px' }}
                    />
                  </Tooltip>
                </Popconfirm>
              </>
            )}

            {/* Индикатор для платежей из чеков */}
            {isReceipt && (
              <Tooltip title="Платеж из чека - редактируется в разделе Чеки">
                <Tag color="blue" style={{ fontSize: '11px' }}>Чек</Tag>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  const filteredPayments = payments
    .filter(payment => {
      const matchesSearch = payment.description.toLowerCase().includes(searchText.toLowerCase()) ||
                           payment.supplier?.toLowerCase().includes(searchText.toLowerCase()) ||
                           payment.orderId?.includes(searchText) ||
                           false;
      const matchesType = typeFilter === 'all' || payment.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'in_cash' && (payment.inCashRegister || payment.category === 'Инкассация')) ||
                           (statusFilter === 'not_in_cash' && !payment.inCashRegister && payment.category !== 'Инкассация');
      
      // Исправленный фильтр по инкассации
      let matchesIncassation = true;
      if (incassationFilter === 'active') {
        matchesIncassation = payment.status !== 'incassated' && payment.category !== 'Инкассация';
      } else if (incassationFilter === 'incassated') {
        matchesIncassation = payment.status === 'incassated' || payment.category === 'Инкассация';
      }
      
      // Фильтр по дате
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const paymentDate = new Date(payment.date);
        const today = new Date();
        
        switch (dateFilter) {
          case 'today':
            matchesDate = paymentDate.toDateString() === today.toDateString();
            break;
          case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            matchesDate = paymentDate.toDateString() === yesterday.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            matchesDate = paymentDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            matchesDate = paymentDate >= monthAgo;
            break;
        }
      }
      
      return matchesSearch && matchesType && matchesStatus && matchesIncassation && matchesDate;
    });

  // Функция фильтрации платежей по выбранному месяцу
  const getMonthPayments = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    
    return payments.filter(payment => {
      const paymentDate = new Date(payment.date);
      return paymentDate.getFullYear() === year && paymentDate.getMonth() === month - 1;
    });
  };

  // Расчет статистики за выбранный месяц
  const currentMonthPayments = getMonthPayments();
  // "Общая сумма за месяц" - показывает все поступления (доходы) за месяц, исключая расходы, инкассацию и возвраты приходов
  const totalAmount = currentMonthPayments
    .filter(p => 
      p.amount > 0 && 
      p.category !== 'Инкассация' && 
      p.apiType !== 'expense' &&
      !p.description?.includes('Возврат в кассу после удаления прихода')
    )
    .reduce((sum, p) => sum + p.amount, 0);
  // "Наличные за месяц" - показывает только поступления наличных (исключаем инкассацию, расходы и возвраты приходов)
  const cashAmount = currentMonthPayments
    .filter(p => 
      p.type === 'cash' && 
      p.amount > 0 && 
      p.category !== 'Инкассация' &&
      !p.description?.includes('Возврат в кассу после удаления прихода')
    )
    .reduce((sum, p) => sum + p.amount, 0);
  const transferAmount = currentMonthPayments
    .filter(p => 
      p.type === 'transfer' && 
      !p.description?.includes('Возврат в кассу после удаления прихода')
    )
    .reduce((sum, p) => sum + p.amount, 0);
  const kebAmount = currentMonthPayments
    .filter(p => 
      p.type === 'keb' && 
      !p.description?.includes('Возврат в кассу после удаления прихода')
    )
    .reduce((sum, p) => sum + p.amount, 0);
  // "Инкассировано за месяц" - показывает сумму всех инкассаций за месяц (берем абсолютное значение)
  const incassatedAmount = currentMonthPayments
    .filter(p => p.category === 'Инкассация')
    .reduce((sum, p) => sum + Math.abs(p.amount), 0);
  // "Не в кассе за месяц" - показывает только КЭБ и переводы за месяц (исключаем инкассацию и возвраты приходов)
  const notInCashRegisterAmount = currentMonthPayments
    .filter(p => 
      (p.type === 'transfer' || p.type === 'keb') && 
      p.category !== 'Инкассация' &&
      !p.description?.includes('Возврат в кассу после удаления прихода')
    )
    .reduce((sum, p) => sum + p.amount, 0);
  
  // Расчет наличных в кассе с использованием утилиты
  const cashInRegisterAmount = calculateCashInRegister(payments);
  
  // Логируем детали расчета кассы
  useEffect(() => {
    const expensesInPayments = payments.filter(p => p.apiType === 'expense');
    const refundPayments = payments.filter(p => p.description?.includes('Возврат в кассу после удаления прихода'));
    console.log('💰 Расчет кассы:', {
      totalPayments: payments.length,
      expensesCount: expensesInPayments.length,
      refundsCount: refundPayments.length,
      cashInRegister: cashInRegisterAmount,
      expensesTotal: expensesInPayments.reduce((sum, p) => sum + p.amount, 0),
      refundsTotal: refundPayments.reduce((sum, p) => sum + p.amount, 0)
    });
  }, [payments, cashInRegisterAmount]);
  
  // Сохраняем сумму наличных для использования на других страницах
  useEffect(() => {
    // Сохраняем в глобальной переменной для быстрого доступа
    (window as any).cashInRegisterAmount = cashInRegisterAmount;
  }, [cashInRegisterAmount]);

  return (
    <div>
      {/* Информационное сообщение */}
      <Card style={{ marginBottom: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%)', border: '1px solid #91d5ff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <DollarOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '16px', fontWeight: '500', color: '#1890ff' }}>
              Расчеты и платежи
            </div>
            <div style={{ fontSize: '14px', color: '#595959', marginTop: '4px' }}>
              Здесь отображаются все платежи: автоматически из созданных чеков и добавленные вручную. 
              Вы можете отмечать, какие суммы поступили в кассу.
            </div>
          </div>
        </div>
      </Card>

      {/* Заголовок статистики с селектором месяца */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#595959', fontSize: '16px', fontWeight: '500' }}>
            📊 Статистика за {new Date(selectedMonth + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
          </h3>
          <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
            Всего операций за месяц: {currentMonthPayments.length}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: '#595959' }}>Месяц:</span>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ width: '150px' }}
          />
        </div>
      </div>

      {/* Статистика */}
      <Spin spinning={loadingPayments}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <Card style={{ flex: 1, borderRadius: '8px', background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)', border: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
              {totalAmount.toLocaleString('ru-RU')} ₽
            </div>
            <div style={{ color: '#595959', fontWeight: '500', fontSize: '12px' }}>Общая сумма за месяц</div>
          </div>
        </Card>
        <Card style={{ flex: 1, borderRadius: '8px', background: 'linear-gradient(135deg, #fff2e8 0%, #ffd8bf 100%)', border: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fa541c' }}>
              {incassatedAmount.toLocaleString('ru-RU')} ₽
            </div>
            <div style={{ color: '#595959', fontWeight: '500', fontSize: '12px' }}>Инкассировано за месяц</div>
          </div>
        </Card>
        <Card style={{ flex: 1, borderRadius: '8px', background: 'linear-gradient(135deg, #fff2e8 0%, #ffd8bf 100%)', border: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fa541c' }}>
              {notInCashRegisterAmount.toLocaleString('ru-RU')} ₽
            </div>
            <div style={{ color: '#595959', fontWeight: '500', fontSize: '12px' }}>Не в кассе за месяц</div>
          </div>
        </Card>
        <Card style={{ flex: 1, borderRadius: '8px', background: 'linear-gradient(135deg, #f9f0ff 0%, #d3adf7 100%)', border: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#722ed1' }}>
              {currentMonthPayments.length}
            </div>
            <div style={{ color: '#595959', fontWeight: '500', fontSize: '12px' }}>Платежей за месяц</div>
          </div>
        </Card>
          {/* Наличные в кассе сейчас */}
        <Card style={{ flex: 1, borderRadius: '8px', background: 'linear-gradient(135deg, #fff7e6 0%, #ffd591 100%)', border: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              color: cashInRegisterAmount < 0 ? '#ff4d4f' : '#fa8c16' 
            }}>
              {cashInRegisterAmount.toLocaleString('ru-RU')} ₽
            </div>
            <div style={{ color: '#595959', fontWeight: '500', fontSize: '12px' }}>Наличные в кассе сейчас</div>
          </div>
        </Card>
      </div>

      {/* Дополнительная статистика по типам */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <Card style={{ flex: 1, borderRadius: '8px', background: 'linear-gradient(135deg, #f0f9ff 0%, #c7f0db 100%)', border: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
              <WalletOutlined style={{ color: cashAmount < 0 ? '#ff4d4f' : '#52c41a', fontSize: '16px' }} />
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#595959' }}>Наличные за месяц</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: cashAmount < 0 ? '#ff4d4f' : '#52c41a' }}>
              {cashAmount.toLocaleString('ru-RU')} ₽
            </div>
          </div>
        </Card>
        <Card style={{ flex: 1, borderRadius: '8px', background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)', border: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
              <BankOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#595959' }}>Переводов не в кассе</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
              {payments.filter(p => p.type === 'transfer' && !p.inCashRegister).length}
            </div>
            <div style={{ fontSize: '10px', color: '#8c8c8c', marginTop: '2px' }}>
              операций
            </div>
          </div>
        </Card>
        <Card style={{ flex: 1, borderRadius: '8px', background: 'linear-gradient(135deg, #f9f0ff 0%, #d3adf7 100%)', border: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
              <DollarOutlined style={{ color: '#722ed1', fontSize: '16px' }} />
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#595959' }}>КЭБ не в кассе</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#722ed1' }}>
              {payments.filter(p => p.type === 'keb' && !p.inCashRegister).length}
            </div>
            <div style={{ fontSize: '10px', color: '#8c8c8c', marginTop: '2px' }}>
              операций
            </div>
          </div>
        </Card>
      </div>
      </Spin>

      {/* Фильтры и поиск */}
      <Card style={{ marginBottom: '24px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Search
            placeholder="Поиск по описанию, поставщику, заказу"
            style={{ width: 350 }}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          <div style={{ 
            padding: '6px 12px', 
            background: '#f0f9ff', 
            borderRadius: '6px', 
            border: '1px solid #bae7ff',
            fontSize: '12px',
            color: '#1890ff',
            fontWeight: '500'
          }}>
            Найдено: {filteredPayments.length} из {payments.length}
          </div>
          <div style={{ 
            padding: '4px 8px', 
            background: '#f6ffed', 
            borderRadius: '4px', 
            border: '1px solid #b7eb8f',
            fontSize: '11px',
            color: '#389e0d',
            fontWeight: '400'
          }}>
            💡 Нажмите на заголовки колонок для сортировки
          </div>
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ minWidth: 130 }}
          >
            <Option value="all">Все типы</Option>
            <Option value="cash">Наличные</Option>
            <Option value="transfer">Переводы</Option>
            <Option value="keb">КЭБ</Option>
          </Select>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ minWidth: 150 }}
          >
            <Option value="all">Все статусы</Option>
            <Option value="in_cash">В кассе</Option>
            <Option value="not_in_cash">Не в кассе</Option>
          </Select>
          <Select
            value={incassationFilter}
            onChange={setIncassationFilter}
            style={{ minWidth: 150 }}
          >
            <Option value="all">Все платежи</Option>
            <Option value="active">Активные</Option>
            <Option value="incassated">Инкассированные</Option>
          </Select>
          <Select
            value={dateFilter}
            onChange={setDateFilter}
            style={{ minWidth: 130 }}
            placeholder={
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarOutlined />
                Все даты
              </div>
            }
          >
            <Option value="all">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarOutlined />
                Все даты
              </div>
            </Option>
            <Option value="today">Сегодня</Option>
            <Option value="yesterday">Вчера</Option>
            <Option value="week">За неделю</Option>
            <Option value="month">За месяц</Option>
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setSearchText('');
              setTypeFilter('all');
              setStatusFilter('all');
              setIncassationFilter('all');
              setDateFilter('all');
              setSortField('date');
              setSortOrder('descend');
            }}
            title="Сбросить все фильтры и сортировку"
            style={{ borderRadius: '8px' }}
          >
            Сбросить
          </Button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            {canEditPayments && (
              <>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingPayment(null);
                    form.resetFields();
                    form.setFieldsValue({
                      date: dayjs().format('YYYY-MM-DD'),
                      inCashRegister: true,
                      cashRegisterDate: dayjs().format('YYYY-MM-DD')
                    });
                    setIsModalVisible(true);
                  }}
                  size="middle"
                  style={{ borderRadius: '8px' }}
                >
                  Добавить платеж
                </Button>
                
                {hasFullAccess() && (
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleClearAllPayments}
                    size="middle"
                    style={{ borderRadius: '8px' }}
                    disabled={payments.length === 0}
                  >
                    Очистить все ({payments.length})
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Кнопка инкассации */}
      {payments.some(p => p.type === 'cash' && p.inCashRegister) && (
        <Card style={{ marginBottom: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #fff2e8 0%, #ffd8bf 100%)', border: '1px solid #ffbb96' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <WalletOutlined style={{ fontSize: '20px', color: '#fa541c' }} />
              <div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: cashInRegisterAmount < 0 ? '#ff4d4f' : '#fa541c' }}>
                  Наличные в кассе: {cashInRegisterAmount.toLocaleString('ru-RU')} ₽
                    </div>
                <div style={{ fontSize: '14px', color: '#595959', marginTop: '2px' }}>
                  Операций: {payments.filter(p => p.type === 'cash' && p.inCashRegister).length}
                </div>
              </div>
            </div>
            {canEditPayments && (
            <Button
              danger
              type="primary"
              icon={<DollarOutlined />}
              onClick={handleIncassation}
                size="middle"
              style={{ borderRadius: '8px' }}
            >
              Инкассировать наличные
            </Button>
            )}
          </div>
        </Card>
      )}

      {/* Таблица платежей */}
      <Card style={{ borderRadius: '12px' }}>
        <Table
          columns={columns}
          dataSource={filteredPayments}
          rowKey="id"
          loading={loadingPayments}
          onChange={(pagination, filters, sorter) => {
            if (sorter && !Array.isArray(sorter)) {
              setSortField(sorter.field as string || 'date');
              setSortOrder(sorter.order || 'descend');
            }
          }}
          pagination={{
            pageSize: pageSize,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Всего ${total} платежей`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onShowSizeChange: (current, size) => {
              setPageSize(size);
            },
          }}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: loadingPayments ? 'Загрузка...' : (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <DollarOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                <div style={{ color: '#8c8c8c', fontSize: '16px' }}>Платежи не найдены</div>
                <div style={{ color: '#bfbfbf', fontSize: '14px', marginTop: '8px' }}>
                  Добавьте первый платеж или обновите данные
                </div>
              </div>
            )
          }}
        />
      </Card>

      {/* Модальное окно создания/редактирования */}
      <Modal
        title={editingPayment ? "Редактировать платеж" : "Добавить платеж"}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        width={600}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="type"
              label="Тип платежа"
              rules={[{ required: true, message: 'Выберите тип платежа' }]}
              style={{ flex: 1 }}
            >
              <Select placeholder="Выберите тип">
                <Option value="cash">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <WalletOutlined />
                    Наличные
                  </div>
                </Option>
                <Option value="transfer">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BankOutlined />
                    Перевод
                  </div>
                </Option>
                <Option value="keb">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DollarOutlined />
                    КЭБ
                  </div>
                </Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="amount"
              label="Сумма"
              rules={[{ required: true, message: 'Введите сумму' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="10000"
                min={0}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                addonAfter="₽"
              />
            </Form.Item>
          </div>

          <Form.Item
            name="description"
            label="Описание"
            rules={[{ required: true, message: 'Введите описание платежа' }]}
          >
            <Input placeholder="Описание платежа" />
          </Form.Item>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="supplier"
              label="Поставщик"
              style={{ flex: 1 }}
            >
              <Input placeholder="Название поставщика (необязательно)" />
            </Form.Item>

            <Form.Item
              name="orderId"
              label="ID заказа"
              style={{ flex: 1 }}
            >
              <Input placeholder="Номер заказа (необязательно)" />
            </Form.Item>
          </div>

          <Form.Item
            name="date"
            label="Дата платежа"
            rules={[{ required: true, message: 'Выберите дату' }]}
          >
            <Input type="date" />
          </Form.Item>

          <Form.Item
            name="inCashRegister"
            label="В кассе"
            valuePropName="checked"
          >
            <Switch 
              checkedChildren="В кассе" 
              unCheckedChildren="Не в кассе"
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.inCashRegister !== currentValues.inCashRegister}
          >
            {({ getFieldValue }) =>
              getFieldValue('inCashRegister') ? (
                <Form.Item
                  name="cashRegisterDate"
                  label="Дата поступления в кассу"
                >
                  <Input type="date" />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item
            name="notes"
            label="Примечания"
          >
            <Input.TextArea rows={3} placeholder="Дополнительная информация" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно инкассации */}
      <Modal
        title="Инкассация наличных"
        open={incassationModalVisible}
        onOk={handleIncassation}
        onCancel={() => {
          setIncassationModalVisible(false);
          incassationForm.resetFields();
        }}
        width={500}
        okText="Продолжить"
        cancelText="Отмена"
      >
        <Form form={incassationForm} layout="vertical">
                      <div style={{ marginBottom: '16px', padding: '12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <WalletOutlined style={{ color: '#52c41a' }} />
                <span style={{ fontWeight: '500' }}>Наличные в кассе</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
                {totalAmount.toLocaleString('ru-RU')} ₽
              </div>
              <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                Доступно для инкассации
              </div>
            </div>

          <Form.Item
            name="type"
            label="Тип инкассации"
          >
            <Select
              onChange={(value) => {
                setIncassationType(value);
                if (value === 'all') {
                  const totalAmount = payments.filter(p => p.type === 'cash' && p.inCashRegister).reduce((sum, p) => sum + p.amount, 0);
                  incassationForm.setFieldValue('amount', totalAmount);
                }
              }}
            >
              <Option value="all">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  Инкассировать все наличные
                </div>
              </Option>
              <Option value="partial">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <EditOutlined style={{ color: '#1890ff' }} />
                  Указать сумму инкассации
                </div>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="amount"
            label="Сумма инкассации"
            rules={[
              { required: true, message: 'Введите сумму инкассации' },
              { 
                type: 'number', 
                min: 1, 
                message: 'Сумма должна быть больше 0' 
              },
              {
                validator: (_, value) => {
                  if (value > totalAmount) {
                    return Promise.reject(new Error(`Сумма не может превышать ${totalAmount.toLocaleString('ru-RU')} ₽`));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
                          <InputNumber
                style={{ width: '100%' }}
                placeholder="Введите сумму"
                min={0}
                max={totalAmount}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => Number(value!.replace(/\$\s?|(,*)/g, ''))}
                addonAfter="₽"
                disabled={incassationType === 'all'}
              />
          </Form.Item>

          {incassationType === 'partial' && (
            <div style={{ padding: '8px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: '6px', fontSize: '12px', color: '#d46b08' }}>
              💡 При частичной инкассации будут выбраны платежи начиная с самых старых
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
};

// Компонент для вкладки расходов
const ExpensesTab: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);

  // Состояние для пагинации
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('expenses_page_size');
    return saved ? parseInt(saved, 10) : 10;
  });

  // Загружаем расходы из API
  const loadExpenses = async () => {
    try {
      console.log('💸 Загружаем расходы из API...');
      setLoading(true);
      const data = await paymentsApi.getAll();
      console.log('💸 Получены данные из API:', data?.length || 0, 'записей');
      
      // Фильтруем только расходы (ищем по apiType)
      const expensePayments = data.filter((p: any) => p.apiType === 'expense' && p.category !== 'Оплата долга поставщику');
      console.log('💸 Отфильтровано расходов:', expensePayments.length);
      
      const mappedExpenses = expensePayments.map((p: any) => ({
        id: p._id || p.id,
        amount: Math.abs(p.amount || 0), // Приводим к положительному числу для отображения
        description: p.description,
        date: p.date,
        category: p.category,
        adminName: p.adminName || 'Администратор' // Имя администратора из API
      }));
      
      console.log('💸 Маппированные расходы:', mappedExpenses);
      setExpenses(mappedExpenses);
      console.log('💸 Состояние расходов обновлено');
    } catch (error) {
      console.error('Ошибка при загрузке расходов:', error);
      message.error('Ошибка при загрузке расходов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  // Сохраняем размер страницы в localStorage
  useEffect(() => {
    localStorage.setItem('expenses_page_size', pageSize.toString());
  }, [pageSize]);

  // Слушаем события обновления платежей
  useEffect(() => {
    const handlePaymentUpdated = (e: CustomEvent) => {
      console.log('💸 ExpensesTab получил событие paymentUpdated:', e.detail);
      
      // Если это событие о создании расхода - обновляем список
      if (e.detail?.type === 'expense') {
        console.log('💸 Обновляем список расходов после создания нового');
        loadExpenses();
      }
    };

    window.addEventListener('paymentUpdated', handlePaymentUpdated as EventListener);
    return () => {
      window.removeEventListener('paymentUpdated', handlePaymentUpdated as EventListener);
    };
  }, []);

  const handleCreateExpense = () => {
    form.resetFields();
    form.setFieldsValue({
      date: dayjs().format('YYYY-MM-DD')
    });
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      console.log('💸 Начинаем создание расхода...');
      const values = await form.validateFields();
      console.log('💸 Валидация формы прошла успешно:', values);
      
      const adminName = localStorage.getItem('admin_name') || 'Администратор';
      console.log('💸 Имя администратора:', adminName);
      
      // Мапинг категорий для читабельности
      const categoryMap: Record<string, string> = {
        'office': 'Офисные расходы',
        'equipment': 'Оборудование',
        'transport': 'Транспорт',
        'marketing': 'Маркетинг',
        'utilities': 'Коммунальные услуги',
        'salary': 'Зарплата',
        'other': 'Прочее'
      };
      
      // Создаем запись в базе данных через API
      const paymentData = {
        type: 'наличные', // Расходы всегда списываются с наличных (русское название для enum)
        apiType: 'expense', // Указываем что это расход
        category: categoryMap[values.category] || values.category,
        amount: Math.abs(values.amount), // Сумма должна быть положительной, минус добавится через apiType
        date: values.date + 'T' + new Date().toISOString().split('T')[1], // Берем дату из формы + текущее время
        description: values.description,
        paymentMethod: 'наличные', // Расходы всегда списываются с наличных
        inCashRegister: true, // Наличные расходы влияют на кассу
        adminName: adminName, // Имя администратора, создавшего расход
        notes: values.notes || `Расход добавлен администратором ${adminName}`
      };
      
      try {
        // Создаем запись через API
        console.log('📡 Отправляем данные расхода в API:', paymentData);
        const createdPayment = await paymentsApi.create(paymentData);
        console.log('✅ Запись о расходе создана в БД:', createdPayment);
        
        // Логируем действие
        logPaymentAction(
          'Создание расхода',
          `Расход "${values.description}" на сумму ${values.amount.toLocaleString('ru-RU')} ₽ (${categoryMap[values.category] || values.category})`,
          createdPayment._id || createdPayment.id
        );
        
        // Обновляем данные из API
        await loadExpenses();
        
        // Отправляем событие только для обновления ExpensesTab
        console.log('📤 Отправляем событие paymentUpdated для расхода (только для ExpensesTab)');
        window.dispatchEvent(new CustomEvent('paymentUpdated', { 
          detail: { 
            type: 'expense',
            amount: values.amount,
            category: values.category,
            description: values.description,
            expenseOnly: true // Флаг что это только для расходов
          } 
        }));
        
        // Отправляем специальное событие для локального добавления расхода в основную вкладку
        console.log('📤 Отправляем событие expenseCreated для локального добавления');
        window.dispatchEvent(new CustomEvent('expenseCreated', { 
          detail: { 
            payment: {
              id: createdPayment.id || createdPayment._id,
              mongoId: createdPayment._id,
              type: 'cash' as const,
              amount: -Math.abs(values.amount), // ✅ Расходы должны быть отрицательными для расчета кассы
              description: values.description,
              date: paymentData.date,
              supplier: categoryMap[values.category] || values.category,
              orderId: undefined,
              inCashRegister: true, // Наличные расходы влияют на кассу  
              cashRegisterDate: paymentData.date,
              notes: values.notes,
              createdAt: new Date().toISOString(),
              category: categoryMap[values.category] || values.category,
              paymentMethod: 'наличные',
              apiType: 'expense' as const,
              status: 'active' as const,
              incassationDate: undefined,
              adminName: adminName
            }
          } 
        }));
        
        message.success(`Расход добавлен. Из наличных кассы списано ${values.amount.toLocaleString('ru-RU')} ₽`, 5);
        
      } catch (apiError) {
        console.error('❌ Ошибка при создании записи в БД:', apiError);
        console.error('❌ Детали ошибки:', {
          message: apiError instanceof Error ? apiError.message : 'Unknown error',
          status: (apiError as any)?.response?.status,
          data: (apiError as any)?.response?.data,
          stack: apiError instanceof Error ? apiError.stack : 'No stack trace'
        });
        
        // Показываем ошибку пользователю
        message.error('Ошибка при добавлении расхода. Проверьте подключение к серверу.');
        console.error('❌ Не удалось добавить расход через API:', apiError);
        return;
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const columns: ColumnsType<ExpenseItem> = [
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount) => (
        <div style={{ fontWeight: '600', color: '#ff4d4f', fontSize: '16px' }}>
          -{Math.abs(amount).toLocaleString('ru-RU')} ₽
        </div>
      ),
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      render: (description, record) => (
        <div>
          <div style={{ fontWeight: '500' }}>{description}</div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
            Категория: {record.category}
          </div>
        </div>
      ),
    },
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date) => {
        const dateObj = new Date(date);
        const isDateOnly = date && typeof date === 'string' && !date.includes('T') && !date.includes(' ');
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CalendarOutlined style={{ color: '#8c8c8c' }} />
            <div>
              <div>{dateObj.toLocaleDateString('ru-RU')}</div>
              {!isDateOnly && (
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  {dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              {isDateOnly && (
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  без времени
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Администратор',
      dataIndex: 'adminName',
      key: 'adminName',
      width: 120,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Popconfirm
          title="Удалить расход?"
          description="Это действие нельзя отменить"
          onConfirm={async () => {
            try {
              console.log('💸 Удаляем расход:', record.id, record.description);
              await paymentsApi.delete(record.id);
              console.log('💸 Расход удален из базы данных');
              
              // Логируем действие удаления
              logPaymentAction(
                'Удаление расхода',
                `Удален расход "${record.description}" на сумму ${Math.abs(record.amount).toLocaleString('ru-RU')} ₽`,
                record.id
              );
              
              // Обновляем ExpensesTab
              await loadExpenses();
              
              // Отправляем событие для локального удаления из основной вкладки
              console.log('📤 Отправляем событие expenseDeleted для локального удаления');
              window.dispatchEvent(new CustomEvent('expenseDeleted', { 
                detail: { 
                  expenseId: record.id,
                  amount: record.amount,
                  description: record.description
                } 
              }));
              
              message.success('Расход удален');
            } catch (error) {
              console.error('Ошибка при удалении расхода:', error);
              message.error('Ошибка при удалении расхода');
            }
          }}
          okText="Да"
          cancelText="Нет"
        >
          <Button
            type="text"
            icon={<DeleteOutlined />}
            size="small"
            danger
          />
        </Popconfirm>
      ),
    },
  ];

  const filteredExpenses = expenses.filter(expense =>
    expense.description.toLowerCase().includes(searchText.toLowerCase()) ||
    expense.category.toLowerCase().includes(searchText.toLowerCase()) ||
    expense.adminName.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div>
      {/* Статистика расходов */}
      <Card style={{ marginBottom: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #fff2f0 0%, #ffccc7 100%)', border: '1px solid #ffaaa5' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <MinusCircleOutlined style={{ fontSize: '20px', color: '#ff4d4f' }} />
          <div>
            <div style={{ fontSize: '16px', fontWeight: '500', color: '#ff4d4f' }}>
              Расходы
            </div>
            <div style={{ fontSize: '14px', color: '#595959', marginTop: '4px' }}>
              Управление расходами компании с автоматическим списанием из кассы
            </div>
          </div>
        </div>
      </Card>

      {/* Фильтры и поиск */}
      <Card style={{ marginBottom: '24px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Search
            placeholder="Поиск по описанию, категории, администратору"
            style={{ width: 350 }}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          <div style={{ marginLeft: 'auto' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateExpense}
              style={{ borderRadius: '8px' }}
            >
              Добавить расход
            </Button>
          </div>
        </div>
      </Card>

      {/* Таблица расходов */}
      <Card style={{ borderRadius: '12px' }}>
        <Table
          columns={columns}
          dataSource={filteredExpenses}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: pageSize,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Всего ${total} расходов`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onShowSizeChange: (current, size) => {
              setPageSize(size);
            },
          }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Модальное окно создания расхода */}
      <Modal
        title="Добавить расход"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        width={600}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Сумма расхода"
                rules={[{ required: true, message: 'Введите сумму' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="10000"
                  min={0}
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  addonAfter="₽"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="Категория расхода"
                rules={[{ required: true, message: 'Выберите категорию' }]}
              >
                <Select placeholder="Выберите категорию">
                  <Option value="office">Офисные расходы</Option>
                  <Option value="equipment">Оборудование</Option>
                  <Option value="transport">Транспорт</Option>
                  <Option value="marketing">Маркетинг</Option>
                  <Option value="utilities">Коммунальные услуги</Option>
                  <Option value="salary">Зарплата</Option>
                  <Option value="other">Прочее</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Описание расхода"
            rules={[{ required: true, message: 'Введите описание' }]}
          >
            <Input placeholder="На что потрачены средства" />
          </Form.Item>

          <Form.Item
            name="date"
            label="Дата расхода"
            rules={[{ required: true, message: 'Выберите дату' }]}
          >
            <Input type="date" />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Примечания"
          >
            <Input.TextArea rows={3} placeholder="Дополнительная информация" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// Компонент для вкладки покупок
const PurchasesTab: React.FC<{
  refreshPayments: (showMessage?: boolean) => Promise<void>;
}> = ({ refreshPayments }) => {
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { hasFullAccess } = useAuth();
  
  // Дополнительные состояния для расширенной функциональности
  const [selectedCategory, setSelectedCategory] = useState('');
  const [serialNumbers, setSerialNumbers] = useState<string[]>(['']);
  const [barcodes, setBarcodes] = useState<string[]>(['']);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);

  // Состояние для пагинации
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('purchases_page_size');
    return saved ? parseInt(saved, 10) : 10;
  });

  // Загружаем данные из API
  const loadPurchases = async () => {
    try {
      setLoading(true);
      // Загружаем покупки из localStorage
      const savedPurchases = localStorage.getItem('admin_purchases');
      if (savedPurchases) {
        try {
          const parsedPurchases = JSON.parse(savedPurchases);
          const purchasesArray = Array.isArray(parsedPurchases) ? parsedPurchases : [];
          console.log('💾 PurchasesTab: Загружены покупки из localStorage:', purchasesArray.map(p => ({ 
            id: p.id, 
            productName: p.productName, 
            arrivalId: p.arrivalId 
          })));
          setPurchases(purchasesArray);
        } catch (e) {
          console.error('Ошибка парсинга покупок из localStorage:', e);
          setPurchases([]);
        }
      } else {
        setPurchases([]);
      }
    } catch (error) {
      console.error('Ошибка при загрузке закупок:', error);
      message.error('Ошибка при загрузке закупок');
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchases();
    fetchSuppliers();
    
    // Инициализируем SSE для получения событий удаления приходов
    console.log('🔌 PurchasesTab: Инициализируем SSE подключение для событий приходов');
    initializeProductEvents();
    
    return () => {
      console.log('🔌 PurchasesTab: Закрываем SSE подключение');
      closeProductEvents();
    };
  }, []);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Слушаем события удаления прихода
  useEffect(() => {
    const handleArrivalDeleted = (e: CustomEvent) => {
      console.log('🔔 PurchasesTab: Получено событие arrivalDeleted:', e.detail);
      
      const deletedArrivalId = e.detail?.arrivalId;
      if (deletedArrivalId) {
        console.log('🗑️ Приход удален, ищем связанную покупку с arrivalId:', deletedArrivalId);
        console.log('🔍 Текущие покупки:', purchases.map(p => ({ id: p.id, productName: p.productName, arrivalId: p.arrivalId })));
        
        // Находим и удаляем покупку, связанную с этим приходом
        const updatedPurchases = purchases.filter(p => p.arrivalId !== deletedArrivalId);
        
        console.log('📊 Результат фильтрации:', {
          before: purchases.length,
          after: updatedPurchases.length,
          deletedArrivalId
        });
        
        if (updatedPurchases.length !== purchases.length) {
          setPurchases(updatedPurchases);
          localStorage.setItem('admin_purchases', JSON.stringify(updatedPurchases));
          message.info('Связанная покупка удалена автоматически');
        } else {
          console.log('⚠️ Не найдено покупок с arrivalId:', deletedArrivalId);
        }
      } else {
        console.log('❌ Событие arrivalDeleted не содержит arrivalId');
      }
    };

    window.addEventListener('arrivalDeleted', handleArrivalDeleted as EventListener);
    
    return () => {
      window.removeEventListener('arrivalDeleted', handleArrivalDeleted as EventListener);
    };
  }, [purchases]);

  // Загружаем поставщиков из базы данных
  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/suppliers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки поставщиков:', error);
      message.error('Ошибка загрузки поставщиков');
    }
  };

  // Сохраняем размер страницы в localStorage
  useEffect(() => {
    localStorage.setItem('purchases_page_size', pageSize.toString());
  }, [pageSize]);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data || []);
      }
    } catch (error) {
      message.error('Ошибка загрузки категорий');
    }
  };

  // Функции для работы с серийными номерами
  const addSerialNumber = () => {
    setSerialNumbers(prev => [...prev, '']);
    // Обновляем количество для техники после добавления серийного номера
    setTimeout(() => {
      updateQuantityBasedOnSerials();
    }, 100);
  };

  const removeSerialNumber = (index: number) => {
    setSerialNumbers(prev => prev.filter((_, i) => i !== index));
    // Обновляем количество для техники после удаления серийного номера
    setTimeout(() => {
      updateQuantityBasedOnSerials();
    }, 100);
  };

  const updateSerialNumber = (index: number, value: string) => {
    setSerialNumbers(prev => {
      const newSerials = prev.map((sn, i) => i === index ? value : sn);
      return newSerials;
    });
    
    // Обновляем количество для техники после изменения серийных номеров
    setTimeout(() => {
      updateQuantityBasedOnSerials();
    }, 100);
  };

  // Функции для работы со штрих-кодами
  const addBarcode = () => {
    setBarcodes(prev => [...prev, '']);
  };

  const removeBarcode = (index: number) => {
    setBarcodes(prev => prev.filter((_, i) => i !== index));
  };

  const updateBarcode = (index: number, value: string) => {
    setBarcodes(prev => prev.map((bc, i) => i === index ? value : bc));
  };

  // Функция генерации уникального артикула
  const generateUniqueArticle = async (isAccessory: boolean = false): Promise<string> => {
    const prefix = isAccessory ? '1' : '0';
    const maxAttempts = 100; // Максимум попыток генерации
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Генерируем 8 случайных цифр
      const randomDigits = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
      const article = prefix + randomDigits;
      
      try {
        // Проверяем, существует ли уже такой артикул в базе
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/products?fields=article`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          }
        });
        
        if (response.ok) {
          const products = await response.json();
          const existingArticles = products.map((p: any) => p.article);
          
          // Если артикул уникален, возвращаем его
          if (!existingArticles.includes(article)) {
            return article;
          }
        }
      } catch (error) {
        console.error('Ошибка при проверке уникальности артикула:', error);
      }
    }
    
    // Если не удалось сгенерировать уникальный артикул за maxAttempts попыток
    const fallback = prefix + Date.now().toString().slice(-8);
    console.warn('Не удалось сгенерировать уникальный артикул, используем fallback:', fallback);
    return fallback;
  };

  const isAccessoryCategory = (categoryName: string): boolean => {
    // Аксессуарами считаются только категории с названием "Аксессуары" и их подкатегории
    const ACCESSORIES_CATEGORY_NAME = 'Аксессуары';
    
    // Найдем категорию по имени
    const findCategoryByName = (cats: any[], name: string): any => {
      for (const cat of cats) {
        if (cat.name === name) return cat;
        if (cat.children) {
          const found = findCategoryByName(cat.children, name);
          if (found) return found;
        }
      }
      return null;
    };

    const findParentCategory = (cats: any[], childName: string): any => {
      for (const cat of cats) {
        if (cat.children) {
          if (cat.children.some((child: any) => child.name === childName)) {
            return cat;
          }
          const foundParent = findParentCategory(cat.children, childName);
          if (foundParent) return foundParent;
        }
      }
      return null;
    };

    // Проверяем, является ли категория "Аксессуары"
    if (categoryName === ACCESSORIES_CATEGORY_NAME) {
      return true;
    }

    // Проверяем, является ли родительская категория "Аксессуары"
    let parent = findParentCategory(categories, categoryName);
    while (parent) {
      if (parent.name === ACCESSORIES_CATEGORY_NAME) {
        return true;
      }
      parent = findParentCategory(categories, parent.name);
    }

    return false;
  };

  // Определяем, является ли категория техникой (не аксессуаром)
  const isTechCategory = (categoryName: string): boolean => {
    return !isAccessoryCategory(categoryName);
  };

  // Обновляем количество на основе серийных номеров для техники
  const updateQuantityBasedOnSerials = () => {
    if (selectedCategory && isTechCategory(selectedCategory)) {
      const validSerials = serialNumbers.filter(sn => sn.trim() !== '');
      form.setFieldsValue({ quantity: validSerials.length || 1 });
    }
  };

  // Функция для проверки дублирования серийных номеров
  const checkDuplicateSerialNumbers = async (serialNumbers: string[]): Promise<string[]> => {
    const validSerials = serialNumbers.filter(sn => sn.trim() !== '');
    if (validSerials.length === 0) return [];

    try {
      const token = localStorage.getItem('admin_token');
      
      // Загружаем приходы
      const arrivalsResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/arrivals`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Загружаем чеки
      const receiptsResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/receipts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (arrivalsResponse.ok && receiptsResponse.ok) {
        const arrivals = await arrivalsResponse.json();
        const receipts = await receiptsResponse.json();
        
        const availableSerials = new Set<string>();
        const soldSerials = new Set<string>();
        
        // Собираем все серийные номера из приходов (доступные товары)
        arrivals.forEach((arrival: any) => {
          if (arrival.items && Array.isArray(arrival.items)) {
            arrival.items.forEach((item: any) => {
              if (item.serialNumbers && Array.isArray(item.serialNumbers)) {
                item.serialNumbers.forEach((sn: string) => {
                  if (sn && sn.trim()) {
                    availableSerials.add(sn.trim().toLowerCase());
                  }
                });
              }
            });
          }
        });

        // Собираем все серийные номера из чеков (проданные товары)
        receipts.forEach((receipt: any) => {
          if (receipt.status !== 'cancelled' && receipt.items && Array.isArray(receipt.items)) {
            receipt.items.forEach((item: any) => {
              if (item.serialNumber && item.serialNumber.trim()) {
                soldSerials.add(item.serialNumber.trim().toLowerCase());
              }
            });
          }
        });

        // Исключаем проданные серийные номера из доступных
        soldSerials.forEach(soldSerial => {
          availableSerials.delete(soldSerial);
        });

        console.log(`📦 Проверка серийных номеров: ${availableSerials.size} доступных, ${soldSerials.size} проданных`);

        // Проверяем наши серийные номера на дублирование с доступными (не проданными)
        const duplicates = validSerials.filter(sn => 
          availableSerials.has(sn.trim().toLowerCase())
        );

        return duplicates;
      }
    } catch (error) {
      console.error('Ошибка при проверке серийных номеров:', error);
    }
    
    return [];
  };

  const handleCreatePurchase = () => {
    form.resetFields();
    form.setFieldsValue({
      date: dayjs().format('YYYY-MM-DD'),
      isHidden: true,
      quantity: 1
    });
    setSelectedCategory('');
    setSerialNumbers(['']);
    setBarcodes(['']);
    setSelectedImages([]);
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const adminName = localStorage.getItem('admin_name') || 'Администратор';
      
      // Проверяем дублирование серийных номеров
      const validSerials = serialNumbers.filter(sn => sn.trim() !== '');
      if (validSerials.length > 0) {
        const duplicates = await checkDuplicateSerialNumbers(validSerials);
        if (duplicates.length > 0) {
          message.error(`Серийные номера уже существуют в системе: ${duplicates.join(', ')}`);
          return;
        }
      }
      
      // Создаем покупку
      const newPurchase: PurchaseItem = {
        id: `purchase_${Date.now()}`,
        productName: values.productName,
        quantity: values.quantity,
        price: values.price,
        costPrice: values.costPrice,
        supplier: suppliers.find(s => (s._id || s.id) === values.supplier)?.name || 'Неизвестный поставщик',
        date: (() => {
          if (values.date) {
            // Если дата указана, используем ее с текущим временем
            const selectedDate = new Date(values.date);
            const now = new Date();
            selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
            return selectedDate.toISOString();
          } else {
            // Если дата не указана, используем текущую дату и время
            return new Date().toISOString();
          }
        })(),
        adminName,
        addToArrival: values.addToArrival !== undefined ? values.addToArrival : true,
        notes: values.notes,
        createdAt: new Date().toISOString()
      };

      // Всегда добавляем товар в базу и на приход
      await createProductAndArrival(values, newPurchase);

      // Добавляем в локальное состояние только после успешного создания
      const updatedPurchases = [newPurchase, ...purchases];
      setPurchases(updatedPurchases);
      
      // Сохраняем в localStorage
      localStorage.setItem('admin_purchases', JSON.stringify(updatedPurchases));

      message.success('Покупка добавлена и товар поставлен на приход');
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Error:', error);
      message.error('Ошибка при создании покупки');
    }
  };

  const createProductAndArrival = async (values: any, purchase: PurchaseItem) => {
    try {
      const token = localStorage.getItem('admin_token');
      const adminId = localStorage.getItem('admin_id') || '';
      
      // Определяем является ли товар аксессуаром автоматически
      const isAccessory = isAccessoryCategory(values.category);
      
      // Находим ID категории по её названию
      const findCategoryId = (categoryName: string, categories: any[]): string | null => {
        for (const category of categories) {
          if (category.name === categoryName) {
            return category._id || category.id;
          }
          if (category.children && category.children.length > 0) {
            const childId = findCategoryId(categoryName, category.children);
            if (childId) return childId;
          }
        }
        return null;
      };

      const categoryId = findCategoryId(values.category, categories);
      if (!categoryId) {
        throw new Error(`Категория "${values.category}" не найдена`);
      }
      
              // Создаем уникальный slug
        const baseSlug = values.productName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const uniqueSlug = `${baseSlug}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Создаем товар с расширенными данными
        const productData = {
          name: values.productName,
          article: values.article,
          price: values.price,
          costPrice: values.costPrice,
          categoryId: categoryId, // Отправляем ID категории, а не название
          category: values.category, // Оставляем название для логов
          brand: values.brand || '',
          description: '', // Описание убираем
          isHidden: values.isHidden !== undefined ? values.isHidden : true,
          isAccessory: isAccessory, // Определяется автоматически
          slug: uniqueSlug, // Уникальный slug
          isActive: true,
          inStock: true,
          stockQuantity: values.quantity,
          // Добавляем серийные номера и штрих-коды
          serialNumbers: serialNumbers.filter(sn => sn.trim() !== ''),
          barcodes: isAccessory ? barcodes.filter(bc => bc.trim() !== '') : [] // Штрих-коды только для аксессуаров
        };

      console.log('📦 Создаем товар:', productData);
      
      const productResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData)
      });

      if (productResponse.ok) {
        const productResult = await productResponse.json();
        console.log('✅ Товар создан:', productResult);
        
        // Находим данные поставщика
        const supplier = suppliers.find(s => (s._id || s.id) === values.supplier);
        if (!supplier) {
          throw new Error('Поставщик не найден');
        }

        // Создаем приход через API
        const arrivalData = {
          supplierId: values.supplier,
          supplierName: supplier.name,
          date: new Date().toISOString(), // Используем текущее время вместо values.date
          notes: `Автоматически создано из покупки: ${values.productName}`,
          totalQuantity: values.quantity,
          totalValue: values.costPrice * values.quantity,
          items: [{
            productId: productResult._id,
            productName: values.productName,
            quantity: values.quantity,
            price: values.price,
            costPrice: values.costPrice,
            isAccessory: isAccessory,
            serialNumbers: serialNumbers.filter(sn => sn.trim() !== ''),
            barcode: isAccessory && barcodes.length > 0 ? barcodes.filter(bc => bc.trim() !== '')[0] : undefined
          }]
        };

        console.log('📦 Создаем приход:', arrivalData);

        const arrivalResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/arrivals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(arrivalData)
        });

        if (arrivalResponse.ok) {
          const arrivalResult = await arrivalResponse.json();
          console.log('✅ Приход создан:', arrivalResult);
          
          // Сохраняем arrivalId в объекте покупки для последующего использования
          purchase.arrivalId = arrivalResult._id;

          // Backend автоматически создает долг при создании прихода
          // Нужно найти созданный долг и оплатить его
          const debtAmount = values.costPrice * values.quantity;
          
          // Ждем немного, чтобы долг точно создался
          await new Promise(resolve => setTimeout(resolve, 500));
          
          try {
            // Получаем список долгов, чтобы найти созданный долг
            const debtsResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/debts`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (debtsResponse.ok) {
              const debtsData = await debtsResponse.json();
              // Ищем долг по arrivalId
              const createdDebt = debtsData.find((debt: any) => debt.arrivalId === arrivalResult._id.toString());
              
              if (createdDebt) {
                console.log('💰 Найден автоматически созданный долг:', createdDebt);
                
                // Оплачиваем найденный долг
                console.log('💳 Оплачиваем долг на сумму:', debtAmount);
                
                await debtsApi.pay(createdDebt.id || createdDebt._id, {
                  amount: debtAmount
                });

                console.log('✅ Долг оплачен');
                
                // НЕ обновляем платежи сразу - дождемся события paymentUpdated
              } else {
                console.error('❌ Не удалось найти созданный долг для прихода:', arrivalResult._id);
              }
            }
          } catch (error) {
            console.error('❌ Ошибка при поиске и оплате долга:', error);
          }

          message.success(`Товар создан, поставлен на приход и долг ${debtAmount.toLocaleString('ru-RU')} ₽ оплачен`);
          
          // Отправляем событие для обновления данных на других страницах (с задержкой для обработки в других компонентах)
          window.dispatchEvent(new CustomEvent('paymentUpdated', {
            detail: {
              type: 'debtPaid',
              amount: debtAmount,
              description: `Оплата долга за ${values.productName}`
            }
          }));

        } else {
          throw new Error('Ошибка при создании прихода');
        }
      } else {
        throw new Error('Ошибка при создании товара');
      }
    } catch (error) {
      console.error('❌ Ошибка при создании товара, прихода и оплате долга:', error);
      message.error('Ошибка при создании товара и оплате долга');
      throw error;
    }
  };

  // Функции для работы с деревом категорий
  const buildCategoryTree = (categories: any[]): any[] => {
    if (categories.length > 0 && categories[0].children !== undefined) {
      return categories
    }
    
    const categoryMap = new Map<string, any>()
    const rootCategories: any[] = []

    categories.forEach(category => {
      categoryMap.set(category._id, { ...category, children: [] })
    })

    categories.forEach(category => {
      const categoryWithChildren = categoryMap.get(category._id)!
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId)
        if (parent) {
          parent.children!.push(categoryWithChildren)
        } else {
          rootCategories.push(categoryWithChildren)
        }
      } else {
        rootCategories.push(categoryWithChildren)
      }
    })

    return rootCategories
  };

  const convertToTreeSelectData = (categories: any[]): any[] => {
    return categories.map(category => ({
      title: category.name,
      value: category.name,
      key: category._id,
      children: category.children && category.children.length > 0 ? convertToTreeSelectData(category.children) : undefined,
      isLeaf: !category.children || category.children.length === 0,
      selectable: true
    }))
  };

  const columns: ColumnsType<PurchaseItem> = [
    {
      title: 'Товар',
      dataIndex: 'productName',
      key: 'productName',
      render: (productName, record) => (
        <div>
          <div style={{ fontWeight: '500' }}>{productName}</div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
            Количество: {record.quantity} шт.
          </div>
        </div>
      ),
    },
    {
      title: 'Цена',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (price) => (
        <div style={{ fontWeight: '600', color: '#52c41a', fontSize: '16px' }}>
          {price.toLocaleString('ru-RU')} ₽
        </div>
      ),
    },
    {
      title: 'Закупка',
      dataIndex: 'costPrice',
      key: 'costPrice',
      width: 120,
      render: (costPrice) => (
        <div style={{ fontWeight: '600', color: '#fa8c16', fontSize: '16px' }}>
          {costPrice.toLocaleString('ru-RU')} ₽
        </div>
      ),
    },
    {
      title: 'Поставщик',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 140,
      render: (supplierId) => {
        const supplier = suppliers.find(s => s.id === supplierId);
        return supplier ? supplier.name : '-';
      },
    },
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date) => {
        const dateObj = new Date(date);
        const isDateOnly = date && typeof date === 'string' && !date.includes('T') && !date.includes(' ');
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CalendarOutlined style={{ color: '#8c8c8c' }} />
            <div>
              <div>{dateObj.toLocaleDateString('ru-RU')}</div>
              {!isDateOnly && (
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  {dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              {isDateOnly && (
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  без времени
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Администратор',
      dataIndex: 'adminName',
      key: 'adminName',
      width: 120,
    },
    {
      title: 'На приходе',
      dataIndex: 'addToArrival',
      key: 'addToArrival',
      width: 100,
      render: (addToArrival) => (
        <Tag color={addToArrival ? 'green' : 'orange'}>
          {addToArrival ? 'Да' : 'Нет'}
        </Tag>
      ),
    }
  ];

  // Добавляем колонку "Действия" только для админов и бухгалтеров
  if (hasFullAccess()) {
    columns.push({
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Popconfirm
          title="Удалить покупку?"
          description="Это действие нельзя отменить"
          onConfirm={() => {
            const updatedPurchases = purchases.filter(p => p.id !== record.id);
            setPurchases(updatedPurchases);
            localStorage.setItem('admin_purchases', JSON.stringify(updatedPurchases));
            message.success('Покупка удалена');
          }}
          okText="Да"
          cancelText="Нет"
        >
          <Button
            type="text"
            icon={<DeleteOutlined />}
            size="small"
            danger
          />
        </Popconfirm>
      ),
    });
  }

  const filteredPurchases = purchases.filter(purchase =>
    purchase.productName.toLowerCase().includes(searchText.toLowerCase()) ||
    purchase.adminName.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div>
      {/* Статистика покупок */}
      <Card style={{ marginBottom: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #f0f9ff 0%, #bae7ff 100%)', border: '1px solid #91d5ff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShoppingCartOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
          <div>
            <div style={{ fontSize: '16px', fontWeight: '500', color: '#1890ff' }}>
              Покупки товаров
            </div>
            <div style={{ fontSize: '14px', color: '#595959', marginTop: '4px' }}>
              Добавление купленных товаров в базу с возможностью постановки на приход
            </div>
            <div style={{ fontSize: '12px', color: '#fa8c16', marginTop: '8px', fontWeight: '500' }}>
              💡 Покупки автоматически удаляются при удалении связанного прихода
              {hasFullAccess() && <span style={{ marginLeft: '8px' }}>• Ручное удаление доступно администраторам</span>}
            </div>
          </div>
        </div>
      </Card>

      {/* Фильтры и поиск */}
      <Card style={{ marginBottom: '24px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Search
            placeholder="Поиск по названию товара, администратору"
            style={{ width: 350 }}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          <div style={{ marginLeft: 'auto' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreatePurchase}
              style={{ borderRadius: '8px' }}
            >
              Добавить покупку
            </Button>
          </div>
        </div>
      </Card>

      {/* Таблица покупок */}
      <Card style={{ borderRadius: '12px' }}>
        <Table
          columns={columns}
          dataSource={filteredPurchases}
          rowKey="id"
          pagination={{
            pageSize: pageSize,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Всего ${total} покупок`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onShowSizeChange: (current, size) => {
              setPageSize(size);
            },
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Модальное окно создания покупки */}
      <Modal
        title="Добавить покупку товара"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
          setSelectedCategory('');
          setSerialNumbers(['']);
          setBarcodes(['']);
          setSelectedImages([]);
        }}
        width={900}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="productName"
                label="Название товара"
                rules={[{ required: true, message: 'Введите название товара' }]}
              >
                <Input placeholder="Введите название товара" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="article"
                label="Артикул"
                rules={[{ required: true, message: 'Введите артикул' }]}
                extra="Артикул генерируется автоматически при выборе категории"
              >
                <Input 
                  placeholder="Выберите категорию для автогенерации" 
                  readOnly
                  suffix={
                    <Button 
                      type="text"
                      icon={<ReloadOutlined />}
                      disabled={!selectedCategory}
                      onClick={async () => {
                        if (selectedCategory) {
                          try {
                            const isAccessory = isAccessoryCategory(selectedCategory);
                            const newArticle = await generateUniqueArticle(isAccessory);
                            form.setFieldsValue({ article: newArticle });
                            message.success(`Новый артикул: ${newArticle}`);
                          } catch (error) {
                            console.error('Ошибка генерации артикула:', error);
                            message.error('Не удалось сгенерировать артикул');
                          }
                        }
                      }}
                      title="Перегенерировать артикул"
                      size="small"
                    />
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="Категория"
                rules={[{ required: true, message: 'Выберите категорию' }]}
                extra="Выберите категорию или подкатегорию"
              >
                <TreeSelect
                  placeholder="🔍 Поиск категории по названию..."
                  allowClear
                  treeData={categories ? convertToTreeSelectData(buildCategoryTree(categories)) : []}
                  treeDefaultExpandAll={false}
                  showSearch
                  filterTreeNode={(inputValue, treeNode) => {
                    const getTextFromNode = (node: any): string => {
                      if (typeof node === 'string') return node;
                      if (node?.props?.children) {
                        if (Array.isArray(node.props.children)) {
                          return node.props.children.map(getTextFromNode).join(' ');
                        }
                        return getTextFromNode(node.props.children);
                      }
                      return '';
                    };
                    
                    const title = getTextFromNode(treeNode.title).toLowerCase();
                    return title.includes(inputValue.toLowerCase());
                  }}
                  dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                  style={{ width: '100%' }}
                  onChange={async (value) => {
                    setSelectedCategory(value);
                    // Сбрасываем серийные номера и штрихкоды при смене категории
                    setSerialNumbers(['']);
                    setBarcodes(['']);
                    
                    // Автоматически генерируем артикул при выборе категории
                    if (value) {
                      try {
                        const isAccessory = isAccessoryCategory(value);
                        const newArticle = await generateUniqueArticle(isAccessory);
                        form.setFieldsValue({ article: newArticle });
                        message.success(`Артикул сгенерирован: ${newArticle}`);
                      } catch (error) {
                        console.error('Ошибка генерации артикула:', error);
                        message.error('Не удалось сгенерировать артикул');
                      }
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="brand"
                label="Бренд"
              >
                <Input placeholder="Введите бренд" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="quantity"
                label="Количество"
                rules={[{ required: true, message: 'Введите количество' }]}
                extra={selectedCategory && isTechCategory(selectedCategory) 
                  ? "Количество определяется автоматически по серийным номерам" 
                  : "Введите количество вручную"
                }
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="1"
                  min={1}
                  disabled={selectedCategory ? isTechCategory(selectedCategory) : false}
                  value={selectedCategory && isTechCategory(selectedCategory) 
                    ? serialNumbers.filter(sn => sn.trim() !== '').length || 1
                    : undefined
                  }
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="costPrice"
                label="Закупочная цена"
                rules={[{ required: true, message: 'Введите закупочную цену' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="8000"
                  min={0}
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  addonAfter="₽"
                  onChange={() => {
                    // Пересчитываем валидацию цены продажи при изменении закупочной цены
                    setTimeout(() => {
                      form.validateFields(['price']);
                    }, 100);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="price"
                label="Цена продажи"
                rules={[{ required: true, message: 'Введите цену' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="10000"
                  min={0}
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  addonAfter="₽"
                />
              </Form.Item>
            </Col>
          </Row>



          {/* Серийные номера */}
          <Form.Item label="Серийные номера">
            {serialNumbers.map((serialNumber, index) => (
              <div key={index} style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                <Input
                  placeholder="Введите серийный номер"
                  value={serialNumber}
                  onChange={(e) => updateSerialNumber(index, e.target.value)}
                  style={{ marginRight: '8px' }}
                />
                {serialNumbers.length > 1 && (
                  <Button
                    type="text"
                    danger
                    icon={<MinusCircleOutlined />}
                    onClick={() => removeSerialNumber(index)}
                  />
                )}
                {index === serialNumbers.length - 1 && (
                  <Button
                    type="text"
                    icon={<PlusOutlined />}
                    onClick={addSerialNumber}
                  />
                )}
              </div>
            ))}
          </Form.Item>

          {/* Штрих-коды - только для аксессуаров */}
          {selectedCategory && isAccessoryCategory(selectedCategory) && (
            <Form.Item label="Штрих-коды">
              {barcodes.map((barcode, index) => (
                <div key={index} style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                  <Input
                    placeholder="Введите штрих-код"
                    value={barcode}
                    onChange={(e) => updateBarcode(index, e.target.value)}
                    style={{ marginRight: '8px' }}
                  />
                  {barcodes.length > 1 && (
                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => removeBarcode(index)}
                    />
                  )}
                  {index === barcodes.length - 1 && (
                    <Button
                      type="text"
                      icon={<PlusOutlined />}
                      onClick={addBarcode}
                    />
                  )}
                </div>
              ))}
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="supplier"
                label="Поставщик"
                rules={[{ required: true, message: 'Выберите поставщика' }]}
              >
                <Select placeholder="Выберите поставщика">
                  {suppliers.filter(s => s.status === 'active').map(supplier => (
                    <Option key={supplier._id || supplier.id} value={supplier._id || supplier.id}>
                      {supplier.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="date"
                label="Дата покупки"
                rules={[{ required: true, message: 'Выберите дату' }]}
              >
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="isHidden"
            label=" "
            valuePropName="checked"
            initialValue={true}
          >
            <div style={{ marginTop: '8px' }}>
              <input
                type="checkbox"
                defaultChecked={true}
                onChange={(e) => {
                  form.setFieldsValue({
                    isHidden: e.target.checked
                  });
                }}
                style={{ marginRight: '8px' }}
              />
              <span style={{ color: '#fa8c16', fontWeight: '500' }}>
                Скрыть товар на сайте (по умолчанию)
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
              Товар не будет отображаться в каталоге на основном сайте. Товар автоматически добавляется на приход.
            </div>
          </Form.Item>

          <Form.Item
            name="notes"
            label="Примечания"
          >
            <Input.TextArea rows={3} placeholder="Дополнительная информация" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

const Payments: React.FC = () => {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  
  const [activeTab, setActiveTab] = useState('payments');

  // Функция для формирования описания платежа с товарами из чека
  const formatReceiptPaymentDescription = (receipt: any, paymentMethod: string, baseDescription: string): string => {
    // Если в чеке нет товаров, возвращаем базовое описание
    if (!receipt.items || receipt.items.length === 0) {
      return baseDescription;
    }

    // Формируем описание товаров
    const itemsDescription = receipt.items.map((item: any) => {
      let itemDesc = item.productName;
      
      // Добавляем количество если больше 1
      if (item.quantity > 1) {
        itemDesc += ` (${item.quantity} шт.)`;
      }
      
      // Добавляем серийные номера если есть (поддерживаем оба формата)
      if (item.serialNumbers && item.serialNumbers.length > 0) {
        // Массив серийных номеров (формат долгов)
        itemDesc += ` [S/N: ${item.serialNumbers.join(', ')}]`;
      } else if (item.serialNumber && item.serialNumber.trim()) {
        // Одиночный серийный номер (формат чеков)
        itemDesc += ` [S/N: ${item.serialNumber.trim()}]`;
      }
      
      // Добавляем штрих-код если есть
      if (item.barcode) {
        itemDesc += ` [ШК: ${item.barcode}]`;
      }
      
      return itemDesc;
    }).join('; ');

    // Определяем название метода оплаты
    let methodName = '';
    switch (paymentMethod) {
      case 'cash':
        methodName = 'Наличные';
        break;
      case 'card':
        methodName = 'Карта';
        break;
      case 'transfer':
        methodName = 'Перевод';
        break;
      case 'keb':
        methodName = 'КЭБ';
        break;
      case 'sber_transfer':
        methodName = 'Перевод Сбербанк';
        break;
      default:
        methodName = 'Платеж';
    }

    // Формируем итоговое описание
    const customerName = receipt.customerName || receipt.clientName || '';
    const clientPart = customerName ? ` от ${customerName}` : '';
    return `${methodName}${clientPart}: ${itemsDescription} (Чек ${receipt.receiptNumber})`;
  };

  // Функция для интеграции чеков в платежи
  const integrateReceiptsIntoPayments = (basePayments: PaymentItem[], receiptsData: any[]): PaymentItem[] => {
    const receiptPayments: PaymentItem[] = [];
    
    console.log('💰 Интеграция чеков в платежи:');
    console.log('💰 - Базовых платежей:', basePayments?.length || 0);
    console.log('💰 - Всего чеков для обработки:', receiptsData?.length || 0);
    console.log('💰 - Активных чеков (не отмененных):', receiptsData?.filter((receipt: any) => receipt?.status !== 'cancelled')?.length || 0);
    
    // Валидация входных данных
    if (!Array.isArray(basePayments)) {
      console.error('💰 basePayments не является массивом:', basePayments);
      return [];
    }
    
    if (!Array.isArray(receiptsData)) {
      console.error('💰 receiptsData не является массивом:', receiptsData);
      return basePayments;
    }
    
    // Фильтруем только валидные платежи
    const validBasePayments = basePayments.filter(payment => {
      if (!payment || typeof payment !== 'object') {
        console.warn('💰 Найден невалидный платеж:', payment);
        return false;
      }
      if (!payment.id) {
        console.warn('💰 Найден платеж без ID:', payment);
        return false;
      }
      return true;
    });
    
    // Создаем Set существующих ID чеков для быстрой проверки
    const existingReceiptIds = new Set(receiptsData.map((r: any) => r._id || r.id));
    
    // Очищаем зависшие платежи из удаленных чеков
    const cleanedBasePayments = validBasePayments.filter(payment => {
      if (payment.id && payment.id.startsWith('receipt_')) {
        const match = payment.id.match(/^receipt_(.+)_(\d+)$/);
        if (match) {
          const receiptId = match[1];
          const receiptExists = existingReceiptIds.has(receiptId);
          if (!receiptExists) {
            console.log(`💰 Удаляем зависший платеж из несуществующего чека ${receiptId}:`, payment.description);
            return false; // Исключаем этот платеж
          }
        }
      }
      return true; // Оставляем этот платеж
    });
    
    if (cleanedBasePayments.length !== basePayments.length) {
      console.log(`💰 Очищено зависших платежей: ${basePayments.length - cleanedBasePayments.length}`);
    }
    
    receiptsData
      .filter((receipt: any) => receipt.status !== 'cancelled')
      .forEach((receipt: any) => {
        console.log(`💰 Обрабатываем чек ${receipt.receiptNumber}:`, {
          id: receipt.id,
          _id: receipt._id,
          isDebt: receipt.isDebt,
          debtPaid: receipt.debtPaid,
          paymentsCount: receipt.payments?.length || 0,
          totalAmount: receipt.totalAmount || receipt.total || 0,
          payments: receipt.payments
        });
        console.log(`💰 Детали платежей чека:`, JSON.stringify(receipt.payments, null, 2));
        // Если чек в долг и долг не оплачен - создаем запись о долге
        if (receipt.isDebt && !receipt.debtPaid) {
          console.log(`💰 - Это неоплаченный долг`);
          const receiptId = receipt._id || receipt.id;
          const debtPaymentId = `debt_${receiptId}`;
          const existingDebtPayment = cleanedBasePayments.find(p => p.id === debtPaymentId);
          
          // Используем customerName вместо clientName
          const customerName = receipt.customerName || receipt.clientName || 'Клиент (имя не указано)';
          
          // Формируем описание товаров с серийными номерами
          const itemsDescription = (receipt.items || []).map((item: any) => {
            let description = item.productName;
            if (item.quantity > 1) {
              description += ` (${item.quantity} шт.)`;
            }
            if (item.serialNumber) {
              description += ` [S/N: ${item.serialNumber}]`;
            }
            return description;
          }).join(', ');
          
          if (!existingDebtPayment) {
            receiptPayments.push({
              id: debtPaymentId,
              type: 'transfer',
              amount: 0,
              description: `ДОЛГ: ${customerName} (Чек ${receipt.receiptNumber}) - ${itemsDescription}`,
              date: receipt.date,
              orderId: receipt.receiptNumber,
              supplier: 'Долг',
              inCashRegister: false,
              cashRegisterDate: undefined,
              createdAt: receipt.date,
              notes: `Долг клиента: ${customerName}, Сумма чека: ${(receipt.totalAmount || receipt.total || 0).toLocaleString('ru-RU')} ₽, Товары: ${itemsDescription}`
            });
          }
        }
        // Если чек в долг и долг оплачен - создаем обычные платежи
        else if (receipt.isDebt && receipt.debtPaid) {
          console.log(`💰 - Это оплаченный долг`);
          const customerName = receipt.customerName || receipt.clientName || 'Клиент';
          (receipt.payments || []).forEach((payment: any, index: number) => {
            const receiptId = receipt._id || receipt.id;
            const paymentId = `receipt_${receiptId}_${index}`;
            const existingPayment = cleanedBasePayments.find(p => p.id === paymentId);
            

            
            if (!existingPayment) {
              let paymentType: 'cash' | 'transfer' | 'keb';
              let paymentDescription: string;
              
              switch (payment.method) {
                case 'cash':
                  paymentType = 'cash';
                  paymentDescription = formatReceiptPaymentDescription(receipt, 'cash', `Наличные от ${customerName} (Чек ${receipt.receiptNumber})`);
                  break;
                case 'card':
                  paymentType = 'transfer';
                  paymentDescription = formatReceiptPaymentDescription(receipt, 'card', `Карта от ${customerName} (Чек ${receipt.receiptNumber})`);
                  break;
                case 'transfer':
                  paymentType = 'transfer';
                  paymentDescription = formatReceiptPaymentDescription(receipt, 'transfer', `Перевод от ${customerName} (Чек ${receipt.receiptNumber})`);
                  break;
                case 'keb':
                  paymentType = 'keb';
                  paymentDescription = formatReceiptPaymentDescription(receipt, 'keb', `КЭБ от ${customerName} (Чек ${receipt.receiptNumber})`);
                  break;
                case 'sber_transfer':
                  paymentType = 'transfer';
                  const sberDescription = `Перевод Сбербанк${payment.sberRecipient ? ` → ${payment.sberRecipient}` : ''} от ${customerName} (Чек ${receipt.receiptNumber})`;
                  paymentDescription = formatReceiptPaymentDescription(receipt, 'sber_transfer', sberDescription);
                  break;
                default:
                  paymentType = 'transfer';
                  paymentDescription = formatReceiptPaymentDescription(receipt, 'transfer', `Платеж от ${customerName} (Чек ${receipt.receiptNumber})`);
              }
              
              const finalInCashRegister = payment.inCashRegister !== undefined ? payment.inCashRegister : (paymentType === 'cash');
              
              console.log(`💰 Создаем платеж долга ${paymentId}:`, {
                method: payment.method,
                amount: payment.amount,
                paymentInCashRegister: payment.inCashRegister,
                paymentCashRegisterDate: payment.cashRegisterDate,
                finalInCashRegister: finalInCashRegister,
                paymentType: paymentType
              });

              receiptPayments.push({
                id: paymentId,
                type: paymentType,
                amount: payment.amount,
                description: paymentDescription,
                date: receipt.date,
                orderId: receipt.receiptNumber,
                supplier: customerName,
                inCashRegister: finalInCashRegister,
                cashRegisterDate: payment.cashRegisterDate || (paymentType === 'cash' ? receipt.date : undefined),
                createdAt: receipt.date
              });
            }
          });
        }
        // Обычные чеки (не в долг)
        else if (!receipt.isDebt) {
          console.log(`💰 - Это обычный чек (не долг)`);
          (receipt.payments || []).forEach((payment: any, index: number) => {
            const receiptId = receipt._id || receipt.id;
            const paymentId = `receipt_${receiptId}_${index}`;
            const existingPayment = cleanedBasePayments.find(p => p.id === paymentId);
            

            
            if (!existingPayment) {
              let paymentType: 'cash' | 'transfer' | 'keb';
              let paymentDescription: string;
              
              switch (payment.method) {
                case 'cash':
                  paymentType = 'cash';
                  paymentDescription = formatReceiptPaymentDescription(receipt, 'cash', `Наличные (Чек ${receipt.receiptNumber})`);
                  break;
                case 'card':
                  paymentType = 'transfer';
                  paymentDescription = formatReceiptPaymentDescription(receipt, 'card', `Карта (Чек ${receipt.receiptNumber})`);
                  break;
                case 'transfer':
                  paymentType = 'transfer';
                  paymentDescription = formatReceiptPaymentDescription(receipt, 'transfer', `Перевод (Чек ${receipt.receiptNumber})`);
                  break;
                case 'keb':
                  paymentType = 'keb';
                  paymentDescription = formatReceiptPaymentDescription(receipt, 'keb', `КЭБ (Чек ${receipt.receiptNumber})`);
                  break;
                case 'sber_transfer':
                  paymentType = 'transfer';
                  const sberDescription = `Перевод Сбербанк${payment.sberRecipient ? ` → ${payment.sberRecipient}` : ''} (Чек ${receipt.receiptNumber})`;
                  paymentDescription = formatReceiptPaymentDescription(receipt, 'sber_transfer', sberDescription);
                  break;
                default:
                  paymentType = 'transfer';
                  paymentDescription = formatReceiptPaymentDescription(receipt, 'transfer', `Платеж (Чек ${receipt.receiptNumber})`);
              }
              
              const finalInCashRegister = payment.inCashRegister !== undefined ? payment.inCashRegister : (paymentType === 'cash');
              
              console.log(`💰 Создаем платеж ${paymentId}:`, {
                method: payment.method,
                amount: payment.amount,
                paymentInCashRegister: payment.inCashRegister,
                paymentCashRegisterDate: payment.cashRegisterDate,
                finalInCashRegister: finalInCashRegister,
                paymentType: paymentType
              });

              receiptPayments.push({
                id: paymentId,
                type: paymentType,
                amount: payment.amount,
                description: paymentDescription,
                date: receipt.date,
                orderId: receipt.receiptNumber,
                supplier: 'Продажа',
                inCashRegister: finalInCashRegister,
                cashRegisterDate: payment.cashRegisterDate || (paymentType === 'cash' ? receipt.date : undefined),
                createdAt: receipt.date
              });
            }
          });
        } else {
          console.log(`💰 - Чек не попал ни в одну категорию:`, {
            isDebt: receipt.isDebt,
            debtPaid: receipt.debtPaid
          });
        }
      });
    
    console.log('💰 Результат интеграции:');
    console.log('💰 - Создано платежей из чеков:', receiptPayments.length);
    console.log('💰 - Итого платежей:', basePayments.length + receiptPayments.length);
    
    return [...cleanedBasePayments, ...receiptPayments];
  };

  // Функция для обновления платежей из API с интеграцией чеков
  const refreshPayments = async (showMessage = true) => {
    setLoadingPayments(true);
    try {
      console.log('💰 Обновляем платежи из API...');
      
      // Загружаем платежи из API
      const apiPayments = await paymentsApi.getAll();
      console.log(`💰 Получено ${apiPayments?.length || 0} платежей из API`);
      
      // Загружаем чеки из API
      const receiptsData = await receiptsApi.getAll();
      console.log(`💰 Получено ${receiptsData?.length || 0} чеков из API`);
      
      // Загружаем долги из API
      const debtsData = await debtsApi.getAll();
      console.log(`💰 Получено ${debtsData?.length || 0} долгов из API`);
      console.log('💰 Первые 3 долга:', debtsData?.slice(0, 3));
      
      // Интегрируем чеки в платежи
      const integratedPayments = integrateReceiptsIntoPayments(apiPayments || [], receiptsData || []);
      
      // Добавляем только НЕОПЛАЧЕННЫЕ долги как отдельные записи
      // Оплаченные долги уже есть в API платежей как "Оплата долга поставщику"
      const unpaidDebts = (debtsData || []).filter((debt: any) => debt.status !== 'paid');
      console.log(`💰 Отфильтровано неоплаченных долгов: ${unpaidDebts.length} из ${debtsData?.length || 0}`);
      
      const debtsAsPayments = unpaidDebts.map((debt: any) => ({
        id: `debt_${debt._id || debt.id}`,
        mongoId: debt._id,
        type: 'transfer' as const,
        amount: debt.remainingAmount || debt.amount,
        description: debt.notes || `Долг ${debt.supplierName || 'Неизвестный клиент'}`,
        date: debt.date || new Date().toISOString(),
        supplier: debt.supplierName || 'Долг',
        inCashRegister: false,
        notes: debt.notes,
        createdAt: debt.createdAt || debt.date || new Date().toISOString(),
        category: 'Долг',
        paymentMethod: 'debt',
        apiType: 'expense' as const,
        status: debt.status === 'paid' ? 'incassated' : 'active'
      }));
      
      console.log(`💰 Преобразовано ${debtsAsPayments.length} неоплаченных долгов в платежи`);
      console.log('💰 Первые 2 неоплаченных долга как платежи:', debtsAsPayments.slice(0, 2));
      
      // Объединяем все платежи
      const allPayments = [...integratedPayments, ...debtsAsPayments];
      
      setPayments(allPayments);
              console.log(`💰 Итого платежей после интеграции: ${allPayments.length}`);
        
        // Логируем статистику по типам и статусу кассы
        const stats = allPayments.reduce((acc, p) => {
          const key = `${p.type}_${p.inCashRegister ? 'in' : 'out'}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('💰 Статистика платежей по типам и кассе:', stats);
        
        if (showMessage) {
          message.success(`Обновлено: ${apiPayments?.length || 0} платежей + ${receiptsData?.length || 0} чеков`);
        }
      
    } catch (error) {
      console.error('Ошибка обновления платежей из API:', error);
      message.error('Ошибка при обновлении платежей');
    } finally {
      setLoadingPayments(false);
    }
  };

  // Загрузка платежей при монтировании
  useEffect(() => {
    const loadPayments = async () => {
      setLoadingPayments(true);
      try {
        console.log('💰 Загружаем платежи и чеки из API...');
        console.log('💰 BaseURL:', import.meta.env.VITE_API_URL || 'http://localhost:5002/api');
        console.log('💰 Токен:', localStorage.getItem('admin_token')?.substring(0, 20) + '...');
        
        // Загружаем платежи из API
        console.log('💰 Начинаем загрузку платежей из API...');
        const apiPayments = await paymentsApi.getAll();
        console.log(`💰 Получено ${apiPayments?.length || 0} платежей из API`);
        console.log('💰 Структура apiPayments:', typeof apiPayments, Array.isArray(apiPayments));
        console.log('💰 Полный ответ API:', apiPayments);
        if (apiPayments && apiPayments.length > 0) {
          console.log('💰 Пример платежа из API:', apiPayments[0]);
        }
        
        // Загружаем чеки из API
        const receiptsData = await receiptsApi.getAll();
        console.log(`💰 Получено ${receiptsData?.length || 0} чеков из API`);
        console.log('💰 Структура receiptsData:', typeof receiptsData, Array.isArray(receiptsData));
        
        // Приводим к массивам и валидируем
        const validApiPayments = Array.isArray(apiPayments) 
          ? apiPayments.map(payment => {
              // Маппинг paymentMethod в type (поддержка русских и английских значений)
              const typeMap: Record<string, 'cash' | 'transfer' | 'keb'> = {
                'cash': 'cash',
                'card': 'transfer', 
                'transfer': 'transfer',
                'наличные': 'cash',
                'перевод': 'transfer',
                'кэб': 'keb'
              };
              
              return {
                id: payment.id || payment._id, // Преобразуем _id в id
                mongoId: payment._id, // Сохраняем MongoDB _id для API вызовов
                type: typeMap[payment.paymentMethod] || typeMap[payment.type] || 'cash' as 'cash' | 'transfer' | 'keb', // Преобразуем paymentMethod или type
                amount: payment.apiType === 'expense' ? -(Math.abs(payment.amount || 0)) : (payment.amount || 0), // Расходы делаем отрицательными
                description: payment.description || 'Платеж',
                date: payment.date || new Date().toISOString(),
                supplier: payment.supplierName,
                inCashRegister: payment.inCashRegister || payment.paymentMethod === 'cash' || payment.paymentMethod === 'наличные', // Используем значение из API или по умолчанию
                cashRegisterDate: payment.cashRegisterDate || (payment.paymentMethod === 'cash' || payment.paymentMethod === 'наличные' ? payment.date : undefined),
                notes: payment.notes,
                createdAt: payment.createdAt || payment.date || new Date().toISOString(),
                // Дополнительные поля из API
                category: payment.category,
                paymentMethod: payment.paymentMethod,
                apiType: payment.apiType, // Сохраняем оригинальный тип из API
                status: payment.status,
                adminName: payment.adminName // Имя администратора из API
              };
                         })
           : [];
           
        console.log('💰 Преобразованные платежи:', validApiPayments?.length || 0);
        if (validApiPayments && validApiPayments.length > 0) {
          console.log('💰 Пример преобразованного платежа:', validApiPayments[0]);
        }
           
        const validReceiptsData = Array.isArray(receiptsData) ? receiptsData : [];
        
        // Интегрируем чеки в платежи
        const integratedPayments = integrateReceiptsIntoPayments(validApiPayments, validReceiptsData);
        
        console.log('💰 Результат интеграции чеков:', {
          input: validApiPayments?.length || 0,
          output: integratedPayments?.length || 0,
          isArray: Array.isArray(integratedPayments)
        });
        
        if (integratedPayments && integratedPayments.length > 0) {
          setPayments(integratedPayments);
          console.log(`💰 Загружено ${integratedPayments.length} платежей (с интеграцией чеков)`);
        } else {
          console.log('💰 API не вернул данные или результат интеграции пуст');
          console.log('💰 Детали:', {
            apiPayments: apiPayments?.length || 0,
            receiptsData: validReceiptsData?.length || 0,
            integratedPayments: integratedPayments?.length || 0
          });
          console.log('💰 ВАЖНО: Принудительно используем API вместо localStorage');
          console.log('💰 Устанавливаем платежи из API даже если массив пуст');
          // Устанавливаем то что получили из API, даже если это пустой массив
          setPayments(integratedPayments || []);
          console.log(`💰 Установлено платежей: ${(integratedPayments || []).length}`);
        }
      } catch (error) {
        console.error('Ошибка загрузки из API:', error);
        console.error('Детали ошибки:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace'
        });
        console.log('💰 НЕ используем localStorage при ошибке API - показываем реальную проблему');
        setPayments([]);
        console.error('💰 API платежей недоступен, устанавливаем пустой массив');
      } finally {
        setLoadingPayments(false);
      }
    };

    loadPayments();
  }, []);

  // Автоматическое обновление при создании новых чеков
  useEffect(() => {
    const handleReceiptCreated = (e: CustomEvent) => {
      console.log('💰 Получено событие создания чека, обновляем платежи...', e.detail);
      // Небольшая задержка для завершения всех операций
      setTimeout(() => {
        refreshPayments();
      }, 1000);
    };

    const handleReceiptDeleted = (e: CustomEvent) => {
      console.log('💰 Получено событие удаления чека, обновляем платежи...', e.detail);
      // Немедленно обновляем платежи после удаления чека
      refreshPayments();
    };

    const handleReceiptCancelled = (e: CustomEvent) => {
      console.log('💰 Получено событие отмены чека, обновляем платежи...', e.detail);
      // Немедленно обновляем платежи после отмены чека
      refreshPayments();
    };

    const handlePaymentUpdated = (e: CustomEvent) => {
      console.log('💰 Получено событие обновления платежей:', e.detail);
      
      // Не перезагружаем данные при изменении статуса кассы - это уже обработано локально
      if (e.detail?.type === 'cashRegisterToggle') {
        console.log('💰 Игнорируем событие изменения статуса кассы - обработано локально');
        return;
      }
      
            // Не перезагружаем данные при создании расхода - это обрабатывается локально
      if (e.detail?.type === 'expense') {
        console.log('💰 Игнорируем событие создания расхода - обрабатывается локально');
        return;
      }
      
      // Добавляем задержку, чтобы дать время для сохранения в базе
      setTimeout(() => {
        console.log('💰 Обновляем платежи через 3 секунды после оплаты долга...');
        refreshPayments();
      }, 3000);
    };

    const handleExpenseCreated = (e: CustomEvent) => {
      console.log('💰 Получено событие создания расхода для локального добавления:', e.detail);
      if (e.detail?.payment) {
        const newExpense = e.detail.payment;
        console.log('💰 Добавляем расход локально:', {
          id: newExpense.id,
          amount: newExpense.amount,
          apiType: newExpense.apiType,
          description: newExpense.description
        });
        
        // Добавляем новый расход в начало списка локально
        setPayments(prevPayments => {
          const newPayments = [newExpense, ...prevPayments];
          console.log('💰 Новое количество платежей:', newPayments.length);
          console.log('💰 Расход добавлен локально, касса будет пересчитана автоматически');
          return newPayments;
        });
      }
    };

    const handleExpenseDeleted = (e: CustomEvent) => {
      console.log('💰 Получено событие удаления расхода для локального удаления:', e.detail);
      if (e.detail?.expenseId) {
        const expenseId = e.detail.expenseId;
        console.log('💰 Удаляем расход локально:', {
          id: expenseId,
          description: e.detail.description
        });
        
        // Удаляем расход из списка локально
        setPayments(prevPayments => {
          const newPayments = prevPayments.filter(p => p.id !== expenseId && p.mongoId !== expenseId);
          console.log('💰 Новое количество платежей:', newPayments.length);
          console.log('💰 Расход удален локально, касса будет пересчитана автоматически');
          return newPayments;
        });
      }
    };

    const handleRefundCreated = (e: CustomEvent) => {
      console.log('💰 Получено событие создания возврата для локального добавления:', e.detail);
      if (e.detail?.payment) {
        const refundPayment = e.detail.payment;
        console.log('💰 Добавляем возврат локально:', {
          id: refundPayment.id,
          amount: refundPayment.amount,
          apiType: refundPayment.apiType,
          description: refundPayment.description,
          inCashRegister: refundPayment.inCashRegister
        });
        
        // Добавляем возвратный платеж в начало списка локально
        setPayments(prevPayments => {
          const newPayments = [refundPayment, ...prevPayments];
          console.log('💰 Новое количество платежей:', newPayments.length);
          console.log('💰 Возврат добавлен локально, касса будет пересчитана автоматически');
          return newPayments;
        });
      }
    };

    window.addEventListener('receiptCreated', handleReceiptCreated as EventListener);
    window.addEventListener('receiptDeleted', handleReceiptDeleted as EventListener);
    window.addEventListener('receiptCancelled', handleReceiptCancelled as EventListener);
    window.addEventListener('paymentUpdated', handlePaymentUpdated as EventListener);
    window.addEventListener('expenseCreated', handleExpenseCreated as EventListener);
    window.addEventListener('expenseDeleted', handleExpenseDeleted as EventListener);
    window.addEventListener('refundCreated', handleRefundCreated as EventListener);
    return () => {
      window.removeEventListener('receiptCreated', handleReceiptCreated as EventListener);
      window.removeEventListener('receiptDeleted', handleReceiptDeleted as EventListener);
      window.removeEventListener('receiptCancelled', handleReceiptCancelled as EventListener);
      window.removeEventListener('paymentUpdated', handlePaymentUpdated as EventListener);
      window.removeEventListener('expenseCreated', handleExpenseCreated as EventListener);
      window.removeEventListener('expenseDeleted', handleExpenseDeleted as EventListener);
      window.removeEventListener('refundCreated', handleRefundCreated as EventListener);
    };
  }, [refreshPayments]);

  // Периодическое обновление убрано - данные загружаются из API при каждом обращении

  return (
    <div>


      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="large"
        style={{ marginBottom: '24px' }}
        items={[
          {
            key: 'payments',
            label: (
              <span>
                <DollarOutlined />
                Основное
              </span>
            ),
            children: (
              <PaymentsTab 
                payments={payments} 
                setPayments={setPayments}
                refreshPayments={refreshPayments}
              />
            )
          },
          {
            key: 'expenses',
            label: (
              <span>
                <MinusCircleOutlined />
                Расходы
              </span>
            ),
            children: <ExpensesTab />
          },
          {
            key: 'purchases',
            label: (
              <span>
                <ShoppingCartOutlined />
                Покупки
              </span>
            ),
            children: <PurchasesTab refreshPayments={refreshPayments} />
          }
        ]}
      />
    </div>
  );
};

export default Payments; 