import mongoose, { Document, Schema } from 'mongoose';

export interface IAdminAction extends Document {
  adminId: string;
  adminName: string;
  action: string;
  page: 'receipts' | 'debts' | 'arrivals' | 'suppliers' | 'payments';
  details: string;
  entityId?: string;
  entityName?: string;
  ip?: string;
  createdAt: Date;
}

const adminActionSchema = new Schema<IAdminAction>({
  adminId: {
    type: String,
    required: true
  },
  adminName: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  page: {
    type: String,
    enum: ['receipts', 'debts', 'arrivals', 'suppliers', 'payments'],
    required: true
  },
  details: {
    type: String,
    required: true
  },
  entityId: {
    type: String
  },
  entityName: {
    type: String
  },
  ip: {
    type: String
  }
}, {
  timestamps: true
});

// Индексы для оптимизации запросов
adminActionSchema.index({ createdAt: -1 });
adminActionSchema.index({ adminId: 1 });
adminActionSchema.index({ page: 1 });

export const AdminAction = mongoose.model<IAdminAction>('AdminAction', adminActionSchema); 