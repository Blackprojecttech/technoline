import mongoose, { Document, Schema } from 'mongoose';

export interface IReceiptItem {
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
}

export interface IPaymentPart {
  method: 'cash' | 'card' | 'transfer' | 'keb' | 'sber_transfer';
  amount: number;
  sberRecipient?: string;
  inCashRegister?: boolean; // Находится ли в кассе
  cashRegisterDate?: Date; // Дата поступления в кассу
}

export interface IReceipt extends Document {
  receiptNumber: string;
  date: Date;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: IReceiptItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'mixed';
  payments: IPaymentPart[]; // Массив платежей для интеграции с расчетами
  deliveryMethod?: string;
  deliveryCost?: number;
  status: 'completed' | 'cancelled' | 'refunded';
  notes?: string;
  createdBy: string; // ID администратора
  isDebt?: boolean; // Признак долга
  debtPaid?: boolean; // Признак оплаты долга
  createdAt: Date;
  updatedAt: Date;
}

const paymentPartSchema = new Schema<IPaymentPart>({
  method: {
    type: String,
    enum: ['cash', 'card', 'transfer', 'keb', 'sber_transfer'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  sberRecipient: {
    type: String,
    trim: true
  },
  inCashRegister: {
    type: Boolean,
    default: true // По умолчанию наличные попадают в кассу
  },
  cashRegisterDate: {
    type: Date
  }
});

const receiptItemSchema = new Schema<IReceiptItem>({
  arrivalId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  serialNumber: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  costPrice: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  isAccessory: {
    type: Boolean,
    default: false
  },
  isService: {
    type: Boolean,
    default: false
  },
  supplierId: {
    type: String
  },
  supplierName: {
    type: String,
    trim: true
  }
});

const receiptSchema = new Schema<IReceipt>({
  receiptNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  customerName: {
    type: String,
    trim: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  items: [receiptItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'transfer', 'mixed'],
    required: true
  },
  payments: [paymentPartSchema],
  deliveryMethod: {
    type: String
  },
  deliveryCost: {
    type: Number,
    min: 0
  },
  status: {
    type: String,
    enum: ['completed', 'cancelled', 'refunded'],
    default: 'completed'
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: String,
    required: true
  },
  isDebt: {
    type: Boolean,
    default: false
  },
  debtPaid: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Индексы
receiptSchema.index({ receiptNumber: 1 });
receiptSchema.index({ date: -1 });
receiptSchema.index({ customerPhone: 1 });
receiptSchema.index({ status: 1 });
receiptSchema.index({ createdBy: 1 });

export const Receipt = mongoose.model<IReceipt>('Receipt', receiptSchema); 