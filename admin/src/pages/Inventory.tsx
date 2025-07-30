import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Modal, 
  Form, 
  Checkbox, 
  Select, 
  Table, 
  InputNumber, 
  Space, 
  message, 
  Typography,
  Row,
  Col,
  Statistic,
  Alert,
  Input
} from 'antd';
import { 
  PlayCircleOutlined, 
  ReloadOutlined, 
  DownloadOutlined, 
  SaveOutlined, 
  FileTextOutlined,
  BarChartOutlined,
  CalculatorOutlined,
  SearchOutlined,
  BarcodeOutlined,
  FolderOutlined
} from '@ant-design/icons';
import { suppliersApi, arrivalsApi, receiptsApi } from '../utils/baseApi';
import { useAuth } from '../hooks/useAuth';
import type { ColumnsType } from 'antd/es/table';

const { Option } = Select;
const { Search } = Input;
const { Title, Text } = Typography;

interface InventoryItem {
  id: string;
  productName: string;
  supplier: string;
  supplierId: string;
  pickedQuantity: number;
  actualQuantity: number;
  costPrice: number;
  totalCost: number;
  isAccessory: boolean;
  isService: boolean;
  arrivalId: string;
  serialNumbers?: string[];
  barcode?: string;
}

interface InventorySettings {
  includeAllProducts: boolean;
  includeAccessories: boolean;
  suppliers: string[];
  inventoryType: 'all' | 'technoline';
}

interface SavedInventory {
  id: string;
  name: string;
  date: string;
  settings: InventorySettings;
  items: InventoryItem[];
  totalPicked: number;
  totalActual: number;
  difference: number;
}

interface InventoryReport {
  id: string;
  name: string;
  date: string;
  settings: InventorySettings;
  matchedItems: InventoryItem[]; // товары с совпадающими количествами
  missingItems: InventoryItem[]; // товары которых нет (пикнуто = 0)
  excessItems: InventoryItem[]; // товары с превышением (пикнуто > на точке)
  totalMatched: number;
  totalMissing: number;
  totalExcess: number;
  createdBy: string;
  canDelete: boolean; // может ли текущий пользователь удалить отчет
}

const Inventory: React.FC = () => {
  const { user, isAdmin, isAccountant, hasFullAccess } = useAuth();
  
  const [isInventoryStarted, setIsInventoryStarted] = useState(() => {
    const saved = localStorage.getItem('inventoryStarted');
    return saved === 'true';
  });
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('inventoryItems');
    return saved ? JSON.parse(saved) : [];
  });
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [arrivals, setArrivals] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchResult, setSearchResult] = useState<InventoryItem | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSuppliersCount, setSelectedSuppliersCount] = useState(0);
  const [isTechnolineMode, setIsTechnolineMode] = useState(() => {
    const saved = localStorage.getItem('inventoryTechnolineMode');
    return saved === 'true';
  });
  const [savedInventories, setSavedInventories] = useState<SavedInventory[]>([]);
  const [showSavedInventories, setShowSavedInventories] = useState(false);
  const [inventoryReports, setInventoryReports] = useState<InventoryReport[]>([]);
  const [showReports, setShowReports] = useState(false);
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('inventoryPageSize');
    return saved ? parseInt(saved) : 20;
  });
  const [form] = Form.useForm();
  const searchInputRef = React.useRef<any>(null);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Обработчик изменения размера страницы
  const handlePageSizeChange = (current: number, size: number) => {
    setPageSize(size);
    localStorage.setItem('inventoryPageSize', size.toString());
  };

  // Загрузка поставщиков
  const loadSuppliers = async () => {
    try {
      const data = await suppliersApi.getAll();
      setSuppliers(data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      message.error('Ошибка при загрузке поставщиков');
    }
  };

  // Загрузка приходов
  const loadArrivals = async () => {
    try {
      const data = await arrivalsApi.getAll();
      setArrivals(data);
    } catch (error) {
      console.error('Error loading arrivals:', error);
      message.error('Ошибка при загрузке приходов');
    }
  };

  // Загрузка чеков
  const loadReceipts = async () => {
    try {
      const data = await receiptsApi.getAll();
      setReceipts(data);
    } catch (error) {
      console.error('Error loading receipts:', error);
      message.error('Ошибка при загрузке чеков');
    }
  };

  useEffect(() => {
    loadSuppliers();
    loadArrivals();
    loadReceipts();
    loadSavedInventories();
    loadInventoryReports();
  }, []);

  // Перезагрузка отчетов при изменении прав доступа
  useEffect(() => {
    loadInventoryReports();
  }, [hasFullAccess]);

  // Автоматическое сохранение состояния при изменении inventoryItems
  useEffect(() => {
    if (isInventoryStarted && inventoryItems.length > 0) {
      saveInventoryState();
    }
  }, [inventoryItems, isInventoryStarted]);

  // Загрузка сохраненных инвентаризаций
  const loadSavedInventories = () => {
    try {
      const saved = localStorage.getItem('savedInventories');
      if (saved) {
        setSavedInventories(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading saved inventories:', error);
    }
  };

  // Загрузка отчетов инвентаризации
  const loadInventoryReports = () => {
    try {
      const saved = localStorage.getItem('inventoryReports');
      if (saved) {
        const reports = JSON.parse(saved);
        // Обновляем права доступа для каждого отчета, добавляем поля для обратной совместимости и сортируем по дате (новые сверху)
        const updatedReports = reports
          .map((report: any) => ({
            ...report,
            // Добавляем поля для обратной совместимости со старыми отчетами
            excessItems: report.excessItems || [],
            totalExcess: report.totalExcess || 0,
            canDelete: hasFullAccess()
          }))
          .sort((a: InventoryReport, b: InventoryReport) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
        setInventoryReports(updatedReports);
      }
    } catch (error) {
      console.error('Error loading inventory reports:', error);
    }
  };



  // Сохранение состояния инвентаризации
  const saveInventoryState = () => {
    localStorage.setItem('inventoryStarted', isInventoryStarted.toString());
    localStorage.setItem('inventoryItems', JSON.stringify(inventoryItems));
    localStorage.setItem('inventoryTechnolineMode', isTechnolineMode.toString());
  };

  // Очистка состояния инвентаризации
  const clearInventoryState = () => {
    localStorage.removeItem('inventoryStarted');
    localStorage.removeItem('inventoryItems');
    localStorage.removeItem('inventoryTechnolineMode');
  };

  // Очистка таймаута при размонтировании
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Поиск товара по серийному номеру или штрихкоду
  const handleSearchItem = (value: string) => {
    if (!value.trim()) {
      setSearchResult(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const searchTerm = value.toLowerCase().trim();
    
    // Ищем товар в инвентаризации
    let foundItem = inventoryItems.find(item => {
      // Поиск по серийному номеру
      if (item.serialNumbers?.some((sn: string) => 
        sn.toLowerCase().includes(searchTerm)
      )) {
        return true;
      }
      
      // Поиск по штрихкоду
      if (item.barcode?.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      return false;
    });

    // Если не нашли по точному совпадению, ищем по частичному совпадению штрихкода
    if (!foundItem) {
      foundItem = inventoryItems.find(item => {
        // Поиск по частичному совпадению штрихкода
        if (item.barcode && item.barcode.toLowerCase().includes(searchTerm)) {
          return true;
        }
        return false;
      });
    }

    if (foundItem) {
      // Проверяем превышение только для серийных номеров (не для штрихкодов)
      const isSerialNumberSearch = foundItem.serialNumbers?.some((sn: string) => 
        sn.toLowerCase().includes(searchTerm)
      );
      
      // Ограничение только для серийных номеров
      if (isSerialNumberSearch && foundItem.pickedQuantity >= foundItem.actualQuantity) {
        message.error(`Товар "${foundItem.productName}" уже полностью посчитан (${foundItem.pickedQuantity}/${foundItem.actualQuantity})`);
        setSearchValue('');
        setIsSearching(false);
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
        return;
      }
      
      setSearchResult(foundItem);
      message.success(`Товар найден: ${foundItem.productName}`);
      
      // Увеличиваем количество пикнутого товара
      setInventoryItems(prev => 
        prev.map(item => 
          item.id === foundItem.id 
            ? { ...item, pickedQuantity: item.pickedQuantity + 1 }
            : item
        )
      );
      
      // Сохраняем состояние
      saveInventoryState();
      
      // Очищаем поле поиска и фокусируемся на нем для следующего сканирования
      setSearchValue('');
      setIsSearching(false);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchResult(null);
      setIsSearching(false);
      message.error('Товар не найден');
      // Фокусируемся на поле поиска для повторного ввода
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  // Автоматический поиск при вводе
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    
    // Очищаем предыдущий таймаут
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Если поле пустое, очищаем результат
    if (!value.trim()) {
      setSearchResult(null);
      return;
    }
    
    // Устанавливаем таймаут для автоматического поиска
    searchTimeoutRef.current = setTimeout(() => {
      handleSearchItem(value);
    }, 300); // Задержка 300мс для завершения ввода
  };

  // Начать инвентаризацию
  const handleStartInventory = () => {
    setSettingsModalVisible(true);
    
    // Инициализируем форму с выбранными по умолчанию поставщиками
    setTimeout(() => {
      const allSupplierIds = suppliers.map(s => s._id);
      form.setFieldsValue({ 
        suppliers: allSupplierIds,
        inventoryType: 'all',
        includeAllProducts: true,
        includeAccessories: true
      });
      setSelectedSuppliersCount(allSupplierIds.length);
      setIsTechnolineMode(false);
    }, 100);
  };

  // Восстановить настройки формы при загрузке
  useEffect(() => {
    if (isInventoryStarted && suppliers.length > 0) {
      // Восстанавливаем настройки формы на основе сохраненного состояния
      const allSupplierIds = suppliers.map(s => s._id);
      form.setFieldsValue({ 
        suppliers: allSupplierIds,
        inventoryType: isTechnolineMode ? 'technoline' : 'all',
        includeAllProducts: true,
        includeAccessories: true
      });
      setSelectedSuppliersCount(allSupplierIds.length);
    }
  }, [isInventoryStarted, suppliers, isTechnolineMode]);

  // Сохранить настройки и начать инвентаризацию
  const handleSettingsOk = async () => {
    try {
      const values = await form.validateFields();
      
      // Фильтруем поставщиков в зависимости от типа инвентаризации
      let selectedSuppliers = values.suppliers;
      if (values.inventoryType === 'technoline') {
        // Фильтруем только поставщиков с названием "Технолайн" или похожих
        selectedSuppliers = suppliers
          .filter(s => s.name.toLowerCase().includes('технолайн'))
          .map(s => s._id);
      }

      // Получаем все товары из приходов выбранных поставщиков
      const items: InventoryItem[] = [];
      
      arrivals.forEach(arrival => {
        if (selectedSuppliers.includes(arrival.supplierId)) {
          arrival.items?.forEach((item: any) => {
            // Проверяем фильтры по типу товара (исключаем услуги)
            if (!item.isService && (
                (values.includeAllProducts && !item.isAccessory) || 
                (values.includeAccessories && item.isAccessory)
              )) {
              
              // Проверяем, не продан ли товар через чеки
              const soldQuantity = receipts.reduce((total: number, receipt: any) => {
                if (receipt.status === 'cancelled') return total;
                return total + (receipt.items || []).reduce((itemTotal: number, receiptItem: any) => {
                  if (receiptItem.arrivalId === arrival._id) {
                    return itemTotal + receiptItem.quantity;
                  }
                  return itemTotal;
                }, 0);
              }, 0);
              
              const availableQuantity = item.quantity - soldQuantity;
              
              if (availableQuantity > 0) {
                // Для техники с серийными номерами создаем отдельные записи
                if (!item.isAccessory && item.serialNumbers && item.serialNumbers.length > 0) {
                  item.serialNumbers.forEach((serialNumber: string, index: number) => {
                    items.push({
                      id: `${arrival._id}_${item.id}_${serialNumber}`,
                      productName: item.productName,
                      supplier: arrival.supplierName,
                      supplierId: arrival.supplierId,
                      pickedQuantity: 0,
                      actualQuantity: 1,
                      costPrice: item.costPrice,
                      totalCost: item.costPrice,
                      isAccessory: false,
                      isService: false,
                      arrivalId: arrival._id,
                      serialNumbers: [serialNumber],
                      barcode: item.barcode
                    });
                  });
                } else {
                  // Для аксессуаров и техники без серийных номеров группируем по названию и штрихкоду
                  const existingItem = items.find(existing => 
                    existing.productName === item.productName && 
                    existing.barcode === item.barcode &&
                    existing.isAccessory === item.isAccessory &&
                    existing.isService === item.isService
                  );
                  
                  if (existingItem) {
                    // Если товар уже есть, увеличиваем количество
                    existingItem.actualQuantity += availableQuantity;
                    existingItem.totalCost += item.costPrice * availableQuantity;
                    
                    // Обновляем информацию о поставщике, если это первый товар от нового поставщика
                    if (!existingItem.supplier.includes(arrival.supplierName)) {
                      existingItem.supplier += `, ${arrival.supplierName}`;
                    }
                  } else {
                    // Если товара нет, добавляем новый
                    items.push({
                      id: `${arrival._id}_${item.id}`,
                      productName: item.productName,
                      supplier: arrival.supplierName,
                      supplierId: arrival.supplierId,
                      pickedQuantity: 0,
                      actualQuantity: availableQuantity,
                      costPrice: item.costPrice,
                      totalCost: item.costPrice * availableQuantity,
                      isAccessory: item.isAccessory || false,
                      isService: item.isService || false,
                      arrivalId: arrival._id,
                      serialNumbers: item.serialNumbers || [],
                      barcode: item.barcode
                    });
                  }
                }
              }
            }
          });
        }
      });

      setInventoryItems(items);
      setIsInventoryStarted(true);
      setSettingsModalVisible(false);
      message.success('Инвентаризация начата');
      
      // Сохраняем состояние
      saveInventoryState();
      
      // Фокусируемся на поле поиска после начала инвентаризации
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 500);
    } catch (error) {
      console.error('Error starting inventory:', error);
    }
  };

  // Обновить количество пикнутого товара
  const handleQuantityChange = (id: string, value: number) => {
    const item = inventoryItems.find(item => item.id === id);
    if (!item) return;
    
    // Проверяем, не превышает ли новое количество фактическое количество
    if (value > item.actualQuantity) {
      message.error(`Количество пикнутого товара не может превышать фактическое количество (${item.actualQuantity})`);
      return;
    }
    
    setInventoryItems(prev => 
      prev.map(item => 
        item.id === id 
          ? { ...item, pickedQuantity: value || 0 }
          : item
      )
    );
    
    // Сохраняем состояние
    saveInventoryState();
  };

  // Сбросить инвентаризацию
  const handleResetInventory = () => {
    Modal.confirm({
      title: 'Сбросить инвентаризацию?',
      content: 'Все данные будут потеряны. Продолжить?',
      onOk: () => {
        setIsInventoryStarted(false);
        setInventoryItems([]);
        setIsTechnolineMode(false);
        form.resetFields();
        clearInventoryState();
        message.info('Инвентаризация сброшена');
      }
    });
  };

  // Сохранить инвентаризацию
  const handleSaveInventory = () => {
    const stats = getStatistics();
    const settings = form.getFieldsValue();
    
    const savedInventory: SavedInventory = {
      id: `inventory_${Date.now()}`,
      name: `Инвентаризация ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU')}`,
      date: new Date().toISOString(),
      settings,
      items: inventoryItems,
      totalPicked: stats.totalPicked,
      totalActual: stats.totalActual,
      difference: stats.difference
    };

    const updatedInventories = [...savedInventories, savedInventory];
    setSavedInventories(updatedInventories);
    localStorage.setItem('savedInventories', JSON.stringify(updatedInventories));
    
    message.success('Инвентаризация сохранена');
  };

  // Скачать PDF отчет
  const handleDownloadPDF = () => {
    const stats = getStatistics();
    const settings = form.getFieldsValue();
    
    // Создаем HTML для PDF в формате A4
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Отчет по инвентаризации</title>
        <style>
          @page {
            size: A4;
            margin: 1cm;
          }
          @media print {
            body {
              height: auto !important;
              min-height: auto !important;
            }
            table {
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 0;
            font-size: 12px;
            line-height: 1.4;
            min-height: auto;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 3px solid #333;
            padding-bottom: 15px;
          }
          .header h1 { 
            margin: 0; 
            font-size: 24px; 
            font-weight: bold; 
          }
          .header p { 
            margin: 5px 0; 
            font-size: 14px; 
          }
          .info { 
            margin-bottom: 25px; 
            font-size: 12px;
          }
          .info h3 { 
            margin: 0 0 8px 0; 
            font-size: 16px; 
          }
          .info p { 
            margin: 3px 0; 
          }
          .stats { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 30px; 
            gap: 20px;
          }
          .stat-item { 
            text-align: center; 
            padding: 15px; 
            border: 2px solid #ddd; 
            flex: 1;
            font-size: 12px;
          }
          .stat-item h4 { 
            margin: 0 0 8px 0; 
            font-size: 16px; 
          }
          .stat-item p { 
            margin: 0; 
            font-weight: bold; 
            font-size: 18px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 30px; 
            font-size: 11px;
            line-height: 1.5;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 12px 10px; 
            text-align: left; 
            vertical-align: top;
            min-height: 20px;
          }
          th { 
            background-color: #f5f5f5; 
            font-weight: bold;
            font-size: 11px;
          }
          .total { 
            font-weight: bold; 
            background-color: #f0f0f0; 
            padding: 15px;
            font-size: 14px;
          }
          .serial-info {
            font-size: 10px;
            color: #666;
            margin-top: 5px;
          }
          .serial-info span {
            display: block;
            margin-bottom: 3px;
          }
          .compact-cell {
            max-width: 120px;
            word-wrap: break-word;
          }
          .product-name {
            font-weight: bold;
            font-size: 12px;
          }
          .accessory-tag {
            background-color: #e6f7ff;
            color: #1890ff;
            padding: 3px 6px;
            border-radius: 4px;
            font-size: 10px;
            margin-left: 8px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ОТЧЕТ ПО ИНВЕНТАРИЗАЦИИ</h1>
          <p>Дата: ${new Date().toLocaleDateString('ru-RU')} | Время: ${new Date().toLocaleTimeString('ru-RU')}</p>
        </div>
        
        <div class="info">
          <h3>Настройки:</h3>
          <p>Тип: ${settings.inventoryType === 'technoline' ? 'Только наш товар' : 'Вся точка'} | 
             Весь товар: ${settings.includeAllProducts ? 'Да' : 'Нет'} | 
             Аксессуары: ${settings.includeAccessories ? 'Да' : 'Нет'}</p>
        </div>
        
        <div class="stats">
          <div class="stat-item">
            <h4>ПИКНУТО</h4>
            <p>${stats.totalPicked.toLocaleString('ru-RU')} ₽</p>
          </div>
          <div class="stat-item">
            <h4>ПО ФАКТУ</h4>
            <p>${stats.totalActual.toLocaleString('ru-RU')} ₽</p>
          </div>
          <div class="stat-item">
            <h4>РАЗНИЦА</h4>
            <p style="color: ${stats.difference >= 0 ? 'green' : 'red'}">${stats.difference.toLocaleString('ru-RU')} ₽</p>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 25%;">Наименование</th>
              <th style="width: 12%;">Поставщик</th>
              <th style="width: 8%;">Пикнуто</th>
              <th style="width: 8%;">На точке</th>
              <th style="width: 10%;">Заход 1шт</th>
              <th style="width: 12%;">Заход суммарный</th>
              <th style="width: 25%;">Серийники/Штрихкоды</th>
            </tr>
          </thead>
          <tbody>
            ${inventoryItems.map(item => {
              const serials = item.serialNumbers && item.serialNumbers.length > 0 
                ? item.serialNumbers.join(', ') 
                : 'Нет';
              const barcode = item.barcode || 'Нет';
              
              return `
                <tr>
                  <td>
                    <div class="product-name">
                      ${item.productName}
                      ${item.isAccessory ? '<span class="accessory-tag">АКС</span>' : ''}
                    </div>
                  </td>
                  <td class="compact-cell">${item.supplier}</td>
                  <td style="text-align: center; font-weight: bold;">
                    ${item.pickedQuantity}
                    ${item.pickedQuantity > item.actualQuantity ? 
                      `<div style="font-size: 9px; color: red; font-weight: bold;">+${item.pickedQuantity - item.actualQuantity}</div>` : 
                      ''
                    }
                  </td>
                  <td style="text-align: center;">${item.actualQuantity}</td>
                                     <td style="text-align: right;">${item.costPrice.toLocaleString('ru-RU')} ₽</td>
                   <td style="text-align: right;">${(item.costPrice * item.actualQuantity).toLocaleString('ru-RU')} ₽</td>
                  <td>
                                         <div class="serial-info">
                       <span><strong>СН:</strong> ${serials}</span>
                       <span><strong>ШК:</strong> ${barcode}</span>
                     </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="total">
          <p>Итого товаров: ${inventoryItems.length} | Общая сумма пикнутого: ${stats.totalPicked.toLocaleString('ru-RU')} ₽ | Общая сумма по факту: ${stats.totalActual.toLocaleString('ru-RU')} ₽ | Итоговая разница: ${stats.difference.toLocaleString('ru-RU')} ₽</p>
        </div>
      </body>
      </html>
    `;

    // Создаем blob и скачиваем
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `инвентаризация_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    message.success('Отчет скачан');
  };

  // Показать отчеты
  const handleShowReports = () => {
    setShowReports(true);
  };

  // Загрузить сохраненную инвентаризацию
  const handleLoadInventory = (savedInventory: SavedInventory) => {
    setInventoryItems(savedInventory.items);
    form.setFieldsValue(savedInventory.settings);
    setIsInventoryStarted(true);
    setIsTechnolineMode(savedInventory.settings.inventoryType === 'technoline');
    setSelectedSuppliersCount(savedInventory.settings.suppliers.length);
    setShowSavedInventories(false);
    
    // Сохраняем состояние
    saveInventoryState();
    
    message.success(`Загружена инвентаризация: ${savedInventory.name}`);
  };

  // Удалить сохраненную инвентаризацию
  const handleDeleteInventory = (id: string) => {
    const updatedInventories = savedInventories.filter(inv => inv.id !== id);
    setSavedInventories(updatedInventories);
    localStorage.setItem('savedInventories', JSON.stringify(updatedInventories));
    message.success('Инвентаризация удалена');
  };

  // Удалить отчет
  const handleDeleteReport = (id: string) => {
    const report = inventoryReports.find(r => r.id === id);
    if (!report) return;
    
    if (!report.canDelete) {
      message.error('У вас нет прав для удаления этого отчета');
      return;
    }
    
    Modal.confirm({
      title: 'Удалить отчет',
      content: `Вы уверены, что хотите удалить отчет "${report.name}"? Это действие нельзя отменить.`,
      okText: 'Да, удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: () => {
        const updatedReports = inventoryReports.filter(r => r.id !== id);
        setInventoryReports(updatedReports);
        localStorage.setItem('inventoryReports', JSON.stringify(updatedReports));
        message.success('Отчет удален');
      }
    });
  };

  // Очистить все отчеты
  const handleClearAllReports = () => {
    Modal.confirm({
      title: 'Очистить все отчеты',
      content: 'Вы уверены, что хотите удалить все отчеты инвентаризации? Это действие нельзя отменить.',
      okText: 'Да, удалить все',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: () => {
        setInventoryReports([]);
        localStorage.removeItem('inventoryReports');
        message.success('Все отчеты удалены');
      }
    });
  };

  // Сформировать отчет
  const handleGenerateReport = () => {
    const settings = form.getFieldsValue();
    
    // Товары с совпадающими количествами (пикнуто = на точке)
    const matchedItems = inventoryItems.filter(item => 
      item.pickedQuantity === item.actualQuantity && item.actualQuantity > 0
    );
    
    // Товары которых нет (пикнуто = 0)
    const missingItems = inventoryItems.filter(item => 
      item.pickedQuantity === 0 && item.actualQuantity > 0
    );
    
    // Товары с превышением (пикнуто > на точке)
    const excessItems = inventoryItems.filter(item => 
      item.pickedQuantity > item.actualQuantity
    );
    
    const totalMatched = matchedItems.reduce((sum, item) => sum + (item.pickedQuantity * item.costPrice), 0);
    const totalMissing = missingItems.reduce((sum, item) => sum + (item.actualQuantity * item.costPrice), 0);
    const totalExcess = excessItems.reduce((sum, item) => sum + ((item.pickedQuantity - item.actualQuantity) * item.costPrice), 0);
    
    const report: InventoryReport = {
      id: `report_${Date.now()}`,
      name: `Отчет инвентаризации ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU')}`,
      date: new Date().toISOString(),
      settings,
      matchedItems,
      missingItems,
      excessItems,
      totalMatched,
      totalMissing,
      totalExcess,
      createdBy: user ? `${user.firstName} ${user.lastName}` : 'Текущий пользователь',
      canDelete: hasFullAccess()
    };

    const updatedReports = [report, ...inventoryReports];
    setInventoryReports(updatedReports);
    localStorage.setItem('inventoryReports', JSON.stringify(updatedReports));
    
    message.success(`Отчет создан: ${matchedItems.length} совпадающих товаров, ${missingItems.length} отсутствующих товаров, ${excessItems.length} с превышением`);
  };

  // Расчет статистики
  const getStatistics = () => {
    const totalPicked = inventoryItems.reduce((sum, item) => sum + (item.pickedQuantity * item.costPrice), 0);
    const totalActual = inventoryItems.reduce((sum, item) => sum + (item.actualQuantity * item.costPrice), 0);
    const difference = totalPicked - totalActual;
    
    return { totalPicked, totalActual, difference };
  };

  const stats = getStatistics();

  // Колонки таблицы
  const columns: ColumnsType<InventoryItem> = [
    {
      title: 'Наименование',
      dataIndex: 'productName',
      key: 'productName',
      width: 200,
      ellipsis: true,
      render: (text: string, record: InventoryItem) => {
        const isComplete = record.pickedQuantity === record.actualQuantity && record.actualQuantity > 0;
        return (
          <div style={{
            backgroundColor: isComplete ? '#f6ffed' : 'transparent',
            padding: '6px',
            borderRadius: '4px',
            border: isComplete ? '1px solid #b7eb8f' : 'none'
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{text}</div>
            {record.isAccessory && <Text type="secondary" style={{ fontSize: '11px' }}>Аксессуар</Text>}
            {isComplete && (
              <Text type="success" style={{ fontSize: '11px', fontWeight: 'bold' }}>
                ✅ Завершено
              </Text>
            )}
          </div>
        );
      }
    },
    {
      title: 'Поставщик',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 100,
      ellipsis: true,
      render: (text: string) => (
        <div style={{ fontSize: '12px' }}>{text}</div>
      )
    },
    {
      title: 'Пикнуто',
      key: 'pickedQuantity',
      width: 80,
      align: 'center' as const,
      render: (_, record: InventoryItem) => {
        const isComplete = record.pickedQuantity === record.actualQuantity && record.actualQuantity > 0;
        const isOverLimit = record.pickedQuantity > record.actualQuantity;
        
        return (
          <div style={{
            padding: '4px 6px',
            backgroundColor: isComplete ? '#f6ffed' : isOverLimit ? '#fff2e8' : '#f5f5f5',
            borderRadius: '4px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '13px',
            color: isComplete ? '#52c41a' : isOverLimit ? '#ff4d4f' : record.pickedQuantity > 0 ? '#1890ff' : '#8c8c8c',
            minWidth: '40px',
            border: isComplete ? '1px solid #b7eb8f' : isOverLimit ? '1px solid #ffbb96' : 'none'
          }}>
            {record.pickedQuantity}
            {isComplete && <div style={{ fontSize: '10px', color: '#52c41a' }}>✓</div>}
            {isOverLimit && <div style={{ fontSize: '10px', color: '#ff4d4f' }}>!</div>}
            {isOverLimit && (
              <div style={{ 
                fontSize: '9px', 
                color: '#ff4d4f', 
                fontWeight: 'bold',
                marginTop: '2px'
              }}>
                +{record.pickedQuantity - record.actualQuantity}
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: 'На точке',
      dataIndex: 'actualQuantity',
      key: 'actualQuantity',
      width: 80,
      align: 'center' as const,
      render: (value: number) => (
        <div style={{ 
          fontSize: '13px', 
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          {value}
        </div>
      )
    },
    {
      title: 'Заход 1шт',
      dataIndex: 'costPrice',
      key: 'costPrice',
      width: 90,
      align: 'right' as const,
      render: (value: number) => (
        <div style={{ fontSize: '12px' }}>
          {value.toLocaleString('ru-RU')} ₽
        </div>
      )
    },
    {
      title: 'Заход суммарный',
      key: 'totalCost',
      width: 110,
      align: 'right' as const,
      render: (_, record: InventoryItem) => (
        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
          {(record.costPrice * record.actualQuantity).toLocaleString('ru-RU')} ₽
        </div>
      )
    },
    {
      title: 'Серийный номер / Штрихкод',
      key: 'serialNumbers',
      width: 150,
      ellipsis: true,
      render: (_, record: InventoryItem) => {
        if (record.serialNumbers && record.serialNumbers.length > 0) {
          return (
            <div style={{ fontSize: '11px', color: '#1890ff' }}>
              {record.serialNumbers.join(', ')}
            </div>
          );
        } else if (record.barcode) {
          return (
            <div style={{ fontSize: '11px', color: '#52c41a' }}>
              {record.barcode}
            </div>
          );
        } else {
          return (
            <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
              Не указан
            </div>
          );
        }
      }
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>📊 Инвентаризация</Title>

      {!isInventoryStarted ? (
        <Card style={{ textAlign: 'center', marginTop: '50px' }}>
          <BarChartOutlined style={{ fontSize: '64px', color: '#1890ff', marginBottom: '24px' }} />
          <Title level={3}>Начать инвентаризацию</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
            Выберите настройки и начните процесс инвентаризации
          </Text>
          <Button
            type="primary"
            size="large"
            icon={<PlayCircleOutlined />}
            onClick={handleStartInventory}
          >
            Начать инвентаризацию
          </Button>
        </Card>
      ) : (
        <>
          {/* Кнопки управления */}
          <Card style={{ marginBottom: '16px' }}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleResetInventory}
              >
                Сбросить инвентаризацию
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadPDF}
              >
                Скачать PDF
              </Button>
              <Button
                icon={<SaveOutlined />}
                onClick={handleSaveInventory}
              >
                Сохранить инвентаризацию
              </Button>
              <Button
                icon={<FileTextOutlined />}
                onClick={handleShowReports}
              >
                Отчеты
              </Button>
              <Button
                icon={<FolderOutlined />}
                onClick={() => setShowSavedInventories(true)}
              >
                Сохраненные
              </Button>
            </Space>
          </Card>

          {/* Статистика */}
          <Row gutter={16} style={{ marginBottom: '16px' }}>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Пикнуто"
                  value={stats.totalPicked}
                  precision={0}
                  valueStyle={{ color: '#52c41a' }}
                  suffix="₽"
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="По факту"
                  value={stats.totalActual}
                  precision={0}
                  valueStyle={{ color: '#1890ff' }}
                  suffix="₽"
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Разница"
                  value={stats.difference}
                  precision={0}
                  valueStyle={{ color: stats.difference >= 0 ? '#52c41a' : '#ff4d4f' }}
                  suffix="₽"
                />
              </Card>
            </Col>
          </Row>

          {/* Блок поиска серийных номеров и штрихкодов */}
          <Card title="🔍 Поиск серийных номеров и штрихкодов" style={{ marginBottom: '16px' }}>
            <Row gutter={16} align="middle">
              <Col span={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>Серийный номер или штрихкод:</Text>
                  <Search
                    ref={searchInputRef}
                    placeholder="Введите серийный номер или штрихкод"
                    value={searchValue}
                    onChange={handleInputChange}
                    onSearch={handleSearchItem}
                    onPressEnter={() => handleSearchItem(searchValue)}
                    enterButton={isSearching ? <SearchOutlined spin /> : <BarcodeOutlined />}
                    size="large"
                    allowClear
                    autoFocus
                    loading={isSearching}
                  />
                </Space>
              </Col>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Найдено: {inventoryItems.filter(item => item.pickedQuantity > 0).length} |
                  Полностью: {inventoryItems.filter(item => item.pickedQuantity === item.actualQuantity && item.actualQuantity > 0).length} |
                  Превышено: {inventoryItems.filter(item => item.pickedQuantity > item.actualQuantity).length}
                </Text>
              </Col>
              <Col span={4}>
                <Text type="secondary" style={{ fontSize: '10px' }}>
                  💡 Отсканируйте штрихкод или введите серийный номер товара для увеличения количества пикнутого товара
                </Text>
              </Col>
            </Row>
            
            {searchResult && (
              <Alert
                message="Товар найден!"
                description={
                  <div>
                    <div><strong>{searchResult.productName}</strong></div>
                    <div>Поставщик: {searchResult.supplier}</div>
                    <div>Количество увеличено на 1</div>
                  </div>
                }
                type="success"
                showIcon
                style={{ marginTop: '16px' }}
              />
            )}
          </Card>

          {/* Таблица товаров */}
          <Card>
            <Table
              columns={columns}
              dataSource={inventoryItems}
              rowKey="id"
              scroll={{ x: 700 }}
              size="small"
              pagination={{
                pageSize: pageSize,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `Всего ${total} товаров`,
                pageSizeOptions: ['10', '20', '50', '100', '200', '500'],
                onShowSizeChange: handlePageSizeChange
              }}
              style={{ fontSize: '12px' }}
            />
          </Card>

          {/* Кнопка формирования отчета */}
          <Card style={{ marginTop: '16px', textAlign: 'center' }}>
            <Button
              type="primary"
              size="large"
              icon={<CalculatorOutlined />}
              onClick={handleGenerateReport}
            >
              Сформировать отчет
            </Button>
          </Card>
        </>
      )}

      {/* Модальное окно настроек */}
      <Modal
        title="Настройки инвентаризации"
        open={settingsModalVisible}
        onOk={handleSettingsOk}
        onCancel={() => setSettingsModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="inventoryType"
            label="Тип инвентаризации"
            initialValue="all"
          >
            <Select
              onChange={(value) => {
                if (value === 'technoline') {
                  // Режим "наш товар" - автоматически настраиваем все
                  setIsTechnolineMode(true);
                  
                  // Автоматически выбираем поставщиков технолайн
                  const technolineSuppliers = suppliers
                    .filter(s => s.name.toLowerCase().includes('технолайн'))
                    .map(s => s._id);
                  
                  // Устанавливаем значения формы
                  form.setFieldsValue({ 
                    suppliers: technolineSuppliers,
                    includeAllProducts: true,
                    includeAccessories: true
                  });
                  setSelectedSuppliersCount(technolineSuppliers.length);
                  
                  // Сохраняем состояние
                  saveInventoryState();
                } else {
                  // Режим "вся точка" - возвращаем обычное состояние
                  setIsTechnolineMode(false);
                  
                  // Для "вся точка" оставляем текущий выбор
                  const currentSuppliers = form.getFieldValue('suppliers') || [];
                  if (currentSuppliers.length === 0) {
                    // Если ничего не выбрано, выбираем всех
                    const allSupplierIds = suppliers.map(s => s._id);
                    form.setFieldsValue({ suppliers: allSupplierIds });
                    setSelectedSuppliersCount(allSupplierIds.length);
                  }
                  
                  // Сохраняем состояние
                  saveInventoryState();
                }
              }}
            >
              <Option value="all">Вся точка</Option>
              <Option value="technoline">Только наш товар</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="includeAllProducts"
            valuePropName="checked"
            initialValue={true}
          >
            <Checkbox 
              disabled={isTechnolineMode}
              onChange={() => saveInventoryState()}
            >
              Весь товар
            </Checkbox>
          </Form.Item>

          <Form.Item
            name="includeAccessories"
            valuePropName="checked"
            initialValue={true}
          >
            <Checkbox 
              disabled={isTechnolineMode}
              onChange={() => saveInventoryState()}
            >
              Аксессуары
            </Checkbox>
          </Form.Item>

          {isTechnolineMode && (
            <Alert
              message="Режим 'Наш товар'"
              description="Автоматически выбраны все товары и аксессуары от поставщика Технолайн (услуги исключены)"
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          )}

          <Form.Item
            name="suppliers"
            label={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Поставщики</span>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Выбрано: {selectedSuppliersCount} из {suppliers.length}
                </Text>
              </div>
            }
            rules={[{ required: true, message: 'Выберите поставщиков' }]}
          >
            <div>
              <div style={{ marginBottom: '8px' }}>
                <Button
                  type="link"
                  size="small"
                  disabled={isTechnolineMode}
                  onClick={() => {
                    const allSupplierIds = suppliers.map(s => s._id);
                    form.setFieldsValue({ suppliers: allSupplierIds });
                    setSelectedSuppliersCount(allSupplierIds.length);
                    
                    // Сохраняем состояние
                    saveInventoryState();
                  }}
                >
                  Выбрать всех
                </Button>
                <Button
                  type="link"
                  size="small"
                  disabled={isTechnolineMode}
                  onClick={() => {
                    form.setFieldsValue({ suppliers: [] });
                    setSelectedSuppliersCount(0);
                    
                    // Сохраняем состояние
                    saveInventoryState();
                  }}
                  style={{ marginLeft: '8px' }}
                >
                  Очистить
                </Button>
              </div>
              <Select
                mode="multiple"
                placeholder={isTechnolineMode ? "Автоматически выбрано: Технолайн" : "Выберите поставщиков"}
                showSearch={!isTechnolineMode}
                disabled={isTechnolineMode}
                onChange={(values) => {
                  setSelectedSuppliersCount(values.length);
                  
                  // Сохраняем состояние
                  saveInventoryState();
                }}
                filterOption={(input, option) =>
                  (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {suppliers.map(supplier => (
                  <Option key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </Option>
                ))}
              </Select>
            </div>
          </Form.Item>
                  </Form>
        </Modal>

        {/* Модальное окно сохраненных инвентаризаций */}
        <Modal
          title="Сохраненные инвентаризации"
          open={showSavedInventories}
          onCancel={() => setShowSavedInventories(false)}
          footer={null}
          width={800}
        >
          {savedInventories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Text type="secondary">Сохраненных инвентаризаций нет</Text>
            </div>
          ) : (
            <div>
              {savedInventories.map((inventory) => (
                <Card
                  key={inventory.id}
                  style={{ marginBottom: '12px' }}
                  size="small"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{inventory.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {new Date(inventory.date).toLocaleDateString('ru-RU')} {new Date(inventory.date).toLocaleTimeString('ru-RU')}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Товаров: {inventory.items.length} | 
                        Пикнуто: {inventory.totalPicked.toLocaleString('ru-RU')} ₽ | 
                        По факту: {inventory.totalActual.toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                    <Space>
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => handleLoadInventory(inventory)}
                      >
                        Продолжить
                      </Button>
                      <Button
                        danger
                        size="small"
                        onClick={() => handleDeleteInventory(inventory.id)}
                      >
                        Удалить
                      </Button>
                    </Space>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Modal>

        {/* Модальное окно отчетов */}
        <Modal
          title="Отчеты инвентаризации"
          open={showReports}
          onCancel={() => setShowReports(false)}
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button 
                danger 
                onClick={handleClearAllReports}
                disabled={inventoryReports.length === 0}
              >
                Очистить все отчеты
              </Button>
              <Button onClick={() => setShowReports(false)}>
                Закрыть
              </Button>
            </div>
          }
          width={1000}
        >
          {inventoryReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Text type="secondary">Отчетов инвентаризации нет</Text>
            </div>
          ) : (
            <div>
              {inventoryReports.map((report) => (
                <Card
                  key={report.id}
                  style={{ marginBottom: '16px' }}
                  size="small"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{report.name}</div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        {new Date(report.date).toLocaleDateString('ru-RU')} {new Date(report.date).toLocaleTimeString('ru-RU')}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        Создал: {report.createdBy}
                      </div>
                      
                      {/* Статистика отчета */}
                      <Row gutter={16} style={{ marginTop: '12px' }}>
                        <Col span={6}>
                          <Card size="small" style={{ backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}>
                            <Statistic
                              title="Совпадающие"
                              value={report.matchedItems.length}
                              suffix={`шт.`}
                              valueStyle={{ color: '#52c41a' }}
                            />
                          </Card>
                        </Col>
                        <Col span={6}>
                          <Card size="small" style={{ backgroundColor: '#e6f7ff', borderColor: '#91d5ff' }}>
                            <Statistic
                              title="Частично"
                              value={(() => {
                                const partialItems = inventoryItems.filter(item => 
                                  item.pickedQuantity > 0 && 
                                  item.pickedQuantity < item.actualQuantity &&
                                  !report.matchedItems.some(matched => matched.id === item.id) &&
                                  !report.missingItems.some(missing => missing.id === item.id)
                                );
                                return partialItems.length;
                              })()}
                              suffix="шт."
                              valueStyle={{ color: '#1890ff' }}
                            />
                          </Card>
                        </Col>
                        <Col span={6}>
                          <Card size="small" style={{ backgroundColor: '#fff1f0', borderColor: '#ffa39e' }}>
                            <Statistic
                              title="Превышения"
                              value={report.excessItems ? report.excessItems.length : 0}
                              suffix="шт."
                              valueStyle={{ color: '#ff4d4f' }}
                            />
                          </Card>
                        </Col>
                        <Col span={6}>
                          <Card size="small" style={{ backgroundColor: '#fff2e8', borderColor: '#ffbb96' }}>
                            <Statistic
                              title="Отсутствующие"
                              value={report.missingItems.length}
                              suffix="шт."
                              valueStyle={{ color: '#fa8c16' }}
                            />
                          </Card>
                        </Col>
                      </Row>
                      
                      {/* Суммы */}
                      <Row gutter={16} style={{ marginTop: '8px' }}>
                        <Col span={8}>
                          <div style={{ fontSize: '11px', color: '#666', textAlign: 'center' }}>
                            Совпадающие: {report.totalMatched.toLocaleString('ru-RU')} ₽
                          </div>
                        </Col>
                        <Col span={8}>
                          <div style={{ fontSize: '11px', color: '#666', textAlign: 'center' }}>
                            Превышения: {report.totalExcess ? report.totalExcess.toLocaleString('ru-RU') : 0} ₽
                          </div>
                        </Col>
                        <Col span={8}>
                          <div style={{ fontSize: '11px', color: '#666', textAlign: 'center' }}>
                            Отсутствующие: {report.totalMissing.toLocaleString('ru-RU')} ₽
                          </div>
                        </Col>
                      </Row>

                      {/* Детали отчета */}
                      <div style={{ marginTop: '12px' }}>
                        <details style={{ fontSize: '12px' }}>
                          <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                            Детали отчета
                          </summary>
                          
                          {/* Совпадающие товары */}
                          {report.matchedItems.length > 0 && (
                            <div style={{ marginTop: '8px' }}>
                              <div style={{ fontWeight: 'bold', color: '#52c41a', marginBottom: '8px' }}>
                                ✅ Совпадающие товары ({report.matchedItems.length}):
                              </div>
                              <table style={{ 
                                width: '100%', 
                                borderCollapse: 'collapse', 
                                fontSize: '11px',
                                marginBottom: '12px'
                              }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#f6ffed', borderBottom: '1px solid #b7eb8f' }}>
                                    <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 'bold' }}>Товар</th>
                                    <th style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>Количество</th>
                                    <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 'bold' }}>Серийный номер</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {report.matchedItems.map((item, index) => (
                                    <tr key={index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                      <td style={{ padding: '4px 6px' }}>{item.productName}</td>
                                      <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>
                                        <div>
                                          {item.pickedQuantity} / {item.actualQuantity}
                                          {item.pickedQuantity > item.actualQuantity && (
                                            <div style={{ 
                                              fontSize: '9px', 
                                              color: '#ff4d4f', 
                                              fontWeight: 'bold',
                                              marginTop: '2px'
                                            }}>
                                              Превышено на {item.pickedQuantity - item.actualQuantity}
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                      <td style={{ padding: '4px 6px', fontSize: '10px', color: '#666' }}>
                                        {item.serialNumbers && item.serialNumbers.length > 0 
                                          ? item.serialNumbers.join(', ')
                                          : item.barcode 
                                            ? `ШК: ${item.barcode}`
                                            : '-'
                                        }
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Частично найденные товары */}
                          {(() => {
                            const partialItems = inventoryItems.filter(item => 
                              item.pickedQuantity > 0 && 
                              item.pickedQuantity < item.actualQuantity &&
                              !report.matchedItems.some(matched => matched.id === item.id) &&
                              !report.missingItems.some(missing => missing.id === item.id)
                            );
                            
                            return partialItems.length > 0 && (
                              <div style={{ marginTop: '8px' }}>
                                <div style={{ fontWeight: 'bold', color: '#1890ff', marginBottom: '8px' }}>
                                  ⚠️ Частично найденные товары ({partialItems.length}):
                                </div>
                                <table style={{ 
                                  width: '100%', 
                                  borderCollapse: 'collapse', 
                                  fontSize: '11px',
                                  marginBottom: '12px'
                                }}>
                                  <thead>
                                    <tr style={{ backgroundColor: '#e6f7ff', borderBottom: '1px solid #91d5ff' }}>
                                      <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 'bold' }}>Товар</th>
                                      <th style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>Количество</th>
                                      <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 'bold' }}>Серийный номер</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {partialItems.map((item, index) => (
                                      <tr key={index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                        <td style={{ padding: '4px 6px' }}>{item.productName}</td>
                                        <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>
                                          <div>
                                            {item.pickedQuantity} / {item.actualQuantity}
                                            {item.pickedQuantity > item.actualQuantity && (
                                              <div style={{ 
                                                fontSize: '9px', 
                                                color: '#ff4d4f', 
                                                fontWeight: 'bold',
                                                marginTop: '2px'
                                              }}>
                                                Превышено на {item.pickedQuantity - item.actualQuantity}
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                        <td style={{ padding: '4px 6px', fontSize: '10px', color: '#666' }}>
                                          {item.serialNumbers && item.serialNumbers.length > 0 
                                            ? item.serialNumbers.join(', ')
                                            : item.barcode 
                                              ? `ШК: ${item.barcode}`
                                              : '-'
                                          }
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })()}

                          {/* Товары с превышением */}
                          {(report.excessItems && report.excessItems.length > 0) && (
                            <div style={{ marginTop: '8px' }}>
                              <div style={{ fontWeight: 'bold', color: '#ff4d4f', marginBottom: '8px' }}>
                                ⚠️ Товары с превышением ({report.excessItems.length}):
                              </div>
                              <table style={{ 
                                width: '100%', 
                                borderCollapse: 'collapse', 
                                fontSize: '11px',
                                marginBottom: '12px'
                              }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#fff1f0', borderBottom: '1px solid #ffa39e' }}>
                                    <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 'bold' }}>Товар</th>
                                    <th style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>Количество</th>
                                    <th style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>Превышение</th>
                                    <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 'bold' }}>Серийный номер</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {report.excessItems.map((item, index) => (
                                    <tr key={index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                      <td style={{ padding: '4px 6px' }}>{item.productName}</td>
                                      <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>
                                        {item.pickedQuantity} / {item.actualQuantity}
                                      </td>
                                      <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 'bold', color: '#ff4d4f' }}>
                                        +{item.pickedQuantity - item.actualQuantity}
                                      </td>
                                      <td style={{ padding: '4px 6px', fontSize: '10px', color: '#666' }}>
                                        {item.serialNumbers && item.serialNumbers.length > 0 
                                          ? item.serialNumbers.join(', ')
                                          : item.barcode 
                                            ? `ШК: ${item.barcode}`
                                            : '-'
                                        }
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Отсутствующие товары */}
                          {report.missingItems.length > 0 && (
                            <div style={{ marginTop: '8px' }}>
                              <div style={{ fontWeight: 'bold', color: '#fa8c16', marginBottom: '8px' }}>
                                ❌ Отсутствующие товары ({report.missingItems.length}):
                              </div>
                              <table style={{ 
                                width: '100%', 
                                borderCollapse: 'collapse', 
                                fontSize: '11px',
                                marginBottom: '12px'
                              }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#fff2e8', borderBottom: '1px solid #ffbb96' }}>
                                    <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 'bold' }}>Товар</th>
                                    <th style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>Количество</th>
                                    <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 'bold' }}>Серийный номер</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {report.missingItems.map((item, index) => (
                                    <tr key={index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                      <td style={{ padding: '4px 6px' }}>{item.productName}</td>
                                      <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>
                                        0 / {item.actualQuantity}
                                      </td>
                                      <td style={{ padding: '4px 6px', fontSize: '10px', color: '#666' }}>
                                        {item.serialNumbers && item.serialNumbers.length > 0 
                                          ? item.serialNumbers.join(', ')
                                          : item.barcode 
                                            ? `ШК: ${item.barcode}`
                                            : '-'
                                        }
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </details>
                      </div>
                    </div>
                    
                    <Space direction="vertical" style={{ marginLeft: '16px' }}>
                      {report.canDelete && (
                        <Button
                          danger
                          size="small"
                          onClick={() => handleDeleteReport(report.id)}
                        >
                          Удалить
                        </Button>
                      )}
                      {!report.canDelete && (
                        <Text type="secondary" style={{ fontSize: '10px' }}>
                          Только администратор/бухгалтер может удалить
                        </Text>
                      )}
                    </Space>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Modal>
      </div>
    );
  };

export default Inventory; 