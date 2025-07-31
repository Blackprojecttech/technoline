import React, { useState, useEffect, useCallback } from 'react';
import { getCashInRegisterAmount } from '../utils/getCashInRegister';
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Input, 
  Select, 
  DatePicker, 
  Modal, 
  Form, 
  InputNumber,
  message,
  Tooltip,
  Space,
  Popconfirm,
  Row,
  Col,
  Alert,
  Checkbox
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  EditOutlined, 
  DeleteOutlined,
  FileTextOutlined,
  CalendarOutlined,
  DollarOutlined,
  PrinterOutlined,
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ReloadOutlined,
  RollbackOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { format } from 'date-fns';
import { logReceiptAction } from '../utils/actionLogger';
import { receiptsApi, arrivalsApi, paymentsApi, sberRecipientsApi } from '../utils/baseApi';
import { useAuth } from '../hooks/useAuth';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { initializeProductEvents, closeProductEvents } from '../utils/productEvents';

dayjs.extend(isBetween);

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

type PeriodType = 'day' | 'week' | 'month' | 'range';

// Получение имени текущего администратора
const getCurrentAdminName = (): string => {
  try {
    // Пытаемся получить информацию о пользователе из localStorage
    const userInfo = localStorage.getItem('admin_user');
    if (userInfo) {
      const user = JSON.parse(userInfo);
      if (user.firstName && user.lastName) {
        return `${user.firstName} ${user.lastName}`;
      } else if (user.firstName) {
        return user.firstName;
      } else if (user.email) {
        return user.email;
      }
    }
    
    // Fallback - проверяем токен
    const token = localStorage.getItem('admin_token');
    if (token) {
      return 'Администратор (авторизован)';
    }
    
    return 'Администратор';
  } catch (error) {
    console.error('Ошибка получения имени администратора:', error);
    return 'Администратор';
  }
};

interface ReceiptItem {
  id: string;
  arrivalId: string;
  productName: string;
  serialNumber?: string;
  quantity: number;
  price: number;
  costPrice: number;
  total: number;
  isAccessory: boolean;
  isService?: boolean;
  supplierId?: string;
  supplierName?: string;
  barcode?: string;
}

// Добавляем интерфейс для методов доставки
interface DeliveryMethod {
  _id: string;
  name: string;
  costType: 'fixed' | 'percentage' | 'zone' | 'fixed_plus_percentage';
  fixedCost?: number;
  costPercentage?: number;
  zonePrices?: {
    [key: string]: number;
  };
  freeThreshold?: number;
  isActive: boolean;
  useZones?: boolean;
  zoneKeys?: string[];
}

// Обновляем интерфейс Receipt
interface PaymentPart {
  method: 'cash' | 'keb' | 'sber_transfer';
  amount: number;
  sberRecipient?: string;
  inCashRegister?: boolean;
  cashRegisterDate?: string;
}

interface Receipt {
  id: string;
  _id?: string; // MongoDB ID
  receiptNumber: string;
  date: string;
  items: ReceiptItem[];
  totalAmount: number;
  total?: number; // Поле из бэкенда
  status: 'new' | 'draft' | 'completed' | 'cancelled';
  payments: PaymentPart[];
  notes?: string;
  createdBy: string;
  deliveryMethod?: string;
  deliveryPrice?: number;
  deliveryZone?: string;
  updatedAt: string;
  isDebt?: boolean;
  clientName?: string;
  debtPaid?: boolean;
  discountInfo?: { type: 'fixed' | 'percent'; value: number };
}

interface ArrivalItem {
  id: string;
  _id?: string; // MongoDB ID
  productId: string;
  productName: string;
  quantity: number;
  serialNumbers: string[];
  barcode?: string;
  price: number;
  costPrice: number;
  date: string;
  supplierId?: string;
  supplierName?: string;
  notes?: string;
  isAccessory: boolean;
  isService?: boolean;
  arrivalId?: string; // ID прихода к которому принадлежит товар
}

interface AvailableProduct {
  arrivalId: string;
  productName: string;
  serialNumber?: string;
  price: number;
  costPrice: number;
  isAccessory: boolean;
  isService?: boolean;
  supplierId?: string;
  supplierName?: string;
  barcode?: string;
  quantity?: number; // Количество для группированных товаров
}

// Долги теперь управляются только из приходов

const Receipts: React.FC = () => {
  const { canDeleteAnything, user, hasFullAccess } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const [arrivals, setArrivals] = useState<ArrivalItem[]>([]);
  const [loadingArrivals, setLoadingArrivals] = useState(true);
  const [debts, setDebts] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([]);
  
  // Состояние для суммы наличных в кассе (из страницы "Расчеты")
  const [cashInRegisterAmount, setCashInRegisterAmount] = useState<number>(0);
  
  // Загрузка суммы наличных в кассе (просто берем готовое значение)
  const loadCashInRegister = () => {
    const amount = getCashInRegisterAmount();
    setCashInRegisterAmount(amount);
  };
  const [sberRecipients, setSberRecipients] = useState<string[]>([]);
  const [loadingSberRecipients, setLoadingSberRecipients] = useState(false);

  // Загружаем получателей Сбера из API
  const loadSberRecipients = async () => {
    try {
      setLoadingSberRecipients(true);
      const data = await sberRecipientsApi.getAll();
      setSberRecipients(data.map((r: any) => r.name));
    } catch (error) {
      console.error('Ошибка при загрузке получателей Сбера:', error);
      message.error('Ошибка при загрузке получателей Сбера');
    } finally {
      setLoadingSberRecipients(false);
    }
  };
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([]);
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState<string | null>(null);
  const [deliveryZone, setDeliveryZone] = useState<string>('');
  const [payments, setPayments] = useState<PaymentPart[]>([
    { method: 'cash', amount: 0 }
  ]);
  const [discount, setDiscount] = useState<{ type: 'fixed' | 'percent'; value: number }>({ type: 'percent', value: 0 });

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isItemModalVisible, setIsItemModalVisible] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [currentReceiptItems, setCurrentReceiptItems] = useState<ReceiptItem[]>([]);
  const [form] = Form.useForm();
  const [itemForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'completed' | 'cancelled'>('all');
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(7, 'days'),
    dayjs()
  ]);
  const [serialNumberSearch, setSerialNumberSearch] = useState('');
  const [serialNumberSearchTimeout, setSerialNumberSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isDebtChecked, setIsDebtChecked] = useState(false);
  const [adminCache, setAdminCache] = useState<{[key: string]: string}>({});
  
  // Состояние для пагинации
  const [pageSize, setPageSize] = useState<number>(() => {
    const saved = localStorage.getItem('receipts_page_size');
    return saved ? parseInt(saved, 10) : 10;
  });

  // Функция для обработки изменения размера страницы
  const handlePageSizeChange = (current: number, size: number) => {
    setPageSize(size);
    localStorage.setItem('receipts_page_size', size.toString());
  };

  // Функция для очистки всех чеков (только для админов и бухгалтеров)
  const handleClearAllReceipts = async () => {
    if (!hasFullAccess()) {
      message.error('Только администратор или бухгалтер может очищать все записи');
      return;
    }

    Modal.confirm({
      title: 'Очистить все чеки?',
      content: (
        <div>
          <p><strong>Вы действительно хотите удалить ВСЕ чеки?</strong></p>
          <p style={{ color: '#ff4d4f' }}>⚠️ Это действие нельзя отменить!</p>
          <p>Будут удалены:</p>
          <ul>
            <li>Все чеки ({receipts.length} записей)</li>
            <li>Связанные платежи</li>
            <li>История операций</li>
          </ul>
        </div>
      ),
      okText: 'Да, удалить всё',
      cancelText: 'Отмена',
      okType: 'danger',
      width: 500,
      onOk: async () => {
        try {
          const token = localStorage.getItem('admin_token');
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/receipts/clear-all`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const result = await response.json();
            setReceipts([]);
            message.success(`Все чеки удалены: ${result.deletedCount || receipts.length} записей`);
            
            // Логируем действие
            logReceiptAction(
              'Массовое удаление',
              `Удалены все чеки: ${result.deletedCount || receipts.length} записей`,
              'clear_all'
            );
          } else {
            const error = await response.json();
            message.error(error.message || 'Ошибка при удалении чеков');
          }
        } catch (error) {
          console.error('❌ Ошибка при удалении всех чеков:', error);
          message.error('Ошибка при удалении чеков');
        }
      }
    });
  };

  // Функция для получения имени администратора по ID
  const getAdminName = async (adminId: string): Promise<string> => {
    // Если уже есть в кеше, возвращаем
    if (adminCache[adminId]) {
      return adminCache[adminId];
    }

    // Если это уже имя (содержит пробел), возвращаем как есть
    if (adminId && adminId.includes(' ')) {
      return adminId;
    }

    try {
      const token = localStorage.getItem('admin_token');
      console.log('🔍 Запрашиваем информацию об администраторе:', adminId);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technohubstore.net/api'}/admin/users/${adminId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Ответ сервера для админа:', { status: response.status, adminId });

      if (response.ok) {
        const data = await response.json();
        const admin = data.user; // API возвращает { user: { ... } }
        console.log('👤 Данные администратора:', { adminId, data, admin });
        console.log('🔍 Детали полей:', {
          firstName: admin?.firstName,
          lastName: admin?.lastName,
          email: admin?.email,
          hasFirstName: !!admin?.firstName,
          hasLastName: !!admin?.lastName,
          hasEmail: !!admin?.email
        });
        
        const fullName = admin?.firstName && admin?.lastName 
          ? `${admin.firstName} ${admin.lastName}`
          : admin?.firstName || admin?.email || adminId;
        
        console.log('✅ Имя администратора:', fullName);
        
        // Сохраняем в кеш
        setAdminCache(prev => ({ ...prev, [adminId]: fullName }));
        return fullName;
      } else {
        console.warn('❌ Не удалось получить данные администратора:', response.status, adminId);
      }
    } catch (error) {
      console.error('❌ Ошибка при запросе информации об администраторе:', error, adminId);
    }

    // Если не удалось получить, пробуем получить из текущего пользователя
    try {
      const userInfo = localStorage.getItem('admin_user');
      if (userInfo) {
        const user = JSON.parse(userInfo);
        if (user.id === adminId) {
          const name = user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}`
            : user.firstName || user.email || adminId;
          
          console.log('💡 Использую данные текущего пользователя:', name);
          setAdminCache(prev => ({ ...prev, [adminId]: name }));
          return name;
        }
      }
    } catch (error) {
      console.error('Ошибка при получении данных из localStorage:', error);
    }

    // Если ничего не помогло, возвращаем ID
    console.log('🤷 Возвращаю ID как есть:', adminId);
    return adminId;
  };

  // Компонент для отображения имени администратора
  const AdminName: React.FC<{ adminId: string }> = ({ adminId }) => {
    const [displayName, setDisplayName] = useState<string>(adminId || 'Неизвестно');
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
      if (!adminId) {
        setDisplayName('Неизвестно');
        return;
      }

      setLoading(true);
      getAdminName(adminId)
        .then(name => {
          setDisplayName(name || adminId || 'Неизвестно');
        })
        .catch(error => {
          console.error('Error getting admin name:', error);
          setDisplayName(adminId || 'Неизвестно');
        })
        .finally(() => {
          setLoading(false);
        });
    }, [adminId]);

    if (loading) {
      return <span style={{ color: '#8c8c8c' }}>...</span>;
    }

    return <span>{displayName}</span>;
  };

  // Загрузка чеков из API
  const loadReceipts = async () => {
    try {
      setLoadingReceipts(true);
      const data = await receiptsApi.getAll();
      setReceipts(data);
    } catch (error) {
      console.error('Error loading receipts:', error);
      message.error('Ошибка при загрузке чеков');
    } finally {
      setLoadingReceipts(false);
    }
  };

  useEffect(() => {
    loadReceipts();
    loadDebts();
    loadCashInRegister(); // Загружаем сумму наличных в кассе
    
    // Периодически обновляем сумму наличных (на случай изменений на странице "Расчеты")
    const interval = setInterval(loadCashInRegister, 2000); // каждые 2 секунды
    return () => clearInterval(interval);
  }, []);

  // Загрузка долгов
  const loadDebts = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/debts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDebts(data);
      }
    } catch (error) {
      console.error('Error loading debts:', error);
    }
  };

  // Данные платежей теперь загружаются через хук usePaymentsData

  // Проверка оплаты долга по arrivalId
  const isDebtPaid = (arrivalId: string): boolean => {
    return debts.some(debt => debt.arrivalId === arrivalId && debt.status === 'paid');
  };

  // Загружаем получателей Сбера при монтировании
  useEffect(() => {
    loadSberRecipients();
  }, []);

  // Загрузка приходов из API
  useEffect(() => {
    const loadArrivals = async () => {
      try {
        setLoadingArrivals(true);
        const data = await arrivalsApi.getAll();
        // Преобразуем приходы в старый формат для совместимости
        const flatArrivals: ArrivalItem[] = [];
        data.forEach((arrival: any) => {
          const arrivalId = arrival._id || arrival.id; // Используем постоянный ID прихода
          arrival.items?.forEach((item: any) => {
            flatArrivals.push({
              id: item.id,
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              serialNumbers: item.serialNumbers || [],
              barcode: item.barcode,
              price: item.price,
              costPrice: item.costPrice,
              date: arrival.date,
              supplierId: arrival.supplierId,
              supplierName: arrival.supplierName,
              isAccessory: item.isAccessory || false,
              isService: item.isService || false,
              arrivalId: arrivalId // Добавляем постоянный arrivalId
            });
          });
        });
        setArrivals(flatArrivals);
      } catch (error) {
        console.error('Error loading arrivals:', error);
      } finally {
        setLoadingArrivals(false);
      }
    };

    loadArrivals();
  }, []);

  // Загрузка приходов из localStorage
  useEffect(() => {
    const loadArrivals = () => {
      console.log('🔄 Загружаем приходы...');
      
      // Пытаемся загрузить из старого формата для совместимости
      const savedOldFormat = localStorage.getItem('arrivals_old_format');
      if (savedOldFormat) {
        console.log('📂 Найден старый формат приходов');
        const oldFormatData = JSON.parse(savedOldFormat);
        console.log('📂 Загружено приходов из старого формата:', oldFormatData.length);
        
        // Проверяем каждый элемент на наличие isService
        oldFormatData.forEach((item: any, index: number) => {
          console.log(`📂 Проверяем товар ${index + 1}:`, {
            productName: item.productName,
            isService: item.isService,
            isAccessory: item.isAccessory,
            hasIsServiceField: 'isService' in item
          });
        });
        
        setArrivals(oldFormatData);
        return;
      }
      
      // Если старого формата нет, пытаемся конвертировать из нового
      const savedArrivals = localStorage.getItem('arrivals');
      if (savedArrivals) {
        try {
          const parsed = JSON.parse(savedArrivals);
          console.log('📂 Найден новый формат приходов, элементов:', parsed.length);
          
          // Проверяем, если это новый формат (массив Arrival)
          if (parsed.length > 0 && parsed[0].items) {
            console.log('🔄 Конвертируем новый формат в старый...');
            // Конвертируем в старый формат
            const oldFormatArrivals: ArrivalItem[] = [];
            parsed.forEach((arrival: any, arrivalIndex: number) => {
              console.log(`📦 Обрабатываем приход ${arrivalIndex + 1}:`, {
                date: arrival.date,
                supplierName: arrival.supplierName,
                itemsCount: arrival.items.length
              });
              
              arrival.items.forEach((item: any, itemIndex: number) => {
                console.log(`  📝 Товар ${itemIndex + 1}:`, {
                  productName: item.productName,
                  isService: item.isService,
                  isAccessory: item.isAccessory,
                  quantity: item.quantity
                });
                
                const convertedItem = {
                  id: item.id,
                  productId: item.productId,
                  productName: item.productName,
                  quantity: item.quantity,
                  serialNumbers: item.serialNumbers,
                  barcode: item.barcode,
                  price: item.price,
                  costPrice: item.costPrice,
                  date: arrival.date,
                  supplierId: arrival.supplierId,
                  supplierName: arrival.supplierName,
                  notes: arrival.notes,
                  isAccessory: item.isAccessory || false,
                  isService: item.isService || false
                };
                
                console.log(`    🔍 Конвертируем товар:`, {
                  productName: item.productName,
                  originalIsService: item.isService,
                  originalIsAccessory: item.isAccessory,
                  convertedIsService: convertedItem.isService,
                  convertedIsAccessory: convertedItem.isAccessory
                });
                
                oldFormatArrivals.push(convertedItem);
              });
            });
            
            console.log('✅ Конвертировано товаров:', oldFormatArrivals.length);
            console.log('💼 Из них услуг:', oldFormatArrivals.filter(item => item.isService).length);
            console.log('📦 Из них аксессуаров:', oldFormatArrivals.filter(item => item.isAccessory && !item.isService).length);
            console.log('🔧 Из них техники:', oldFormatArrivals.filter(item => !item.isAccessory && !item.isService).length);
            
            setArrivals(oldFormatArrivals);
                      } else {
              console.log('📂 Используем данные как есть (уже старый формат)');
              
              // Проверяем каждый элемент на наличие isService
              parsed.forEach((item: any, index: number) => {
                console.log(`📂 Проверяем товар ${index + 1} (прямой формат):`, {
                  productName: item.productName,
                  isService: item.isService,
                  isAccessory: item.isAccessory,
                  hasIsServiceField: 'isService' in item
                });
              });
              
              // Это уже старый формат
              setArrivals(parsed);
            }
        } catch (error) {
          console.error('❌ Ошибка при разборе приходов:', error);
          setArrivals([]);
        }
      } else {
        console.log('📂 Нет сохраненных приходов');
        setArrivals([]);
      }
    };

    loadArrivals();
    

  }, []);

  // Обновление списка доступных товаров при изменении приходов или чеков
  useEffect(() => {
    console.log('🔄 Обновляем список доступных товаров...');
    console.log('📦 Всего приходов:', arrivals.length);
    
    // Отладочная информация о приходах
    arrivals.forEach((arrival, index) => {
      console.log(`📦 Приход ${index + 1}:`, {
        id: arrival._id || arrival.id || `arrival_${Date.now()}`,
        productName: arrival.productName,
        isService: arrival.isService,
        isAccessory: arrival.isAccessory,
        quantity: arrival.quantity
      });
    });
    
    // Создаем Map для подсчета использованных товаров по arrivalId
    const usedAccessoryCount = new Map<string, number>();
    const usedTechCount = new Map<string, number>();
    const soldSerialNumbers = new Set<string>();
    
    // Собираем все проданные/зарезервированные товары из всех чеков (кроме отмененных)
    console.log('🧾 Всего чеков для анализа:', receipts.length);
    receipts.forEach((receipt, receiptIndex) => {
      if (receipt.status !== 'cancelled') {
        console.log(`📋 Чек ${receiptIndex + 1}: ${receipt.receiptNumber || 'без номера'}, товаров: ${receipt.items.length}`);
        receipt.items.forEach((item, itemIndex) => {
          console.log(`  📦 Товар ${itemIndex + 1}:`, {
            productName: item.productName,
            arrivalId: item.arrivalId,
            serialNumber: item.serialNumber,
            quantity: item.quantity,
            isAccessory: item.isAccessory,
            isService: item.isService
          });
          if (item.isService || item.isAccessory) {
            // Для услуг и аксессуаров увеличиваем счетчик использованных
            const currentCount = usedAccessoryCount.get(item.arrivalId) || 0;
            usedAccessoryCount.set(item.arrivalId, currentCount + item.quantity);
          } else if (item.serialNumber) {
            // Для техники добавляем серийный номер в список использованных
            soldSerialNumbers.add(item.serialNumber);
          } else {
            // Для техники без серийного номера увеличиваем счетчик использованных
            const currentCount = usedTechCount.get(item.arrivalId) || 0;
            usedTechCount.set(item.arrivalId, currentCount + item.quantity);
          }
        });
      }
    });

    const available: AvailableProduct[] = [];
    
    arrivals.forEach((arrival, arrivalIndex) => {
      // Пропускаем товары из приходов с оплаченными долгами (только для не-бухгалтеров)
      const arrivalId = arrival.arrivalId || arrival._id || arrival.id;
      console.log(`🏭 Обрабатываем приход ${arrivalIndex + 1}:`, {
        productName: arrival.productName,
        arrivalId: arrivalId,
        _id: arrival._id,
        id: arrival.id,
        quantity: arrival.quantity,
        isService: arrival.isService,
        isAccessory: arrival.isAccessory,
        barcode: arrival.barcode
      });
      
      if (!canDeleteAnything() && arrivalId && isDebtPaid(arrivalId)) {
        console.log(`💰 Пропускаем товар "${arrival.productName}" - долг оплачен`);
        return;
      }

      if (arrival.isService) {
        console.log('💼 Найдена услуга:', arrival.productName);
        // Для услуг проверяем сколько уже использовано
        const used = usedAccessoryCount.get(arrival.arrivalId || arrival._id || arrival.id || '') || 0;
        const remaining = arrival.quantity - used;
        
        console.log(`💼 Услуга ${arrival.productName}: количество ${arrival.quantity}, использовано ${used}, доступно ${remaining}`);
        
        // Добавляем одну запись с общим количеством
        if (remaining > 0) {
          available.push({
            arrivalId: arrival.arrivalId || arrival._id || arrival.id || `arrival_${Date.now()}`,
            productName: arrival.productName,
            price: arrival.price,
            costPrice: arrival.costPrice,
            isAccessory: true, // Услуги ведут себя как аксессуары
            isService: true,
            supplierId: arrival.supplierId,
            supplierName: arrival.supplierName,
            barcode: arrival.barcode,
            quantity: remaining
          });
        }
      } else if (arrival.isAccessory) {
        console.log('📦 Найден аксессуар:', arrival.productName);
        // Для аксессуаров проверяем сколько уже использовано
        const used = usedAccessoryCount.get(arrival.arrivalId || arrival._id || arrival.id || '') || 0;
        const remaining = arrival.quantity - used;
        
        // Добавляем одну запись с общим количеством
        if (remaining > 0) {
          available.push({
            arrivalId: arrival.arrivalId || arrival._id || arrival.id || `arrival_${Date.now()}`,
            productName: arrival.productName,
            price: arrival.price,
            costPrice: arrival.costPrice,
            isAccessory: true,
            supplierId: arrival.supplierId,
            supplierName: arrival.supplierName,
            barcode: arrival.barcode,
            quantity: remaining
          });
        }
      } else {
        console.log('🔧 Найдена техника:', arrival.productName);
        console.log('🔍 Серийные номера:', arrival.serialNumbers);
        
        // Для техники добавляем только те серийные номера, которые еще не использованы
        if (arrival.serialNumbers && arrival.serialNumbers.length > 0) {
          console.log(`📋 Обрабатываем серийные номера для ${arrival.productName}:`, arrival.serialNumbers);
          arrival.serialNumbers.forEach(serialNumber => {
            if (!soldSerialNumbers.has(serialNumber)) {
              const productToAdd = {
                arrivalId: arrival.arrivalId || arrival._id || arrival.id || `arrival_${Date.now()}`,
                productName: arrival.productName,
                serialNumber,
                price: arrival.price,
                costPrice: arrival.costPrice,
                isAccessory: false,
                supplierId: arrival.supplierId,
                supplierName: arrival.supplierName,
                quantity: 1
              };
              console.log(`➕ Добавляем товар с S/N ${serialNumber}:`, productToAdd);
              available.push(productToAdd);
            } else {
              console.log(`❌ Серийный номер ${serialNumber} уже продан`);
            }
          });
        } else {
          // Если серийных номеров нет, добавляем товар для возможности назначения серийного номера
          const used = usedTechCount.get(arrival.arrivalId || arrival._id || arrival.id || '') || 0;
          const remaining = arrival.quantity - used;
          
          console.log('📊 Количество в приходе:', arrival.quantity, 'Использовано:', used, 'Осталось:', remaining);
          
          for (let i = 0; i < remaining; i++) {
            const productToAdd = {
              arrivalId: arrival.arrivalId || arrival._id || arrival.id || `arrival_${Date.now()}`,
              productName: arrival.productName,
              price: arrival.price,
              costPrice: arrival.costPrice,
              isAccessory: false,
              supplierId: arrival.supplierId,
              supplierName: arrival.supplierName,
              quantity: 1
            };
            console.log(`➕ Добавляем в доступные товар ${i + 1}:`, productToAdd);
            available.push(productToAdd);
          }
        }
      }
    });

    console.log('✅ Итого доступных товаров:', available.length);
    console.log('💼 Из них услуг:', available.filter(p => p.isService).length);
    console.log('📦 Из них аксессуаров:', available.filter(p => p.isAccessory && !p.isService).length);
    console.log('🔧 Из них техники:', available.filter(p => !p.isAccessory && !p.isService).length);

    // Группируем аксессуары и услуги по названию и штрихкоду
    const groupedAvailable = available.reduce((acc, product) => {
      // Для техники (с серийными номерами) не группируем
      if (!product.isAccessory && !product.isService) {
        acc.push(product);
        return acc;
      }

      // Для аксессуаров и услуг группируем по названию и штрихкоду
      const existing = acc.find(p => 
        p.productName === product.productName && 
        p.barcode === product.barcode &&
        p.isAccessory === product.isAccessory &&
        p.isService === product.isService
      );

      if (existing) {
        // Если товар уже есть, увеличиваем количество на количество из прихода
        existing.quantity = (existing.quantity || 0) + (product.quantity || 1);
      } else {
        // Если товара нет, добавляем новый с количеством из прихода
        acc.push({
          ...product,
          quantity: product.quantity || 1
        });
      }

      return acc;
    }, [] as (AvailableProduct & { quantity?: number })[]);

    console.log('✅ После группировки доступных товаров:', groupedAvailable.length);
    setAvailableProducts(groupedAvailable);
  }, [arrivals, receipts]);

  // Загрузка методов доставки
  useEffect(() => {
    const fetchDeliveryMethods = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technohubstore.net/api'}/delivery/active`);
        
        if (response.ok) {
          const data = await response.json();
          
          // Данные приходят в поле deliveryMethods
          if (data.deliveryMethods && Array.isArray(data.deliveryMethods)) {
            setDeliveryMethods(data.deliveryMethods);
          } else {
            setDeliveryMethods([]);
          }
        } else {
          setDeliveryMethods([]);
        }
      } catch (error) {
        console.error('Ошибка загрузки методов доставки:', error);
        
        // Добавляем тестовые методы доставки для отладки
        const testMethods: DeliveryMethod[] = [
          {
            _id: 'test-pickup',
            name: 'Самовывоз',
            costType: 'fixed',
            fixedCost: 0,
            isActive: true
          },
          {
            _id: 'test-courier',
            name: 'Курьерская доставка',
            costType: 'fixed',
            fixedCost: 300,
            isActive: true
          },
          {
            _id: 'test-zone',
            name: 'Доставка по зонам',
            costType: 'zone',
            zonePrices: {
              'inside_mkad': 200,
              'outside_mkad': 400,
              'region': 600
            },
            isActive: true
          }
        ];
        
        setDeliveryMethods(testMethods);
      }
    };

    fetchDeliveryMethods();
  }, []);

  // Функция расчета стоимости доставки
  const calculateDeliveryPrice = (methodId: string, subtotal: number, zone?: string): number => {
    const method = deliveryMethods.find(m => m._id === methodId);
    if (!method) return 0;

    // Если есть порог бесплатной доставки и сумма превышает его
    if (method.freeThreshold && subtotal >= method.freeThreshold) {
      return 0;
    }

    switch (method.costType) {
      case 'fixed':
        return method.fixedCost || 0;
      
      case 'percentage':
        // Проверяем разные возможные поля для процента
        const percentage = method.costPercentage || (method as any).percentage || 0;
        
        // Если процент больше 1, то это процент (например, 6%), нужно делить на 100
        // Если процент меньше 1, то это уже десятичная дробь (например, 0.06)
        const normalizedPercentage = percentage > 1 ? percentage / 100 : percentage;
        return Math.round(subtotal * normalizedPercentage);

      case 'fixed_plus_percentage':
        const fixedPart = method.fixedCost || 0;
        const percentagePart = method.costPercentage || 0;
        const normalizedPercentageForCombo = percentagePart > 1 ? percentagePart / 100 : percentagePart;
        return fixedPart + Math.round(subtotal * normalizedPercentageForCombo);
      
      case 'zone':
        if (!zone || !method.zonePrices) return 0;
        return method.zonePrices[zone] || 0;
      
      default:
        return 0;
    }
  };

  // Функция для проверки и обновления статусов чеков
  const updateReceiptStatuses = () => {
    const now = new Date();
    // Преобразуем текущее время в московское (UTC+3)
    const mskTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
    const mskHours = mskTime.getUTCHours();
    const mskMinutes = mskTime.getUTCMinutes();

    // Проверяем, наступило ли 22:00 по МСК
    if (mskHours === 22 && mskMinutes === 0) {
      setReceipts(prev => prev.map(receipt => {
        // Обновляем статус только для чеков с текущей датой и статусом new или draft
        const receiptDate = new Date(receipt.date);
        const today = new Date();
        if (
          receiptDate.getDate() === today.getDate() &&
          receiptDate.getMonth() === today.getMonth() &&
          receiptDate.getFullYear() === today.getFullYear() &&
          (receipt.status === 'new' || receipt.status === 'draft')
        ) {
          return { ...receipt, status: 'completed' };
        }
        return receipt;
      }));
    }
  };

  // Эффект для запуска таймера проверки времени
  useEffect(() => {
    // Проверяем каждую минуту
    const interval = setInterval(() => {
      updateReceiptStatuses();
    }, 60000); // 60000 мс = 1 минута

    // Очищаем интервал при размонтировании компонента
    return () => clearInterval(interval);
  }, []);

  // Эффект для первоначальной проверки при монтировании компонента
  useEffect(() => {
    updateReceiptStatuses();
  }, []);

  // Обновляем долги при изменениях
  useEffect(() => {
    const handleDebtUpdated = () => {
      loadDebts();
    };

    const handlePaymentUpdated = (e: Event) => {
      console.log('💰 Получено событие обновления платежей - перезагружаем сумму наличных');
      console.log('💰 Детали события:', (e as CustomEvent)?.detail);
      loadCashInRegister(); // Перезагружаем сумму наличных в кассе
    };

    window.addEventListener('debtUpdated', handleDebtUpdated);
    window.addEventListener('debtPaid', handleDebtUpdated);
    window.addEventListener('debtCreated', handleDebtUpdated);
    window.addEventListener('paymentUpdated', handlePaymentUpdated);
    
    return () => {
      window.removeEventListener('debtUpdated', handleDebtUpdated);
      window.removeEventListener('debtPaid', handleDebtUpdated);
      window.removeEventListener('debtCreated', handleDebtUpdated);
      window.removeEventListener('paymentUpdated', handlePaymentUpdated);
    };
  }, []);

  const getStatusColor = (status: Receipt['status']) => {
    switch (status) {
      case 'new': return 'blue';
      case 'draft': return 'orange';
      case 'completed': return 'green';
      case 'cancelled': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status: Receipt['status']) => {
    switch (status) {
      case 'new': return 'Новый';
      case 'draft': return 'Черновик';
      case 'completed': return 'Завершен';
      case 'cancelled': return 'Отменен';
      default: return status;
    }
  };

  const handleCreateReceipt = () => {
    setEditingReceipt(null);
    setCurrentReceiptItems([]);
    setPayments([{ method: 'cash', amount: 0 }]);
    
    // Ищем метод доставки "Самовывоз" и устанавливаем его по умолчанию
    const pickupMethod = deliveryMethods.find(method => 
      method.name.toLowerCase().includes('самовывоз') || 
      method.name.toLowerCase().includes('pickup')
    );
    setSelectedDeliveryMethod(pickupMethod?._id || null);
    setDeliveryZone('');
    
    form.resetFields();
    form.setFieldsValue({ status: 'new', paymentMethod: 'cash' });
    setIsModalVisible(true);
  };

  const handleEditReceipt = (receipt: Receipt) => {
    setEditingReceipt(receipt);
    setCurrentReceiptItems([...receipt.items]);
    setPayments([...receipt.payments]);
    setSelectedDeliveryMethod(receipt.deliveryMethod || null);
    setDeliveryZone(receipt.deliveryZone || '');
    setIsDebtChecked(receipt.isDebt || false);
    form.setFieldsValue({
      status: receipt.status,
      sberRecipient: receipt.payments.find(p => p.method === 'sber_transfer')?.sberRecipient,
      notes: receipt.notes,
      isDebt: receipt.isDebt || false,
      clientName: receipt.clientName || '',
    });
    setIsModalVisible(true);
  };

  const handleDeleteReceipt = async (receiptId: string) => {
    // Находим чек для логирования
    const receiptToDelete = receipts.find(r => r._id === receiptId || r.id === receiptId);
    
    try {
      // Удаляем через API
      await receiptsApi.delete(receiptId);
      setReceipts(prev => prev.filter(r => r._id !== receiptId && r.id !== receiptId));
    
      // Логируем действие
      if (receiptToDelete) {
        const amount = receiptToDelete.totalAmount || receiptToDelete.total || 0;
        logReceiptAction(
          'Удаление чека',
          `Удален чек на сумму ${amount.toLocaleString('ru-RU')} ₽`,
          receiptToDelete.receiptNumber,
          receiptToDelete
        );
      }
      
      message.success('Чек удален');
      
      // Уведомляем другие компоненты об удалении чека
      window.dispatchEvent(new CustomEvent('receiptDeleted', { 
        detail: { receiptId, receipt: receiptToDelete } 
      }));
    } catch (error) {
      console.error('Error deleting receipt:', error);
      message.error('Ошибка при удалении чека');
    }
  };

  const handleSoftDeleteReceipt = async (receiptId: string) => {
    // Находим чек для отображения в модальном окне
    const receiptToDelete = receipts.find(r => r._id === receiptId || r.id === receiptId);
    if (!receiptToDelete) return;

    // Проверяем, не оплачены ли долги по товарам из этого чека (только для не-бухгалтеров)
    if (!canDeleteAnything()) {
      console.log('🚫 Пользователь не может удалять всё, проверяем оплаченные долги...');
      const paidDebtsItems: string[] = [];
      receiptToDelete.items.forEach(item => {
        if (item.arrivalId && isDebtPaid(item.arrivalId)) {
          console.log('💰 Найден товар с оплаченным долгом:', item.productName, 'arrivalId:', item.arrivalId);
          paidDebtsItems.push(item.productName);
        }
      });
      console.log('📋 Всего товаров с оплаченными долгами:', paidDebtsItems.length);

      if (paidDebtsItems.length > 0) {
      Modal.error({
        title: 'Нельзя удалить чек',
        width: 600,
        content: (
          <div>
            <p>Этот чек нельзя удалить, поскольку долги по следующим товарам уже оплачены:</p>
            <ul style={{ marginTop: '12px', marginBottom: '16px' }}>
              {paidDebtsItems.map((productName, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>
                  <strong>{productName}</strong>
                </li>
              ))}
            </ul>
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#fff7e6',
              border: '1px solid #ffd591',
              borderRadius: '6px',
              fontSize: '14px'
            }}>
              <strong>Информация:</strong> Чек содержит товары, за которые долги поставщикам уже оплачены. 
              Отмена таких чеков невозможна для сохранения целостности финансовой отчетности.
            </div>
            <p style={{ marginTop: '12px', fontSize: '14px', color: '#666' }}>
              Для отмены чека необходимо сначала отменить оплату соответствующих долгов на странице "Долги".
            </p>
          </div>
        ),
        okText: 'Понятно'
      });
      return;
      }
    }

    // Подготавливаем информацию о товарах
    const itemsInfo = receiptToDelete.items.map(item => {
      const typeText = item.isService ? 'Услуга' : (item.isAccessory ? 'Аксессуар' : 'Техника');
      const serialText = item.serialNumber ? ` (S/N: ${item.serialNumber})` : '';
      const barcodeText = item.barcode ? ` (Штрихкод: ${item.barcode})` : '';
      return `• ${item.productName} (${typeText})${serialText}${barcodeText} - ${item.quantity} шт. × ${item.price.toLocaleString('ru-RU')} ₽`;
    }).join('\n');

    const totalAmount = receiptToDelete.items.reduce((sum, item) => {
      return sum + (item.price || 0) * (item.quantity || 1);
    }, 0);

    const isAlreadyCancelled = receiptToDelete.status === 'cancelled';
    const isAdminOrAccountant = canDeleteAnything();

    console.log('🗑️ Параметры удаления:', {
      isAlreadyCancelled,
      isAdminOrAccountant,
      receiptStatus: receiptToDelete.status,
      userRole: user?.role
    });

    Modal.confirm({
      title: isAlreadyCancelled && isAdminOrAccountant ? 'Подтверждение полного удаления чека' : 'Подтверждение отмены чека',
      width: 600,
      content: (
        <div>
          <p style={{ marginBottom: '16px' }}>
            <strong>
              {isAlreadyCancelled && isAdminOrAccountant 
                ? `Вы уверены, что хотите полностью удалить отмененный чек ${receiptToDelete.receiptNumber || 'без номера'} из системы?`
                : `Вы уверены, что хотите отменить чек ${receiptToDelete.receiptNumber || 'без номера'}?`
              }
            </strong>
          </p>
          
          <div style={{ marginBottom: '16px' }}>
            <strong>Информация о чеке:</strong>
            <div style={{ marginTop: '8px' }}>
              <div>Дата: {new Date(receiptToDelete.date).toLocaleString('ru-RU')}</div>
              {receiptToDelete.clientName && (
                <div>Клиент: {receiptToDelete.clientName}</div>
              )}
              <div>Общая сумма: {totalAmount.toLocaleString('ru-RU')} ₽</div>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <strong>Товары в чеке:</strong>
            <div style={{ 
              marginTop: '8px', 
              maxHeight: '200px', 
              overflowY: 'auto',
              backgroundColor: '#f5f5f5',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {itemsInfo}
              </pre>
            </div>
          </div>

          <div style={{ 
            padding: '12px', 
            backgroundColor: isAlreadyCancelled && isAdminOrAccountant ? '#fff1f0' : '#fff2e8',
            border: `1px solid ${isAlreadyCancelled && isAdminOrAccountant ? '#ffccc7' : '#ffec3d'}`,
            borderRadius: '6px',
            fontSize: '14px'
          }}>
            <strong>⚠️ Внимание:</strong> {
              isAlreadyCancelled && isAdminOrAccountant 
                ? 'Чек будет полностью удален из системы и не подлежит восстановлению!'
                : 'Чек будет помечен как отмененный и останется в системе с пометкой об отмене.'
            }
          </div>
        </div>
      ),
      okText: isAlreadyCancelled && isAdminOrAccountant ? 'Да, удалить полностью' : 'Да, отменить чек',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: async () => {
        try {
          if (isAlreadyCancelled && isAdminOrAccountant) {
            console.log('🔥 Выполняется полное удаление отмененного чека:', receiptId);
            // Полное удаление чека (только для уже отмененных чеков)
            await receiptsApi.delete(receiptId);
            
            // Удаляем из локального состояния
            setReceipts(prev => prev.filter(r => 
              r._id !== receiptId && r.id !== receiptId
            ));

            // Логируем действие
            logReceiptAction(
              'Полное удаление чека',
              `Полностью удален чек на сумму ${totalAmount.toLocaleString('ru-RU')} ₽ (статус: ${receiptToDelete.status})`,
              receiptToDelete.receiptNumber,
              receiptToDelete
            );
            
            message.success('Чек полностью удален из системы');
          } else {
            console.log('🏷️ Выполняется мягкое удаление (отмена) чека:', receiptId);
            // Обычная отмена чека
            const updatedReceipt = { ...receiptToDelete, status: 'cancelled' as const };
            await receiptsApi.update(receiptId, updatedReceipt);
            
            // Обновляем локальный состояние
            setReceipts(prev => prev.map(r => 
              (r._id === receiptId || r.id === receiptId) 
                ? { ...r, status: 'cancelled' as const }
                : r
            ));

            // Логируем действие
            logReceiptAction(
              'Отмена чека',
              `Отменен чек на сумму ${totalAmount.toLocaleString('ru-RU')} ₽`,
              receiptToDelete.receiptNumber,
              receiptToDelete
            );
            
            message.success('Чек отменен');
          }
          
          // Уведомляем другие компоненты
          if (isAlreadyCancelled && isAdminOrAccountant) {
            window.dispatchEvent(new CustomEvent('receiptDeleted', { 
              detail: { receiptId, receipt: receiptToDelete } 
            }));
          } else {
            window.dispatchEvent(new CustomEvent('receiptCancelled', { 
              detail: { receiptId, receipt: receiptToDelete } 
            }));
          }
        } catch (error) {
          console.error('Error cancelling receipt:', error);
          message.error('Ошибка при отмене чека');
        }
      }
    });
  };

    const handlePrintReceipt = (receipt: Receipt) => {
    try {
      console.log('🖨️ Начинаем печать чека:', receipt.receiptNumber);
      
      // Создаем HTML для печати чека
      const printContent = generateReceiptHTML(receipt);
      
      // Открываем новое окно для печати
      const printWindow = window.open('', '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes');
      
      if (printWindow) {
        // Записываем HTML в новое окно
        printWindow.document.open();
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Ждем загрузки и запускаем печать
        printWindow.onload = function() {
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
            // Закрываем окно после печати (опционально)
            // printWindow.close();
          }, 500);
        };
        
        // Логируем действие
        const amount = receipt.totalAmount || receipt.total || 0;
        logReceiptAction(
          'Печать чека',
          `Распечатан чек на сумму ${amount.toLocaleString('ru-RU')} ₽`,
          receipt.receiptNumber,
          receipt
        );
        
        console.log('🖨️ Окно печати открыто успешно');
        
      } else {
        console.error('🖨️ Не удалось открыть окно печати');
        message.error('Не удалось открыть окно печати. Проверьте настройки блокировщика всплывающих окон в браузере.');
      }
      
    } catch (error) {
      console.error('🖨️ Ошибка при печати чека:', error);
      message.error('Ошибка при печати чека');
    }
  };



  const generateReceiptHTML = (receipt: Receipt): string => {
    console.log('🖨️ Генерируем HTML для чека:', receipt.receiptNumber);
    
    const receiptDate = new Date(receipt.date);
    const formattedDate = receiptDate.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const formattedTime = receiptDate.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const itemsHTML = receipt.items.map(item => {
      const itemTotal = item.total || (item.price * item.quantity);
      return `
        <div style="margin-bottom: 10px;">
          <div style="font-weight: bold; margin-bottom: 3px;">${item.productName}</div>
          ${item.serialNumber ? `<div style="margin-bottom: 3px;">IMEI: ${item.serialNumber}</div>` : ''}
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>Кол-во: ${item.quantity}</span>
            <span>Цена: ${item.price.toLocaleString('ru-RU')} ₽</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span>Скидка: 0 ₽</span>
            <span style="font-weight: bold;">${itemTotal.toLocaleString('ru-RU')} ₽</span>
          </div>
          <div style="border-bottom: 1px dashed #000; margin-top: 5px;"></div>
        </div>
      `;
    }).join('');

    const paymentsHTML = (receipt.payments || []).map(payment => {
      let methodText = '';
      switch (payment.method) {
        case 'cash': methodText = 'Наличные'; break;
        case 'keb': methodText = 'КЭБ'; break;
        case 'sber_transfer': methodText = `Перевод Сбербанк${payment.sberRecipient ? ` → ${payment.sberRecipient}` : ''}`; break;
        default: methodText = payment.method === 'card' ? 'Банковская карта' : payment.method; break;
      }
      return `
        <tr>
          <td style="padding: 4px 8px; text-align: left;">${methodText}</td>
          <td style="padding: 4px 8px; text-align: right; font-weight: bold;">${payment.amount.toLocaleString('ru-RU')} ₽</td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Чек ${receipt.receiptNumber}</title>
        <style>
          body { 
            font-family: 'Courier New', monospace; 
            margin: 0; 
            padding: 5px; 
            font-size: 12px;
            line-height: 1.3;
            width: 57mm;
            background: white;
          }
          .receipt { 
            width: 100%; 
            margin: 0;
            padding: 0;
          }
          .header { 
            text-align: center; 
            margin-bottom: 10px;
            font-size: 11px;
          }
          .company-name { 
            font-size: 12px; 
            font-weight: bold; 
            margin-bottom: 3px; 
          }
          .separator { 
            border-bottom: 1px dashed #000;
            margin: 6px 0;
          }
          .items-section {
            margin: 10px 0;
            font-size: 11px;
          }
          .total-section { 
            margin-top: 10px;
            font-size: 12px;
            text-align: center;
          }
          .footer { 
            text-align: center; 
            margin-top: 10px;
            font-size: 11px;
            line-height: 1.2;
          }
          .signature-line {
            border-bottom: 1px solid #000;
            width: 100%;
            height: 20px;
            margin: 10px 0 5px 0;
          }
          @media print {
            body { margin: 0; padding: 2px; }
            .receipt { width: 57mm; }
          }
        </style>
      </head>
      <body>
                  <div class="receipt">
            <div class="header">
              <div class="company-name">ИП ЗЕЙНАЛОВ Р.Н.</div>
              <div>Митинский Радиорынок</div>
              <div>Пятницкое шоссе, 18</div>
              <div style="text-align: left;">ИНН: 773390915200</div>
              <div style="text-align: left;">СНО: Патент</div>
              <div style="margin-top: 6px; text-align: left;">Кассир: Зейналов Руслан Натикович</div>
            </div>
          
          <div class="separator"></div>
          
          <div class="items-section">
            ${itemsHTML}
          </div>
          
          <div class="total-section">
            <div style="font-weight: bold; margin-bottom: 6px; font-size: 14px;">
              ИТОГО: ${(receipt.totalAmount || receipt.total || 0).toLocaleString('ru-RU')} ₽
            </div>
            <div style="margin-bottom: 6px;">
              ${formattedDate} ${formattedTime}
            </div>
            ${paymentsHTML ? `
              <div style="margin-top: 8px; font-size: 11px;">
                <div style="font-weight: bold; margin-bottom: 4px;">Способы оплаты:</div>
                <table style="width: 100%; border-collapse: collapse;">
                  ${paymentsHTML}
                </table>
              </div>
            ` : ''}
          </div>
          
          <div class="separator"></div>
          
          <div class="footer">
            <div style="margin-bottom: 4px; font-weight: bold; text-align: left; padding-left: 5mm;">Гарантия на технику 2 недели</div>
            <div style="margin-bottom: 6px; text-align: left; padding-left: 5mm;">СПАСИБО ЗА ПОКУПКУ</div>
            <div style="margin-bottom: 6px; text-align: left; padding-left: 5mm;">
              Претензий к качеству<br>
              и внешнему виду товара<br>
              не имею
            </div>
            <div class="signature-line"></div>
            <div style="font-size: 10px; text-align: center;">подпись клиента</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handleAddItem = () => {
    if (availableProducts.length === 0) {
      message.warning('Нет доступных товаров из прихода');
      return;
    }
    itemForm.resetFields();
    setIsItemModalVisible(true);
  };

  const handleAddItemOk = async () => {
    try {
      const values = await itemForm.validateFields();
      const selectedValue = values.arrivalId;
      let selectedProduct: AvailableProduct | undefined;
      let selectedArrivalId: string;

      // Определяем товар в зависимости от типа value
      if (selectedValue.includes('|serial|')) {
        // Для техники value содержит серийный номер
        const [arrivalId, , serialNumber] = selectedValue.split('|');
        selectedArrivalId = arrivalId;
        selectedProduct = availableProducts.find(p => p.arrivalId === arrivalId && p.serialNumber === serialNumber);
      } else {
        // Для услуг и аксессуаров value = arrivalId
        selectedArrivalId = selectedValue;
        const products = availableProducts.filter(p => p.arrivalId === selectedArrivalId);
        selectedProduct = products.length > 0 ? products[0] : undefined;
      }
      
      if (!selectedProduct) {
        message.error('Выбранный товар не найден или недоступен');
        return;
      }

      // Проверяем, не оплачен ли долг по этому приходу (только для не-бухгалтеров)
      if (!canDeleteAnything() && isDebtPaid(selectedArrivalId)) {
        Modal.error({
          title: 'Нельзя добавить товар в чек',
          width: 600,
          content: (
            <div>
              <p>Товар <strong>"{selectedProduct.productName}"</strong> нельзя добавить в чек, поскольку долг по приходу уже оплачен.</p>
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#fff7e6',
                border: '1px solid #ffd591',
                borderRadius: '6px',
                fontSize: '14px',
                marginTop: '12px'
              }}>
                <strong>Информация:</strong> Товары из приходов с оплаченными долгами нельзя добавлять в новые чеки 
                для сохранения целостности финансовой отчетности.
              </div>
              <p style={{ marginTop: '12px', fontSize: '14px', color: '#666' }}>
                Если необходимо продать этот товар, сначала отмените оплату долга на странице "Долги".
              </p>
            </div>
          ),
          okText: 'Понятно'
        });
        return;
      }

      const isAccessory = selectedProduct.isAccessory;
      const isService = selectedProduct.isService;
      const quantity = values.quantity || 1;

      // Для услуг и аксессуаров проверяем доступное количество
      if (isService || isAccessory) {
        // Находим группированный товар в availableProducts
        const groupedProduct = availableProducts.find(p => 
          p.productName === selectedProduct.productName && 
          p.barcode === selectedProduct.barcode &&
          p.isAccessory === selectedProduct.isAccessory &&
          p.isService === selectedProduct.isService
        );
        
        if (!groupedProduct) {
          message.error('Товар не найден в доступных');
          return;
        }
        
        // Подсчитываем сколько уже добавлено в текущий чек
        const alreadyInReceipt = currentReceiptItems
          .filter(item => 
            item.productName === selectedProduct.productName && 
            item.barcode === selectedProduct.barcode &&
            item.isAccessory === selectedProduct.isAccessory &&
            item.isService === selectedProduct.isService
          )
          .reduce((sum, item) => sum + item.quantity, 0);
        
        const maxAvailable = groupedProduct.quantity || 1;
        
        if (quantity + alreadyInReceipt > maxAvailable) {
          message.error(`Доступно только ${maxAvailable - alreadyInReceipt} шт. этого товара`);
          return;
        }
      }
      // Для техники количество всегда 1 и проверяем доступность серийного номера
      else {
        if (quantity !== 1) {
          message.error('Для техники можно выбрать только 1 шт.');
          return;
        }
        // Проверяем, не используется ли уже этот серийный номер в текущем чеке
        const serialNumber = selectedProduct.serialNumber;
        if (currentReceiptItems.some(item => item.serialNumber === serialNumber)) {
          message.error('Этот товар уже добавлен в текущий чек');
          return;
        }
      }
      // Проверяем, есть ли уже товар с таким же названием и штрихкодом
      const existingItemIndex = currentReceiptItems.findIndex(item => 
        item.productName === selectedProduct.productName && 
        item.barcode === selectedProduct.barcode &&
        !item.serialNumber // Только для товаров без серийных номеров (аксессуары, услуги)
      );

      if (existingItemIndex !== -1) {
        // Обновляем существующий товар, увеличивая количество
        setCurrentReceiptItems(prev => prev.map((item, index) => 
          index === existingItemIndex 
            ? {
                ...item,
                quantity: item.quantity + quantity,
                total: item.price * (item.quantity + quantity)
              }
            : item
        ));
        message.success(`Количество товара "${selectedProduct.productName}" увеличено на ${quantity}`);
      } else {
        // Добавляем новый товар
        const newItem: ReceiptItem = {
          id: Date.now().toString(),
          arrivalId: selectedProduct.arrivalId,
          productName: selectedProduct.productName,
          serialNumber: selectedProduct.serialNumber,
          quantity,
          price: selectedProduct.price,
          costPrice: selectedProduct.costPrice,
          total: selectedProduct.price * quantity,
          isAccessory: selectedProduct.isAccessory,
          isService: selectedProduct.isService,
          supplierId: selectedProduct.supplierId,
          supplierName: selectedProduct.supplierName,
          barcode: selectedProduct.barcode
        };

        setCurrentReceiptItems(prev => [...prev, newItem]);
        message.success('Товар добавлен в чек');
      }
      setIsItemModalVisible(false);
      itemForm.resetFields();
      message.success('Товар добавлен в чек');
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setCurrentReceiptItems(prev => prev.filter(item => item.id !== itemId));
    message.success('Товар удален из чека');
  };

  const handleAddSberRecipient = async (newRecipient: string) => {
    try {
      const trimmedRecipient = newRecipient.trim();
      if (trimmedRecipient && !sberRecipients.includes(trimmedRecipient)) {
        // Добавляем через API
        await sberRecipientsApi.create({ name: trimmedRecipient });
        // Обновляем список
        await loadSberRecipients();
        message.success(`Получатель "${trimmedRecipient}" добавлен`);
      }
    } catch (error) {
      console.error('Ошибка при добавлении получателя Сбера:', error);
      message.error('Ошибка при добавлении получателя');
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash': return 'Наличные';
      case 'keb': return 'КЕБ';
      case 'sber_transfer': return 'Перевод на Сбер';
      default: return method;
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash': return '#52c41a';
      case 'keb': return '#1890ff';
      case 'sber_transfer': return '#fa8c16';
      default: return '#8c8c8c';
    }
  };

  // Генерация номера чека
  const generateReceiptNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6); // последние 6 цифр
    return `ЧЕК-${year}${month}${day}-${timestamp}`;
  };

  const handleAddPayment = () => {
    if (payments.length === 1) {
      // Если это первое разделение оплаты, обнуляем сумму первого способа
      setPayments(prev => [
        { ...prev[0], amount: 0 },
        { method: 'cash', amount: 0 }
      ]);
    } else {
      setPayments(prev => [...prev, { method: 'cash', amount: 0 }]);
    }
  };

  const handleRemovePayment = (index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  };

  const handlePaymentChange = (index: number, field: keyof PaymentPart, value: any) => {
    setPayments(prev => prev.map((payment, i) => 
      i === index
        ? { ...payment, [field]: value }
        : payment
    ));
  };

  // Добавляем функцию для расчета общей суммы чека с учетом скидки
  const calculateTotalAmount = () => {
    const subtotal = currentReceiptItems.reduce((sum, item) => sum + item.total, 0);
    const deliveryPrice = selectedDeliveryMethod 
      ? calculateDeliveryPrice(selectedDeliveryMethod, subtotal, deliveryZone)
      : 0;
    
    // Применяем скидку
    let discountAmount = 0;
    if (discount.value > 0) {
      if (discount.type === 'percent') {
        discountAmount = subtotal * (discount.value / 100);
      } else {
        discountAmount = discount.value;
      }
    }
    
    return {
      subtotal,
      discountAmount,
      deliveryPrice,
      total: subtotal - discountAmount + deliveryPrice
    };
  };

  // Обновляем useEffect для автоматического обновления суммы первого способа оплаты
  useEffect(() => {
    if (payments.length === 1) {
      const totalAmount = calculateTotalAmount();
      setPayments(prev => [{
        ...prev[0],
        amount: totalAmount.total
      }]);
    }
  }, [currentReceiptItems, selectedDeliveryMethod, deliveryZone]);

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (currentReceiptItems.length === 0) {
        message.error('Добавьте хотя бы один товар в чек');
        return;
      }

      // Проверяем сумму оплат
      const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const calculatedAmounts = calculateTotalAmount();
      const totalAmount = calculatedAmounts.total;

      if (Math.abs(totalPayments - totalAmount) > 0.01) {
        message.error(`Сумма оплат (${totalPayments}₽) не совпадает с суммой чека (${totalAmount}₽)`);
        return;
      }

      // Проверяем, что для Сбера указан получатель
      const hasSberWithoutRecipient = payments.some(p => 
        p.method === 'sber_transfer' && !p.sberRecipient
      );
      if (hasSberWithoutRecipient) {
        message.error('Укажите получателя для перевода на Сбер');
        return;
      }
      
      let newReceipt: Receipt;
      
      if (editingReceipt) {
        const updatedReceipt = { 
          ...editingReceipt, 
          ...values,
          items: currentReceiptItems,
          totalAmount,
          payments,
          deliveryMethod: selectedDeliveryMethod || undefined,
          deliveryPrice: calculatedAmounts.deliveryPrice,
          deliveryZone: deliveryZone || undefined,
          discountInfo: discount.value > 0 ? discount : undefined,
          updatedAt: new Date().toISOString(),
          isDebt: values.isDebt || false,
          clientName: values.isDebt ? values.clientName : undefined,
          debtPaid: editingReceipt.debtPaid || false
        };
        
        setReceipts(prev => prev.map(receipt => 
          receipt.id === editingReceipt.id ? updatedReceipt : receipt
        ));

        // Логируем действие
        logReceiptAction(
          'Редактирование чека',
          `Обновлен чек на сумму ${updatedReceipt.totalAmount.toLocaleString('ru-RU')} ₽`,
          updatedReceipt.receiptNumber,
          updatedReceipt
        );

        // Долги теперь создаются только из приходов, не из чеков

        message.success('Чек обновлен');
      } else {
        // Создание нового чека
        
        // Проверяем цены товаров перед созданием чека
        const invalidPriceItems = currentReceiptItems.filter(item => 
          item.price < item.costPrice
        );
        
        if (invalidPriceItems.length > 0) {
          Modal.error({
            title: 'Ошибка цены товара',
            width: 500,
            content: (
              <div>
                <p>Следующие товары имеют цену продажи ниже закупочной цены:</p>
                <ul style={{ marginTop: '12px', marginBottom: '16px' }}>
                  {invalidPriceItems.map((item, index) => (
                    <li key={index} style={{ marginBottom: '8px' }}>
                      <strong>{item.productName}</strong>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        Цена продажи: {item.price.toLocaleString('ru-RU')} ₽, 
                        Закупка: {item.costPrice.toLocaleString('ru-RU')} ₽
                      </div>
                    </li>
                  ))}
                </ul>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: '#fff7e6',
                  border: '1px solid #ffd591',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}>
                  <strong>Внимание:</strong> Цена продажи не может быть меньше закупочной цены. 
                  Пожалуйста, скорректируйте цены товаров.
                </div>
              </div>
            ),
            okText: 'Понятно'
          });
          return;
        }
        
        // Подготавливаем данные в формате, соответствующем модели Receipt в бэкенде
        const receiptItems = currentReceiptItems.map(item => ({
          arrivalId: item.arrivalId || item.id || Date.now().toString(),
          productName: item.productName,
          serialNumber: item.serialNumber,
          quantity: item.quantity,
          price: item.price,
          costPrice: item.costPrice || 0,
          total: item.total || (item.price * item.quantity),
          isAccessory: item.isAccessory || false,
          isService: item.isService || false,
          supplierId: item.supplierId,
          supplierName: item.supplierName
        }));

        // Определяем способ оплаты для бэкенда
        let paymentMethod: 'cash' | 'card' | 'transfer' | 'mixed' = 'cash';
        if (payments && payments.length > 0) {
          if (payments.length === 1) {
            const payment = payments[0];
            if (payment.method === 'keb') paymentMethod = 'card';
            else if (payment.method === 'sber_transfer') paymentMethod = 'transfer';
            else paymentMethod = 'cash';
          } else {
            paymentMethod = 'mixed';
          }
        }

        // Подготавливаем платежи с полями инкассации
        const paymentsWithCashRegister = payments.map(payment => ({
          ...payment,
          inCashRegister: payment.method === 'cash', // Только наличные попадают в кассу
          cashRegisterDate: payment.method === 'cash' ? new Date() : undefined
        }));

        // Данные для отправки в бэкенд (соответствуют модели Receipt)
        const backendReceiptData = {
          date: new Date(),
          items: receiptItems,
          subtotal: totalAmount - (calculatedAmounts.deliveryPrice || 0),
          discount: 0,
          tax: 0,
          total: totalAmount,
          paymentMethod,
          payments: paymentsWithCashRegister, // Добавляем массив платежей для интеграции с расчетами
          deliveryMethod: selectedDeliveryMethod || undefined,
          deliveryCost: calculatedAmounts.deliveryPrice || 0,
          status: 'new' as const,
          notes: values.notes || '',
          customerName: values.isDebt ? values.clientName : undefined,
          customerPhone: undefined,
          customerEmail: undefined,
          createdBy: getCurrentAdminName(),
          isDebt: values.isDebt || false,
          debtPaid: false
        };

        console.log('🔍 Frontend отправляет данные чека:', {
          isDebt: values.isDebt,
          clientName: values.clientName,
          customerName: backendReceiptData.customerName,
          isDebtChecked: isDebtChecked,
          formValues: form.getFieldsValue(),
          allValues: values
        });
        
        // Дополнительная проверка
        if (values.isDebt && !values.clientName) {
          console.warn('⚠️ ПРЕДУПРЕЖДЕНИЕ: Чек создается в долг, но clientName пустое!', {
            isDebt: values.isDebt,
            clientName: values.clientName,
            formData: form.getFieldsValue()
          });
        }

        // Создаем локальный объект чека для фронтенда
        const receiptNumber = generateReceiptNumber();
        newReceipt = {
          id: Date.now().toString(),
          receiptNumber,
          date: new Date().toISOString(),
          items: currentReceiptItems,
          totalAmount,
          status: 'new',
          payments,
          notes: values.notes || '',
          createdBy: getCurrentAdminName(),
          deliveryMethod: selectedDeliveryMethod || undefined,
          deliveryPrice: calculatedAmounts.deliveryPrice,
          deliveryZone: deliveryZone || undefined,
          discountInfo: discount.value > 0 ? discount : undefined,
          updatedAt: new Date().toISOString(),
          isDebt: values.isDebt || false,
          clientName: values.isDebt ? values.clientName : undefined,
          debtPaid: false
        };
        console.log('🧾 Создаем чек с платежами:', payments);
        console.log('🧾 Детали платежей:', JSON.stringify(payments, null, 2));
        console.log('🧾 Данные для бэкенда:', backendReceiptData);
        console.log('🧾 Детали данных для бэкенда:', JSON.stringify(backendReceiptData, null, 2));
        
        try {
          const savedReceipt = await receiptsApi.create(backendReceiptData);
          console.log('🧾 Чек сохранен в API:', savedReceipt);
          console.log('🧾 Детали сохраненного чека:', JSON.stringify(savedReceipt, null, 2));
          setReceipts(prev => [savedReceipt, ...prev]);
          
          // Уведомляем другие компоненты о создании нового чека
          window.dispatchEvent(new CustomEvent('receiptCreated', { 
            detail: { receipt: savedReceipt } 
          }));
          console.log('🧾 Отправлено событие receiptCreated для чека:', savedReceipt.receiptNumber);
        } catch (error) {
          console.error('Error saving receipt:', error);
          
          // Проверяем, является ли это ошибкой с недоступными товарами
          const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
          
          if (errorMessage.includes('Невозможно создать чек. Следующие товары недоступны:') || 
              errorMessage.includes('Невозможно создать чек. Данные товаров изменились:')) {
            
            // Определяем тип проблемы
            const isDataChanged = errorMessage.includes('Данные товаров изменились:');
            const title = isDataChanged ? 'Данные товаров изменились' : 'Товары недоступны';
            const mainText = isDataChanged 
              ? 'Информация о товарах в чеке устарела:'
              : 'Некоторые товары в чеке больше недоступны:';
            
            // Показываем детальное модальное окно для ошибок с товарами
            Modal.error({
              title: `Невозможно создать чек: ${title}`,
              width: 700,
              content: (
                <div>
                  <p style={{ marginBottom: '16px', fontWeight: 'bold', color: '#ff4d4f' }}>
                    {mainText}
                  </p>
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#fff2f0',
                    border: '1px solid #ffccc7',
                    borderRadius: '6px',
                    fontSize: '14px',
                    whiteSpace: 'pre-line',
                    fontFamily: 'monospace',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    {errorMessage.replace(/^Невозможно создать чек\. [^:]+: ?/, '')}
                  </div>
                  <p style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
                    <strong>Возможные причины:</strong>
                    <br />• Приход был отредактирован другим администратором
                    <br />• Товар был удален или исключен из прихода
                    <br />• Изменились цены или количество товаров
                    <br />• Изменился поставщик товара
                  </p>
                  <p style={{ marginTop: '12px', fontSize: '14px', color: '#666' }}>
                    <strong>Что делать:</strong>
                    <br />• Обновите страницу для получения актуальных данных
                    <br />• Пересоздайте чек с новыми товарами
                    <br />• Или удалите проблемные товары из текущего чека
                  </p>
                  {isDataChanged && (
                    <div style={{ 
                      marginTop: '16px', 
                      padding: '12px', 
                      backgroundColor: '#fffbe6',
                      border: '1px solid #ffe58f',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}>
                      <strong>💡 Рекомендация:</strong> Данная ошибка часто возникает, когда приход редактируется 
                      во время создания чека. Рекомендуется обновить страницу и создать чек заново.
                    </div>
                  )}
                </div>
              ),
              okText: 'Понятно',
              onOk: () => {
                if (isDataChanged) {
                  message.info('Рекомендуется обновить страницу для получения актуальных данных о товарах');
                } else {
                  message.info('Проверьте список товаров в чеке и удалите недоступные позиции');
                }
              }
            });
          } else {
            // Обычная ошибка
            message.error(`Ошибка при сохранении чека: ${errorMessage}`);
          }
          return;
        }

        // Логируем действие
        logReceiptAction(
          'Создание чека',
          `Создан чек на сумму ${totalAmount.toLocaleString('ru-RU')} ₽`,
          newReceipt.receiptNumber,
          newReceipt
        );

        // Долги теперь создаются только из приходов, не из чеков

        message.success(`Чек ${newReceipt.receiptNumber} создан`);
      }
      
      setIsModalVisible(false);
      setCurrentReceiptItems([]);
      setPayments([{ method: 'cash', amount: 0 }]);
      
      // Сбрасываем способ доставки на самовывоз
      const pickupMethod = deliveryMethods.find(method => 
        method.name.toLowerCase().includes('самовывоз') || 
        method.name.toLowerCase().includes('pickup')
      );
      setSelectedDeliveryMethod(pickupMethod?._id || null);
      setDeliveryZone('');
      setSerialNumberSearch('');
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setCurrentReceiptItems([]);
    setPayments([{ method: 'cash', amount: 0 }]);
    setDiscount({ type: 'percent', value: 0 });
    
    // Сбрасываем способ доставки на самовывоз
    const pickupMethod = deliveryMethods.find(method => 
      method.name.toLowerCase().includes('самовывоз') || 
      method.name.toLowerCase().includes('pickup')
    );
    setSelectedDeliveryMethod(pickupMethod?._id || null);
    setDeliveryZone('');
    setSerialNumberSearch('');
    setIsDebtChecked(false);
    form.resetFields();
  };

  // Функция для изменения значения поиска (без поиска)
  const handleProductSearchChange = (value: string) => {
    setSerialNumberSearch(value);
    
    // Очищаем предыдущий таймаут, если он был
    if (serialNumberSearchTimeout) {
      clearTimeout(serialNumberSearchTimeout);
    }

    // Если строка поиска пустая, не делаем ничего
    if (!value.trim()) return;

    // Устанавливаем новый таймаут на 2 секунды
    const timeout = setTimeout(() => {
      performProductSearch(value);
    }, 2000);

    setSerialNumberSearchTimeout(timeout);
  };

  // Функция для поиска при потере фокуса
  const handleProductSearchBlur = () => {
    if (serialNumberSearch.trim()) {
      // Очищаем таймаут если есть
      if (serialNumberSearchTimeout) {
        clearTimeout(serialNumberSearchTimeout);
      }
      performProductSearch(serialNumberSearch);
    }
  };

  // Функция быстрого добавления товара из выпадающего списка
  const handleQuickAddProduct = (key: string, product: any) => {
    try {
      let selectedProduct: AvailableProduct | undefined;
      let selectedArrivalId: string;

      // Определяем товар в зависимости от типа key
      if (key.includes('|serial|')) {
        // Для техники key содержит серийный номер
        const [arrivalId, , serialNumber] = key.split('|');
        selectedArrivalId = arrivalId;
        selectedProduct = availableProducts.find(p => p.arrivalId === arrivalId && p.serialNumber === serialNumber);
      } else {
        // Для услуг и аксессуаров key = arrivalId
        selectedArrivalId = key;
        selectedProduct = product;
      }
      
      if (!selectedProduct) {
        message.error('Товар не найден или недоступен');
        return;
      }

      // Проверяем, не оплачен ли долг по этому приходу (только для не-бухгалтеров)
      if (!canDeleteAnything() && isDebtPaid(selectedArrivalId)) {
        Modal.error({
          title: 'Нельзя добавить товар в чек',
          width: 600,
          content: (
            <div>
              <p>Товар <strong>"{selectedProduct.productName}"</strong> нельзя добавить в чек, поскольку долг по приходу уже оплачен.</p>
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#fff7e6',
                border: '1px solid #ffd591',
                borderRadius: '6px',
                fontSize: '14px',
                marginTop: '12px'
              }}>
                <strong>Информация:</strong> Товары из приходов с оплаченными долгами нельзя добавлять в новые чеки 
                для сохранения целостности финансовой отчетности.
              </div>
              <p style={{ marginTop: '12px', fontSize: '14px', color: '#666' }}>
                Если необходимо продать этот товар, сначала отмените оплату долга на странице "Долги".
              </p>
            </div>
          ),
          okText: 'Понятно'
        });
        return;
      }

      const isAccessory = selectedProduct.isAccessory;
      const isService = selectedProduct.isService;
      const quantity = 1; // По умолчанию добавляем 1 шт

      // Для услуг и аксессуаров проверяем доступное количество
      if (isService || isAccessory) {
        // Находим группированный товар в availableProducts
        const groupedProduct = availableProducts.find(p => 
          p.productName === selectedProduct.productName && 
          p.barcode === selectedProduct.barcode &&
          p.isAccessory === selectedProduct.isAccessory &&
          p.isService === selectedProduct.isService
        );
        
        if (!groupedProduct) {
          message.error('Товар не найден в доступных');
          return;
        }
        
        // Подсчитываем сколько уже добавлено в текущий чек
        const alreadyInReceipt = currentReceiptItems
          .filter(item => 
            item.productName === selectedProduct.productName && 
            item.barcode === selectedProduct.barcode &&
            item.isAccessory === selectedProduct.isAccessory &&
            item.isService === selectedProduct.isService
          )
          .reduce((sum, item) => sum + item.quantity, 0);
        
        const maxAvailable = groupedProduct.quantity || 1;
        
        if (quantity + alreadyInReceipt > maxAvailable) {
          message.error(`Доступно только ${maxAvailable - alreadyInReceipt} шт. этого товара`);
          return;
        }

        // Проверяем, есть ли уже товар с таким же названием и штрихкодом
        const existingItem = currentReceiptItems.find(item => 
          item.productName === selectedProduct.productName && 
          item.barcode === selectedProduct.barcode &&
          !item.serialNumber // Только для товаров без серийных номеров
        );
        if (existingItem) {
          // Увеличиваем количество существующего товара
          const newQuantity = existingItem.quantity + 1;
          const newTotal = existingItem.price * newQuantity;
          
          setCurrentReceiptItems(prev => prev.map(item => 
            item.id === existingItem.id
              ? { ...item, quantity: newQuantity, total: newTotal }
              : item
          ));
          
          message.success(`Количество "${selectedProduct.productName}" увеличено до ${newQuantity} шт.`);
          return;
        }
      }
      // Для техники проверяем что серийный номер не используется
      else {
        const serialNumber = selectedProduct.serialNumber;
        if (currentReceiptItems.some(item => item.serialNumber === serialNumber)) {
          message.error('Этот товар уже добавлен в текущий чек');
          return;
        }
      }

      const newItem: ReceiptItem = {
        id: Date.now().toString(),
        arrivalId: selectedProduct.arrivalId,
        productName: selectedProduct.productName,
        serialNumber: selectedProduct.serialNumber,
        quantity,
        price: selectedProduct.price,
        costPrice: selectedProduct.costPrice,
        total: selectedProduct.price * quantity,
        isAccessory: selectedProduct.isAccessory,
        isService: selectedProduct.isService,
        supplierId: selectedProduct.supplierId,
        supplierName: selectedProduct.supplierName,
        barcode: selectedProduct.barcode
      };

      setCurrentReceiptItems(prev => [...prev, newItem]);
      message.success(`Товар "${selectedProduct.productName}" добавлен в чек`);
    } catch (error) {
      console.error('Ошибка при быстром добавлении товара:', error);
      message.error('Не удалось добавить товар');
    }
  };

  // Основная функция поиска товара
  const performProductSearch = (value: string) => {
    const searchTerm = value.trim().toLowerCase();
    console.log('�� Performing product search:', searchTerm);
    
    if (!searchTerm) {
      console.log('❌ Empty search term, clearing results');
      setAvailableProducts([]);
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'https://technohubstore.net/api';
    const url = `${apiUrl}/arrivals/available-products?search=${encodeURIComponent(searchTerm)}`;
    console.log('🌐 Fetching products from:', url);

    fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
      .then(response => {
        console.log('📥 Response status:', response.status);
        return response.json();
      })
      .then(data => {
        console.log('📦 Received products:', data);
        if (Array.isArray(data)) {
          console.log('✅ Setting available products:', data.length, 'items');
          setAvailableProducts(data);
        } else {
          console.error('❌ Unexpected response format:', data);
          message.error('Ошибка при поиске товаров');
        }
      })
      .catch(error => {
        console.error('❌ Error searching products:', error);
        message.error('Ошибка при поиске товаров');
      });
  };

  // Функция для изменения цены товара в чеке
  const handleUpdateItemPrice = (itemId: string, newPrice: number) => {
    if (newPrice <= 0) {
      message.error('Цена должна быть больше нуля');
      return;
    }

    const item = currentReceiptItems.find(i => i.id === itemId);
    if (item && item.costPrice && newPrice < item.costPrice) {
      message.warning(`Цена продажи (${newPrice.toLocaleString('ru-RU')} ₽) меньше цены закупки (${item.costPrice.toLocaleString('ru-RU')} ₽)`);
      // Но все равно позволяем установить цену (может быть акция)
    }

    setCurrentReceiptItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updatedTotal = newPrice * item.quantity;
        return {
          ...item,
          price: newPrice,
          total: updatedTotal
        };
      }
      return item;
    }));
  };

  // Функция для изменения количества товара в чеке
  const handleUpdateItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      message.error('Количество должно быть больше нуля');
      return;
    }

    const item = currentReceiptItems.find(i => i.id === itemId);
    if (!item) return;

    // Проверяем доступное количество для аксессуаров и услуг
    if (item.isAccessory || item.isService) {
      // Находим группированный товар в availableProducts
      const groupedProduct = availableProducts.find(p => 
        p.productName === item.productName && 
        p.barcode === item.barcode &&
        p.isAccessory === item.isAccessory &&
        p.isService === item.isService
      );
      
      if (!groupedProduct) {
        message.error('Товар не найден в доступных');
        return;
      }
      
      // Подсчитываем сколько уже добавлено в текущий чек (исключая текущий товар)
      const alreadyInReceipt = currentReceiptItems
        .filter(i => 
          i.productName === item.productName && 
          i.barcode === item.barcode &&
          i.isAccessory === item.isAccessory &&
          i.isService === item.isService &&
          i.id !== itemId
        )
        .reduce((sum, i) => sum + i.quantity, 0);
      
      const maxAvailable = groupedProduct.quantity || 1;
      
      if (newQuantity + alreadyInReceipt > maxAvailable) {
        message.error(`Доступно только ${maxAvailable - alreadyInReceipt} шт. этого товара`);
        return;
      }
    } else {
      // Для техники количество всегда 1
      if (newQuantity !== 1) {
        message.error('Для техники можно выбрать только 1 шт.');
        return;
      }
    }

    setCurrentReceiptItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updatedTotal = item.price * newQuantity;
        return {
          ...item,
          quantity: newQuantity,
          total: updatedTotal
        };
      }
      return item;
    }));
    message.success('Количество товара обновлено');
  };

  // Функция проверки точного совпадения серийного номера или штрихкода
  const handleInstantMatch = (searchTerm: string) => {
    const trimmedTerm = searchTerm.trim();
    if (!trimmedTerm) return false;

    // Ищем точное совпадение по серийному номеру
    const exactSerialMatch = availableProducts.find(product => 
      product.serialNumber && product.serialNumber === trimmedTerm
    );

    if (exactSerialMatch) {
      console.log('⚡ Мгновенное добавление по серийному номеру:', exactSerialMatch);
      const key = `${exactSerialMatch.arrivalId}|serial|${exactSerialMatch.serialNumber}`;
      handleQuickAddProduct(key, exactSerialMatch);
      return true;
    }

    // Ищем точное совпадение по штрихкоду
    const exactBarcodeMatch = availableProducts.find(product => 
      product.barcode && product.barcode === trimmedTerm
    );

    if (exactBarcodeMatch) {
      console.log('⚡ Мгновенное добавление по штрихкоду:', exactBarcodeMatch);
      const key = exactBarcodeMatch.arrivalId;
      handleQuickAddProduct(key, exactBarcodeMatch);
      return true;
    }

    return false;
  };

  // Функция автоматического добавления товара при выходе из поля
  const handleAutoAddProduct = () => {
    const searchTerm = serialNumberSearch.trim();
    if (!searchTerm) return;

    // Ищем точное совпадение по серийному номеру (для техники)
    const exactSerialMatch = availableProducts.find(product => 
      product.serialNumber && product.serialNumber.toLowerCase() === searchTerm.toLowerCase()
    );

    if (exactSerialMatch) {
      // Найден товар по серийному номеру
      console.log('🎯 Найдено точное совпадение по серийному номеру:', exactSerialMatch);
      const key = `${exactSerialMatch.arrivalId}|serial|${exactSerialMatch.serialNumber}`;
      handleQuickAddProduct(key, exactSerialMatch);
      return;
    }

    // Ищем точное совпадение по штрихкоду (для аксессуаров)
    const exactBarcodeMatch = availableProducts.find(product => 
      product.barcode && product.barcode.toLowerCase() === searchTerm.toLowerCase()
    );

    if (exactBarcodeMatch) {
      // Найден товар по штрихкоду
      console.log('🏷️ Найдено точное совпадение по штрихкоду:', exactBarcodeMatch);
      const key = exactBarcodeMatch.arrivalId;
      handleQuickAddProduct(key, exactBarcodeMatch);
      return;
    }

    // Ищем точное совпадение по названию товара
    const exactNameMatch = availableProducts.find(product => 
      product.productName.toLowerCase() === searchTerm.toLowerCase()
    );

    if (exactNameMatch) {
      // Найден товар по названию
      let key: string;
      if (exactNameMatch.serialNumber) {
        // Для техники с серийным номером
        key = `${exactNameMatch.arrivalId}|serial|${exactNameMatch.serialNumber}`;
      } else {
        // Для услуг и аксессуаров
        key = exactNameMatch.arrivalId;
      }
      handleQuickAddProduct(key, exactNameMatch);
      return;
    }

    // Ищем частичное совпадение по названию
    const partialNameMatches = availableProducts.filter(product => 
      product.productName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (partialNameMatches.length === 1) {
      // Найден один товар по частичному совпадению названия
      const product = partialNameMatches[0];
      let key: string;
      if (product.serialNumber) {
        // Для техники с серийным номером
        key = `${product.arrivalId}|serial|${product.serialNumber}`;
      } else {
        // Для услуг и аксессуаров
        key = product.arrivalId;
      }
      handleQuickAddProduct(key, product);
      return;
    }

    // Если ничего не найдено или найдено больше одного товара
    if (partialNameMatches.length === 0) {
      message.warning(`Товар "${searchTerm}" не найден`);
    } else {
      message.info(`Найдено ${partialNameMatches.length} товаров. Уточните поиск или используйте кнопку "Выбрать из списка".`);
    }
  };

  // Очищаем таймаут при размонтировании компонента
  useEffect(() => {
    return () => {
      if (serialNumberSearchTimeout) {
        clearTimeout(serialNumberSearchTimeout);
      }
    };
  }, [serialNumberSearchTimeout]);

  // Создаем компонент для развернутой строки, чтобы можно было использовать хуки
  const ExpandedRow: React.FC<{ record: Receipt }> = ({ record }) => {
    const [showPurchasePrice, setShowPurchasePrice] = useState(false);

    if (!record || !Array.isArray(record.items)) {
      return <div>Нет данных</div>;
    }

    // Правильно считаем общие суммы
    const totalSum = record.items.reduce((sum, item) => {
      const itemTotal = (item.price || 0) * (item.quantity || 1);
      return sum + itemTotal;
    }, 0);

    const totalPurchaseSum = record.items.reduce((sum, item) => {
      const itemPurchaseTotal = (item.costPrice || 0) * (item.quantity || 1);
      return sum + itemPurchaseTotal;
    }, 0);

    const profit = totalSum - totalPurchaseSum;

    return (
      <div style={{ 
        padding: '8px 12px',
        background: '#fafafa',
        margin: '-4px -8px',
        borderRadius: '4px'
      }}>
        {/* Кнопка показа/скрытия закупочных цен */}
        <div style={{ 
          marginBottom: '8px',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <Button
            type="text"
            size="small"
            onClick={() => setShowPurchasePrice(!showPurchasePrice)}
            icon={showPurchasePrice ? <EyeOutlined /> : <EyeInvisibleOutlined />}
            style={{ fontSize: '12px', height: '24px' }}
          >
            {showPurchasePrice ? 'Скрыть закупку' : 'Показать закупку'}
          </Button>
        </div>

        {/* Список товаров */}
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          {record.items.map((item, index) => {
            if (!item) return null;
            
            const itemTotal = (item.price || 0) * (item.quantity || 1);
            const itemPurchaseTotal = (item.costPrice || 0) * (item.quantity || 1);
            const itemProfit = itemTotal - itemPurchaseTotal;
            
            return (
              <div key={index} style={{ 
                padding: '6px 8px',
                background: 'white',
                borderRadius: '4px',
                boxShadow: '0 1px 1px rgba(0,0,0,0.05)',
                fontSize: '13px'
              }}>
                {/* Название и теги */}
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '4px'
                }}>
                  <span style={{ 
                    fontWeight: 500,
                    fontSize: '13px'
                  }}>
                    {item.productName || 'Без названия'}
                  </span>
                  {!item.isAccessory && !item.isService && <Tag color="green" style={{ fontSize: '10px', margin: 0, padding: '0 4px', lineHeight: '16px' }}>Техника</Tag>}
                  {item.isAccessory && !item.isService && <Tag color="blue" style={{ fontSize: '10px', margin: 0, padding: '0 4px', lineHeight: '16px' }}>Аксессуар</Tag>}
                  {item.isService && <Tag color="orange" style={{ fontSize: '10px', margin: 0, padding: '0 4px', lineHeight: '16px' }}>Услуга</Tag>}
                </div>

                {/* Серийный номер для техники или штрихкод для аксессуаров */}
                {(!item.isAccessory && !item.isService && item.serialNumber) && (
                  <div style={{ marginBottom: '4px' }}>
                    <Tag
                      color="default"
                      style={{ 
                        cursor: 'pointer', 
                        fontSize: '11px', 
                        margin: 0, 
                        padding: '2px 6px',
                        backgroundColor: '#f0f0f0',
                        border: '1px solid #d9d9d9'
                      }}
                      icon={<CopyOutlined />}
                      onClick={() => copyToClipboard(item.serialNumber!)}
                    >
                      S/N: {item.serialNumber}
                    </Tag>
                  </div>
                )}
                {(item.isAccessory && !item.isService && item.barcode) && (
                  <div style={{ marginBottom: '4px' }}>
                    <Tag
                      color="default"
                      style={{ 
                        cursor: 'pointer', 
                        fontSize: '11px', 
                        margin: 0, 
                        padding: '2px 6px',
                        backgroundColor: '#f0f0f0',
                        border: '1px solid #d9d9d9'
                      }}
                      icon={<CopyOutlined />}
                      onClick={() => copyToClipboard(item.barcode!)}
                    >
                      Штрихкод: {item.barcode}
                    </Tag>
                  </div>
                )}

                {/* Цены и количество */}
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '8px',
                  fontSize: '12px'
                }}>
                  <div>
                    <span style={{ color: '#8c8c8c' }}>Кол-во:</span>
                    <span style={{ marginLeft: '4px', fontWeight: 500 }}>{item.quantity || 1} шт.</span>
                  </div>
                  <div>
                    <span style={{ color: '#8c8c8c' }}>Цена:</span>
                    <span style={{ marginLeft: '4px', fontWeight: 500 }}>{(item.price || 0).toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <div>
                    <span style={{ color: '#8c8c8c' }}>Сумма:</span>
                    <span style={{ marginLeft: '4px', fontWeight: 500, color: '#52c41a' }}>
                      {itemTotal.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                  {showPurchasePrice && (
                    <>
                      <div>
                        <span style={{ color: '#8c8c8c' }}>Закупка:</span>
                        <span style={{ marginLeft: '4px', fontWeight: 500, color: '#ff4d4f' }}>
                          {(item.costPrice || 0).toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#8c8c8c' }}>З. всего:</span>
                        <span style={{ marginLeft: '4px', fontWeight: 500, color: '#ff4d4f' }}>
                          {itemPurchaseTotal.toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#8c8c8c' }}>Прибыль:</span>
                        <span style={{ marginLeft: '4px', fontWeight: 500, color: '#1890ff' }}>
                          {itemProfit.toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Итоговая информация */}
        <div style={{ 
          marginTop: '8px',
          padding: '6px 8px',
          background: 'white',
          borderRadius: '4px',
          boxShadow: '0 1px 1px rgba(0,0,0,0.05)'
        }}>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
            fontSize: '13px'
          }}>
            <div>
              <span style={{ color: '#8c8c8c' }}>Сумма товаров:</span>
              <span style={{ marginLeft: '6px', fontWeight: 600, color: '#52c41a' }}>
                {totalSum.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            
            {/* Показываем скидку если она есть */}
            {(() => {
              const discountInfo = (record as any).discountInfo;
              let discountAmount = 0;
              
              if (discountInfo && discountInfo.value > 0) {
                if (discountInfo.type === 'percent') {
                  discountAmount = totalSum * (discountInfo.value / 100);
                } else {
                  discountAmount = discountInfo.value;
                }
              } else {
                // Пытаемся вычислить из разности
                const actualTotal = record.totalAmount || record.total || 0;
                const deliveryPrice = record.deliveryPrice || 0;
                const expectedTotal = totalSum + deliveryPrice;
                discountAmount = Math.max(0, expectedTotal - actualTotal);
              }
              
              if (discountAmount > 0) {
                return (
                  <div>
                    <span style={{ color: '#8c8c8c' }}>Скидка:</span>
                    <span style={{ marginLeft: '6px', fontWeight: 600, color: '#ff4d4f' }}>
                      -{discountAmount.toLocaleString('ru-RU')} ₽
                      {discountInfo && discountInfo.type === 'percent' && ` (${discountInfo.value}%)`}
                    </span>
                  </div>
                );
              }
              return null;
            })()}
            
            {/* Информация об оплате */}
            {record.payments && record.payments.length > 0 && (
              <div style={{ 
                marginTop: '12px',
                marginBottom: '8px',
                padding: '8px',
                background: '#f7f7f7',
                borderRadius: '4px',
                border: '1px solid #e8e8e8'
              }}>
                <div style={{ 
                  marginBottom: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#666'
                }}>
                  Способы оплаты:
                </div>
                {record.payments.map((payment, index) => {
                  const getPaymentMethodName = (method: string) => {
                    switch (method) {
                      case 'cash': return 'Наличные';
                      case 'keb': return 'КЭБ';
                      case 'sber_transfer': return 'СберБанк';
                      case 'card': return 'Карта';
                      case 'transfer': return 'Перевод';
                      case 'bank_transfer': return 'Банковский перевод';
                      case 'sberbank_transfer': return 'Перевод Сбербанк';
                      default: return method; // Возвращаем как есть для неизвестных методов
                    }
                  };

                  const getPaymentMethodColor = (method: string) => {
                    switch (method) {
                      case 'cash': return '#52c41a';
                      case 'keb': return '#1890ff';
                      case 'sber_transfer': return '#722ed1';
                      default: return '#8c8c8c';
                    }
                  };

                  return (
                    <div key={index} style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: index < record.payments.length - 1 ? '4px' : '0',
                      fontSize: '12px'
                    }}>
                      <span style={{ 
                        color: getPaymentMethodColor(payment.method),
                        fontWeight: 500
                      }}>
                        {getPaymentMethodName(payment.method)}
                        {payment.sberRecipient && ` (${payment.sberRecipient})`}
                      </span>
                      <span style={{ 
                        fontWeight: 600,
                        color: '#262626'
                      }}>
                        {payment.amount.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Показываем доставку если она есть */}
            {record.deliveryPrice && record.deliveryPrice > 0 && (
              <div>
                <span style={{ color: '#8c8c8c' }}>Доставка:</span>
                <span style={{ marginLeft: '6px', fontWeight: 600, color: '#1890ff' }}>
                  {record.deliveryPrice.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            )}
            
            <div>
              <span style={{ color: '#8c8c8c' }}>Итого:</span>
              <span style={{ marginLeft: '6px', fontWeight: 600, color: '#52c41a' }}>
                {(record.totalAmount || record.total || 0).toLocaleString('ru-RU')} ₽
              </span>
            </div>
            
            {showPurchasePrice && (
              <>
                <div>
                  <span style={{ color: '#8c8c8c' }}>Общая закупка:</span>
                  <span style={{ marginLeft: '6px', fontWeight: 600, color: '#ff4d4f' }}>
                    {totalPurchaseSum.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                <div>
                  <span style={{ color: '#8c8c8c' }}>Общая прибыль:</span>
                  <span style={{ marginLeft: '6px', fontWeight: 600, color: '#1890ff' }}>
                    {(totalSum - totalPurchaseSum - ((() => {
                      const discountInfo = (record as any).discountInfo;
                      if (discountInfo && discountInfo.value > 0) {
                        if (discountInfo.type === 'percent') {
                          return totalSum * (discountInfo.value / 100);
                        } else {
                          return discountInfo.value;
                        }
                      }
                      const actualTotal = record.totalAmount || record.total || 0;
                      const deliveryPrice = record.deliveryPrice || 0;
                      const expectedTotal = totalSum + deliveryPrice;
                      return Math.max(0, expectedTotal - actualTotal);
                    })())).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Используем компонент в expandedRowRender
  const expandedRowRender = (record: Receipt) => {
    return <ExpandedRow record={record} />;
  };

  const columns: ColumnsType<Receipt> = [
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      render: (date) => date ? dayjs(date).format('DD.MM.YYYY HH:mm') : '00.00.0000 00:00',
      width: 150
    },
    {
      title: 'Номер',
      dataIndex: 'receiptNumber',
      key: 'receiptNumber',
      render: (number) => number || 'Без номера',
      width: 120
    },
    {
      title: 'Клиент',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name, record) => {
        // Проверяем оба поля для совместимости
        const clientName = name || record.clientName;
        if (record.isDebt && clientName) {
          return <span style={{ color: '#ff4d4f', fontWeight: '500' }}>{clientName} (долг)</span>;
        }
        return clientName || 'Без клиента';
      },
      width: 200
    },
    {
      title: 'Сумма',
      key: 'totalAmount',
      render: (_, record) => {
        // Считаем общую сумму из товаров (до скидки)
        const subtotal = record.items.reduce((sum, item) => {
          const itemTotal = (item.price || 0) * (item.quantity || 1);
          return sum + itemTotal;
        }, 0);
        return `${subtotal.toLocaleString('ru-RU')} ₽`;
      },
      width: 120
    },
    {
      title: 'Скидка',
      key: 'discount',
      render: (_, record) => {
        // Проверяем есть ли информация о скидке в записи
        const discountInfo = (record as any).discountInfo;
        if (discountInfo && discountInfo.value > 0) {
          if (discountInfo.type === 'percent') {
            return `${discountInfo.value}%`;
          } else {
            return `${discountInfo.value.toLocaleString('ru-RU')} ₽`;
          }
        }
        
        // Пытаемся вычислить из разности totalAmount и суммы товаров
        const subtotal = record.items.reduce((sum, item) => {
          const itemTotal = (item.price || 0) * (item.quantity || 1);
          return sum + itemTotal;
        }, 0);
        const actualTotal = record.totalAmount || record.total || 0;
        const deliveryPrice = record.deliveryPrice || 0;
        const expectedTotal = subtotal + deliveryPrice;
        const discountAmount = expectedTotal - actualTotal;
        
        if (discountAmount > 0) {
          return `${discountAmount.toLocaleString('ru-RU')} ₽`;
        }
        
        return '0 ₽';
      },
      width: 100
    },
    {
      title: 'Итого',
      key: 'finalAmount',
      render: (_, record) => {
        // Используем сохраненную totalAmount как финальную сумму
        const finalAmount = record.totalAmount || record.total || 0;
        return `${finalAmount.toLocaleString('ru-RU')} ₽`;
      },
      width: 120
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            icon={<PrinterOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handlePrintReceipt(record);
            }}
            disabled={record.status === 'cancelled'}
            title="Печать чека"
          >
            Печать
          </Button>
          {(() => {
            // Для администратора и бухгалтера - всегда показываем кнопку удаления
            if (canDeleteAnything()) {
              const buttonText = record.status === 'cancelled' ? 'Удалить полностью' : 'Отменить';
              const buttonTitle = record.status === 'cancelled' 
                ? 'Полностью удалить отмененный чек из системы' 
                : 'Отменить чек (пометить как отмененный)';
              
              return (
                <Tooltip title={buttonTitle}>
                  <Button
                    icon={<DeleteOutlined />}
                    danger
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSoftDeleteReceipt(record._id || record.id);
                    }}
                  >
                    {buttonText}
                  </Button>
                </Tooltip>
              );
            }

            // Для других ролей - только если чек не отменен
            if (record.status === 'cancelled') {
              return null;
            }

            const hasItemsWithPaidDebts = record.items.some(item => 
              item.arrivalId && isDebtPaid(item.arrivalId)
            );

            return hasItemsWithPaidDebts ? (
              <Tooltip title="Нельзя удалить чек с товарами, долги по которым уже оплачены">
                <Button
                  icon={<DeleteOutlined />}
                  disabled
                >
                  Удалить
                </Button>
              </Tooltip>
            ) : (
              <Button
                icon={<DeleteOutlined />}
                danger
                onClick={(e) => {
                  e.stopPropagation();
                  handleSoftDeleteReceipt(record._id || record.id);
                }}
              >
                Удалить
              </Button>
            );
          })()}
        </Space>
      )
    }
  ];

  // Функция для фильтрации по датам
  const getFilteredReceipts = (): Receipt[] => {
    return receipts.filter(receipt => {
      const receiptDate = dayjs(receipt.date);
      
      // Фильтрация по периоду
      let matchesPeriod = true;
      if (periodType === 'day') {
        matchesPeriod = receiptDate.isSame(selectedDate, 'day');
      } else if (periodType === 'week') {
        const startOfWeek = selectedDate.startOf('week');
        const endOfWeek = selectedDate.endOf('week');
        matchesPeriod = receiptDate.isBetween(startOfWeek, endOfWeek, 'day', '[]');
      } else if (periodType === 'month') {
        matchesPeriod = receiptDate.isSame(selectedDate, 'month');
      } else if (periodType === 'range') {
        matchesPeriod = receiptDate.isBetween(dateRange[0], dateRange[1], 'day', '[]');
      }
      
      // Фильтрация по поиску
      const matchesSearch = receipt.receiptNumber.toLowerCase().includes(searchText.toLowerCase()) ||
                           receipt.createdBy.toLowerCase().includes(searchText.toLowerCase()) ||
                           (receipt.payments || []).some(p => getPaymentMethodText(p.method).toLowerCase().includes(searchText.toLowerCase())) ||
                           (receipt.payments || []).some(p => p.sberRecipient && p.sberRecipient.toLowerCase().includes(searchText.toLowerCase())) ||
                           receipt.items.some(item => 
                             item.productName.toLowerCase().includes(searchText.toLowerCase()) ||
                             (item.serialNumber && item.serialNumber.toLowerCase().includes(searchText.toLowerCase()))
                           );
      
      // Фильтрация по статусу
      const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter;
      
      return matchesPeriod && matchesSearch && matchesStatus;
    });
  };

  const filteredReceipts = getFilteredReceipts();

  // Функция для получения заголовка периода
  const getPeriodTitle = () => {
    if (periodType === 'day') {
      return selectedDate.format('DD MMMM YYYY');
    } else if (periodType === 'week') {
      const startOfWeek = selectedDate.startOf('week');
      const endOfWeek = selectedDate.endOf('week');
      return `${startOfWeek.format('DD MMM')} - ${endOfWeek.format('DD MMM YYYY')}`;
    } else if (periodType === 'month') {
      return selectedDate.format('MMMM YYYY');
    } else if (periodType === 'range') {
      return `${dateRange[0].format('DD MMM')} - ${dateRange[1].format('DD MMM YYYY')}`;
    }
    return 'Все время';
  };

  // Функции для расчета статистики
  const calculateStatistics = () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Фильтруем чеки (включаем и новые, и завершенные)
    const validReceipts = receipts.filter(r => r.status !== 'cancelled');

    // Чеки за сегодня и за месяц
    const todayReceipts = validReceipts.filter(r => {
      const receiptDate = new Date(r.date);
      return receiptDate.getFullYear() === startOfToday.getFullYear() &&
             receiptDate.getMonth() === startOfToday.getMonth() &&
             receiptDate.getDate() === startOfToday.getDate();
    });

    const monthReceipts = validReceipts.filter(r => {
      const receiptDate = new Date(r.date);
      return receiptDate.getFullYear() === startOfMonth.getFullYear() &&
             receiptDate.getMonth() === startOfMonth.getMonth();
    });

    // Функция для расчета оборота с учетом скидок
    const calculateTurnoverWithDiscount = (receiptsArray: any[]) => {
      return receiptsArray.reduce((sum, r) => {
        // Используем totalAmount если есть (уже с учетом скидки), иначе считаем сами
        if (r.totalAmount || r.total) {
          const deliveryPrice = r.deliveryPrice || 0;
          return sum + (r.totalAmount || r.total) - deliveryPrice; // Оборот без доставки
        }
        
        // Fallback - считаем из товаров с учетом скидки
        const subtotal = r.items.reduce((itemSum: number, item: any) => itemSum + (item.total || (item.price * item.quantity)), 0);
        
        // Применяем скидку если есть
        let discountAmount = 0;
        const discountInfo = r.discountInfo;
        if (discountInfo && discountInfo.value > 0) {
          if (discountInfo.type === 'percent') {
            discountAmount = subtotal * (discountInfo.value / 100);
          } else {
            discountAmount = discountInfo.value;
          }
        }
        
        return sum + subtotal - discountAmount;
      }, 0);
    };

    // Функция для расчета прибыли с учетом скидок
    const calculateProfitWithDiscount = (receiptsArray: any[]) => {
      return receiptsArray.reduce((sum, r) => {
        // Используем totalAmount если есть (уже с учетом скидки)
        if (r.totalAmount || r.total) {
          const deliveryPrice = r.deliveryPrice || 0;
          const finalSalesTotal = (r.totalAmount || r.total) - deliveryPrice; // Продажи без доставки
          
          // Считаем закупочную стоимость
          const costTotal = r.items.reduce((itemSum: number, item: any) => itemSum + ((item.costPrice || 0) * item.quantity), 0);
          
          const profit = finalSalesTotal - costTotal;
          return sum + profit;
        }
        
        // Fallback - считаем из товаров с учетом скидки
        const salesTotal = r.items.reduce((itemSum: number, item: any) => itemSum + (item.total || (item.price * item.quantity)), 0);
        const costTotal = r.items.reduce((itemSum: number, item: any) => itemSum + ((item.costPrice || 0) * item.quantity), 0);
        
        // Применяем скидку к продажной сумме
        let discountAmount = 0;
        const discountInfo = r.discountInfo;
        if (discountInfo && discountInfo.value > 0) {
          if (discountInfo.type === 'percent') {
            discountAmount = salesTotal * (discountInfo.value / 100);
          } else {
            discountAmount = discountInfo.value;
          }
        }
        
        const finalSalesTotal = salesTotal - discountAmount;
        const profit = finalSalesTotal - costTotal;
        
        return sum + profit;
      }, 0);
    };

    // Расчет оборота с учетом скидок
    const todayTurnover = calculateTurnoverWithDiscount(todayReceipts);
    const monthTurnover = calculateTurnoverWithDiscount(monthReceipts);

    // Расчет прибыли с учетом скидок
    const todayProfit = calculateProfitWithDiscount(todayReceipts);
    const monthProfit = calculateProfitWithDiscount(monthReceipts);

    // Расчет сумм по способам оплаты за сегодня
    let todayCashFromReceipts = todayReceipts.reduce((sum, r) => 
      sum + (r.payments || [])
        .filter(p => p.method === 'cash')
        .reduce((pSum, p) => pSum + p.amount, 0), 0);

    // Наличные за сегодня только из чеков (платежи из системы теперь не учитываем здесь)
    const todayCash = todayCashFromReceipts;

    const todayKeb = todayReceipts.reduce((sum, r) => 
      sum + (r.payments || [])
        .filter(p => p.method === 'keb')
        .reduce((pSum, p) => pSum + p.amount, 0), 0);

    // Расчет сумм по переводам на Сбер за сегодня с группировкой по получателям
    const todaySberByRecipient = todayReceipts.reduce((acc, r) => {
      (r.payments || [])
        .filter(p => p.method === 'sber_transfer' && p.sberRecipient)
        .forEach(p => {
          const recipient = p.sberRecipient!;
          acc[recipient] = (acc[recipient] || 0) + p.amount;
        });
      return acc;
    }, {} as Record<string, number>);

    return {
      todayTurnover,
      monthTurnover,
      todayProfit,
      monthProfit,
      todayCash,
      todayKeb,
      todaySberByRecipient
    };
  };

  // Добавляем useEffect для обновления статистики при изменении чеков
  const [statistics, setStatistics] = useState(() => calculateStatistics());

  useEffect(() => {
    setStatistics(calculateStatistics());
  }, [receipts, cashInRegisterAmount]); // Обновляем статистику при изменении чеков или суммы наличных

  // Состояние для отслеживания разблокированных блоков
  const [unlockedBlocks, setUnlockedBlocks] = useState<Set<string>>(new Set());

  // Функция для разблокировки блока
  const unlockBlock = (blockId: string) => {
    setUnlockedBlocks(prev => new Set([...prev, blockId]));
  };

  // В компоненте используем statistics вместо stats
  const StatBlock = ({ title, value, color = '#52c41a', blockId }: { title: string; value: number; color?: string; blockId?: string }) => {
    const isLocked = blockId && !unlockedBlocks.has(blockId);
    
    return (
      <div 
        style={{ 
          padding: '16px',
          background: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          marginBottom: '16px',
          position: 'relative',
          cursor: isLocked ? 'pointer' : 'default',
          transition: 'all 0.3s ease',
          border: isLocked ? '2px solid #f0f0f0' : '2px solid transparent'
        }}
        onClick={isLocked ? () => unlockBlock(blockId!) : undefined}
        onMouseEnter={(e) => {
          if (isLocked) {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
            e.currentTarget.style.borderColor = '#d9d9d9';
          }
        }}
        onMouseLeave={(e) => {
          if (isLocked) {
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
            e.currentTarget.style.borderColor = '#f0f0f0';
          }
        }}
        title={isLocked ? 'Нажмите для просмотра' : undefined}
      >
        <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '8px' }}>{title}</div>
        <div 
          style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            color,
            filter: isLocked ? 'blur(10px) brightness(0.8)' : 'none',
            transition: 'filter 0.3s ease',
            userSelect: isLocked ? 'none' : 'auto'
          }}
        >
          {value.toLocaleString('ru-RU')} ₽
        </div>
        {isLocked && (
          <>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(2px)',
              borderRadius: '8px',
              pointerEvents: 'none'
            }} />
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '500',
              pointerEvents: 'none',
              zIndex: 2,
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              🔒 Нажмите для просмотра
            </div>
          </>
        )}
      </div>
    );
  };

  const copyToClipboard = (text: string) => {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  };

  // Функция для загрузки начальных данных
  const loadInitialData = useCallback(() => {
    loadReceipts();
    loadDebts();
    loadCashInRegister();
    loadSberRecipients();
  }, []);

  useEffect(() => {
    console.log('🔄 Initializing Receipts component');
    loadInitialData();
    initializeProductEvents();

    const handleProductUpdate = (event: CustomEvent) => {
      console.log('📦 Received productUpdate event:', event.detail);
      const { type, product } = event.detail;
      
      // Игнорируем системные события (подключение и т.д.)
      if (type === 'connected' || !product) {
        console.log('🔄 Ignoring system event:', type);
        return;
      }
      
      if (type === 'productRemoved') {
        // Обрабатываем удаление товара
        console.log('🗑️ Processing product removal:', product);
        setAvailableProducts(prevProducts => {
          const updatedProducts = prevProducts.filter(p => {
            if (product.serialNumber) {
              // Для товаров с серийными номерами удаляем по серийному номеру
              return p.serialNumber !== product.serialNumber;
            } else {
              // Для аксессуаров и услуг удаляем по arrivalId, названию и типу
              return !(
                p.arrivalId === product.arrivalId && 
                p.productName === product.productName &&
                p.isAccessory === product.isAccessory &&
                p.isService === product.isService
              );
            }
          });
          
          console.log('Products after removal:', updatedProducts);
          return updatedProducts;
        });
        return;
      }
      
      if (type === 'productAdded') {
        // Обрабатываем добавление товара
        setAvailableProducts(prevProducts => {
          console.log('Current products:', prevProducts);
          const updatedProducts = [...prevProducts];

          // Для товаров с серийными номерами, добавляем как новый товар
          if (product.serialNumber) {
            // Проверяем, нет ли уже такого серийного номера
            const existingProductIndex = updatedProducts.findIndex(p => 
              p.serialNumber === product.serialNumber
            );

            if (existingProductIndex !== -1) {
              console.log('Updating existing product with serial number:', product.serialNumber);
              updatedProducts[existingProductIndex] = product;
            } else {
              console.log('Adding new product with serial number:', product.serialNumber);
              updatedProducts.push(product);
            }
          } else {
            // Для аксессуаров и услуг, обновляем существующий или добавляем новый
            const existingProductIndex = updatedProducts.findIndex(p => 
              p.arrivalId === product.arrivalId && 
              p.productName === product.productName &&
              p.isAccessory === product.isAccessory &&
              p.isService === product.isService
            );

            if (existingProductIndex !== -1) {
              console.log('Updating existing accessory/service:', product.productName);
              updatedProducts[existingProductIndex] = {
                ...updatedProducts[existingProductIndex],
                quantity: (updatedProducts[existingProductIndex].quantity || 0) + (product.quantity || 1)
              };
            } else {
              console.log('Adding new accessory/service:', product.productName);
              updatedProducts.push(product);
            }
          }
          
          console.log('Updated products list:', updatedProducts);
          return updatedProducts;
        });
      }
    };

    window.addEventListener('productUpdate', handleProductUpdate as EventListener);
    console.log('✅ Added productUpdate event listener');

    return () => {
      console.log('👋 Cleaning up Receipts component');
      closeProductEvents();
      window.removeEventListener('productUpdate', handleProductUpdate as EventListener);
    };
  }, [loadInitialData]);

  const [isMobile, setIsMobile] = useState(false);

  // Определяем мобильную версию при монтировании
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Компонент карточки чека для мобильной версии
  const MobileReceiptCard: React.FC<{ receipt: Receipt }> = ({ receipt }) => {
    const [showDetails, setShowDetails] = useState(false);

    // Считаем общую сумму из товаров (до скидки)
    const subtotal = receipt.items.reduce((sum, item) => {
      const itemTotal = (item.price || 0) * (item.quantity || 1);
      return sum + itemTotal;
    }, 0);

    // Вычисляем скидку
    let discountAmount = 0;
    const discountInfo = receipt.discountInfo;
    if (discountInfo && discountInfo.value > 0) {
      if (discountInfo.type === 'percent') {
        discountAmount = subtotal * (discountInfo.value / 100);
      } else {
        discountAmount = discountInfo.value;
      }
    }

    // Вычисляем итоговую сумму
    const finalAmount = receipt.totalAmount || receipt.total || 0;

    return (
      <Card
        style={{
          marginBottom: '12px',
          borderRadius: '8px',
          background: receipt.status === 'cancelled' ? '#fff2f0' : '#fff'
        }}
        bodyStyle={{ padding: '12px' }}
      >
        {/* Верхняя часть карточки */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            marginBottom: '8px'
          }}>
            <div>
              <div style={{ fontSize: '14px', color: '#8c8c8c' }}>
                {dayjs(receipt.date).format('DD.MM.YYYY HH:mm')}
              </div>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: '500',
                marginTop: '4px',
                cursor: 'pointer'
              }} onClick={() => setShowDetails(!showDetails)}>
                {receipt.receiptNumber || 'Без номера'}
              </div>
            </div>
            <Tag color={getStatusColor(receipt.status)}>
              {getStatusText(receipt.status)}
            </Tag>
          </div>

          {/* Клиент */}
          {(receipt.clientName || receipt.isDebt) && (
            <div style={{ 
              marginTop: '8px',
              color: receipt.isDebt ? '#ff4d4f' : '#262626',
              fontWeight: receipt.isDebt ? '500' : 'normal'
            }}>
              {receipt.clientName} {receipt.isDebt && '(долг)'}
            </div>
          )}
        </div>

        {/* Краткая информация о товарах */}
        <div style={{ marginBottom: '12px' }}>
          {receipt.items.map((item, index) => (
            <div 
              key={index} 
              style={{ 
                marginBottom: index < receipt.items.length - 1 ? '8px' : 0,
                fontSize: '14px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div>{item.productName}</div>
                  {item.serialNumber && (
                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                      S/N: {item.serialNumber}
                    </div>
                  )}
                </div>
                <div style={{ marginLeft: '12px', whiteSpace: 'nowrap' }}>
                  {item.quantity} × {item.price.toLocaleString('ru-RU')} ₽
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Способы оплаты */}
        {receipt.payments && receipt.payments.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            {receipt.payments.map((payment, index) => (
              <div 
                key={index}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  fontSize: '14px',
                  color: getPaymentMethodColor(payment.method)
                }}
              >
                <span>
                  {getPaymentMethodText(payment.method)}
                  {payment.sberRecipient && ` → ${payment.sberRecipient}`}
                </span>
                <span style={{ fontWeight: '500' }}>
                  {payment.amount.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Итоговая сумма */}
        <div style={{ 
          borderTop: '1px solid #f0f0f0',
          paddingTop: '12px',
          marginTop: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8c8c8c' }}>Сумма товаров:</span>
            <span>{subtotal.toLocaleString('ru-RU')} ₽</span>
          </div>
          {discountAmount > 0 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              color: '#ff4d4f'
            }}>
              <span>Скидка:</span>
              <span>-{discountAmount.toLocaleString('ru-RU')} ₽</span>
            </div>
          )}
          {receipt.deliveryPrice && receipt.deliveryPrice > 0 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              color: '#1890ff'
            }}>
              <span>Доставка:</span>
              <span>+{receipt.deliveryPrice.toLocaleString('ru-RU')} ₽</span>
            </div>
          )}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginTop: '8px',
            fontSize: '16px',
            fontWeight: '600',
            color: '#52c41a'
          }}>
            <span>Итого:</span>
            <span>{finalAmount.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>

        {/* Кнопки действий */}
        <div style={{ 
          display: 'flex', 
          gap: '8px',
          marginTop: '12px'
        }}>
          <Button
            icon={<PrinterOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handlePrintReceipt(receipt);
            }}
            disabled={receipt.status === 'cancelled'}
            style={{ flex: 1 }}
          >
            Печать
          </Button>
          {(() => {
            // Для администратора и бухгалтера - всегда показываем кнопку удаления
            if (canDeleteAnything()) {
              const buttonText = receipt.status === 'cancelled' ? 'Удалить полностью' : 'Отменить';
              const buttonTitle = receipt.status === 'cancelled' 
                ? 'Полностью удалить отмененный чек из системы' 
                : 'Отменить чек (пометить как отмененный)';
              
              return (
                <Tooltip title={buttonTitle}>
                  <Button
                    icon={<DeleteOutlined />}
                    danger
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSoftDeleteReceipt(receipt._id || receipt.id);
                    }}
                    style={{ flex: 1 }}
                  >
                    {buttonText}
                  </Button>
                </Tooltip>
              );
            }

            // Для других ролей - только если чек не отменен
            if (receipt.status === 'cancelled') {
              return null;
            }

            const hasItemsWithPaidDebts = receipt.items.some(item => 
              item.arrivalId && isDebtPaid(item.arrivalId)
            );

            return hasItemsWithPaidDebts ? (
              <Tooltip title="Нельзя удалить чек с товарами, долги по которым уже оплачены">
                <Button
                  icon={<DeleteOutlined />}
                  disabled
                  style={{ flex: 1 }}
                >
                  Удалить
                </Button>
              </Tooltip>
            ) : (
              <Button
                icon={<DeleteOutlined />}
                danger
                onClick={(e) => {
                  e.stopPropagation();
                  handleSoftDeleteReceipt(receipt._id || receipt.id);
                }}
                style={{ flex: 1 }}
              >
                Удалить
              </Button>
            );
          })()}
        </div>
      </Card>
    );
  };

  // Состояния для модального окна отката
  const [isRefundModalVisible, setIsRefundModalVisible] = useState(false);
  const [refundForm] = Form.useForm();

  // Функция для обработки отката (добавления отрицательного платежа)
  const handleRefund = () => {
    refundForm.resetFields();
    refundForm.setFieldsValue({
      date: dayjs().format('YYYY-MM-DD'),
      inCashRegister: true,
      cashRegisterDate: dayjs().format('YYYY-MM-DD')
    });
    setIsRefundModalVisible(true);
  };

  // Функция для создания отрицательного платежа
  const handleRefundOk = async () => {
    try {
      const values = await refundForm.validateFields();
      
      // Создаём отрицательный платеж через API
      const refundDate = values.date ? 
        (values.date.includes('T') ? values.date : `${values.date}T${new Date().toTimeString().split(' ')[0]}`) :
        new Date().toISOString();

      const refundData = {
        type: 'наличные',
        apiType: 'expense', // Это расход (отрицательный платеж)
        category: 'Откат клиенту',
        amount: -Math.abs(values.amount), // Отрицательная сумма
        date: refundDate,
        description: `Откат клиенту: ${values.clientName}`,
        paymentMethod: 'наличные',
        notes: values.notes || `Откат клиенту ${values.clientName}`,
        inCashRegister: values.inCashRegister ? 'yes' : 'no',
        cashRegisterDate: values.inCashRegister && values.cashRegisterDate ? values.cashRegisterDate : undefined
      };
      
      const createdRefund = await paymentsApi.create(refundData);
      
      // Логируем действие
      logReceiptAction(
        'Создание отката',
        `Добавлен откат клиенту ${values.clientName} на сумму ${Math.abs(values.amount).toLocaleString('ru-RU')} ₽`,
        `refund_${Date.now()}`
      );
      
      message.success(`Откат клиенту ${values.clientName} на сумму ${Math.abs(values.amount).toLocaleString('ru-RU')} ₽ успешно создан`);
      setIsRefundModalVisible(false);
      refundForm.resetFields();
      
      // Обновляем сумму наличных в кассе
      loadCashInRegister();
      
    } catch (error) {
      console.error('❌ Ошибка при создании отката:', error);
      message.error('Ошибка при создании отката');
    }
  };

  return (
    <div>
      {/* Компактная статистика */}
      <Row gutter={isMobile ? 8 : 16} style={{ marginBottom: '24px' }}>
        <Col span={isMobile ? 12 : 4}>
          <StatBlock title="Оборот за месяц" value={statistics.monthTurnover} blockId="monthTurnover" />
        </Col>
        <Col span={isMobile ? 12 : 4}>
          <StatBlock title="Оборот за день" value={statistics.todayTurnover} blockId="todayTurnover" />
        </Col>
        <Col span={isMobile ? 12 : 4}>
          <StatBlock title="Прибыль за месяц" value={statistics.monthProfit} color="#1890ff" blockId="monthProfit" />
        </Col>
        <Col span={isMobile ? 12 : 4}>
          <StatBlock title="Прибыль за день" value={statistics.todayProfit} color="#1890ff" blockId="todayProfit" />
        </Col>
        <Col span={isMobile ? 12 : 4}>
          <StatBlock title="Наличные в кассе" value={cashInRegisterAmount} blockId="cashInRegister" />
        </Col>
        <Col span={isMobile ? 12 : 4}>
          <StatBlock title="КЕБ сегодня" value={statistics.todayKeb} blockId="todayKeb" />
        </Col>
      </Row>

      {/* Сбер статистика */}
      {Object.entries(statistics.todaySberByRecipient).length > 0 && (
        <Row gutter={isMobile ? 8 : 16} style={{ marginBottom: '24px' }}>
          {Object.entries(statistics.todaySberByRecipient).map(([recipient, amount]) => (
            <Col span={isMobile ? 12 : 4} key={recipient}>
              <StatBlock 
                title={`Сбер (${recipient})`} 
                value={amount} 
                color="#fa8c16" 
                blockId={`sber_${recipient}`} 
              />
            </Col>
          ))}
        </Row>
      )}

      {/* Фильтры и поиск */}
      <Card 
        style={{ 
          marginBottom: '24px', 
          borderRadius: '12px' 
        }} 
        bodyStyle={{ 
          padding: isMobile ? 12 : 24 
        }}
      >
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '16px', 
          alignItems: isMobile ? 'stretch' : 'center'
        }}>
          <Search
            placeholder="Поиск по номеру, товару, поставщику..."
            style={{ width: isMobile ? '100%' : 400 }}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: isMobile ? '100%' : 150 }}
          >
            <Option key="all" value="all">Все статусы</Option>
            <Option key="new" value="new">Новые</Option>
            <Option key="completed" value="completed">Завершенные</Option>
            <Option key="cancelled" value="cancelled">Отмененные</Option>
          </Select>
          
          {/* Фильтр по периодам */}
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '8px' : '8px', 
            alignItems: isMobile ? 'stretch' : 'center',
            width: isMobile ? '100%' : 'auto'
          }}>
            <Select
              value={periodType}
              onChange={setPeriodType}
              style={{ width: isMobile ? '100%' : 120 }}
            >
              <Option value="day">День</Option>
              <Option value="week">Неделя</Option>
              <Option value="month">Месяц</Option>
              <Option value="range">Интервал</Option>
            </Select>
            
            {periodType === 'day' && (
              <DatePicker
                value={selectedDate}
                onChange={(date) => setSelectedDate(date || dayjs())}
                format="DD.MM.YYYY"
                style={{ width: isMobile ? '100%' : 140 }}
              />
            )}
            
            {periodType === 'week' && (
              <DatePicker
                value={selectedDate}
                onChange={(date) => setSelectedDate(date || dayjs())}
                format="DD.MM.YYYY"
                style={{ width: isMobile ? '100%' : 140 }}
                picker="week"
              />
            )}
            
            {periodType === 'month' && (
              <DatePicker
                value={selectedDate}
                onChange={(date) => setSelectedDate(date || dayjs())}
                format="MMMM YYYY"
                style={{ width: isMobile ? '100%' : 140 }}
                picker="month"
              />
            )}
            
            {periodType === 'range' && (
              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setDateRange([dates[0], dates[1]]);
                  }
                }}
                format="DD.MM.YYYY"
                style={{ width: isMobile ? '100%' : 240 }}
              />
            )}
          </div>

          {/* Кнопки действий */}
          <div style={{ 
            marginLeft: isMobile ? 0 : 'auto',
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            gap: '8px',
            width: isMobile ? '100%' : 'auto'
          }}>
                          <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateReceipt}
                style={{ 
                  borderRadius: '8px',
                  width: isMobile ? '100%' : 'auto'
                }}
              >
                Создать чек
              </Button>
              <Button
                type="default"
                icon={<RollbackOutlined />}
                onClick={handleRefund}
                style={{ 
                  borderRadius: '8px',
                  borderColor: '#fa8c16',
                  color: '#fa8c16',
                  width: isMobile ? '100%' : 'auto'
                }}
              >
                Откат
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadReceipts}
                style={{ 
                  borderRadius: '8px',
                  width: isMobile ? '100%' : 'auto'
                }}
              >
                Обновить
              </Button>
            {hasFullAccess() && receipts.length > 0 && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleClearAllReceipts}
                style={{ 
                  borderRadius: '8px',
                  width: isMobile ? '100%' : 'auto'
                }}
              >
                Очистить все
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Информация о выбранном периоде */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ 
          margin: 0, 
          color: '#595959', 
          fontSize: isMobile ? '14px' : '16px', 
          fontWeight: '500' 
        }}>
          📊 Чеки за период: {getPeriodTitle()} ({filteredReceipts.length} записей)
        </h3>
      </div>

      {/* Таблица или список карточек */}
      <Card 
        style={{ borderRadius: '12px' }} 
        bodyStyle={{ padding: isMobile ? 12 : 24 }}
      >
        {isMobile ? (
          // Мобильная версия - список карточек
          <div>
            {filteredReceipts.map(receipt => (
              <MobileReceiptCard key={receipt._id || receipt.id} receipt={receipt} />
            ))}
          </div>
        ) : (
          // Десктопная версия - таблица
          <Table
            dataSource={filteredReceipts}
            rowKey={(record) => record._id || record.id}
            rowClassName={(record) => {
              let className = '';
              
              if (record.status === 'cancelled') {
                className += 'cancelled-receipt';
              }
              
              const hasNonCashPayment = record.payments && record.payments.some(p => p.method !== 'cash');
              if (hasNonCashPayment) {
                className += (className ? ' ' : '') + 'non-cash-payment';
              }
              
              return className;
            }}
            expandable={{
              expandedRowRender: expandedRowRender,
              expandRowByClick: true,
              showExpandColumn: false
            }}
            columns={columns}
            pagination={{
              pageSize: pageSize,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Всего ${total} чеков`,
              pageSizeOptions: ['10', '20', '50', '100'],
              onShowSizeChange: handlePageSizeChange,
            }}
            size="small"
            scroll={{ x: 'max-content' }}
          />
        )}
      </Card>

      <style>
        {`
          .cancelled-receipt {
            background-color: #fff2f0 !important;
            opacity: 0.6;
          }
          .cancelled-receipt:hover {
            background-color: #ffccc7 !important;
          }
          .cancelled-receipt td {
            color: #8c8c8c !important;
          }
          .cancelled-receipt .ant-tag {
            opacity: 0.6;
          }
          
          .non-cash-payment {
            background-color: #fff7e6 !important;
          }
          .non-cash-payment:hover {
            background-color: #ffe7ba !important;
          }
          
          .cancelled-receipt.non-cash-payment {
            background-color: #f6f6f6 !important;
            opacity: 0.6;
          }
          .cancelled-receipt.non-cash-payment:hover {
            background-color: #eeeeee !important;
          }
        `}
      </style>

      {/* Модальное окно создания/редактирования */}
      <Modal
        title={editingReceipt ? "Редактировать чек" : "Создать чек"}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={900}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>

                          <Col span={24}>
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0 }}>Способы оплаты</h4>
                  <Button
                    type="dashed"
                    onClick={handleAddPayment}
                    icon={<PlusOutlined />}
                  >
                    Добавить способ оплаты
                  </Button>
                </div>

                {payments.map((payment, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    gap: '16px', 
                    marginBottom: '16px',
                    padding: '12px',
                    background: '#fafafa',
                    borderRadius: '8px'
                  }}>
                    <Form.Item
                      label="Способ"
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <Select
                        value={payment.method}
                        onChange={(value) => handlePaymentChange(index, 'method', value)}
                      >
                                            <Option key="cash" value="cash">💰 Наличные</Option>
                    <Option key="keb" value="keb">💳 КЕБ</Option>
                    <Option key="sber_transfer" value="sber_transfer">🏦 Перевод на Сбер</Option>
                      </Select>
                    </Form.Item>

                    <Form.Item
                      label="Сумма"
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        value={payment.amount}
                        onChange={(value) => handlePaymentChange(index, 'amount', value || 0)}
                        formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value: string | undefined) => parseFloat(value?.replace(/[^\d.]/g, '') || '0')}
                      />
                    </Form.Item>

                    {payment.method === 'sber_transfer' && (
                      <Form.Item
                        label="Получатель"
                        style={{ flex: 1, marginBottom: 0 }}
                      >
                        <Select
                          value={payment.sberRecipient}
                          onChange={(value) => handlePaymentChange(index, 'sberRecipient', value)}
                          loading={loadingSberRecipients}
                          placeholder="Выберите получателя"
                          popupRender={(menu) => (
                            <div>
                              {menu}
                              <div style={{ padding: '4px 8px 8px', borderTop: '1px solid #f0f0f0' }}>
                                <Input
                                  placeholder="Добавить нового получателя"
                                  onPressEnter={(e) => {
                                    const value = (e.target as HTMLInputElement).value;
                                    if (value) {
                                      handleAddSberRecipient(value);
                                      handlePaymentChange(index, 'sberRecipient', value);
                                      (e.target as HTMLInputElement).value = '';
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        >
                          {sberRecipients.map(recipient => (
                            <Option key={recipient} value={recipient}>
                              {recipient}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    )}

                    {payments.length > 1 && (
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemovePayment(index)}
                        style={{ marginTop: 29 }}
                      />
                    )}
                  </div>
                ))}

                <div style={{
                  padding: '12px',
                  background: '#f6ffed',
                  border: '1px solid #b7eb8f',
                  borderRadius: '6px',
                  marginTop: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Сумма оплат:</span>
                    <span style={{ 
                      fontWeight: '600', 
                      color: payments.reduce((sum, p) => sum + (p.amount || 0), 0) === calculateTotalAmount().total 
                        ? '#52c41a' 
                        : '#ff4d4f'
                    }}>
                      {payments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span>Сумма чека:</span>
                    <span style={{ fontWeight: '600', color: '#52c41a' }}>
                      {calculateTotalAmount().total.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                  {payments.length > 1 && (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginTop: '4px',
                      paddingTop: '4px',
                      borderTop: '1px dashed #b7eb8f'
                    }}>
                      <span>Осталось распределить:</span>
                      <span style={{ 
                        fontWeight: '600', 
                        color: calculateTotalAmount().total - payments.reduce((sum, p) => sum + (p.amount || 0), 0) === 0 
                          ? '#52c41a' 
                          : '#ff4d4f'
                      }}>
                        {Math.max(0, calculateTotalAmount().total - payments.reduce((sum, p) => sum + (p.amount || 0), 0)).toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Col>
          </Row>

          <div style={{ marginBottom: '24px' }}>
            <Alert
              message="ℹ️ Номер чека будет сгенерирован автоматически при создании"
              type="info"
              showIcon={false}
              style={{ marginBottom: '16px' }}
            />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0 }}>Товары в чеке</h4>
            </div>

            {/* Объединенный поиск товаров */}
            <div style={{ marginBottom: '16px', position: 'relative' }}>
              <Input
                placeholder="Поиск по названию, серийному номеру или штрихкоду..."
                value={serialNumberSearch}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setSerialNumberSearch(newValue);
                  
                  // Очищаем таймаут если есть
                  if (serialNumberSearchTimeout) {
                    clearTimeout(serialNumberSearchTimeout);
                  }
                  
                  // Проверяем мгновенное совпадение по серийному номеру или штрихкоду
                  if (newValue.length > 0) {
                    const wasAdded = handleInstantMatch(newValue);
                    if (wasAdded) {
                      // Если товар был добавлен, очищаем поле поиска
                      setSerialNumberSearch('');
                      return;
                    }
                  }
                }}
                onFocus={() => setShowSearchDropdown(true)}
                onBlur={() => {
                  // Задержка чтобы клик по элементу списка успел сработать
                  setTimeout(() => {
                    setShowSearchDropdown(false);
                    // Автоматически добавляем товар если есть точное совпадение
                    handleAutoAddProduct();
                  }, 200);
                }}
                style={{ width: '100%' }}
                prefix={<SearchOutlined />}
                suffix={
                  availableProducts.length === 0 ? null : (
                    <Button 
                      type="link" 
                      size="small"
                      onClick={handleAddItem}
                      style={{ padding: '0 4px', fontSize: '12px' }}
                    >
                      Выбрать из списка
                    </Button>
                  )
                }
              />
              
              {/* Выпадающий список товаров */}
              {showSearchDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  zIndex: 1000
                }}>
                  {(() => {
                    const searchTerm = serialNumberSearch.toLowerCase();
                    const groupedProducts = new Map<string, any>();
                    
                    // Фильтруем товары по поисковому запросу
                    const filteredProducts = availableProducts.filter(product => {
                      if (!searchTerm) return true; // Показываем все если поиск пустой
                      
                      return product.productName.toLowerCase().includes(searchTerm) ||
                             (product.serialNumber && product.serialNumber.toLowerCase().includes(searchTerm)) ||
                             (product.barcode && product.barcode.toLowerCase().includes(searchTerm));
                    });
                    
                    // Группируем отфильтрованные товары
                    filteredProducts.forEach(product => {
                      if (!product) return;
                      
                      if (product.isService || product.isAccessory) {
                        const key = product.arrivalId;
                        if (!groupedProducts.has(key)) {
                          groupedProducts.set(key, {
                            ...product,
                            availableCount: 0
                          });
                        }
                        groupedProducts.get(key).availableCount++;
                      } else {
                        const key = `${product.arrivalId}|serial|${product.serialNumber}`;
                        groupedProducts.set(key, product);
                      }
                    });

                    if (groupedProducts.size === 0) {
                      return (
                        <div style={{ padding: '12px', color: '#8c8c8c', textAlign: 'center' }}>
                          {searchTerm ? 'Товары не найдены' : 'Нет доступных товаров'}
                        </div>
                      );
                    }

                    return Array.from(groupedProducts.entries()).map(([key, product]) => {
                      let displayText;
                      
                      if (product.isService) {
                        displayText = `💼 ${product.productName} - ${product.price.toLocaleString('ru-RU')}₽ (Услуга) [Доступно: ${product.quantity || 1}]`;
                      } else if (product.isAccessory) {
                        displayText = `📦 ${product.productName} - ${product.price.toLocaleString('ru-RU')}₽ (Аксессуар) [Доступно: ${product.quantity || 1}]${product.barcode ? ` [${product.barcode}]` : ''}`;
                      } else {
                        displayText = `🔧 ${product.productName} - ${product.price.toLocaleString('ru-RU')}₽ (Техника) [S/N: ${product.serialNumber}]`;
                      }

                      return (
                        <div
                          key={key}
                          style={{
                            padding: '8px 12px',
                            borderBottom: '1px solid #f0f0f0',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f5f5f5';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'white';
                          }}
                          onClick={() => {
                            handleQuickAddProduct(key, product);
                            setShowSearchDropdown(false);
                            setSerialNumberSearch('');
                          }}
                        >
                          {displayText}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
              
              <div style={{ 
                fontSize: '12px', 
                color: '#8c8c8c', 
                marginTop: '4px' 
              }}>
                💡 Начните вводить название товара или серийный номер для поиска, или кликните в поле для просмотра всех товаров
              </div>
            </div>
            
            {availableProducts.length === 0 && (
              <div style={{
                padding: '16px',
                background: '#fafafa',
                border: '1px dashed #d9d9d9',
                borderRadius: '6px',
                textAlign: 'center',
                color: '#8c8c8c'
              }}>
                Нет доступных товаров из прихода. Добавьте товары в разделе "Приход".
              </div>
            )}

            {currentReceiptItems.length > 0 ? (
                              <Table
                  dataSource={currentReceiptItems}
                  rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: 'Товар',
                    dataIndex: 'productName', 
                    key: 'productName',
                    render: (name, record) => (
                      <div>
                        <div style={{ fontWeight: '500' }}>{name}</div>
                        {record.serialNumber && (
                          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                            S/N: {record.serialNumber}
                          </div>
                        )}
                        {record.supplierName && (
                          <div style={{ fontSize: '12px', color: '#fa8c16' }}>
                            Поставщик: {record.supplierName}
                          </div>
                        )}
                        {record.isAccessory && (
                          <Tag color="blue">Аксессуар</Tag>
                        )}
                      </div>
                    )
                  },
                  {
                    title: 'Цена',
                    dataIndex: 'price',
                    key: 'price',
                    width: 120,
                    render: (price, record) => (
                      <InputNumber
                        size="small"
                        value={price || 0}
                        min={0.01}
                        step={1}
                        style={{ width: '100%' }}
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                        onBlur={(e) => {
                          const value = parseFloat(e.target.value);
                          if (value && value > 0) {
                            handleUpdateItemPrice(record.id, value);
                          }
                        }}
                      />
                    )
                  },
                  {
                    title: (
                      <span>
                        Кол-во
                        <div style={{ fontSize: '10px', color: '#1890ff', fontWeight: 'normal' }}>
                          ✏️ Аксессуары
                        </div>
                      </span>
                    ),
                    dataIndex: 'quantity',
                    key: 'quantity',
                    width: 80,
                    render: (quantity, record) => {
                      // Для аксессуаров и услуг делаем количество редактируемым
                      if (record.isAccessory || record.isService) {
                        const maxAvailable = availableProducts.filter(p => p.arrivalId === record.arrivalId).length;
                        const alreadyInReceipt = currentReceiptItems
                          .filter(item => item.arrivalId === record.arrivalId && item.id !== record.id)
                          .reduce((sum, item) => sum + item.quantity, 0);
                        const maxQuantity = maxAvailable - alreadyInReceipt + quantity;
                        
                        return (
                          <InputNumber
                            size="small"
                            value={quantity}
                            min={1}
                            max={maxQuantity}
                            style={{ width: '60px' }}
                            onBlur={(e) => {
                              const value = parseInt(e.target.value);
                              if (value && value !== quantity) {
                                handleUpdateItemQuantity(record.id, value);
                              }
                            }}
                            onPressEnter={(e) => {
                              const value = parseInt((e.target as HTMLInputElement).value);
                              if (value && value !== quantity) {
                                handleUpdateItemQuantity(record.id, value);
                              }
                            }}
                          />
                        );
                      }
                      // Для техники количество всегда 1 и не редактируется
                      return `${quantity} шт.`;
                    }
                  },
                  {
                    title: 'Закупка',
                    dataIndex: 'costPrice',
                    key: 'costPrice',
                    width: 100,
                    render: (costPrice) => (
                      <span style={{ color: '#fa8c16', fontWeight: 500 }}>{(costPrice || 0).toLocaleString('ru-RU')} ₽</span>
                    )
                  },
                  {
                    title: 'Сумма',
                    dataIndex: 'total',
                    key: 'total',
                    width: 100,
                    render: (total) => (
                      <span style={{ fontWeight: '600', color: '#52c41a' }}>
                        {(total || 0).toLocaleString('ru-RU')} ₽
                      </span>
                    )
                  },
                  {
                    title: 'Действия',
                    key: 'actions',
                    width: 70,
                    render: (_, record) => (
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveItem(record.id)}
                      />
                    )
                  }
                ]}
              />
            ) : (
              <div style={{
                padding: '16px',
                background: '#fafafa',
                border: '1px dashed #d9d9d9',
                borderRadius: '6px',
                textAlign: 'center',
                color: '#8c8c8c'
              }}>
                Товары не добавлены
              </div>
            )}

            {currentReceiptItems.length > 0 && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: '6px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    {payments.length > 0 && (
                      <div style={{ fontSize: '14px', color: '#8c8c8c' }}>
                        Способ оплаты: <span style={{ color: getPaymentMethodColor(payments[0].method), fontWeight: '500' }}>
                          {getPaymentMethodText(payments[0].method)}
                        </span>
                        {payments[0].sberRecipient && (
                          <span style={{ color: '#fa8c16' }}> → {payments[0].sberRecipient}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', color: '#8c8c8c', textAlign: 'right' }}>
                      Сумма товаров: {currentReceiptItems.reduce((sum, item) => sum + item.total, 0).toLocaleString('ru-RU')} ₽
                    </div>
                    {discount.value > 0 && (
                      <div style={{ fontSize: '14px', color: '#ff4d4f', textAlign: 'right' }}>
                        Скидка: -{calculateTotalAmount().discountAmount.toLocaleString('ru-RU')} ₽
                      </div>
                    )}
                    {calculateTotalAmount().deliveryPrice > 0 && (
                      <div style={{ fontSize: '14px', color: '#8c8c8c', textAlign: 'right' }}>
                        Доставка: +{calculateTotalAmount().deliveryPrice.toLocaleString('ru-RU')} ₽
                      </div>
                    )}
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#52c41a', textAlign: 'right' }}>
                      Итого: {calculateTotalAmount().total.toLocaleString('ru-RU')} ₽
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Поле скидки */}
            {currentReceiptItems.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ marginBottom: '12px' }}>Скидка</h4>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'end' }}>
                  <div style={{ flex: 1 }}>
                    <Form.Item label="Тип скидки" style={{ marginBottom: 0 }}>
                      <Select
                        value={discount.type}
                        onChange={(value) => setDiscount(prev => ({ ...prev, type: value }))}
                        style={{ width: '100%' }}
                      >
                        <Option value="percent">Процент (%)</Option>
                        <Option value="fixed">Фиксированная сумма (₽)</Option>
                      </Select>
                    </Form.Item>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Form.Item label="Размер скидки" style={{ marginBottom: 0 }}>
                      <InputNumber
                        value={discount.value}
                        onChange={(value) => setDiscount(prev => ({ ...prev, value: value || 0 }))}
                        style={{ width: '100%' }}
                        min={0}
                        max={discount.type === 'percent' ? 100 : currentReceiptItems.reduce((sum: number, item) => sum + item.total, 0)}
                        placeholder={discount.type === 'percent' ? '0' : '0'}
                        addonAfter={discount.type === 'percent' ? '%' : '₽'}
                        formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                        parser={(value: string | undefined) => parseFloat(value?.replace(/\s?/g, '') || '0')}
                      />
                    </Form.Item>
                  </div>
                  {discount.value > 0 && (
                    <Button
                      type="text"
                      danger
                      onClick={() => setDiscount({ type: 'percent', value: 0 })}
                      style={{ marginBottom: 0 }}
                    >
                      Сбросить
                    </Button>
                  )}
                </div>
                {discount.value > 0 && (
                  <div style={{ 
                    marginTop: '8px',
                    padding: '8px 12px',
                    backgroundColor: '#fff2e8',
                    border: '1px solid #ffec3d',
                    borderRadius: '6px',
                    fontSize: '13px'
                  }}>
                    💰 Размер скидки: {calculateTotalAmount().discountAmount.toLocaleString('ru-RU')} ₽
                    {discount.type === 'percent' && ` (${discount.value}% от суммы товаров)`}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <Form.Item
            name="notes"
            label="Примечания"
          >
            <Input.TextArea rows={4} placeholder="Дополнительная информация" />
          </Form.Item>

          {/* Чекбокс "В долг" */}
          <div style={{ marginBottom: '24px' }}>
            <Form.Item name="isDebt" valuePropName="checked">
              <Checkbox 
                onChange={(e) => {
                  setIsDebtChecked(e.target.checked);
                  if (!e.target.checked) {
                    form.setFieldsValue({ clientName: '' });
                  }
                }}
              >
                В долг
              </Checkbox>
            </Form.Item>
            
            {isDebtChecked && (
              <Form.Item
                name="clientName"
                label="Имя клиента"
                rules={[
                  { required: true, message: 'Введите имя клиента для оформления в долг' }
                ]}
                style={{ marginTop: '16px' }}
              >
                <Input placeholder="Введите имя клиента" />
              </Form.Item>
            )}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h4>Доставка</h4>
            
            <Form.Item
              label={`Способ доставки`}
              style={{ marginBottom: '16px' }}
            >
              <Select
                value={selectedDeliveryMethod}
                onChange={(value) => {
                  setSelectedDeliveryMethod(value);
                  if (!value) setDeliveryZone('');
                }}
                style={{ width: '100%' }}
                allowClear
                placeholder="Выберите способ доставки"
              >
                {deliveryMethods.map(method => (
                  <Option key={method._id} value={method._id}>
                    {method.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {selectedDeliveryMethod && 
             deliveryMethods.find(m => m._id === selectedDeliveryMethod)?.costType === 'zone' && (
              <Form.Item
                label="Зона доставки"
                style={{ marginBottom: '16px' }}
              >
                <Select
                  value={deliveryZone}
                  onChange={setDeliveryZone}
                  style={{ width: '100%' }}
                  placeholder="Выберите зону доставки"
                >
                  {deliveryMethods.find(m => m._id === selectedDeliveryMethod)?.zonePrices && 
                   Object.entries(deliveryMethods.find(m => m._id === selectedDeliveryMethod)!.zonePrices!).map(([zone, price]) => (
                    <Option key={zone} value={zone}>
                      {zone} - {price}₽
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            )}

            {selectedDeliveryMethod && (
              <div style={{ 
                padding: '12px',
                background: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: '6px',
                marginTop: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Стоимость доставки:</span>
                  <span style={{ fontWeight: '600', color: '#52c41a' }}>
                    {calculateDeliveryPrice(
                      selectedDeliveryMethod,
                      currentReceiptItems.reduce((sum, item) => sum + item.total, 0),
                      deliveryZone
                    ).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </div>
            )}
          </div>
        </Form>
      </Modal>

      {/* Модальное окно добавления товара */}
      <Modal
        title="Добавить товар"
        open={isItemModalVisible}
        onOk={handleAddItemOk}
        onCancel={() => {
          setIsItemModalVisible(false);
          itemForm.resetFields();
        }}
        width={700}
      >
        {debts.some(debt => debt.status === 'paid') && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: '6px',
            fontSize: '14px',
            marginBottom: '16px'
          }}>
            <strong>ℹ️ Информация:</strong> Товары из приходов с оплаченными долгами скрыты из списка и недоступны для добавления в чек.
          </div>
        )}
        
        <Form form={itemForm} layout="vertical" initialValues={{ quantity: 1 }}>
          <Form.Item
            name="arrivalId"
            label="Товар"
            rules={[{ required: true, message: 'Выберите товар' }]}
          >
            <Select
              showSearch
              placeholder="Выберите товар"
              optionFilterProp="children"
              style={{ width: '100%' }}
              onChange={(value) => {
                // Для техники value содержит серийный номер через разделитель
                if (value.includes('|serial|')) {
                  const [arrivalId, , serialNumber] = value.split('|');
                  const product = availableProducts.find(p => p.arrivalId === arrivalId && p.serialNumber === serialNumber);
                  if (product) {
                    itemForm.setFieldsValue({
                      serialNumber: product.serialNumber,
                      quantity: 1
                    });
                  }
                } else {
                  // Для услуг и аксессуаров просто берем по arrivalId
                  const products = availableProducts.filter(p => p.arrivalId === value);
                  if (products.length > 0) {
                    const product = products[0];
                    itemForm.setFieldsValue({
                      serialNumber: product.serialNumber || undefined,
                      quantity: 1
                    });
                  }
                }
              }}
            >
              {(() => {
                const groupedProducts = new Map<string, any>();
                
                // Группируем товары для правильного отображения
                availableProducts.forEach(product => {
                  if (!product) return;
                  
                  if (product.isService || product.isAccessory) {
                    // Для услуг и аксессуаров группируем по arrivalId
                    const key = product.arrivalId;
                    if (!groupedProducts.has(key)) {
                      groupedProducts.set(key, {
                        ...product,
                        availableCount: 0
                      });
                    }
                    groupedProducts.get(key).availableCount++;
                  } else {
                    // Для техники создаем отдельную запись для каждого серийного номера
                    const key = `${product.arrivalId}|serial|${product.serialNumber}`;
                    groupedProducts.set(key, product);
                  }
                });

                return Array.from(groupedProducts.entries()).map(([key, product]) => {
                  if (!product) return null;
                  
                  let displayText;
                  let value;
                  
                  if (product.isService) {
                    displayText = `💼 ${product.productName} - ${product.price.toLocaleString('ru-RU')}₽ (Услуга) [Доступно: ${product.quantity || 1}]`;
                    value = product.arrivalId;
                  } else if (product.isAccessory) {
                    displayText = `📦 ${product.productName} - ${product.price.toLocaleString('ru-RU')}₽ (Аксессуар) [Доступно: ${product.quantity || 1}]${product.barcode ? ` [${product.barcode}]` : ''}`;
                    value = product.arrivalId;
                  } else {
                    displayText = `🔧 ${product.productName} - ${product.price.toLocaleString('ru-RU')}₽ (Техника) [S/N: ${product.serialNumber}]`;
                    value = key; // Для техники value содержит серийный номер
                  }

                  return (
                    <Select.Option key={key} value={value}>
                      {displayText}
                    </Select.Option>
                  );
                });
              })()}
            </Select>
          </Form.Item>

          {(() => {
            const selectedArrivalId = itemForm.getFieldValue('arrivalId');
            if (!selectedArrivalId) return null;

            const products = availableProducts.filter(p => p.arrivalId === selectedArrivalId);
            if (products.length === 0) return null;

            const product = products[0];
            const isAccessory = product.isAccessory;
            
            if (isAccessory || product.isService) {
              // Находим группированный товар в availableProducts
              const groupedProduct = availableProducts.find(p => 
                p.productName === product.productName && 
                p.barcode === product.barcode &&
                p.isAccessory === product.isAccessory &&
                p.isService === product.isService
              );
              
              const maxAvailable = groupedProduct?.quantity || 1;
              const alreadyInReceipt = currentReceiptItems
                .filter(item => 
                  item.productName === product.productName && 
                  item.barcode === product.barcode &&
                  item.isAccessory === product.isAccessory &&
                  item.isService === product.isService
                )
                .reduce((sum, item) => sum + item.quantity, 0);
              const availableToAdd = maxAvailable - alreadyInReceipt;
              
              return (
                <div>
                  <Form.Item
                    name="quantity"
                    label={
                      <span>
                        Количество 
                        <span style={{ color: '#1890ff', fontSize: '12px', marginLeft: '8px' }}>
                          ✏️ Можно изменить
                        </span>
                      </span>
                    }
                    rules={[{ required: true, message: 'Введите количество' }]}
                    initialValue={1}
                  >
                    <InputNumber 
                      min={1} 
                      max={availableToAdd} 
                      style={{ width: '100%' }} 
                      placeholder={`Доступно: ${availableToAdd} шт.`}
                      addonAfter="шт."
                      step={1}
                      precision={0}
                    />
                  </Form.Item>
                  <div style={{ 
                    padding: '8px 12px', 
                    backgroundColor: '#f6ffed', 
                    border: '1px solid #b7eb8f', 
                    borderRadius: '6px',
                    fontSize: '13px'
                  }}>
                    <div>💡 <strong>Информация:</strong></div>
                    <div>Тип: {product.isService ? 'Услуга' : 'Аксессуар'}</div>
                    <div>Цена: {product.price.toLocaleString('ru-RU')} ₽</div>
                    <div>Закупка: {product.costPrice.toLocaleString('ru-RU')} ₽</div>
                    <div>Доступно всего: {maxAvailable} шт.</div>
                    <div>Уже в чеке: {alreadyInReceipt} шт.</div>
                    <div>Можно добавить: {availableToAdd} шт.</div>
                    {product.barcode && <div>Штрихкод: {product.barcode}</div>}
                    <div style={{ marginTop: '8px', color: '#1890ff', fontWeight: '500' }}>
                      ✏️ Количество можно изменить после добавления в чеке
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div>
                <Form.Item
                  name="quantity"
                  label="Количество"
                  initialValue={1}
                >
                  <InputNumber 
                    value={1}
                    disabled
                    min={1}
                    max={1}
                    style={{ width: '100%' }} 
                    placeholder="Только 1 шт. для техники"
                  />
                </Form.Item>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: '#f6ffed', 
                  border: '1px solid #b7eb8f', 
                  borderRadius: '6px' 
                }}>
                  <div style={{ marginBottom: '8px' }}>💡 <strong>Информация о товаре:</strong></div>
                  <div>Тип: Техника</div>
                  <div>Цена: {product.price.toLocaleString('ru-RU')} ₽</div>
                  <div>Закупка: {product.costPrice.toLocaleString('ru-RU')} ₽</div>
                  {product.serialNumber && <div>Серийный номер: {product.serialNumber}</div>}
                  <div style={{ marginTop: '8px', color: '#1890ff' }}>
                    ✓ Количество: 1 шт. (для техники всегда 1)
                  </div>
                </div>
              </div>
            );
          })()}
        </Form>
      </Modal>

      {/* Модальное окно отката */}
      <Modal
        title="Откат клиенту"
        open={isRefundModalVisible}
        onOk={handleRefundOk}
        onCancel={() => setIsRefundModalVisible(false)}
        width={700}
      >
        <Form form={refundForm} layout="vertical">
          <Form.Item
            name="amount"
            label="Сумма отката"
            rules={[{ required: true, message: 'Введите сумму отката' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              step={1}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value: string | undefined) => parseFloat(value?.replace(/[^\d.]/g, '') || '0')}
            />
          </Form.Item>
          <Form.Item
            name="clientName"
            label="Имя клиента"
            rules={[{ required: true, message: 'Введите имя клиента' }]}
          >
            <Input placeholder="Введите имя клиента" />
          </Form.Item>
          <Form.Item
            name="notes"
            label="Примечания"
          >
            <Input.TextArea rows={4} placeholder="Дополнительная информация" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Receipts; 