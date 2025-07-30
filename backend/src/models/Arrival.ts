import mongoose, { Document, Schema } from 'mongoose';

export interface IArrivalItem {
  productId: string;
  productName: string;
  quantity: number;
  serialNumbers: string[];
  barcode?: string;
  price: number;
  costPrice: number;
  isAccessory: boolean;
  isService?: boolean;
  supplierId?: string;
  supplierName?: string;
}

export interface IArrival extends Document {
  _id: mongoose.Types.ObjectId;
  date: Date;
  supplierId?: string;
  supplierName?: string;
  notes?: string;
  items: IArrivalItem[];
  totalQuantity: number;
  totalValue: number;
  createdBy: string; // ID администратора
  createdAt: Date;
  updatedAt: Date;
}

const arrivalItemSchema = new Schema<IArrivalItem>({
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
  serialNumbers: [{
    type: String,
    trim: true
  }],
  barcode: {
    type: String,
    trim: true
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
  supplierId: {
    type: String
  },
  supplierName: {
    type: String,
    trim: true
  }
});

const arrivalSchema = new Schema<IArrival>({
  date: {
    type: Date,
    required: true
  },
  supplierId: {
    type: String
  },
  supplierName: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  items: [arrivalItemSchema],
  totalQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  totalValue: {
    type: Number,
    required: true,
    min: 0
  },
  createdBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Индексы
arrivalSchema.index({ date: -1 });
arrivalSchema.index({ supplierId: 1 });
arrivalSchema.index({ createdBy: 1 });

export const Arrival = mongoose.model<IArrival>('Arrival', arrivalSchema); 