import mongoose, { Document, Schema } from 'mongoose';

export interface IReferral extends Document {
  referrerId: mongoose.Types.ObjectId; // ID реферера (кто привлек)
  referredUserId?: mongoose.Types.ObjectId; // ID привлеченного пользователя (если регистрировался)
  referralCode: string; // Уникальный код реферала
  referralUrl: string; // Полная реферальная ссылка
  clicks: number; // Количество кликов по ссылке
  registrations: number; // Количество регистраций по ссылке
  orders: number; // Количество заказов от привлеченных пользователей
  totalCommission: number; // Общая сумма комиссии
  pendingCommission: number; // Комиссия в ожидании (от заказов не в статусе "доставлен")
  availableCommission: number; // Доступная к выводу комиссия
  withdrawnCommission: number; // Выведенная комиссия
  lastClickDate?: Date; // Дата последнего клика
  createdAt: Date;
  updatedAt: Date;
}

export interface IReferralClick extends Document {
  referralId: mongoose.Types.ObjectId;
  referrerId: mongoose.Types.ObjectId;
  ip: string;
  userAgent: string;
  clickDate: Date;
  convertedToRegistration: boolean;
  registrationDate?: Date;
  convertedToOrder: boolean;
  orderId?: mongoose.Types.ObjectId;
  orderDate?: Date;
  orderAmount?: number;
  commission?: number;
  commissionPaid: boolean;
}

export interface IReferralWithdrawal extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  requestDate: Date;
  processedDate?: Date;
  paymentMethod: string;
  paymentDetails: string;
  notes?: string;
  processedBy?: mongoose.Types.ObjectId;
}

const referralSchema = new Schema<IReferral>({
  referrerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  referredUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  referralCode: { type: String, required: true, unique: true },
  referralUrl: { type: String, required: false, default: '' },
  clicks: { type: Number, default: 0 },
  registrations: { type: Number, default: 0 },
  orders: { type: Number, default: 0 },
  totalCommission: { type: Number, default: 0 },
  pendingCommission: { type: Number, default: 0 },
  availableCommission: { type: Number, default: 0 },
  withdrawnCommission: { type: Number, default: 0 },
  lastClickDate: { type: Date }
}, {
  timestamps: true
});

const referralClickSchema = new Schema<IReferralClick>({
  referralId: { type: Schema.Types.ObjectId, ref: 'Referral', required: true },
  referrerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  ip: { type: String, required: true },
  userAgent: { type: String },
  clickDate: { type: Date, default: Date.now },
  convertedToRegistration: { type: Boolean, default: false },
  registrationDate: { type: Date },
  convertedToOrder: { type: Boolean, default: false },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  orderDate: { type: Date },
  orderAmount: { type: Number },
  commission: { type: Number },
  commissionPaid: { type: Boolean, default: false }
}, {
  timestamps: true
});

const referralWithdrawalSchema = new Schema<IReferralWithdrawal>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'paid'], default: 'pending' },
  requestDate: { type: Date, default: Date.now },
  processedDate: { type: Date },
  paymentMethod: { type: String, required: true },
  paymentDetails: { type: String, required: true },
  notes: { type: String },
  processedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Индексы для оптимизации
referralSchema.index({ referrerId: 1 });
referralSchema.index({ referralCode: 1 });
referralClickSchema.index({ referralId: 1 });
referralClickSchema.index({ referrerId: 1 });
referralClickSchema.index({ ip: 1, referralId: 1 });
referralWithdrawalSchema.index({ userId: 1 });
referralWithdrawalSchema.index({ status: 1 });

export const Referral = mongoose.model<IReferral>('Referral', referralSchema);
export const ReferralClick = mongoose.model<IReferralClick>('ReferralClick', referralClickSchema);
export const ReferralWithdrawal = mongoose.model<IReferralWithdrawal>('ReferralWithdrawal', referralWithdrawalSchema); 