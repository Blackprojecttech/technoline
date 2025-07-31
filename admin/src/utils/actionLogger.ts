interface ActionItem {
  id: string;
  adminName: string;
  action: string;
  page: 'receipts' | 'debts' | 'arrivals' | 'suppliers' | 'payments' | 'notifications' | 'orders';
  details: string;
  entityId?: string;
  entityName?: string;
  timestamp: string;
  ip?: string;
}

import { message } from 'antd';

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

// Логирование действия
export const logAction = async (
  action: string,
  page: ActionItem['page'],
  details: string,
  entityId?: string,
  entityName?: string
) => {
  try {
    // Отправляем действие на сервер
    const token = localStorage.getItem('admin_token');
    const baseUrl = import.meta.env.VITE_API_URL || 'https://technohubstore.net/api';
    const response = await fetch(`${baseUrl}/admin-actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action,
        page,
        details,
        entityId,
        entityName
      })
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    console.log(`📝 Действие "${action}" в разделе "${page}" сохранено в базе данных`);
  } catch (error) {
    console.error('❌ Ошибка при сохранении действия:', error);
    message.error('Не удалось сохранить действие. Попробуйте обновить страницу.');
  }
};

// Специфические функции для каждого раздела
export const logReceiptAction = (action: string, details: string, receiptNumber?: string, receipt?: any) => {
  let formattedDetails = details;

  if (receipt?.items?.length > 0) {
    formattedDetails += '\n\nТовары в чеке:';
    receipt.items.forEach((item: any, index: number) => {
      const typeText = item.isService ? 'Услуга' : (item.isAccessory ? 'Аксессуар' : 'Техника');
      formattedDetails += `\n${index + 1}. ${item.productName} (${typeText})`;
      
      if (item.serialNumber) {
        formattedDetails += `\n   S/N: ${item.serialNumber}`;
      }
      
      if (item.barcode) {
        formattedDetails += `\n   Штрихкод: ${item.barcode}`;
      }
      
      formattedDetails += `\n   Количество: ${item.quantity} шт.`;
      formattedDetails += `\n   Цена: ${(item.price || 0).toLocaleString('ru-RU')} ₽`;
      
      if (item.costPrice) {
        formattedDetails += `\n   Закупка: ${item.costPrice.toLocaleString('ru-RU')} ₽`;
      }
      
      const itemTotal = (item.price || 0) * (item.quantity || 1);
      formattedDetails += `\n   Сумма: ${itemTotal.toLocaleString('ru-RU')} ₽`;
    });
    
    // Добавляем информацию о скидке
    if (receipt.discountInfo && receipt.discountInfo.value > 0) {
      const discountType = receipt.discountInfo.type === 'percent' ? '%' : '₽';
      formattedDetails += `\n\nСкидка: ${receipt.discountInfo.value}${discountType}`;
    }
    
    // Добавляем информацию о доставке
    if (receipt.deliveryPrice && receipt.deliveryPrice > 0) {
      formattedDetails += `\n\nДоставка: ${receipt.deliveryPrice.toLocaleString('ru-RU')} ₽`;
    }
    
    // Добавляем итоговую сумму
    const subtotal = receipt.items.reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
    let discountAmount = 0;
    if (receipt.discountInfo && receipt.discountInfo.value > 0) {
      if (receipt.discountInfo.type === 'percent') {
        discountAmount = subtotal * (receipt.discountInfo.value / 100);
      } else {
        discountAmount = receipt.discountInfo.value;
      }
    }
    const total = subtotal - discountAmount + (receipt.deliveryPrice || 0);
    
    formattedDetails += `\n\nСумма товаров: ${subtotal.toLocaleString('ru-RU')} ₽`;
    if (discountAmount > 0) {
      formattedDetails += `\nСкидка: -${discountAmount.toLocaleString('ru-RU')} ₽`;
    }
    if (receipt.deliveryPrice && receipt.deliveryPrice > 0) {
      formattedDetails += `\nДоставка: +${receipt.deliveryPrice.toLocaleString('ru-RU')} ₽`;
    }
    formattedDetails += `\nИТОГО: ${total.toLocaleString('ru-RU')} ₽`;
    
    // Добавляем информацию о клиенте
    if (receipt.customerName) {
      formattedDetails += `\n\nКлиент: ${receipt.customerName}`;
    }
    if (receipt.customerPhone) {
      formattedDetails += `\nТелефон: ${receipt.customerPhone}`;
    }
  }

  logAction(action, 'receipts', formattedDetails, undefined, receiptNumber);
};

export const logDebtAction = (action: string, details: string, supplierName?: string) => {
  logAction(action, 'debts', details, undefined, supplierName);
};

export const logArrivalAction = (action: string, details: string, arrival?: any) => {
  let formattedDetails = details;

  if (arrival?.items?.length > 0) {
    formattedDetails += '\n\nТовары:';
    arrival.items.forEach((item: any, index: number) => {
      formattedDetails += `\n${index + 1}. ${item.productName} (${item.quantity} шт.)`;
      
      if (item.serialNumbers?.length > 0) {
        formattedDetails += `\n   S/N: ${item.serialNumbers.join(', ')}`;
      }
      
      if (item.barcode) {
        formattedDetails += `\n   Штрихкод: ${item.barcode}`;
      }
      
      formattedDetails += `\n   Цена: ${item.price.toLocaleString('ru-RU')} ₽`;
      formattedDetails += `\n   Закупка: ${item.costPrice.toLocaleString('ru-RU')} ₽`;
    });
    
    formattedDetails += `\n\nИтого: ${arrival.totalQuantity} шт. на сумму ${arrival.totalValue.toLocaleString('ru-RU')} ₽`;
  }

  logAction(action, 'arrivals', formattedDetails, arrival?.id, arrival?.supplierName);
};

export const logSupplierAction = (action: string, details: string, supplierName?: string) => {
  logAction(action, 'suppliers', details, undefined, supplierName);
};

export const logPaymentAction = (action: string, details: string, paymentId?: string) => {
  logAction(action, 'payments', details, paymentId, undefined);
}; 

export const logNotificationAction = (action: string, details: string, entityId?: string, entityName?: string) => {
  logAction(action, 'notifications', details, entityId, entityName);
};

export const logOrderAction = (action: string, details: string, entityId?: string, entityName?: string) => {
  logAction(action, 'orders', details, entityId, entityName);
}; 