import mongoose, { Document, Schema } from 'mongoose';

interface IDebtItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  costPrice: number;
  isAccessory: boolean;
  isService?: boolean;
  serialNumbers?: string[];
  barcode?: string;
}

export interface IDebt extends Document {
  id: string;
  arrivalId: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  date: Date;
  dueDate?: Date;
  status: 'active' | 'partially_paid' | 'paid' | 'overdue';
  notes?: string;
  items: IDebtItem[];
  createdBy: string; // ID администратора
  createdAt: Date;
  updatedAt: Date;
}

const debtItemSchema = new Schema<IDebtItem>({
  productId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
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
  isAccessory: {
    type: Boolean,
    default: false
  },
  isService: {
    type: Boolean,
    default: false
  },
  serialNumbers: {
    type: [String],
    default: []
  },
  barcode: {
    type: String,
    trim: true
  }
});

const debtSchema = new Schema<IDebt>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  arrivalId: {
    type: String,
    required: true
  },
  supplierId: {
    type: String,
    required: true
  },
  supplierName: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  remainingAmount: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'partially_paid', 'paid', 'overdue'],
    default: 'active'
  },
  notes: {
    type: String,
    trim: true
  },
  items: [debtItemSchema],
  createdBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Индексы
debtSchema.index({ id: 1 }, { unique: true }); // Уникальный индекс для поля id
debtSchema.index({ supplierId: 1 });
debtSchema.index({ status: 1 });
debtSchema.index({ date: -1 });
debtSchema.index({ dueDate: 1 });
debtSchema.index({ createdBy: 1 });

export const Debt = mongoose.model<IDebt>('Debt', debtSchema); 