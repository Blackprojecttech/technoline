import mongoose, { Document, Schema } from 'mongoose';

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  costPrice: number; // Себестоимость товара на момент заказа
  quantity: number;
  image: string;
  sku: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  userId?: mongoose.Types.ObjectId;
  guestEmail?: string;
  guestPhone?: string;
  items: IOrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'with_courier';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: 'cash_on_delivery' | 'bank_card' | 'sberbank_transfer' | 'credit_purchase' | 'usdt_payment';
  deliveryMethod?: mongoose.Types.ObjectId;
  deliveryDate?: string; // 'today', 'tomorrow', 'day3'
  deliveryTime?: string; // 'HH:mm' - выбранное время доставки
  deliveryInterval?: string; // выбранный пользователем интервал доставки
  callRequest?: boolean; // Запрос звонка от клиента
  callStatus?: 'requested' | 'completed' | 'not_completed'; // Статус выполнения звонка
  shippingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode?: string;
    country: string;
  };
  billingAddress?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  notes?: string;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  cdekPvzAddress?: string;
  cdekPvzCode?: string; // Код ПВЗ CDEK
  cdekDeliveryDate?: string; // Ожидаемая дата доставки СДЭК
  callAttempts?: Array<{ date: Date; status: 'failed' | 'success' }>;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  costPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  image: {
    type: String,
    required: true
  },
  sku: {
    type: String,
    required: true
  }
});

const orderSchema = new Schema<IOrder>({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  guestEmail: {
    type: String,
    required: false
  },
  guestPhone: {
    type: String,
    required: false
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  shipping: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'with_courier'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: [
      'cash_on_delivery',
      'bank_card',
      'sberbank_transfer',
      'credit_purchase',
      'usdt_payment'
    ],
    required: true
  },
  deliveryMethod: {
    type: Schema.Types.ObjectId,
    ref: 'DeliveryMethod'
  },
  deliveryDate: {
    type: String,
    // enum убран, теперь можно сохранять любые значения (например, YYYY-MM-DD)
  },
  deliveryTime: {
    type: String,
    default: '',
  },
  deliveryInterval: {
    type: String,
    default: '',
  },
  shippingAddress: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, default: '' },
    country: { type: String, required: true }
  },
  billingAddress: {
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String }
  },
  notes: {
    type: String,
    maxlength: 1000
  },
  trackingNumber: {
    type: String
  },
  estimatedDelivery: {
    type: Date
  },
  cdekPvzAddress: {
    type: String,
    default: '',
  },
  cdekPvzCode: {
    type: String,
    default: '',
  },
  cdekDeliveryDate: {
    type: String,
    default: '',
  },
  callAttempts: [{
    date: { type: Date, required: true },
    status: { type: String, enum: ['failed', 'success'], required: true }
  }],
  callRequest: {
    type: Boolean,
    default: false
  },
  callStatus: {
    type: String,
    enum: ['requested', 'completed', 'not_completed'],
    default: 'requested'
  }
}, {
  timestamps: true
});

// Indexes
orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

// Generate order number before saving
orderSchema.pre('save', function(next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.orderNumber = `TL-${year}${month}${day}-${random}`;
  }
  next();
});

export const Order = mongoose.model<IOrder>('Order', orderSchema); 