import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Input, 
  Select, 
  Modal, 
  Form, 
  InputNumber,
  message,
  Space,
  Tag,
  Tooltip,
  Divider,
  Row,
  Col,
  Popconfirm,
  TreeSelect,
  Checkbox,
  AutoComplete
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  EditOutlined, 
  DeleteOutlined,
  InboxOutlined,
  CalendarOutlined,
  NumberOutlined,
  MinusCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { logArrivalAction } from '../utils/actionLogger';
import { suppliersApi, arrivalsApi, debtsApi } from '../utils/baseApi';
import { useAuth } from '../hooks/useAuth';
import '../styles/adaptive-select.css';

const { Search } = Input;
const { Option } = Select;

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  isAccessory: boolean;
  isActive?: boolean; // Добавляем поле активности товара
}

interface Supplier {
  _id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  inn?: string;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Интерфейс для шаблона услуги
interface ServiceTemplate {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  createdAt: string;
}

// Новая структура для товара/услуги в приходе
interface ArrivalItemDetail {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  serialNumbers: string[];
  barcode?: string; // оставляем для обратной совместимости
  barcodes?: string[]; // новое поле для множественных штрихкодов
  price: number;
  costPrice: number;
  isAccessory: boolean;
  isService?: boolean; // новое поле для услуг
  supplierId?: string; // поставщик для конкретного товара/услуги
  supplierName?: string; // название поставщика
  serialNumberData?: Array<{
    supplierId: string;
    supplierName: string;
    costPrice: number;
    price: number;
  }>; // данные для каждого серийного номера
  barcodeData?: Array<{
    supplierId: string;
    supplierName: string;
    costPrice: number;
    price: number;
  }>; // данные для каждого штрихкода
}

// Новая структура для прихода
interface Arrival {
  id: string;
  _id?: string; // MongoDB ID
  date: string;
  supplierId?: string;
  supplierName?: string;
  notes?: string;
  items: ArrivalItemDetail[];
  totalQuantity: number;
  totalValue: number;
}

// Старая структура для обратной совместимости
interface ArrivalItem {
  id: string;
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
}

const Arrivals: React.FC = () => {
  const { canDeleteAnything, hasFullAccess } = useAuth();
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [loadingArrivals, setLoadingArrivals] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [debts, setDebts] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingArrival, setEditingArrival] = useState<Arrival | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState<number>(() => {
    const saved = localStorage.getItem('arrivalsPageSize');
    return saved ? parseInt(saved) : 10;
  });
  const [currentItems, setCurrentItems] = useState<ArrivalItemDetail[]>([]);
  const [receiptsWithSerialNumbers, setReceiptsWithSerialNumbers] = useState<{[key: string]: boolean}>({});

  // Загрузка информации о чеках с серийными номерами
  const loadReceiptsWithSerialNumbers = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/receipts/serial-numbers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Создаем объект, где ключ - серийный номер, значение - true (есть чек)
        const serialNumbersMap = data.reduce((acc: {[key: string]: boolean}, sn: string) => {
          acc[sn] = true;
          return acc;
        }, {});
        setReceiptsWithSerialNumbers(serialNumbersMap);
      }
    } catch (error) {
      console.error('Ошибка при загрузке информации о чеках:', error);
    }
  };

  // Загружаем информацию о чеках при монтировании компонента
  useEffect(() => {
    loadReceiptsWithSerialNumbers();
  }, []);

  // Функция для проверки наличия чека для серийного номера
  const hasReceiptForSerialNumber = (serialNumber: string): boolean => {
    return !!receiptsWithSerialNumbers[serialNumber];
  };

  // Функция для обработки изменения размера страницы
  const handlePageSizeChange = (current: number, size: number) => {
    setPageSize(size);
    localStorage.setItem('arrivalsPageSize', size.toString());
  };
  const [serviceTemplates, setServiceTemplates] = useState<ServiceTemplate[]>([]);
  
  // Состояние для модального окна создания товара
  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [productForm] = Form.useForm();
  const [categories, setCategories] = useState<any[]>([]);
  const [characteristics, setCharacteristics] = useState<any[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  


  
  // Состояние для серийных номеров и штрихкодов
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [serialNumbers, setSerialNumbers] = useState<string[]>(['']);
  const [barcodes, setBarcodes] = useState<string[]>(['']);
  
  // Состояние для поставщиков серийных номеров
  const [serialNumberSuppliers, setSerialNumberSuppliers] = useState<{supplierId: string, supplierName: string}[]>([{supplierId: '', supplierName: ''}]);
  
  // Состояние для настройки прихода прямо в модальном окне товара
  const [showArrivalSection, setShowArrivalSection] = useState(false);

  // Функция миграции старых данных
  const migrateOldArrivals = (oldArrivals: ArrivalItem[]): Arrival[] => {
    const groupedByDate = new Map<string, ArrivalItem[]>();
    
    // Группируем старые приходы по дате и поставщику
    oldArrivals.forEach(item => {
      const key = `${item.date}_${item.supplierId || 'no_supplier'}`;
      if (!groupedByDate.has(key)) {
        groupedByDate.set(key, []);
      }
      groupedByDate.get(key)!.push(item);
    });

    // Создаем новые приходы
    const newArrivals: Arrival[] = [];
    let arrivalCounter = 1;

    groupedByDate.forEach((items, key) => {
      const firstItem = items[0];
      const arrivalItems: ArrivalItemDetail[] = items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        serialNumbers: item.serialNumbers,
        barcode: item.barcode,
        price: item.price,
        costPrice: item.costPrice,
        isAccessory: item.isAccessory
      }));

      const totalQuantity = arrivalItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalValue = arrivalItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      newArrivals.push({
        id: `migrated_${arrivalCounter++}_${Date.now()}`,
        date: firstItem.date,
        supplierId: firstItem.supplierId,
        supplierName: firstItem.supplierName,
        notes: firstItem.notes,
        items: arrivalItems,
        totalQuantity,
        totalValue
      });
    });

    return newArrivals;
  };

  // Данные теперь сохраняются через API, не нужно сохранять в localStorage

  // Загрузка поставщиков из API
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        setLoadingSuppliers(true);
        const data = await suppliersApi.getAll();
        const activeSuppliers = data.filter((supplier: any) => supplier.status === 'active');
        setSuppliers(activeSuppliers);
      } catch (error) {
        console.error('Error loading suppliers:', error);
        message.error('Ошибка при загрузке поставщиков');
      } finally {
        setLoadingSuppliers(false);
      }
    };

    loadSuppliers();
  }, []);

  // Загрузка приходов из API
  const loadArrivals = async () => {
    try {
      setLoadingArrivals(true);
      const data = await arrivalsApi.getAll();
      setArrivals(data);
    } catch (error) {
      console.error('Error loading arrivals:', error);
      message.error('Ошибка при загрузке приходов');
    } finally {
      setLoadingArrivals(false);
    }
  };

  useEffect(() => {
    loadArrivals();
    loadDebts();
    loadReceipts();
  }, []);

  // Обновляем долги при изменениях
  useEffect(() => {
    const handleDebtUpdated = () => {
      loadDebts();
    };

    window.addEventListener('debtUpdated', handleDebtUpdated);
    window.addEventListener('debtPaid', handleDebtUpdated);
    window.addEventListener('debtCreated', handleDebtUpdated);
    
    return () => {
      window.removeEventListener('debtUpdated', handleDebtUpdated);
      window.removeEventListener('debtPaid', handleDebtUpdated);
      window.removeEventListener('debtCreated', handleDebtUpdated);
    };
  }, []);

  // Обновляем чеки при изменениях
  useEffect(() => {
    const handleReceiptUpdated = () => {
      loadReceipts();
      loadReceiptsWithSerialNumbers(); // Обновляем информацию о чеках с серийными номерами
    };

    window.addEventListener('receiptCreated', handleReceiptUpdated);
    window.addEventListener('receiptUpdated', handleReceiptUpdated);
    window.addEventListener('receiptCancelled', handleReceiptUpdated);
    window.addEventListener('receiptDeleted', handleReceiptUpdated);
    
    return () => {
      window.removeEventListener('receiptCreated', handleReceiptUpdated);
      window.removeEventListener('receiptUpdated', handleReceiptUpdated);
      window.removeEventListener('receiptCancelled', handleReceiptUpdated);
      window.removeEventListener('receiptDeleted', handleReceiptUpdated);
    };
  }, []);

  // Загрузка долгов
  const loadDebts = async () => {
    try {
      const data = await debtsApi.getAll();
      setDebts(data);
    } catch (error) {
      console.error('Error loading debts:', error);
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
      
      if (response.ok) {
        const data = await response.json();
        setReceipts(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки чеков:', error);
    }
  };

  // Проверка наличия активных чеков с товарами из прихода
  const hasReceiptsWithArrivalItems = (arrivalId: string): boolean => {
    return receipts.some(receipt => {
      // Пропускаем отмененные и удаленные чеки
      if (receipt.status === 'cancelled' || receipt.status === 'deleted') return false;
      return receipt.items && receipt.items.some((item: any) => 
        item.arrivalId === arrivalId
      );
    });
  };

  // Функция для проверки оплаты долга по приходу
  const isDebtPaid = (arrivalId: string): boolean => {
    const debt = debts.find(d => d.arrivalId === arrivalId);
    return debt?.status === 'paid';
  };

  // Функция для очистки всех приходов (только для админов и бухгалтеров)
  const handleClearAllArrivals = async () => {
    if (!hasFullAccess()) {
      message.error('Только администратор или бухгалтер может очищать все записи');
      return;
    }

    Modal.confirm({
      title: 'Очистить все приходы?',
      content: (
        <div>
          <p><strong>Вы действительно хотите удалить ВСЕ приходы?</strong></p>
          <p style={{ color: '#ff4d4f' }}>⚠️ Это действие нельзя отменить!</p>
          <p>Будут удалены:</p>
          <ul>
            <li>Все приходы ({arrivals.length} записей)</li>
            <li>Связанные долги поставщикам</li>
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
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/arrivals/clear-all`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const result = await response.json();
            setArrivals([]);
            message.success(`Все приходы удалены: ${result.deletedCount || arrivals.length} записей`);
            
            // Перезагружаем данные
            await loadArrivals();
            await loadDebts();
          } else {
            const error = await response.json();
            message.error(error.message || 'Ошибка при удалении приходов');
          }
        } catch (error) {
          console.error('❌ Ошибка при удалении всех приходов:', error);
          message.error('Ошибка при удалении приходов');
        }
      }
    });
  };

  // Загрузка товаров из API
  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchCharacteristics();
    fetchServiceTemplates();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      // Добавляем параметры для получения всех товаров (включая неактивные) и без лимита пагинации
      const params = new URLSearchParams({
        limit: '1000', // Увеличиваем лимит для получения всех товаров
        page: '1',
        admin: 'true' // Параметр для получения всех товаров в админ-панели
      });
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/products?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const products = data.products || [];
        console.log('📦 Загружено товаров для приходов:', products.length);
        
        // Дополнительная информация о товарах
        if (products.length > 0) {
          const activeCount = products.filter((p: any) => p.isActive !== false).length;
          const inactiveCount = products.length - activeCount;
          console.log(`📊 Активных товаров: ${activeCount}, Неактивных: ${inactiveCount}`);
          console.log('🔍 Первые 3 товара:', products.slice(0, 3).map((p: any) => ({
            name: p.name,
            category: p.category,
            isActive: p.isActive
          })));
        }
        
        setProducts(products);
      } else {
        console.error('❌ Ошибка при загрузке товаров:', response.status);
        message.error('Ошибка загрузки товаров');
      }
    } catch (error) {
      console.error('❌ Ошибка fetchProducts:', error);
      message.error('Ошибка загрузки товаров');
    }
  };

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

  const fetchCharacteristics = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/characteristics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCharacteristics(data || []);
        
        // Загружаем значения для каждой характеристики
        const values: { [key: string]: any[] } = {};
        for (const char of data) {
          const valuesResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/characteristics/${char._id}/values`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (valuesResponse.ok) {
            values[char._id] = await valuesResponse.json();
          }
        }

      }
    } catch (error) {
      message.error('Ошибка загрузки характеристик');
    }
  };

  // Загрузка шаблонов услуг с сервера
  const fetchServiceTemplates = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/service-templates`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setServiceTemplates(data || []);
        console.log('📋 Загружено шаблонов услуг с сервера:', data.length);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Ошибка загрузки шаблонов услуг с сервера:', error);
      // Fallback: загружаем из localStorage
      const saved = localStorage.getItem('serviceTemplates');
      if (saved) {
        try {
          const localTemplates = JSON.parse(saved);
          setServiceTemplates(localTemplates);
          console.log('📋 Загружено шаблонов услуг из localStorage:', localTemplates.length);
        } catch (e) {
          console.error('Ошибка парсинга localStorage:', e);
          setServiceTemplates([]);
        }
      } else {
        setServiceTemplates([]);
      }
    }
  };

  // Сохранение новых шаблонов услуг на сервер
  const saveServiceTemplates = async (newTemplates: ServiceTemplate[]) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/service-templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ templates: newTemplates })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Шаблоны услуг сохранены на сервере:', result);
        // Обновляем локальное состояние
        await fetchServiceTemplates();
        return true;
      } else {
        console.error('❌ Ошибка сохранения шаблонов услуг на сервере');
        return false;
      }
    } catch (error) {
      console.error('❌ Ошибка при отправке шаблонов услуг на сервер:', error);
      return false;
    }
  };

  const handleCreateArrival = () => {
    setEditingArrival(null);
    setCurrentItems([]); // Начинаем с пустого списка товаров/услуг
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleCreateProduct = () => {
    setIsProductModalVisible(true);
    productForm.resetFields();
    setSelectedImages([]);
    setShowArrivalSection(false);
    // Устанавливаем скрытый по умолчанию
    productForm.setFieldsValue({
      isHidden: true
    });
  };

  // Функция для добавления товара в приход
  const addProductToArrival = () => {
    const newIndex = currentItems.length;
    const newItem: ArrivalItemDetail = {
      id: 'temp_' + Date.now() + Math.random(),
      productId: '',
      productName: '',
      quantity: 1, // По умолчанию количество = 1
      serialNumbers: [],
      barcode: undefined,
      barcodes: undefined,
      price: 0,
      costPrice: 0,
      isAccessory: false,
      supplierId: '',
      supplierName: '',
      serialNumberData: undefined,
      barcodeData: undefined
    };
    
    setCurrentItems(prev => [...prev, newItem]);
    
    // Автоматически заполняем поля формы значениями по умолчанию
    setTimeout(() => {
      form.setFieldsValue({
        [`quantity_${newIndex}`]: 1,
        [`price_${newIndex}`]: 0,
        [`costPrice_${newIndex}`]: 0
      });
    }, 100);
  };

  // Функция для добавления услуги в приход
  const addServiceToArrival = () => {
    const newIndex = currentItems.length;
    const newItem: ArrivalItemDetail = {
      id: 'temp_' + Date.now() + Math.random(),
      productId: 'service_' + Date.now(),
      productName: '',
      quantity: 1, // По умолчанию количество = 1
      serialNumbers: [],
      barcode: undefined,
      barcodes: undefined,
      price: 0,
      costPrice: 0,
      isAccessory: false,
      isService: true,
      supplierId: '',
      supplierName: '',
      serialNumberData: undefined,
      barcodeData: undefined
    };
    
    setCurrentItems(prev => [...prev, newItem]);
    
    // Автоматически заполняем поля формы значениями по умолчанию
    setTimeout(() => {
      form.setFieldsValue({
        [`quantity_${newIndex}`]: 1,
        [`price_${newIndex}`]: 0,
        [`costPrice_${newIndex}`]: 0
      });
    }, 100);
  };

  // Функция для обработки изменения товара в приходе
  const handleProductChange = async (index: number, productId: string) => {
    const product = products.find(p => p._id === productId);
    if (!product) return;

    const newItems = [...currentItems];
    const isAccessory = product.isAccessory || isAccessoryCategory(product.category);
    
    // Обновляем информацию о товаре
    newItems[index] = {
      ...newItems[index],
      productId: product._id,
      productName: product.name,
      isAccessory: isAccessory,
      price: product.price || 0,
      costPrice: product.costPrice || 0
    };

    // Для техники (не аксессуаров) автоматически добавляем один серийный номер
    if (!isAccessory) {
      newItems[index].serialNumbers = [''];
      newItems[index].quantity = 1; // Количество = количество серийных номеров
      newItems[index].barcode = undefined; // Убираем штрихкод для техники
      newItems[index].barcodes = undefined; // Убираем штрихкоды для техники
      newItems[index].barcodeData = undefined; // Убираем данные штрихкодов для техники
      newItems[index].serialNumberData = [{
        supplierId: '',
        supplierName: '',
        costPrice: product.costPrice || 0,
        price: product.price || 0
      }]; // Инициализируем данные для первого серийного номера
    } else {
      // Для аксессуаров очищаем серийные номера и инициализируем штрихкоды
      newItems[index].serialNumbers = [];
      newItems[index].quantity = 1; // По умолчанию 1, но можно изменить
      newItems[index].barcode = undefined; // Убираем старый формат штрихкода
      newItems[index].barcodes = ['']; // Инициализируем новый формат штрихкодов
      newItems[index].barcodeData = [{
        supplierId: '',
        supplierName: '',
        costPrice: product.costPrice || 0,
        price: product.price || 0
      }]; // Инициализируем данные для первого штрихкода
      newItems[index].serialNumberData = undefined; // Для аксессуаров не нужны данные серийных номеров
    }

    setCurrentItems(newItems);

    // Обновляем поля формы
    form.setFieldsValue({
      [`price_${index}`]: product.price || 0,
      [`costPrice_${index}`]: product.costPrice || 0,
      [`quantity_${index}`]: 1
    });
  };

  // Функции для работы с серийными номерами
  const addSerialNumber = () => {
    setSerialNumbers(prev => [...prev, '']);
    setSerialNumberSuppliers(prev => [...prev, {supplierId: '', supplierName: ''}]);
  };

  const removeSerialNumber = (index: number) => {
    setSerialNumbers(prev => prev.filter((_, i) => i !== index));
    setSerialNumberSuppliers(prev => prev.filter((_, i) => i !== index));
  };

  const updateSerialNumber = (index: number, value: string) => {
    setSerialNumbers(prev => prev.map((sn, i) => i === index ? value : sn));
    
    // Проверяем уникальность введенного серийного номера
    if (value.trim() && value.length > 2) { // Проверяем только если введено более 2 символов
      const trimmedValue = value.trim();
      
      // Проверяем дубликаты в других приходах
      const duplicates = checkSerialNumberUniqueness([trimmedValue]);
      if (duplicates.length > 0) {
        message.warning(`Серийный номер "${trimmedValue}" уже существует в системе`);
        return;
      }
      
      // Проверяем дубликаты в текущем приходе (кроме текущего поля)
      const currentSerialNumbers = serialNumbers.filter((sn, i) => i !== index && sn.trim() !== '');
      if (currentSerialNumbers.includes(trimmedValue)) {
        message.warning(`Серийный номер "${trimmedValue}" уже используется в этом приходе`);
      }
    }
  };

  const updateSerialNumberSupplier = (index: number, supplierId: string) => {
    const supplier = suppliers.find(s => s._id === supplierId);
    const newSuppliers = [...serialNumberSuppliers];
    newSuppliers[index] = {
      supplierId: supplierId,
      supplierName: supplier ? supplier.name : ''
    };
    setSerialNumberSuppliers(newSuppliers);
  };

  // Функция для проверки уникальности серийных номеров
  const checkSerialNumberUniqueness = (serialNumbersToCheck: string[], excludeArrivalId?: string): string[] => {
    const duplicates: string[] = [];
    
    serialNumbersToCheck.forEach(serialNumber => {
      if (!serialNumber.trim()) return;
      
      // Проверяем во всех существующих приходах
      const existingArrival = arrivals.find(arrival => {
        // Исключаем текущий приход при редактировании
        if (excludeArrivalId && (arrival.id === excludeArrivalId || arrival._id === excludeArrivalId)) {
          return false;
        }
        
        return arrival.items.some(item => {
          return item.serialNumbers && item.serialNumbers.includes(serialNumber);
        });
      });

      // Если серийный номер найден в существующем приходе
      if (existingArrival) {
        const arrivalId = existingArrival._id || existingArrival.id;
        // Проверяем, есть ли чек с этим серийным номером и оплачен ли приход
        const hasCompletedReceipt = hasReceiptForSerialNumber(serialNumber);
        const isArrivalPaid = isDebtPaid(arrivalId);
        
        // Можно использовать серийный номер повторно только если и приход оплачен, и есть завершенный чек
        if (!hasCompletedReceipt || !isArrivalPaid) {
          duplicates.push(serialNumber);
          let errorMessage = `Серийный номер "${serialNumber}" уже используется в приходе и не может быть использован повторно:`;
          if (!hasCompletedReceipt) errorMessage += "\n- Нет завершенного чека на этот товар";
          if (!isArrivalPaid) errorMessage += "\n- Приход не оплачен";
          message.warning(errorMessage, 10); // Увеличиваем время показа сообщения до 10 секунд
        } else {
          // Если все условия выполнены, показываем информационное сообщение
          message.info(`Серийный номер "${serialNumber}" уже использовался ранее, но может быть использован повторно, так как предыдущий приход оплачен и товар продан`, 5);
        }
      }
    });
    
    return duplicates;
  };

  // Функция для генерации уникального артикула
  const generateUniqueArticle = async (isAccessory: boolean): Promise<string> => {
    try {
      const prefix = isAccessory ? '1' : '0';
      const token = localStorage.getItem('admin_token');
      
      // Получаем все существующие артикулы с сервера
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/products?fields=article`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const existingProducts = response.ok ? await response.json() : [];
      const existingArticles = new Set(existingProducts.map((p: any) => p.article).filter(Boolean));
      
      // Генерируем новый артикул
      let attempts = 0;
      let newArticle: string;
      
      do {
        // Генерируем 8 случайных цифр
        const randomPart = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
        newArticle = prefix + randomPart;
        attempts++;
        
        // Защита от бесконечного цикла
        if (attempts > 1000) {
          throw new Error('Не удалось сгенерировать уникальный артикул');
        }
      } while (existingArticles.has(newArticle));
      
      return newArticle;
    } catch (error) {
      console.error('Ошибка генерации артикула:', error);
      // Fallback - простая генерация без проверки на сервере
      const prefix = isAccessory ? '1' : '0';
      const randomPart = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
      return prefix + randomPart;
    }
  };

  // Функция для копирования текста в буфер обмена
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success(`Скопировано: ${text}`);
    } catch (error) {
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      message.success(`Скопировано: ${text}`);
    }
  };

  // Функции для работы со штрихкодами
  const addBarcode = () => {
    setBarcodes(prev => [...prev, '']);
  };

  const removeBarcode = (index: number) => {
    setBarcodes(prev => prev.filter((_, i) => i !== index));
  };

  const updateBarcode = (index: number, value: string) => {
    setBarcodes(prev => prev.map((bc, i) => i === index ? value : bc));
  };

  // Проверяем, является ли выбранная категория аксессуаром или подкатегорией аксессуаров
  const isAccessoryCategory = (categoryId: string) => {
    const ACCESSORIES_CATEGORY_NAME = 'Аксессуары';

    const findCategory = (cats: any[], id: string): any => {
      for (const cat of cats) {
        if (cat._id === id || cat.id === id) return cat;
        if (cat.children) {
          const found = findCategory(cat.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const findParentCategory = (cats: any[], childId: string): any => {
      for (const cat of cats) {
        if (cat.children) {
          if (cat.children.some((child: any) => child._id === childId || child.id === childId)) {
            return cat;
          }
          const foundParent = findParentCategory(cat.children, childId);
          if (foundParent) return foundParent;
        }
      }
      return null;
    };

    const checkCategoryChain = (catId: string): boolean => {
      const category = findCategory(categories, catId);
      if (!category) {
        console.log('🔍 Категория не найдена:', catId);
        return false;
      }

      console.log('🔍 Проверяем категорию:', category.name);

      // Проверяем текущую категорию
      if (category.name === ACCESSORIES_CATEGORY_NAME) {
        console.log('✅ Найдена категория аксессуаров');
        return true;
      }

      // Проверяем родительские категории
      let parent = findParentCategory(categories, catId);
      while (parent) {
        console.log('⬆️ Проверяем родительскую категорию:', parent.name);
        if (parent.name === ACCESSORIES_CATEGORY_NAME) {
          console.log('✅ Родительская категория является категорией аксессуаров');
          return true;
        }
        parent = findParentCategory(categories, parent._id || parent.id);
      }

      console.log('❌ Категория не является аксессуаром');
      return false;
    };

    const result = checkCategoryChain(categoryId);
    console.log('🎯 Результат проверки isAccessoryCategory:', result, 'для категории ID:', categoryId);
    return result;
  };

  // Функции для работы с деревом категорий (как на странице товаров)
  const buildCategoryTree = (categories: any[]): any[] => {
    // API уже возвращает дерево, поэтому просто возвращаем как есть
    if (categories.length > 0 && categories[0].children !== undefined) {
      return categories
    }
    
    // Если данные в плоском виде, строим дерево
    const categoryMap = new Map<string, any>()
    const rootCategories: any[] = []

    // Создаем карту всех категорий
    categories.forEach(category => {
      categoryMap.set(category._id, { ...category, children: [] })
    })

    // Строим дерево
    categories.forEach(category => {
      const categoryWithChildren = categoryMap.get(category._id)!
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId)
        if (parent) {
          parent.children!.push(categoryWithChildren)
        } else {
          // Если родитель не найден, добавляем как корневую категорию
          rootCategories.push(categoryWithChildren)
        }
      } else {
        rootCategories.push(categoryWithChildren)
      }
    })

    return rootCategories
  };

  // Функция для преобразования категорий в формат TreeSelect
  const convertToTreeSelectData = (categories: any[]): any[] => {
    return categories.map(category => ({
      title: (
        <span>
          {category.name}
          {category.children && category.children.length > 0 && (
            <span style={{ color: '#999', fontSize: '12px', marginLeft: 8 }}>
              ({category.children.length})
            </span>
          )}
        </span>
      ),
      value: category._id || category.id, // Используем ID категории как значение
      key: category._id || category.id,
      children: category.children && category.children.length > 0 ? convertToTreeSelectData(category.children) : undefined,
      isLeaf: !category.children || category.children.length === 0,
      selectable: true // Позволяет выбирать как родительские, так и дочерние категории
    }))
  };

  const handleProductModalOk = async () => {
    try {
      const values = await productForm.validateFields();
      console.log('📝 Создание товара:', values);
      console.log('🔧 showArrivalSection:', showArrivalSection);
      
      // Проверяем обязательные поля для прихода только если включен режим добавления в приход
      if (showArrivalSection) {
        if (!values.price || values.price <= 0) {
          message.error('При добавлении товара на приход цена продажи обязательна');
          return;
        }
        if (!values.costPrice || values.costPrice <= 0) {
          message.error('При добавлении товара на приход закупочная цена обязательна');
          return;
        }

        const isAccessory = isAccessoryCategory(values.category);
        
        if (isAccessory) {
          if (!values.supplierId) {
            message.error('При добавлении аксессуара на приход необходимо выбрать поставщика');
            return;
          }
          // Устанавливаем количество по умолчанию 1, если не задано
          if (!values.quantity || values.quantity <= 0) {
            values.quantity = 1;
            productForm.setFieldsValue({ quantity: 1 });
          }
        } else {
          const validSerialNumbers = serialNumbers.filter(sn => sn.trim() !== '');
          if (validSerialNumbers.length === 0) {
            message.error('Для техники необходимо добавить хотя бы один серийный номер');
            return;
          }
          
          // Проверяем уникальность серийных номеров
          const duplicateSerialNumbers = checkSerialNumberUniqueness(validSerialNumbers);
          if (duplicateSerialNumbers.length > 0) {
            message.error(`Серийные номера уже существуют в системе: ${duplicateSerialNumbers.join(', ')}`);
            return;
          }
          
          // Проверяем, что для каждого серийного номера выбран поставщик
          for (let i = 0; i < validSerialNumbers.length; i++) {
            if (!serialNumberSuppliers[i]?.supplierId) {
              message.error(`Для серийного номера "${validSerialNumbers[i]}" необходимо выбрать поставщика`);
              return;
            }
          }
        }
      }
      
      const token = localStorage.getItem('admin_token');
      const formData = new FormData();
      
      // Добавляем основные поля
      Object.keys(values).forEach(key => {
        if (values[key] !== undefined && values[key] !== null) {
          let fieldName = key;
          if (key === 'category') {
            fieldName = 'categoryId';
          } else if (key === 'article') {
            fieldName = 'sku'; // Передаем артикул как SKU товара
          } else if (key === 'isHidden') {
            fieldName = 'isActive';
            // Инвертируем значение: если isHidden = true, то isActive = false
            formData.append(fieldName, String(!values[key]));
            return;
          }
          formData.append(fieldName, values[key]);
        }
      });

      // Добавляем признак, что товар из базы
      formData.append('isFromDatabase', 'true');

      // Добавляем серийные номера или штрихкоды только если товар добавляется в приход
      if (showArrivalSection) {
        const isAccessory = isAccessoryCategory(values.category);
        const validSerialNumbers = serialNumbers.filter(sn => sn.trim() !== '');
        const validBarcodes = barcodes.filter(bc => bc.trim() !== '');

        if (isAccessory && validBarcodes.length > 0) {
          formData.append('barcodes', JSON.stringify(validBarcodes));
        } else if (!isAccessory && validSerialNumbers.length > 0) {
          formData.append('serialNumbers', JSON.stringify(validSerialNumbers));
        }
      }

      // Добавляем изображения если есть
      selectedImages.forEach((file, index) => {
        formData.append('images', file);
      });

      console.log('📤 Отправляем данные на сервер:', {
        ...Object.fromEntries(formData.entries()),
        showArrivalSection
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        const newProduct = result.product || result;
        console.log('🎉 Ответ сервера при создании товара:', newProduct);
        
        // Добавляем товар в приход только если включен соответствующий режим
        if (showArrivalSection) {
          console.log('📦 Добавляем товар в приход');
          
          if (!newProduct || !newProduct._id) {
            console.error('❌ Неверная структура ответа сервера:', result);
            message.error('Ошибка: неверный ответ сервера');
            return;
          }
          
          const isAccessory = isAccessoryCategory(values.category);
          const validSerialNumbers = serialNumbers.filter(sn => sn.trim() !== '');
          const validBarcodes = barcodes.filter(bc => bc.trim() !== '');
          const newItems: ArrivalItemDetail[] = [];

          if (isAccessory) {
            // Для аксессуаров создаем один элемент с общим поставщиком
            const supplier = suppliers.find(s => s._id === values.supplierId);
            const supplierName = supplier ? supplier.name : '';

            const newItem: ArrivalItemDetail = {
              id: 'temp_' + Date.now() + Math.random(),
              productId: newProduct._id,
              productName: newProduct.name,
              quantity: values.quantity || 1, // Для аксессуаров количество задается пользователем, по умолчанию 1
              serialNumbers: [],
              barcode: validBarcodes[0] || '',
              price: values.price,
              costPrice: values.costPrice,
              isAccessory: true,
              supplierId: values.supplierId || '',
              supplierName: supplierName
            };
            newItems.push(newItem);
          } else {
            // Для техники создаем отдельный элемент для каждого серийного номера
            // Количество определяется автоматически по количеству серийных номеров
            validSerialNumbers.forEach((serialNumber, index) => {
              const supplierData = serialNumberSuppliers[index];
              const newItem: ArrivalItemDetail = {
                id: 'temp_' + Date.now() + Math.random() + '_' + index,
                productId: newProduct._id,
                productName: newProduct.name,
                quantity: 1, // Для техники всегда 1 единица на серийный номер
                serialNumbers: [serialNumber],
                price: values.price,
                costPrice: values.costPrice,
                isAccessory: false,
                supplierId: supplierData?.supplierId || '',
                supplierName: supplierData?.supplierName || ''
              };
              newItems.push(newItem);
            });
          }
          
          console.log('📦 Новые товары для прихода:', newItems);
          
          // Создаем приход автоматически
          try {
            const newArrivals: any[] = [];
            
            // Каждый товар создает отдельный приход (техника и аксессуары)
            const itemsBySupplier = new Map<string, typeof newItems>();
            newItems.forEach(item => {
              let groupKey: string;
              
              if (!item.isAccessory) {
                // Для техники создаем уникальный ключ для каждого товара
                groupKey = `tech_${item.productId}_${item.supplierId || 'no_supplier'}`;
              } else {
                // Для аксессуаров создаем уникальный ключ для каждого товара
                groupKey = `accessory_${item.productId}_${item.supplierId || 'no_supplier'}`;
              }
              
              if (!itemsBySupplier.has(groupKey)) {
                itemsBySupplier.set(groupKey, []);
              }
              itemsBySupplier.get(groupKey)!.push(item);
            });

            // Создаем приход для каждого поставщика
            for (const [supplierId, items] of itemsBySupplier) {
              const firstItem = items[0];
              const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
              const totalValue = items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);

              const isTechGroup = supplierId.startsWith('tech_');
              const isAccessoryGroup = supplierId.startsWith('accessory_');
              const newArrival = {
                date: new Date().toISOString(),
                supplierId: firstItem.supplierId,
                supplierName: firstItem.supplierName,
                notes: isTechGroup ? 
                  `Автоматически создан при добавлении техники: ${newProduct.name}` :
                  isAccessoryGroup ? 
                  `Автоматически создан при добавлении аксессуара: ${newProduct.name}` :
                  `Автоматически создан при добавлении товара: ${newProduct.name}`,
                items: items.map(item => ({
                  productId: item.productId,
                  productName: item.productName,
                  quantity: item.quantity,
                  serialNumbers: item.serialNumbers,
                  barcode: item.barcode,
                  price: item.price,
                  costPrice: item.costPrice,
                  isAccessory: item.isAccessory
                })),
                totalQuantity,
                totalValue
              };

              console.log('📦 Создаем автоматический приход:', newArrival);
              
              const arrivalResponse = await arrivalsApi.create(newArrival);
              console.log('✅ Приход создан:', arrivalResponse);
              newArrivals.push(arrivalResponse);
            }

            // Обновляем список приходов
            await loadArrivals();
            
            message.success(`Товар создан и добавлен в приход автоматически (${newArrivals.length} приходов)`);
            
          } catch (error) {
            console.error('❌ Ошибка создания автоматического прихода:', error);
            message.error('Товар создан, но не удалось создать приход автоматически');
          }
        }
        
        message.success('Товар создан успешно');
        setIsProductModalVisible(false);
        productForm.resetFields();
        setSelectedImages([]);
        setSelectedCategory('');
        setSerialNumbers(['']);
        setBarcodes(['']);
        setSerialNumberSuppliers([{supplierId: '', supplierName: ''}]);
        setShowArrivalSection(false);
      } else {
        const error = await response.json();
        console.error('❌ Ошибка создания товара:', error);
        message.error(error.message || 'Ошибка при создании товара');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      message.error('Ошибка при создании товара');
    }
  };

  const handleEditArrival = (arrival: Arrival) => {
    console.log('🔄 Попытка редактирования прихода:', arrival);
    
    // Проверяем разрешения на редактирование
    const arrivalId = arrival._id || arrival.id;
    
    // Проверяем, есть ли чеки с товарами из этого прихода
    if (hasReceiptsWithArrivalItems(arrivalId)) {
      Modal.error({
        title: 'Нельзя редактировать приход',
        width: 600,
        content: (
          <div>
            <p>Приход нельзя редактировать, поскольку из него созданы чеки.</p>
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#fff7e6',
              border: '1px solid #ffd591',
              borderRadius: '6px',
              fontSize: '14px',
              marginTop: '12px'
            }}>
              <strong>Информация:</strong> Для редактирования прихода сначала нужно отменить все чеки, 
              содержащие товары из этого прихода.
            </div>
            <p style={{ marginTop: '12px', fontSize: '14px', color: '#666' }}>
              Перейдите на страницу "Чеки" и отмените соответствующие чеки.
            </p>
          </div>
        ),
        okText: 'Понятно'
      });
      return;
    }
    
    if (!canDeleteAnything() && isDebtPaid(arrivalId)) {
      Modal.error({
        title: 'Нельзя редактировать приход',
        width: 600,
        content: (
          <div>
            <p>Приход нельзя редактировать, поскольку долг по нему уже оплачен.</p>
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#fff7e6',
              border: '1px solid #ffd591',
              borderRadius: '6px',
              fontSize: '14px',
              marginTop: '12px'
            }}>
              <strong>Информация:</strong> Приходы с оплаченными долгами могут редактировать только администраторы и бухгалтеры 
              для сохранения целостности финансовой отчетности.
            </div>
            <p style={{ marginTop: '12px', fontSize: '14px', color: '#666' }}>
              Если необходимо изменить приход, обратитесь к администратору или сначала отмените оплату долга.
            </p>
          </div>
        ),
        okText: 'Понятно'
      });
      return;
    }
    
    console.log('✅ Редактирование разрешено для прихода:', arrival);
    // Убедимся, что у прихода есть правильный id
    const arrivalWithId = {
      ...arrival,
      id: arrival._id || arrival.id // Используем MongoDB _id если он есть
    };
    setEditingArrival(arrivalWithId);
    
    // Заполняем форму данными прихода
    form.setFieldsValue({
      date: arrival.date ? arrival.date.split('T')[0] : undefined,
      supplierId: arrival.supplierId,
      notes: arrival.notes
    });

    // Устанавливаем текущие товары
    const items = arrival.items.map(item => ({
      ...item,
      id: item.id || `temp_${Date.now()}_${Math.random()}`
    }));
    setCurrentItems(items);

    // Заполняем поля для каждого товара
    setTimeout(() => {
      items.forEach((item, index) => {
        // Основные поля
        form.setFieldsValue({
          [`productId_${index}`]: item.productId,
          [`supplierId_${index}`]: item.supplierId,
          [`quantity_${index}`]: item.quantity,
          [`price_${index}`]: item.price,
          [`costPrice_${index}`]: item.costPrice
        });

        // Серийные номера и штрихкоды
        if (item.isAccessory) {
          if (item.barcode) {
            setBarcodes([item.barcode]);
          }
        } else {
          if (item.serialNumbers && item.serialNumbers.length > 0) {
            setSerialNumbers(item.serialNumbers);
          }
        }

        // Поставщики для серийных номеров
        if (item.serialNumbers && item.serialNumbers.length > 0) {
          setSerialNumberSuppliers(item.serialNumbers.map(() => ({
            supplierId: item.supplierId || '',
            supplierName: item.supplierName || ''
          })));
        }
      });
    }, 100);

    setIsModalVisible(true);
  };

    const handleDeleteArrival = async (arrivalId: string) => {
    const arrivalToDelete = arrivals.find(a => a._id === arrivalId || a.id === arrivalId);
    
    // Проверяем, не оплачен ли долг по этому приходу (только для не-бухгалтеров)
    if (!canDeleteAnything() && isDebtPaid(arrivalId)) {
      Modal.error({
        title: 'Нельзя удалить приход',
        content: (
          <div>
            <p>Этот приход нельзя удалить, поскольку долг по нему уже оплачен.</p>
            <p>Для удаления прихода необходимо сначала отменить оплату долга на странице "Долги".</p>
          </div>
        ),
        okText: 'Понятно'
      });
      return;
    }
    
    try {
      // Проверяем, есть ли чеки с товарами из этого прихода
      if (hasReceiptsWithArrivalItems(arrivalId)) {
        Modal.error({
          title: 'Невозможно удалить приход',
          content: (
            <div>
              <p><strong>Товары из этого прихода используются в активных чеках!</strong></p>
              <p>Чтобы удалить приход, необходимо сначала отменить или удалить все чеки, в которых используются товары из этого прихода.</p>
              <p>После того как все чеки будут отменены или удалены, вы сможете удалить приход.</p>
            </div>
          ),
          width: 500
        });
        return;
      }
      
      const deleteResponse = await arrivalsApi.delete(arrivalId);
      setArrivals(prev => prev.filter(a => a._id !== arrivalId && a.id !== arrivalId));
      
      // Логируем действие
      if (arrivalToDelete) {
        logArrivalAction(
          'delete', 
          `Удален приход от ${new Date(arrivalToDelete.date).toLocaleDateString('ru-RU')} (${arrivalToDelete.supplierName})`,
          arrivalToDelete
        );
      }
      
      // Проверяем, был ли возврат денег в кассу
      if (deleteResponse?.refund) {
        message.success([
          'Приход удален',
          deleteResponse.refund.description
        ].join('. '), 5);
        
        // Отправляем событие для локального добавления возвратного платежа в основную вкладку
        console.log('📤 Отправляем событие refundCreated для локального добавления');
        const refundPaymentId = `arrival_refund_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        window.dispatchEvent(new CustomEvent('refundCreated', {
          detail: {
            payment: {
              id: refundPaymentId,
              mongoId: refundPaymentId,
              type: 'cash' as const,
              amount: deleteResponse.refund.amount, // ✅ Положительная сумма для возврата
              description: deleteResponse.refund.description,
              date: new Date().toISOString(),
              supplier: arrivalToDelete?.supplierName || 'Возврат за приход',
              orderId: undefined,
              inCashRegister: true, // ✅ Возврат сразу в кассе
              cashRegisterDate: new Date().toISOString(),
              notes: `Автоматический возврат после удаления прихода`,
              createdAt: new Date().toISOString(),
              category: 'Возврат за удаленный приход',
              paymentMethod: 'наличные',
              apiType: 'income' as const,
              status: 'active' as const,
              incassationDate: undefined
            }
          }
        }));
      } else if (deleteResponse?.warning) {
        message.warning([
          'Приход удален',
          deleteResponse.warning
        ].join('. '), 5);
      } else {
        message.success('Приход удален');
      }
      
      // Уведомляем другие компоненты об удалении прихода (для обновления долгов)
      window.dispatchEvent(new CustomEvent('arrivalDeleted', { 
        detail: { arrivalId, arrival: arrivalToDelete } 
      }));
    } catch (error: any) {
      console.error('Error deleting arrival:', error);
      
      // Проверяем наличие данных об ошибке
      if (error.data?.error) {
        Modal.error({
          title: 'Ошибка при удалении прихода',
          content: error.data.error,
          okText: 'Понятно',
          width: 500
        });
      } else {
        message.error('Ошибка при удалении прихода');
      }
    }
  };



  const handleQuantityChange = (index: number, value: number) => {
    const newItems = [...currentItems];
    const item = newItems[index];
    
    // Для техники (не аксессуаров) количество должно соответствовать серийным номерам
    if (!item.isAccessory && !item.isService) {
      // Для техники показываем предупреждение, что количество определяется серийными номерами
      message.warning('Для техники количество определяется автоматически по количеству серийных номеров');
      return;
    }
    
    // Для аксессуаров и услуг позволяем изменять количество
    newItems[index].quantity = value;
    setCurrentItems(newItems);
  };



  const handleRemoveItem = (index: number) => {
    const newItems = currentItems.filter((_, i) => i !== index);
    setCurrentItems(newItems);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      console.log('📝 Сохранение прихода:', values);
      
      // Проверяем, что есть хотя бы один товар
      if (currentItems.length === 0) {
        message.error('Добавьте хотя бы один товар');
        return;
      }

      // Проверяем валидность каждого товара
      for (let i = 0; i < currentItems.length; i++) {
        const item = currentItems[i];
        
        if (!item.isService) {
          if (item.isAccessory) {
            // Для аксессуаров обязательны штрихкоды с данными
            const validBarcodes = item.barcodes?.filter(bc => bc.trim() !== '') || [];
            if (validBarcodes.length === 0) {
              message.error(`Для аксессуара "${item.productName}" необходимо добавить хотя бы один штрихкод`);
              return;
            }
            
            // Проверяем, что для каждого штрихкода заполнены поставщик и цены
            for (let j = 0; j < validBarcodes.length; j++) {
              const barcodeData = item.barcodeData?.[j];
              if (!barcodeData?.supplierId) {
                message.error(`Для штрихкода "${validBarcodes[j]}" необходимо выбрать поставщика`);
                return;
              }
              if (!barcodeData.costPrice || barcodeData.costPrice <= 0) {
                message.error(`Для штрихкода "${validBarcodes[j]}" необходимо указать закупочную цену`);
                return;
              }
              if (!barcodeData.price || barcodeData.price <= 0) {
                message.error(`Для штрихкода "${validBarcodes[j]}" необходимо указать цену продажи`);
                return;
              }
            }
          } else {
            // Для техники обязательны серийные номера с данными
            const validSerialNumbers = item.serialNumbers?.filter(sn => sn.trim() !== '') || [];
            if (validSerialNumbers.length === 0) {
              message.error(`Для товара "${item.productName}" необходимо добавить хотя бы один серийный номер`);
              return;
            }
            
            // Проверяем, что для каждого серийного номера заполнены поставщик и цены
            for (let j = 0; j < validSerialNumbers.length; j++) {
              const serialData = item.serialNumberData?.[j];
              if (!serialData?.supplierId) {
                message.error(`Для серийного номера "${validSerialNumbers[j]}" необходимо выбрать поставщика`);
                return;
              }
              if (!serialData.costPrice || serialData.costPrice <= 0) {
                message.error(`Для серийного номера "${validSerialNumbers[j]}" необходимо указать закупочную цену`);
                return;
              }
              if (!serialData.price || serialData.price <= 0) {
                message.error(`Для серийного номера "${validSerialNumbers[j]}" необходимо указать цену продажи`);
                return;
              }
            }
          }
        } else {
          // Для услуг проверяем цены
          const price = values[`price_${i}`];
          const costPrice = values[`costPrice_${i}`] || 0;
          
          if (!price || price <= 0) {
            message.error(`Для услуги "${item.productName}" необходимо указать цену продажи`);
            return;
          }
          if (costPrice > 0 && price < costPrice) {
            message.error(`Для услуги "${item.productName}" цена продажи не может быть ниже закупочной цены (${costPrice} ₽)`);
            return;
          }
        }
      }

      // Обновляем цены только для услуг из полей формы
      const updatedItems = currentItems.map((item, index) => {
        if (item.isService) {
          // Для услуг берем данные из основных полей формы
          return {
            ...item,
            quantity: values[`quantity_${index}`] || item.quantity,
            price: values[`price_${index}`] || item.price,
            costPrice: values[`costPrice_${index}`] || 0, // Для услуг закупочная цена может быть 0
            supplierId: values[`supplierId_${index}`] || item.supplierId
          };
        } else {
          // Для товаров (аксессуаров и техники) данные берутся из индивидуальных полей
          return item;
        }
      });

      // Проверяем уникальность серийных номеров во всех товарах
      const allSerialNumbers: string[] = [];
      updatedItems.forEach(item => {
        if (item.serialNumbers && item.serialNumbers.length > 0) {
          allSerialNumbers.push(...item.serialNumbers.filter(sn => sn.trim() !== ''));
        }
      });

      if (allSerialNumbers.length > 0) {
        const duplicateSerialNumbers = checkSerialNumberUniqueness(
          allSerialNumbers, 
          editingArrival ? (editingArrival._id || editingArrival.id) : undefined
        );
        if (duplicateSerialNumbers.length > 0) {
          message.error(`Серийные номера уже существуют в системе: ${duplicateSerialNumbers.join(', ')}`);
          return;
        }
      }

      // Создаем отдельные элементы для каждого серийного номера и штрихкода
      const expandedItems: ArrivalItemDetail[] = [];
      updatedItems.forEach(item => {
        if (!item.isAccessory && !item.isService && item.serialNumbers && item.serialNumberData) {
          // Для техники создаем отдельный элемент для каждого серийного номера
          const validSerialNumbers = item.serialNumbers.filter(sn => sn.trim() !== '');
          validSerialNumbers.forEach((serialNumber, index) => {
            const serialData = item.serialNumberData![index];
            if (serialData) {
              expandedItems.push({
                ...item,
                id: `${item.id}_serial_${index}`,
                quantity: 1,
                serialNumbers: [serialNumber],
                price: serialData.price,
                costPrice: serialData.costPrice,
                supplierId: serialData.supplierId,
                supplierName: serialData.supplierName,
                barcodes: undefined,
                barcodeData: undefined
              });
            }
          });
        } else if (item.isAccessory && !item.isService && item.barcodes && item.barcodeData) {
          // Для аксессуаров создаем отдельный элемент для каждого штрихкода
          const validBarcodes = item.barcodes.filter(bc => bc.trim() !== '');
          validBarcodes.forEach((barcode, index) => {
            const barcodeData = item.barcodeData![index];
            if (barcodeData) {
              expandedItems.push({
                ...item,
                id: `${item.id}_barcode_${index}`,
                quantity: 1,
                barcodes: [barcode],
                barcode: barcode, // для обратной совместимости
                price: barcodeData.price,
                costPrice: barcodeData.costPrice,
                supplierId: barcodeData.supplierId,
                supplierName: barcodeData.supplierName,
                serialNumbers: [],
                serialNumberData: undefined
              });
            }
          });
        } else {
          // Для услуг оставляем как есть
          expandedItems.push(item);
        }
      });

      // Каждый товар создает отдельный приход (техника, аксессуары и услуги)
      const itemsBySupplier = new Map<string, ArrivalItemDetail[]>();
      expandedItems.forEach(item => {
        let groupKey: string;
        
        if (item.isService) {
          // Для услуг создаем уникальный ключ для каждой услуги
          groupKey = `service_${item.id}_${item.supplierId || 'no_supplier'}`;
        } else if (!item.isAccessory) {
          // Для техники создаем уникальный ключ для каждого серийного номера
          groupKey = `tech_serial_${item.id}_${item.supplierId || 'no_supplier'}`;
        } else {
          // Для аксессуаров создаем уникальный ключ для каждого штрихкода
          groupKey = `accessory_barcode_${item.id}_${item.supplierId || 'no_supplier'}`;
        }
        
        if (!itemsBySupplier.has(groupKey)) {
          itemsBySupplier.set(groupKey, []);
        }
        itemsBySupplier.get(groupKey)!.push(item);
      });

      // Создаем или обновляем приход для каждого товара (каждый товар - отдельный приход)
      const newArrivals: Arrival[] = [];
      itemsBySupplier.forEach((items, groupKey) => {
        const firstItem = items[0];
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Используем текущую дату если дата не указана
        const arrivalDate = values.date ? new Date(values.date).toISOString() : new Date().toISOString();
        
        // Определяем реальный supplierId для группы
        const actualSupplierId = firstItem.supplierId || 'no_supplier';
        const isServiceGroup = groupKey.startsWith('service_');
        const isTechGroup = groupKey.startsWith('tech_');
        const isAccessoryGroup = groupKey.startsWith('accessory_');

        // Находим имя поставщика
        const supplier = suppliers.find(s => s._id === actualSupplierId);
        const supplierName = supplier ? supplier.name : firstItem.supplierName || '';

        newArrivals.push({
          id: editingArrival ? editingArrival.id : `arrival_${Date.now()}_${Math.random()}`,
          date: arrivalDate,
          supplierId: actualSupplierId === 'no_supplier' ? undefined : actualSupplierId,
          supplierName: supplierName,
                      notes: isServiceGroup ? 
              `${values.notes || ''} (Услуга: ${firstItem.productName})`.trim() : 
              isTechGroup ? 
              `${values.notes || ''} (Техника: ${firstItem.productName} - С/Н: ${firstItem.serialNumbers?.[0] || 'не указан'})`.trim() : 
              isAccessoryGroup ? 
              `${values.notes || ''} (Аксессуар: ${firstItem.productName} - Штрихкод: ${firstItem.barcodes?.[0] || firstItem.barcode || 'не указан'})`.trim() : 
              values.notes || '',
          items: items.map(item => ({
            ...item,
            supplierId: item.supplierId || actualSupplierId,
            supplierName: item.supplierName || supplierName
          })),
          totalQuantity,
          totalValue
        });
      });

      if (editingArrival) {
        // Обновляем существующий приход
        if (newArrivals.length > 1) {
          message.warning('При редактировании нельзя разделять приход на несколько поставщиков');
          return;
        }
        
        const updatedArrival = {
          ...newArrivals[0],
          id: editingArrival._id || editingArrival.id // Используем MongoDB _id если он есть
        };
        console.log('📝 Обновляем приход:', updatedArrival);
        
        // Сравниваем старое и новое содержимое для логирования изменений
        const oldTotalValue = editingArrival.totalValue || 0;
        const newTotalValue = updatedArrival.totalValue || 0;
        if (oldTotalValue !== newTotalValue) {
          console.log(`💰 Изменение суммы прихода: ${oldTotalValue} ₽ → ${newTotalValue} ₽`);
        }
        
        try {
          const result = await arrivalsApi.update(updatedArrival.id, updatedArrival);
          setArrivals(prev => prev.map(a => (a._id || a.id) === (editingArrival._id || editingArrival.id) ? result : a));
          
          // Отправляем события обновления
          window.dispatchEvent(new CustomEvent('arrivalUpdated', { 
            detail: { 
              arrivalId: updatedArrival.id,
              arrival: result 
            } 
          }));
          
          // Отправляем событие обновления долга для синхронизации
          window.dispatchEvent(new CustomEvent('debtUpdated', { 
            detail: { arrivalId: updatedArrival.id } 
          }));

          // Логируем действие
          logArrivalAction(
            'update',
            `Обновлен приход от ${new Date(result.date).toLocaleDateString('ru-RU')} (${result.supplierName})`,
            result
          );
          
          message.success('Приход обновлен');
        } catch (error) {
          console.error('Error updating arrival:', error);
          message.error('Ошибка при обновлении прихода');
          return;
        }
      } else {
        // Создаем новые приходы
        for (const newArrival of newArrivals) {
          try {
            console.log('📝 Создаем приход:', newArrival);
            const result = await arrivalsApi.create(newArrival);
            setArrivals(prev => [result, ...prev]);

            // Логируем действие
            logArrivalAction(
              'create',
              `Создан приход от ${new Date(result.date).toLocaleDateString('ru-RU')} (${result.supplierName || 'поставщика'})`,
              result
            );

            message.success(`Приход от ${newArrival.supplierName || 'поставщика'} создан`);
          } catch (error) {
            console.error('Error creating arrival:', error);
            message.error(`Ошибка при создании прихода от ${newArrival.supplierName || 'поставщика'}`);
            return;
          }
        }
      }

      // Сохраняем названия услуг для будущих подсказок (только после успешного сохранения прихода)
      const serviceNames = updatedItems
        .filter(item => item.isService && item.productName && item.productName.trim())
        .map(item => item.productName.trim());
      
      if (serviceNames.length > 0) {
        const newTemplates: ServiceTemplate[] = [];
        serviceNames.forEach(serviceName => {
          if (!serviceTemplates.find(t => t.name === serviceName)) {
            newTemplates.push({
              id: `template_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
              name: serviceName,
              price: 0,
              costPrice: 0,
              createdAt: new Date().toISOString()
            });
          }
        });
        
        if (newTemplates.length > 0) {
          const success = await saveServiceTemplates(newTemplates);
          if (success) {
            console.log('✅ Сохранены названия услуг для подсказок:', newTemplates.map(t => t.name));
          } else {
            console.log('⚠️ Не удалось сохранить названия услуг на сервере, сохраняем локально');
            // Fallback: сохраняем локально если сервер недоступен
            const updatedTemplates = [...serviceTemplates, ...newTemplates];
            setServiceTemplates(updatedTemplates);
            localStorage.setItem('serviceTemplates', JSON.stringify(updatedTemplates));
          }
        }
      }

      setIsModalVisible(false);
      form.resetFields();
      setCurrentItems([]);
      setEditingArrival(null);
    } catch (error) {
      console.error('Form validation failed:', error);
      message.error('Пожалуйста, заполните все обязательные поля');
    }
  };

  const columns: ColumnsType<Arrival> = [
    {
      title: 'Товар',
      dataIndex: 'items',
      key: 'productName',
      width: 400,
             render: (items: ArrivalItemDetail[]) => (
         <div>
           {items.map((item: ArrivalItemDetail, index: number) => (
            <div key={`${item.id}-${index}`}>
              <div style={{ 
                fontWeight: '500',
                wordBreak: 'break-word',
                whiteSpace: 'normal',
                lineHeight: '1.4'
              }}>
                {item.productName}
                {item.serialNumbers.length > 0 && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#8c8c8c', 
                    marginTop: '4px',
                    fontWeight: 'normal'
                  }}>
                    S/N: {item.serialNumbers.join(', ')}
                  </div>
                )}
              </div>
              {item.isAccessory && (
                <Tag color="blue">Аксессуар</Tag>
              )}
              {item.serialNumbers.length > 0 && (
                <Tag color="green" style={{ marginLeft: '8px' }}>
                  {item.serialNumbers.length} шт.
                </Tag>
              )}
              {item.barcode && (
                <Tag color="blue" style={{ marginLeft: '8px' }}>
                  Штрихкод: {item.barcode}
                </Tag>
              )}
            </div>
           ))}
         </div>
       ),
    },
    {
      title: 'Количество',
      dataIndex: 'totalQuantity',
      key: 'totalQuantity',
      width: 100,
      render: (totalQuantity, record) => {
        // Используем totalQuantity если есть, иначе вычисляем из items
        const quantity = totalQuantity || (record.items ? record.items.reduce((sum, item) => sum + item.quantity, 0) : 0);
        return <span style={{ fontWeight: '500' }}>{quantity} шт.</span>;
      },
    },
    {
      title: 'Серийные номера / Штрихкод',
      dataIndex: 'items',
      key: 'serialNumbers',
      width: 200,
             render: (items: ArrivalItemDetail[]) => (
         <div>
           {items.map((item: ArrivalItemDetail, index: number) => (
             <div key={`serial-${item.id}-${index}`}>
               {item.serialNumbers.length > 0 && (
                 <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '4px' }}>
                   Серийные номера:
                 </div>
               )}
               {item.serialNumbers.map((sn: string, i: number) => (
                 <Tag 
                   key={i} 
                   color="green" 
                   style={{ 
                     marginBottom: '2px',
                     cursor: 'pointer',
                     transition: 'all 0.2s'
                   }}
                   onClick={() => copyToClipboard(sn)}
                   onMouseEnter={(e) => {
                     e.currentTarget.style.opacity = '0.8';
                     e.currentTarget.style.transform = 'scale(1.05)';
                   }}
                   onMouseLeave={(e) => {
                     e.currentTarget.style.opacity = '1';
                     e.currentTarget.style.transform = 'scale(1)';
                   }}
                   title="Нажмите, чтобы скопировать серийный номер"
                 >
                   {sn}
                 </Tag>
               ))}
               {item.barcode && (
                 <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '4px' }}>
                   Штрихкод: 
                   <span 
                     style={{ 
                       color: '#1890ff',
                       cursor: 'pointer',
                       marginLeft: '4px',
                       textDecoration: 'underline'
                     }}
                     onClick={() => copyToClipboard(item.barcode!)}
                     title="Нажмите, чтобы скопировать штрихкод"
                   >
                     {item.barcode}
                   </span>
                 </div>
               )}
             </div>
           ))}
         </div>
       ),
    },
    {
      title: 'Цена за шт.',
      dataIndex: 'items',
      key: 'price',
      width: 120,
             render: (items: ArrivalItemDetail[]) => (
         <div>
           {items.map((item: ArrivalItemDetail, index: number) => (
             <div key={`price-${item.id}-${index}`}>
               <span style={{ fontWeight: '600', color: '#52c41a' }}>
                 {item.price.toLocaleString('ru-RU')} ₽
               </span>
             </div>
           ))}
         </div>
       ),
    },
    {
      title: 'Закупка за шт.',
      dataIndex: 'items',
      key: 'costPrice',
      width: 120,
      render: (items: ArrivalItemDetail[]) => (
        <div>
          {items.map((item: ArrivalItemDetail, index: number) => (
            <div key={`costPrice-${item.id}-${index}`}>
              <span style={{ fontWeight: '600', color: '#1890ff' }}>
                {item.costPrice.toLocaleString('ru-RU')} ₽
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Дата прихода',
      dataIndex: 'date',
      key: 'date',
      width: 180,
      render: (date) => {
        const d = new Date(date);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CalendarOutlined style={{ color: '#8c8c8c' }} />
            <div>
              <div>{d.toLocaleDateString('ru-RU')}</div>
              <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                {d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Поставщик',
      dataIndex: 'supplierName',
      key: 'supplierName',
      width: 140,
      render: (supplierName) => supplierName || '-',
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          {!canDeleteAnything() && isDebtPaid(record._id || record.id) ? (
            <Tooltip title="Нельзя редактировать приход с оплаченным долгом">
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                disabled
              />
            </Tooltip>
          ) : (
            <Tooltip title="Редактировать">
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={() => handleEditArrival(record)}
              />
            </Tooltip>
          )}
          {!canDeleteAnything() && isDebtPaid(record._id || record.id) ? (
            <Tooltip title="Нельзя удалить приход с оплаченным долгом">
              <Button
                type="text"
                icon={<DeleteOutlined />}
                size="small"
                disabled
              />
            </Tooltip>
          ) : (
            <Popconfirm
              title="Удалить приход?"
              description="Вы действительно хотите удалить этот приход? Это действие нельзя отменить."
              onConfirm={() => handleDeleteArrival(record._id || record.id)}
              okText="Да, удалить"
              cancelText="Отмена"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Удалить">
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  size="small"
                  danger
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const filteredArrivals = arrivals.filter(arrival => 
    arrival.items.some(item => 
      item.productName.toLowerCase().includes(searchText.toLowerCase()) ||
      item.serialNumbers.some(sn => sn.toLowerCase().includes(searchText.toLowerCase())) ||
      item.barcode?.toLowerCase().includes(searchText.toLowerCase())
    ) ||
    arrival.supplierName?.toLowerCase().includes(searchText.toLowerCase()) ||
    new Date(arrival.date).toLocaleDateString('ru-RU').includes(searchText)
  );

  const totalItems = arrivals.reduce((sum, a) => {
    // Используем totalQuantity если есть, иначе вычисляем из items
    const quantity = a.totalQuantity || (a.items ? a.items.reduce((itemSum, item) => itemSum + item.quantity, 0) : 0);
    return sum + quantity;
  }, 0);
  const totalValue = arrivals.reduce((sum, a) => {
    // Используем totalValue если есть, иначе вычисляем из items
    const value = a.totalValue || (a.items ? a.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0) : 0);
    return sum + value;
  }, 0);
  const uniqueProducts = new Set(arrivals.flatMap(a => a.items.map(item => item.productId))).size;

  return (
    <div>
      {/* Статистика */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <Card style={{ flex: 1, borderRadius: '12px', background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)', border: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1890ff' }}>
              {arrivals.length}
            </div>
            <div style={{ color: '#595959', fontWeight: '500' }}>Всего приходов</div>
          </div>
        </Card>
        <Card style={{ flex: 1, borderRadius: '12px', background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)', border: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#52c41a' }}>
              {totalItems}
            </div>
            <div style={{ color: '#595959', fontWeight: '500' }}>Единиц товара</div>
          </div>
        </Card>
        <Card style={{ flex: 1, borderRadius: '12px', background: 'linear-gradient(135deg, #fff7e6 0%, #ffd591 100%)', border: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#fa8c16' }}>
              {uniqueProducts}
            </div>
            <div style={{ color: '#595959', fontWeight: '500' }}>Уникальных товаров</div>
          </div>
        </Card>
        <Card style={{ flex: 1, borderRadius: '12px', background: 'linear-gradient(135deg, #f9f0ff 0%, #d3adf7 100%)', border: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#722ed1' }}>
              {totalValue.toLocaleString('ru-RU')} ₽
            </div>
            <div style={{ color: '#595959', fontWeight: '500' }}>Общая стоимость</div>
          </div>
        </Card>
      </div>

      {/* Фильтры и поиск */}
      <Card style={{ marginBottom: '24px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Search
            placeholder="Поиск по товару, серийным номерам или штрихкоду"
            style={{ width: 300 }}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <Button
              type="default"
              icon={<PlusOutlined />}
              onClick={handleCreateProduct}
              style={{ borderRadius: '8px' }}
            >
              Создать товар
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateArrival}
              style={{ borderRadius: '8px' }}
            >
              Поставить на приход
            </Button>
            {hasFullAccess() && arrivals.length > 0 && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleClearAllArrivals}
                style={{ borderRadius: '8px' }}
              >
                Очистить все записи
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Таблица приходов */}
      <Card style={{ borderRadius: '12px' }}>
        <Table
          columns={columns}
          dataSource={filteredArrivals}
          rowKey={(record) => record._id || record.id}
          rowClassName={(record) => {
            const arrivalId = record._id || record.id;
            return isDebtPaid(arrivalId) ? 'paid-debt-arrival' : '';
          }}
          pagination={{
            pageSize: pageSize,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Всего ${total} приходов`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onShowSizeChange: handlePageSizeChange,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Модальное окно создания/редактирования */}
      <Modal
        title={editingArrival ? "Редактировать приход" : "Поставить на приход"}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
          setCurrentItems([]);
        }}
        width={700}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          {/* Отладочная информация о товарах */}
          <div style={{ 
            padding: '8px', 
            background: '#f6ffed', 
            border: '1px solid #b7eb8f', 
            borderRadius: '6px',
            marginBottom: '12px',
            fontSize: '12px'
          }}>
            <span style={{ color: '#52c41a', fontWeight: '500' }}>
              📦 Товаров в базе: {products.length} | 
              Активных: {products.filter(p => p.isActive !== false).length} | 
              Неактивных: {products.filter(p => p.isActive === false).length}
            </span>
          </div>
          
          <div style={{ 
            padding: '12px', 
            background: '#f0f9ff', 
            border: '1px solid #bae7ff', 
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <div style={{ color: '#1890ff', fontWeight: '500' }}>
              📅 Дата и время прихода: {new Date().toLocaleDateString('ru-RU')} {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
              Дата устанавливается автоматически при создании прихода
            </div>
          </div>

          <div style={{ 
            padding: '12px', 
            background: '#f6ffed', 
            border: '1px solid #b7eb8f', 
            borderRadius: '6px',
            marginBottom: '16px' 
          }}>
            <div style={{ fontSize: '14px', color: '#52c41a', fontWeight: '500', marginBottom: '4px' }}>
              📋 Поставщики для товаров
            </div>
            <div style={{ fontSize: '12px', color: '#389e0d' }}>
              Теперь поставщик выбирается для каждого товара/услуги отдельно. 
              Если товары от разных поставщиков, будут созданы отдельные приходы.
            </div>
          </div>

          <Form.Item
            name="supplierId"
            label="Поставщик по умолчанию (необязательно)"
            style={{ display: 'none' }}
          >
            <Select
              placeholder={suppliers.filter(s => s.status === 'active').length > 0 
                ? "Выберите поставщика из базы" 
                : "Нет активных поставщиков"}
              allowClear
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option?.children?.toString().toLowerCase().includes(input.toLowerCase()) || false
              }
              disabled={suppliers.filter(s => s.status === 'active').length === 0}
            >
              {suppliers
                .filter(supplier => supplier.status === 'active')
                .map(supplier => (
                  <Option key={supplier._id} value={supplier._id}>
                    {supplier.name}
                    {supplier.contactPerson && ` (${supplier.contactPerson})`}
                  </Option>
                ))}
            </Select>
            {suppliers.filter(s => s.status === 'active').length === 0 && (
              <div style={{ 
                marginTop: '8px', 
                fontSize: '12px', 
                color: '#8c8c8c',
                padding: '8px',
                background: '#f6f6f6',
                borderRadius: '4px',
                border: '1px solid #d9d9d9'
              }}>
                ℹ️ Нет активных поставщиков. Перейдите на вкладку "Поставщики" для добавления новых.
              </div>
            )}
          </Form.Item>
          
          <Form.Item
            name="notes"
            label="Примечания"
          >
            <Input.TextArea rows={3} placeholder="Дополнительная информация" />
          </Form.Item>

          <Divider orientation="left">Товары и услуги в приходе</Divider>
          
          {currentItems.length === 0 && (
            <div style={{ 
              padding: '24px', 
              textAlign: 'center', 
              background: '#f9f9f9', 
              border: '2px dashed #d9d9d9', 
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '16px', color: '#8c8c8c', marginBottom: '16px' }}>
                📦 Добавьте товары или услуги в приход
              </div>
              <Row gutter={16}>
                <Col span={12}>
                  <Button
                    type="primary"
                    onClick={addProductToArrival}
                    icon={<PlusOutlined />}
                    style={{ width: '100%' }}
                  >
                    Добавить товар
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    type="primary"
                    onClick={addServiceToArrival}
                    icon={<PlusOutlined />}
                    style={{ width: '100%' }}
                  >
                    Добавить услугу
                  </Button>
                </Col>
              </Row>
            </div>
          )}
          
          {currentItems.map((item, index) => (
            <div key={item.id} style={{ 
              marginBottom: '16px',
              padding: '16px',
              background: '#fafafa',
              border: '1px solid #e8e8e8',
              borderRadius: '8px'
            }}>
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Form.Item
                    name={`productId_${index}`}
                    label={item.isService ? "Услуга" : "Товар"}
                    rules={[{ required: true, message: 'Выберите товар' }]}
                    style={{ marginBottom: '8px' }}
                  >
                    {item.isService ? (
                      <AutoComplete
                        placeholder="Введите название услуги"
                        style={{ width: '100%' }}
                        value={currentItems[index]?.productName || ''}
                        options={serviceTemplates.map(template => ({
                          value: template.name,
                          label: template.name
                        }))}
                        onChange={(serviceName) => {
                          const newItems = [...currentItems];
                          newItems[index] = {
                            ...newItems[index],
                            productName: serviceName
                          };
                          setCurrentItems(newItems);
                        }}
                        filterOption={(inputValue, option) =>
                          option!.value.toLowerCase().includes(inputValue.toLowerCase())
                        }
                      />
                    ) : (
                      <Select
                        placeholder="Выберите товар"
                        showSearch
                        optionFilterProp="label"
                        optionLabelProp="label"
                        value={currentItems[index]?.productId || undefined}
                        style={{ width: '100%' }}
                        dropdownStyle={{ 
                          maxWidth: '800px',
                          maxHeight: '400px',
                          overflow: 'auto'
                        }}
                        className="adaptive-product-select"
                        listItemHeight={88}
                        listHeight={320}
                        onChange={(productId) => handleProductChange(index, productId)}
                      >
                        {products.map(product => (
                          <Option 
                            key={product._id} 
                            value={product._id} 
                            label={product.name}
                            title={`${product.name} - ${product.category}`}
                          >
                            <div style={{ 
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              padding: '8px 0',
                              fontSize: product.name.length > 50 ? '12px' : 
                                               product.name.length > 30 ? '13px' : '14px',
                              transition: 'font-size 0.2s'
                            }}>
                              <div style={{ 
                                fontWeight: 500,
                                marginBottom: '4px',
                                width: '100%',
                                display: 'block',
                                lineHeight: '1.4'
                              }}>
                                {product.name}
                              </div>
                              <div style={{ 
                                fontSize: '12px',
                                color: '#666',
                                lineHeight: '1.2'
                              }}>
                                {product.category}
                              </div>
                            </div>
                          </Option>
                        ))}
                      </Select>
                    )}
                  </Form.Item>
                </Col>
              </Row>
              {/* Показываем поля поставщика, количества и цен только для услуг */}
              {item.isService && (
                <>
                  <Row gutter={[16, 16]}>
                    <Col span={8}>
                      <Form.Item
                        name={`supplierId_${index}`}
                        label="Поставщик"
                        rules={[{ required: true, message: 'Выберите поставщика' }]}
                        style={{ marginBottom: '8px' }}
                      >
                        <Select
                          placeholder="Выберите поставщика"
                          dropdownStyle={{ minWidth: '300px' }}
                          optionLabelProp="label"
                        >
                          {suppliers.filter(s => s.status === 'active').map(supplier => (
                            <Option 
                              key={supplier._id} 
                              value={supplier._id}
                              label={supplier.name}
                              title={supplier.name}
                            >
                              <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                {supplier.name}
                              </div>
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name={`quantity_${index}`}
                        label="Количество"
                        rules={[{ required: true, message: 'Введите количество' }]}
                        style={{ marginBottom: '8px' }}
                        initialValue={1}
                      >
                        <InputNumber
                          min={1}
                          defaultValue={1}
                          style={{ width: '100%' }}
                          onChange={(value) => handleQuantityChange(index, value as number)}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name={`costPrice_${index}`}
                        label="Цена закупки"
                        style={{ marginBottom: '8px' }}
                      >
                        <InputNumber<number>
                          min={0}
                          defaultValue={0}
                          precision={0}
                          style={{ width: '100%' }}
                          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          parser={(value) => {
                            const parsed = Number(value!.replace(/[^\d.-]/g, ''));
                            return isNaN(parsed) ? 0 : parsed;
                          }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={[16, 16]}>
                    <Col span={8}>
                      <Form.Item
                        name={`price_${index}`}
                        label="Цена продажи"
                        rules={[{ required: true, message: 'Введите цену продажи' }]}
                        style={{ marginBottom: '8px' }}
                      >
                        <InputNumber<number>
                          min={0}
                          defaultValue={0}
                          precision={0}
                          style={{ width: '100%' }}
                          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          parser={(value) => {
                            const parsed = Number(value!.replace(/[^\d.-]/g, ''));
                            return isNaN(parsed) ? 0 : parsed;
                          }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </>
              )}
              
              {/* Для товаров (не услуг) показываем только информационные поля */}
              {!item.isService && (
                <div style={{ 
                  padding: '12px', 
                  background: '#f0f9ff', 
                  border: '1px solid #bae7ff', 
                  borderRadius: '6px',
                  marginBottom: '12px'
                }}>
                  <div style={{ fontSize: '14px', color: '#1890ff', fontWeight: '500', marginBottom: '8px' }}>
                    ℹ️ Информация о товаре
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {currentItems[index]?.isAccessory ? 
                      'Для аксессуаров поставщик, количество и цены указываются для каждого штрихкода отдельно.' :
                      'Для техники поставщик, количество и цены указываются для каждого серийного номера отдельно.'
                    }
                  </div>
                </div>
              )}
              
              {/* Серийные номера и штрихкоды для каждого товара */}
              {!item.isService && (
                <div style={{ marginTop: '12px' }}>
                                   <div style={{ marginBottom: '8px', fontWeight: '500', color: '#1890ff' }}>
                   {currentItems[index]?.isAccessory ? '📦 Штрихкоды' : '🔢 Серийные номера'}
                 </div>
                  
                                     {currentItems[index]?.isAccessory ? (
                     // Штрихкоды для аксессуаров (множественные)
                     <div style={{ 
                       padding: '8px', 
                       background: '#fff7e6', 
                       border: '1px solid #ffd591', 
                       borderRadius: '6px'
                     }}>
                       <div style={{ fontSize: '12px', color: '#fa8c16', marginBottom: '8px' }}>
                         💡 Для аксессуаров: добавьте штрихкоды. Для каждого штрихкода укажите поставщика и цены.
                       </div>
                       {(currentItems[index]?.barcodes || ['']).map((barcode, bcIndex) => (
                         <div key={bcIndex} style={{ 
                           marginBottom: '12px',
                           padding: '12px',
                           background: '#fafafa',
                           border: '1px solid #e8e8e8',
                           borderRadius: '6px'
                         }}>
                           <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                             <Input
                               placeholder={`Штрихкод ${bcIndex + 1} (обязательно)`}
                               value={barcode}
                                                                onChange={(e) => {
                                   const newItems = [...currentItems];
                                   if (!newItems[index].barcodes) {
                                     newItems[index].barcodes = [];
                                   }
                                   newItems[index].barcodes![bcIndex] = e.target.value;
                                   // Обновляем количество для аксессуаров по количеству штрихкодов
                                   const validBarcodes = newItems[index].barcodes?.filter(bc => bc.trim() !== '') || [];
                                   newItems[index].quantity = Math.max(1, validBarcodes.length);
                                   setCurrentItems(newItems);
                                   // Обновляем поле количества в форме
                                   form.setFieldsValue({
                                     [`quantity_${index}`]: Math.max(1, validBarcodes.length)
                                   });
                                 }}
                               style={{ flex: 1, marginRight: '8px' }}
                               required
                             />
                             {(currentItems[index]?.barcodes || []).length > 1 && (
                               <Button
                                 type="text"
                                 danger
                                 icon={<MinusCircleOutlined />}
                                 onClick={() => {
                                   const newItems = [...currentItems];
                                   if (newItems[index].barcodes) {
                                     newItems[index].barcodes = newItems[index].barcodes!.filter((_, i) => i !== bcIndex);
                                   }
                                   // Удаляем соответствующие данные поставщика и цен
                                   if (!newItems[index].barcodeData) {
                                     newItems[index].barcodeData = [];
                                   }
                                   if (newItems[index].barcodeData) {
                                     newItems[index].barcodeData = newItems[index].barcodeData!.filter((_, i) => i !== bcIndex);
                                   }
                                   // Обновляем количество
                                   const validBarcodes = newItems[index].barcodes?.filter(bc => bc.trim() !== '') || [];
                                   newItems[index].quantity = Math.max(1, validBarcodes.length);
                                   setCurrentItems(newItems);
                                   form.setFieldsValue({
                                     [`quantity_${index}`]: Math.max(1, validBarcodes.length)
                                   });
                                 }}
                                 size="small"
                               />
                             )}
                             {bcIndex === (currentItems[index]?.barcodes || []).length - 1 && (
                               <Button
                                 type="text"
                                 icon={<PlusOutlined />}
                                 onClick={() => {
                                   const newItems = [...currentItems];
                                   if (!newItems[index].barcodes) {
                                     newItems[index].barcodes = [];
                                   }
                                   if (!newItems[index].barcodeData) {
                                     newItems[index].barcodeData = [];
                                   }
                                   newItems[index].barcodes!.push('');
                                   const product = products.find(p => p._id === newItems[index].productId);
                                   newItems[index].barcodeData!.push({
                                     supplierId: '',
                                     supplierName: '',
                                     costPrice: product?.costPrice || 0,
                                     price: product?.price || 0
                                   });
                                   setCurrentItems(newItems);
                                 }}
                                 size="small"
                                 style={{ color: '#1890ff' }}
                               />
                             )}
                           </div>
                           
                           {/* Поставщик и цены для каждого штрихкода */}
                           <Row gutter={8}>
                             <Col span={8}>
                               <div style={{ marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>Поставщик:</div>
                               <Select
                                 placeholder="Выберите поставщика"
                                 style={{ width: '100%' }}
                                 size="small"
                                 value={currentItems[index]?.barcodeData?.[bcIndex]?.supplierId || undefined}
                                 onChange={(supplierId) => {
                                   const newItems = [...currentItems];
                                   if (!newItems[index].barcodeData) {
                                     newItems[index].barcodeData = [];
                                   }
                                   if (!newItems[index].barcodeData[bcIndex]) {
                                     newItems[index].barcodeData[bcIndex] = {
                                       supplierId: '',
                                       supplierName: '',
                                       costPrice: 0,
                                       price: 0
                                     };
                                   }
                                   const supplier = suppliers.find(s => s._id === supplierId);
                                   newItems[index].barcodeData[bcIndex].supplierId = supplierId;
                                   newItems[index].barcodeData[bcIndex].supplierName = supplier ? supplier.name : '';
                                   setCurrentItems(newItems);
                                 }}
                               >
                                 {suppliers.filter(s => s.status === 'active').map(supplier => (
                                   <Option key={supplier._id} value={supplier._id}>
                                     {supplier.name}
                                   </Option>
                                 ))}
                               </Select>
                             </Col>
                             <Col span={8}>
                               <div style={{ marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>Закупка:</div>
                               <InputNumber
                                 placeholder="0"
                                 style={{ width: '100%' }}
                                 size="small"
                                 min={0}
                                 value={currentItems[index]?.barcodeData?.[bcIndex]?.costPrice || 0}
                                 onChange={(value) => {
                                   const newItems = [...currentItems];
                                   if (!newItems[index].barcodeData) {
                                     newItems[index].barcodeData = [];
                                   }
                                   if (!newItems[index].barcodeData[bcIndex]) {
                                     newItems[index].barcodeData[bcIndex] = {
                                       supplierId: '',
                                       supplierName: '',
                                       costPrice: 0,
                                       price: 0
                                     };
                                   }
                                   newItems[index].barcodeData[bcIndex].costPrice = value || 0;
                                   // Если цена продажи меньше новой закупочной цены, обновляем цену продажи
                                   if (newItems[index].barcodeData[bcIndex].price < (value || 0)) {
                                     newItems[index].barcodeData[bcIndex].price = value || 0;
                                   }
                                   setCurrentItems(newItems);
                                 }}
                                 formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                               />
                             </Col>
                             <Col span={8}>
                               <div style={{ marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>Продажа:</div>
                               <InputNumber
                                 placeholder="0"
                                 style={{ width: '100%' }}
                                 size="small"
                                 min={currentItems[index]?.barcodeData?.[bcIndex]?.costPrice || 0}
                                 value={currentItems[index]?.barcodeData?.[bcIndex]?.price || 0}
                                 onChange={(value) => {
                                   const costPrice = currentItems[index]?.barcodeData?.[bcIndex]?.costPrice || 0;
                                   if (value && value < costPrice) {
                                     message.error(`Цена продажи не может быть ниже закупочной цены (${costPrice} ₽)`);
                                     return;
                                   }
                                   const newItems = [...currentItems];
                                   if (!newItems[index].barcodeData) {
                                     newItems[index].barcodeData = [];
                                   }
                                   if (!newItems[index].barcodeData[bcIndex]) {
                                     newItems[index].barcodeData[bcIndex] = {
                                       supplierId: '',
                                       supplierName: '',
                                       costPrice: 0,
                                       price: 0
                                     };
                                   }
                                   newItems[index].barcodeData[bcIndex].price = value || 0;
                                   setCurrentItems(newItems);
                                 }}
                                 formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                               />
                             </Col>
                           </Row>
                         </div>
                       ))}
                     </div>
                   ) : (
                                         // Серийные номера для техники
                     <div style={{ 
                       padding: '8px', 
                       background: '#f6ffed', 
                       border: '1px solid #b7eb8f', 
                       borderRadius: '6px'
                     }}>
                       <div style={{ fontSize: '12px', color: '#52c41a', marginBottom: '8px' }}>
                         💡 Для техники: добавьте серийные номера. Для каждого серийного номера укажите поставщика и цены.
                       </div>
                       {(currentItems[index]?.serialNumbers || ['']).map((serialNumber, snIndex) => (
                         <div key={snIndex} style={{ 
                           marginBottom: '12px',
                           padding: '12px',
                           background: '#fafafa',
                           border: '1px solid #e8e8e8',
                           borderRadius: '6px'
                         }}>
                           <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                             <Input
                               placeholder={`Серийный номер ${snIndex + 1} (обязательно)`}
                               value={serialNumber}
                                                                onChange={(e) => {
                                   const newItems = [...currentItems];
                                   if (!newItems[index].serialNumbers) {
                                     newItems[index].serialNumbers = [];
                                   }
                                   newItems[index].serialNumbers[snIndex] = e.target.value;
                                   // Обновляем количество для техники по количеству серийных номеров
                                   const validSerialNumbers = newItems[index].serialNumbers?.filter(sn => sn.trim() !== '') || [];
                                   newItems[index].quantity = Math.max(1, validSerialNumbers.length);
                                   setCurrentItems(newItems);
                                   // Обновляем поле количества в форме
                                   form.setFieldsValue({
                                     [`quantity_${index}`]: Math.max(1, validSerialNumbers.length)
                                   });
                                 }}
                               style={{ flex: 1, marginRight: '8px' }}
                               required
                             />
                             {(currentItems[index]?.serialNumbers || []).length > 1 && (
                               <Button
                                 type="text"
                                 danger
                                 icon={<MinusCircleOutlined />}
                                 onClick={() => {
                                   const newItems = [...currentItems];
                                   if (newItems[index].serialNumbers) {
                                     newItems[index].serialNumbers = newItems[index].serialNumbers.filter((_, i) => i !== snIndex);
                                   }
                                   // Удаляем соответствующие данные поставщика и цен
                                   if (!newItems[index].serialNumberData) {
                                     newItems[index].serialNumberData = [];
                                   }
                                   if (newItems[index].serialNumberData) {
                                     newItems[index].serialNumberData = newItems[index].serialNumberData!.filter((_, i) => i !== snIndex);
                                   }
                                   // Обновляем количество
                                   const validSerialNumbers = newItems[index].serialNumbers?.filter(sn => sn.trim() !== '') || [];
                                   newItems[index].quantity = Math.max(1, validSerialNumbers.length);
                                   setCurrentItems(newItems);
                                   form.setFieldsValue({
                                     [`quantity_${index}`]: Math.max(1, validSerialNumbers.length)
                                   });
                                 }}
                                 size="small"
                               />
                             )}
                             {snIndex === (currentItems[index]?.serialNumbers || []).length - 1 && (
                               <Button
                                 type="text"
                                 icon={<PlusOutlined />}
                                 onClick={() => {
                                   const newItems = [...currentItems];
                                   if (!newItems[index].serialNumbers) {
                                     newItems[index].serialNumbers = [];
                                   }
                                   if (!newItems[index].serialNumberData) {
                                     newItems[index].serialNumberData = [];
                                   }
                                   newItems[index].serialNumbers.push('');
                                   const product = products.find(p => p._id === newItems[index].productId);
                                   newItems[index].serialNumberData.push({
                                     supplierId: '',
                                     supplierName: '',
                                     costPrice: product?.costPrice || 0,
                                     price: product?.price || 0
                                   });
                                   setCurrentItems(newItems);
                                 }}
                                 size="small"
                                 style={{ color: '#1890ff' }}
                               />
                             )}
                           </div>
                           
                           {/* Поставщик и цены для каждого серийного номера */}
                           <Row gutter={8}>
                             <Col span={8}>
                               <div style={{ marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>Поставщик:</div>
                               <Select
                                 placeholder="Выберите поставщика"
                                 style={{ width: '100%' }}
                                 size="small"
                                 value={currentItems[index]?.serialNumberData?.[snIndex]?.supplierId || undefined}
                                 onChange={(supplierId) => {
                                   const newItems = [...currentItems];
                                   if (!newItems[index].serialNumberData) {
                                     newItems[index].serialNumberData = [];
                                   }
                                   if (!newItems[index].serialNumberData[snIndex]) {
                                     newItems[index].serialNumberData[snIndex] = {
                                       supplierId: '',
                                       supplierName: '',
                                       costPrice: 0,
                                       price: 0
                                     };
                                   }
                                   const supplier = suppliers.find(s => s._id === supplierId);
                                   newItems[index].serialNumberData[snIndex].supplierId = supplierId;
                                   newItems[index].serialNumberData[snIndex].supplierName = supplier ? supplier.name : '';
                                   setCurrentItems(newItems);
                                 }}
                               >
                                 {suppliers.filter(s => s.status === 'active').map(supplier => (
                                   <Option key={supplier._id} value={supplier._id}>
                                     {supplier.name}
                                   </Option>
                                 ))}
                               </Select>
                             </Col>
                             <Col span={8}>
                               <div style={{ marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>Закупка:</div>
                               <InputNumber
                                 placeholder="0"
                                 style={{ width: '100%' }}
                                 size="small"
                                 min={0}
                                 value={currentItems[index]?.serialNumberData?.[snIndex]?.costPrice || 0}
                                 onChange={(value) => {
                                   const newItems = [...currentItems];
                                   if (!newItems[index].serialNumberData) {
                                     newItems[index].serialNumberData = [];
                                   }
                                   if (!newItems[index].serialNumberData[snIndex]) {
                                     newItems[index].serialNumberData[snIndex] = {
                                       supplierId: '',
                                       supplierName: '',
                                       costPrice: 0,
                                       price: 0
                                     };
                                   }
                                   newItems[index].serialNumberData[snIndex].costPrice = value || 0;
                                   // Если цена продажи меньше новой закупочной цены, обновляем цену продажи
                                   if (newItems[index].serialNumberData[snIndex].price < (value || 0)) {
                                     newItems[index].serialNumberData[snIndex].price = value || 0;
                                   }
                                   setCurrentItems(newItems);
                                 }}
                                 formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                               />
                             </Col>
                             <Col span={8}>
                               <div style={{ marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>Продажа:</div>
                               <InputNumber
                                 placeholder="0"
                                 style={{ width: '100%' }}
                                 size="small"
                                 min={currentItems[index]?.serialNumberData?.[snIndex]?.costPrice || 0}
                                 value={currentItems[index]?.serialNumberData?.[snIndex]?.price || 0}
                                 onChange={(value) => {
                                   const costPrice = currentItems[index]?.serialNumberData?.[snIndex]?.costPrice || 0;
                                   if (value && value < costPrice) {
                                     message.error(`Цена продажи не может быть ниже закупочной цены (${costPrice} ₽)`);
                                     return;
                                   }
                                   const newItems = [...currentItems];
                                   if (!newItems[index].serialNumberData) {
                                     newItems[index].serialNumberData = [];
                                   }
                                   if (!newItems[index].serialNumberData[snIndex]) {
                                     newItems[index].serialNumberData[snIndex] = {
                                       supplierId: '',
                                       supplierName: '',
                                       costPrice: 0,
                                       price: 0
                                     };
                                   }
                                   newItems[index].serialNumberData[snIndex].price = value || 0;
                                   setCurrentItems(newItems);
                                 }}
                                 formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                               />
                             </Col>
                           </Row>
                         </div>
                       ))}
                     </div>
                  )}
                </div>
              )}
              
              {/* Кнопка удаления товара */}
              <div style={{ marginTop: '12px', textAlign: 'right' }}>
                <Button
                  type="text"
                  danger
                  icon={<MinusCircleOutlined />}
                  onClick={() => handleRemoveItem(index)}
                  size="small"
                >
                  Удалить товар
                </Button>
              </div>
            </div>
          ))}
          {currentItems.length > 0 && (
            <Row gutter={8} style={{ marginTop: '16px' }}>
                            <Col span={12}>
                <Button
                  type="dashed"
                  onClick={addProductToArrival}
                  icon={<PlusOutlined />}
                  style={{ width: '100%' }}
                >
                  Добавить товар
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  type="dashed"
                  onClick={addServiceToArrival}
                  icon={<PlusOutlined />}
                  style={{ width: '100%' }}
                >
                    Добавить услугу
                </Button>
              </Col>
              </Row>
            )}
        </Form>
      </Modal>

      {/* Модальное окно создания товара */}
      <Modal
        title="Создать новый товар"
        open={isProductModalVisible}
        onOk={handleProductModalOk}
        onCancel={() => {
          setIsProductModalVisible(false);
          productForm.resetFields();
          setSelectedImages([]);
          setSelectedCategory('');
          setSerialNumbers(['']);
          setBarcodes(['']);
          setSerialNumberSuppliers([{supplierId: '', supplierName: ''}]);
          setShowArrivalSection(false);
        }}
        width={800}
        okText="Создать товар"
        cancelText="Отмена"
      >
        <Form form={productForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
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
                            productForm.setFieldsValue({ article: newArticle });
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
                extra="Выберите категорию или подкатегорию. Можно выбрать как основную категорию, так и любую подкатегорию."
              >
                <TreeSelect
                  placeholder="🔍 Поиск категории по названию..."
                  allowClear
                  treeData={categories ? convertToTreeSelectData(buildCategoryTree(categories)) : []}
                  treeDefaultExpandAll={false}
                  showSearch
                  filterTreeNode={(inputValue, treeNode) => {
                    // Извлекаем текст из React элемента
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
                  treeNodeFilterProp="title"
                  showCheckedStrategy={TreeSelect.SHOW_PARENT}
                  maxTagCount={1}
                  treeNodeLabelProp="title"
                  dropdownMatchSelectWidth={false}
                  placement="bottomLeft"
                  onChange={async (value) => {
                    setSelectedCategory(value);
                    // Сбрасываем серийные номера и штрихкоды при смене категории
                    setSerialNumbers(['']);
                    setBarcodes(['']);
                    setSerialNumberSuppliers([{supplierId: '', supplierName: ''}]);
                    
                    // Автоматически генерируем артикул при выборе категории
                    if (value) {
                      try {
                        const isAccessory = isAccessoryCategory(value);
                        const newArticle = await generateUniqueArticle(isAccessory);
                        productForm.setFieldsValue({ article: newArticle });
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
            <Col span={12}>
              <Form.Item
                name="costPrice"
                label="Закупочная цена"
                rules={[{ required: true, message: 'Введите закупочную цену' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0"
                  min={0}
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  onChange={() => {
                    // Пересчитываем валидацию цены продажи при изменении закупочной цены
                    setTimeout(() => {
                      productForm.validateFields(['price']);
                    }, 100);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="isAccessory"
                label=" "
                valuePropName="checked"
              >
                <div style={{ marginTop: '8px' }}>
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      productForm.setFieldsValue({
                        isAccessory: e.target.checked
                      });
                    }}
                    style={{ marginRight: '8px' }}
                  />
                  Это аксессуар
                </div>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea
              rows={3}
              placeholder="Введите описание товара"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="isHidden"
                label=" "
                valuePropName="checked"
                initialValue={true}
              >
                <div>
                  <input
                    type="checkbox"
                    defaultChecked={true}
                    onChange={(e) => {
                      productForm.setFieldsValue({
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
                  Товар не будет отображаться в каталоге на основном сайте
                </div>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Изображения"
              >
                <div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setSelectedImages(files);
                    }}
                    style={{ marginBottom: '8px' }}
                  />
                  <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                    Выберите изображения товара (необязательно)
                  </div>
                  {selectedImages.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <Tag color="green">Выбрано файлов: {selectedImages.length}</Tag>
                    </div>
                  )}
                </div>
              </Form.Item>
            </Col>
          </Row>





          {/* Секция для добавления в приход */}
          <Divider>Добавить товар на приход</Divider>
          <div>
            <input
              type="checkbox"
              checked={showArrivalSection}
              onChange={(e) => setShowArrivalSection(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <span style={{ fontWeight: '500' }}>Сразу добавить этот товар на приход</span>
          </div>
          
          {showArrivalSection && (
            <div style={{ 
              marginTop: '16px',
              padding: '16px',
              background: '#f0f9ff',
              border: '1px solid #bae7ff',
              borderRadius: '8px'
            }}>
              <div style={{ marginBottom: '12px', fontWeight: '500', color: '#1890ff' }}>
                🎯 Настройка прихода
              </div>
              <Row gutter={16}>
                {/* Поставщик только для аксессуаров */}
                {(!selectedCategory || isAccessoryCategory(selectedCategory)) && (
                  <Col span={8}>
                    <Form.Item
                      name="supplierId"
                      label="Поставщик"
                      style={{ marginBottom: 0 }}
                      rules={[{ required: true, message: 'Выберите поставщика' }]}
                    >
                      <Select
                        placeholder="Выберите поставщика"
                        style={{ width: '100%' }}
                        onChange={(supplierId) => {
                          const supplier = suppliers.find(s => s._id === supplierId);
                          if (supplier) {
                            productForm.setFieldsValue({
                              supplierName: supplier.name
                            });
                          }
                        }}
                      >
                        {suppliers.filter(s => s.status === 'active').map(supplier => (
                          <Option key={supplier._id} value={supplier._id}>
                            {supplier.name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                )}
                {/* Количество показываем только для штрихкодов (аксессуаров) */}
                {!selectedCategory || isAccessoryCategory(selectedCategory) ? (
                  <Col span={8}>
                  <Form.Item
                    name="quantity"
                    label="Количество"
                    style={{ marginBottom: 0 }}
                    initialValue={1}
                  >
                    <InputNumber
                      min={1}
                      defaultValue={1}
                      style={{ width: '100%' }}
                      placeholder="1"
                    />
                  </Form.Item>
                  </Col>
                ) : (
                  <Col span={8}>
                    <div style={{ marginBottom: '8px', fontWeight: '500', color: '#666' }}>Количество:</div>
                    <div style={{ 
                      padding: '6px 11px', 
                      background: '#f5f5f5', 
                      border: '1px solid #d9d9d9', 
                      borderRadius: '6px',
                      color: '#666'
                    }}>
                      {serialNumbers.filter(sn => sn.trim() !== '').length || 1} шт (по серийным номерам)
                    </div>
                  </Col>
                )}
                <Col span={8}>
                  <Form.Item
                    name="price"
                    label="Цена продажи"
                    style={{ marginBottom: 0 }}
                    rules={[
                      {
                        validator: async (_, value) => {
                          const costPrice = productForm.getFieldValue('costPrice');
                          if (value && costPrice && value < costPrice) {
                            throw new Error(`Цена продажи не может быть меньше закупочной цены (${costPrice} ₽)`);
                          }
                        }
                      }
                    ]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="0"
                      min={0}
                      formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <div style={{ marginTop: '12px' }}>
                <Form.Item
                  name="notes"
                  label="Примечания"
                  style={{ marginBottom: 0 }}
                >
                  <Input.TextArea
                    rows={2}
                    placeholder="Дополнительная информация о приходе"
                  />
                </Form.Item>
              </div>

              {/* Серийные номера и штрихкоды */}
              {selectedCategory && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ marginBottom: '12px', fontWeight: '500', color: '#1890ff' }}>
                    {isAccessoryCategory(selectedCategory) ? '📦 Штрихкоды' : '🔢 Серийные номера'}
            </div>
                  
                  {/* Пояснение для пользователей */}
                  <div style={{ 
                    marginBottom: '12px', 
                    padding: '8px 12px', 
                    background: isAccessoryCategory(selectedCategory) ? '#fff7e6' : '#f6ffed',
                    border: `1px solid ${isAccessoryCategory(selectedCategory) ? '#ffd591' : '#b7eb8f'}`,
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    {isAccessoryCategory(selectedCategory) ? 
                      '💡 Для аксессуаров: один штрихкод может соответствовать нескольким товарам. Укажите количество выше.' :
                      '💡 Для техники: один серийный номер = один товар. Количество определяется автоматически.'
                    }
                  </div>
                  
                  {isAccessoryCategory(selectedCategory) ? (
                    // Штрихкоды для аксессуаров
                    <div>
                      {barcodes.map((barcode, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <Input
                            placeholder={`Штрихкод ${index + 1}`}
                            value={barcode}
                            onChange={(e) => updateBarcode(index, e.target.value)}
                            style={{ flex: 1, marginRight: '8px' }}
                          />
                          {barcodes.length > 1 && (
                            <Button
                              type="text"
                              danger
                              icon={<MinusCircleOutlined />}
                              onClick={() => removeBarcode(index)}
                              size="small"
                            />
                          )}
                          {index === barcodes.length - 1 && (
                            <Button
                              type="text"
                              icon={<PlusOutlined />}
                              onClick={addBarcode}
                              size="small"
                              style={{ color: '#1890ff' }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Серийные номера для обычных товаров
                    <div>
                      {serialNumbers.map((serialNumber, index) => (
                        <div key={index} style={{ 
                          marginBottom: '12px',
                          padding: '12px',
                          background: '#fafafa',
                          border: '1px solid #e8e8e8',
                          borderRadius: '6px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                            <Input
                              placeholder={`Серийный номер ${index + 1}`}
                              value={serialNumber}
                              onChange={(e) => updateSerialNumber(index, e.target.value)}
                              style={{ flex: 1, marginRight: '8px' }}
                            />
                            {serialNumbers.length > 1 && (
                              <Button
                                type="text"
                                danger
                                icon={<MinusCircleOutlined />}
                                onClick={() => removeSerialNumber(index)}
                                size="small"
                              />
                            )}
                            {index === serialNumbers.length - 1 && (
                              <Button
                                type="text"
                                icon={<PlusOutlined />}
                                onClick={addSerialNumber}
                                size="small"
                                style={{ color: '#1890ff' }}
                              />
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ marginRight: '8px', fontWeight: '500', color: '#666', minWidth: '80px' }}>
                              Поставщик:
                            </span>
                            <Select
                              placeholder="Выберите поставщика"
                              style={{ flex: 1 }}
                              dropdownStyle={{ minWidth: '300px' }}
                              optionLabelProp="label"
                              value={serialNumberSuppliers[index]?.supplierId || undefined}
                              onChange={(supplierId) => updateSerialNumberSupplier(index, supplierId)}
                            >
                              {suppliers.filter(s => s.status === 'active').map(supplier => (
                                <Option 
                                  key={supplier._id} 
                                  value={supplier._id}
                                  label={supplier.name}
                                  title={supplier.name}
                                >
                                  <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                    {supplier.name}
                                  </div>
                                </Option>
                              ))}
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Form>
      </Modal>

      {/* Стили для приходов с оплаченными долгами и адаптивного текста */}
      <style>
        {`
          .paid-debt-arrival {
            background-color: #f6ffed !important;
            opacity: 0.7;
          }
          .paid-debt-arrival:hover {
            background-color: #d9f7be !important;
          }
          .paid-debt-arrival td {
            color: #8c8c8c !important;
          }
          .paid-debt-arrival .ant-tag {
            opacity: 0.7;
          }

          /* Стили для адаптивного размера шрифта в выбранном значении */
          .adaptive-product-select .ant-select-selection-item {
            font-size: 14px;
            transition: font-size 0.2s ease;
            white-space: normal !important;
            height: auto !important;
            line-height: 1.4 !important;
            padding-right: 20px !important;
          }

          .adaptive-product-select .ant-select-selection-item[title*=" - "] {
            font-size: 13px;
          }

          .adaptive-product-select .ant-select-selection-item[title*="   - "] {
            font-size: 12px;
          }

          /* Стили для длинных названий */
          .adaptive-product-select .ant-select-selection-item[style*="width: 100%"] {
            font-size: 12px;
          }

          /* Медиа-запросы для адаптивности */
          @media screen and (max-width: 1200px) {
            .adaptive-product-select .ant-select-selection-item {
              font-size: 13px;
            }
          }

          @media screen and (max-width: 992px) {
            .adaptive-product-select .ant-select-selection-item {
              font-size: 12px;
            }
          }

          @media screen and (max-width: 768px) {
            .adaptive-product-select .ant-select-selection-item {
              font-size: 11px;
            }
          }

          /* Стили для выпадающего списка */
          .adaptive-select .ant-select-selection-item {
            font-size: 14px;
            transition: font-size 0.2s;
          }
          
          .adaptive-select .ant-select-selection-item.ant-select-selection-item-overflow {
            font-size: 12px;
          }
          
          .adaptive-select .ant-select-selection-item.ant-select-selection-item-overflow-wrap {
            font-size: 10px;
          }

          .adaptive-text {
            font-size: 14px;
            transition: font-size 0.2s;
          }

          @media screen and (max-width: 1200px) {
            .adaptive-text {
              font-size: 13px;
            }
          }

          @media screen and (max-width: 992px) {
            .adaptive-text {
              font-size: 12px;
            }
          }

          @media screen and (max-width: 768px) {
            .adaptive-text {
              font-size: 11px;
            }
          }

          .ant-select-dropdown .ant-select-item-option-content {
            white-space: normal;
            word-break: break-word;
          }

          .ant-select-dropdown .adaptive-text {
            font-size: 14px !important;
          }
        `}
      </style>
    </div>
  );
};

export default Arrivals; 