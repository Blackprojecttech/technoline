import { message } from 'antd';
import { suppliersApi, arrivalsApi, receiptsApi, debtsApi, paymentsApi, clientsApi } from './baseApi';

// Утилита для миграции данных из localStorage в базу данных
export const migrateFromLocalStorage = async () => {
  try {
    let migrationCount = 0;
    const errors: string[] = [];

    // Миграция поставщиков
    const savedSuppliers = localStorage.getItem('suppliers');
    if (savedSuppliers) {
      try {
        const suppliers = JSON.parse(savedSuppliers);
        for (const supplier of suppliers) {
          try {
            const supplierData = {
              name: supplier.name,
              contactPerson: supplier.contactPerson || '',
              phone: supplier.phone || '',
              email: supplier.email || '',
              address: supplier.address || '',
              inn: supplier.inn || '',
              status: supplier.status || 'active',
              notes: supplier.notes || ''
            };
            await suppliersApi.create(supplierData);
            migrationCount++;
          } catch (error) {
            console.error('Error migrating supplier:', supplier.name, error);
            errors.push(`Поставщик: ${supplier.name}`);
          }
        }
        // После успешной миграции удаляем из localStorage
        localStorage.removeItem('suppliers');
        console.log(`✅ Migrated ${suppliers.length} suppliers`);
      } catch (error) {
        console.error('Error parsing suppliers from localStorage:', error);
      }
    }

    // Миграция приходов
    const savedArrivals = localStorage.getItem('arrivals');
    if (savedArrivals) {
      try {
        const arrivals = JSON.parse(savedArrivals);
        for (const arrival of arrivals) {
          try {
            // Преобразуем в формат API
            const arrivalData = {
              date: arrival.date || new Date().toISOString(),
              supplierId: arrival.supplierId,
              supplierName: arrival.supplierName || '',
              notes: arrival.notes || '',
              items: arrival.items || [],
              totalQuantity: arrival.totalQuantity || 0,
              totalValue: arrival.totalValue || 0
            };
            await arrivalsApi.create(arrivalData);
            migrationCount++;
          } catch (error) {
            console.error('Error migrating arrival:', arrival.id, error);
            errors.push(`Приход: ${arrival.id}`);
          }
        }
        localStorage.removeItem('arrivals');
        console.log(`✅ Migrated ${arrivals.length} arrivals`);
      } catch (error) {
        console.error('Error parsing arrivals from localStorage:', error);
      }
    }

    // Миграция чеков
    const savedReceipts = localStorage.getItem('receipts');
    if (savedReceipts) {
      try {
        const receipts = JSON.parse(savedReceipts);
        for (const receipt of receipts) {
          try {
            const receiptData = {
              date: receipt.date || new Date().toISOString(),
              customerName: receipt.clientName || '',
              customerPhone: receipt.customerPhone || '',
              customerEmail: receipt.customerEmail || '',
              items: receipt.items || [],
              subtotal: receipt.totalAmount || 0,
              discount: 0,
              tax: 0,
              total: receipt.totalAmount || 0,
              paymentMethod: receipt.payments?.[0]?.method || 'cash',
              deliveryMethod: receipt.deliveryMethod || '',
              deliveryCost: receipt.deliveryPrice || 0,
              status: receipt.status === 'completed' ? 'completed' : 'completed',
              notes: receipt.notes || ''
            };
            await receiptsApi.create(receiptData);
            migrationCount++;
          } catch (error) {
            console.error('Error migrating receipt:', receipt.receiptNumber, error);
            errors.push(`Чек: ${receipt.receiptNumber}`);
          }
        }
        localStorage.removeItem('receipts');
        console.log(`✅ Migrated ${receipts.length} receipts`);
      } catch (error) {
        console.error('Error parsing receipts from localStorage:', error);
      }
    }

    // Миграция долгов
    const savedDebts = localStorage.getItem('debts');
    if (savedDebts) {
      try {
        const debts = JSON.parse(savedDebts);
        for (const debt of debts) {
          try {
            const debtData = {
              arrivalId: debt.arrivalId || '',
              supplierId: debt.supplierId || '',
              supplierName: debt.supplierName || '',
              amount: debt.amount || 0,
              paidAmount: debt.paidAmount || 0,
              remainingAmount: debt.remainingAmount || debt.amount || 0,
              date: debt.date || new Date().toISOString(),
              dueDate: debt.dueDate,
              status: debt.status || 'active',
              notes: debt.notes || ''
            };
            await debtsApi.create(debtData);
            migrationCount++;
          } catch (error) {
            console.error('Error migrating debt:', debt.id, error);
            errors.push(`Долг: ${debt.id}`);
          }
        }
        localStorage.removeItem('debts');
        console.log(`✅ Migrated ${debts.length} debts`);
      } catch (error) {
        console.error('Error parsing debts from localStorage:', error);
      }
    }

    // Миграция платежей
    const savedPayments = localStorage.getItem('payments');
    if (savedPayments) {
      try {
        const payments = JSON.parse(savedPayments);
        for (const payment of payments) {
          try {
            const paymentData = {
              type: payment.type || 'expense',
              category: payment.category || 'Прочее',
              amount: payment.amount || 0,
              date: payment.date || new Date().toISOString(),
              description: payment.description || '',
              paymentMethod: payment.paymentMethod || 'cash',
              supplierId: payment.supplierId,
              supplierName: payment.supplierName || '',
              receiptId: payment.receiptId,
              debtId: payment.debtId,
              notes: payment.notes || ''
            };
            await paymentsApi.create(paymentData);
            migrationCount++;
          } catch (error) {
            console.error('Error migrating payment:', payment.id, error);
            errors.push(`Платеж: ${payment.id}`);
          }
        }
        localStorage.removeItem('payments');
        console.log(`✅ Migrated ${payments.length} payments`);
      } catch (error) {
        console.error('Error parsing payments from localStorage:', error);
      }
    }

    // Миграция клиентов
    const savedClients = localStorage.getItem('clients');
    if (savedClients) {
      try {
        const clients = JSON.parse(savedClients);
        for (const client of clients) {
          try {
            const clientData = {
              name: client.name || '',
              phone: client.phone || '',
              email: client.email || '',
              address: client.address || '',
              birthDate: client.birthDate,
              notes: client.notes || '',
              totalOrders: client.totalOrders || 0,
              totalSpent: client.totalSpent || 0,
              status: client.status || 'active',
              lastOrderDate: client.lastOrderDate,
              discountPercent: client.discountPercent || 0
            };
            await clientsApi.create(clientData);
            migrationCount++;
          } catch (error) {
            console.error('Error migrating client:', client.name, error);
            errors.push(`Клиент: ${client.name}`);
          }
        }
        localStorage.removeItem('clients');
        console.log(`✅ Migrated ${clients.length} clients`);
      } catch (error) {
        console.error('Error parsing clients from localStorage:', error);
      }
    }

    // Показываем результат
    if (migrationCount > 0) {
      message.success(`✅ Успешно перенесено ${migrationCount} записей в базу данных`);
    }

    if (errors.length > 0) {
      console.error('Migration errors:', errors);
      message.warning(`⚠️ Ошибки при переносе ${errors.length} записей. Подробности в консоли.`);
    }

    if (migrationCount === 0 && errors.length === 0) {
      message.info('ℹ️ Нет данных для переноса из localStorage');
    }

    return { migrationCount, errors };

  } catch (error) {
    console.error('Migration failed:', error);
    message.error('❌ Ошибка при переносе данных в базу');
    throw error;
  }
};

// Проверка наличия данных в localStorage для миграции
export const checkLocalStorageForMigration = (): boolean => {
  const keys = ['suppliers', 'arrivals', 'receipts', 'debts', 'payments', 'clients'];
  return keys.some(key => {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) && parsed.length > 0;
      } catch {
        return false;
      }
    }
    return false;
  });
}; 