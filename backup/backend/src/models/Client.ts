import mongoose, { Document, Schema } from 'mongoose';

export interface IClient extends Document {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  birthDate?: Date;
  notes?: string;
  totalOrders: number;
  totalSpent: number;
  status: 'active' | 'inactive' | 'blocked';
  lastOrderDate?: Date;
  discountPercent?: number;
  createdBy: string; // ID администратора
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<IClient>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  address: {
    type: String,
    trim: true
  },
  birthDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  totalOrders: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked'],
    default: 'active'
  },
  lastOrderDate: {
    type: Date
  },
  discountPercent: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  createdBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Индексы
clientSchema.index({ name: 1 });
clientSchema.index({ phone: 1 });
clientSchema.index({ email: 1 });
clientSchema.index({ status: 1 });
clientSchema.index({ createdBy: 1 });

export const Client = mongoose.model<IClient>('Client', clientSchema); 