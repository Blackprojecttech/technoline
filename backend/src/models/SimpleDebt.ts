import mongoose, { Document, Schema } from 'mongoose';

export interface ISimpleDebt extends Document {
  id: string;
  title: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  date: Date;
  dueDate?: Date;
  status: 'active' | 'partially_paid' | 'paid' | 'overdue';
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const simpleDebtSchema = new Schema<ISimpleDebt>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
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
  createdBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Индексы
simpleDebtSchema.index({ id: 1 }, { unique: true });
simpleDebtSchema.index({ status: 1 });
simpleDebtSchema.index({ date: -1 });
simpleDebtSchema.index({ dueDate: 1 });

export const SimpleDebt = mongoose.model<ISimpleDebt>('SimpleDebt', simpleDebtSchema); 