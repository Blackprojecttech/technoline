import mongoose, { Document, Schema } from 'mongoose';

export interface IClientRecord extends Document {
  id: string;
  clientName: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  date: Date;
  dueDate?: Date;
  status: 'active' | 'paid';
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isDebt: boolean; // Добавляем для совместимости с чеками
  debtPaid: boolean; // Добавляем для совместимости с чеками
}

const clientRecordSchema = new Schema<IClientRecord>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  clientName: {
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
    enum: ['active', 'paid'],
    default: 'active'
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
    default: true
  },
  debtPaid: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Индексы
clientRecordSchema.index({ id: 1 }, { unique: true });
clientRecordSchema.index({ clientName: 1 });
clientRecordSchema.index({ status: 1 });
clientRecordSchema.index({ date: -1 });
clientRecordSchema.index({ isDebt: 1 });
clientRecordSchema.index({ debtPaid: 1 });

// Пре-сейв хук для расчета remainingAmount
clientRecordSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('paidAmount')) {
    this.remainingAmount = this.amount - (this.paidAmount || 0);
    
    // Обновляем статус и debtPaid на основе remainingAmount
    if (this.remainingAmount <= 0) {
      this.status = 'paid';
      this.debtPaid = true;
    } else {
      this.status = 'active';
      this.debtPaid = false;
    }
  }
  next();
});

export const ClientRecord = mongoose.model<IClientRecord>('ClientRecord', clientRecordSchema); 