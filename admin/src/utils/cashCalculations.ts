export interface PaymentItem {
  id: string;
  mongoId?: string;
  type: 'cash' | 'transfer' | 'keb';
  amount: number;
  description: string;
  date: string;
  supplier?: string;
  orderId?: string;
  inCashRegister: boolean;
  cashRegisterDate?: string;
  notes?: string;
  createdAt: string;
  category?: string;
  paymentMethod?: string;
  apiType?: 'income' | 'expense';
  status?: 'active' | 'incassated';
  incassationDate?: string;
  adminName?: string;
}

export const calculateCashInRegister = (payments: PaymentItem[]): number => {
  const cashInRegister = payments.filter(p => {
    // Для наличных в кассе учитываем только платежи с inCashRegister: true
    // Это включает:
    // 1. Наличные доходы, которые в кассе (положительные)
    // 2. Переводы и КЭБ, которые помещены в кассу (преобразованы в наличные)
    // 3. Наличные расходы из кассы (отрицательные, включая оплату долгов)
    // 4. Инкассации (отрицательные)
    
    return p.inCashRegister;
  });

  return cashInRegister.reduce((sum, p) => sum + p.amount, 0);
}; 