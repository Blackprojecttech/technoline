import { BaseApi } from '../utils/baseApi';

export interface DebtItem {
  _id?: string;
  arrivalId: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  date: string;
  dueDate: string;
  status: 'active' | 'partially_paid' | 'paid' | 'overdue';
  notes: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    costPrice: number;
    isAccessory: boolean;
    isService?: boolean;
  }[];
  createdBy: string;
}

class DebtsApi extends BaseApi {
  constructor() {
    super('debts');
  }

  // Методы pay и delete уже наследуются от BaseApi
}

export const debtsApi = new DebtsApi(); 