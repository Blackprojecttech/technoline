import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  ymlId?: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  currency?: string;
  sku: string;
  barcode?: string;
  categoryId: mongoose.Types.ObjectId;
  images: string[];
  mainImage: string;
  isActive: boolean;
  isFeatured: boolean;
  inStock: boolean;
  isAvailable: boolean;
  stockQuantity: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  attributes?: Record<string, any>;
  specifications?: Array<{
    name: string;
    value: string;
  }>;
  tags: string[];
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>({
  ymlId: {
    type: String,
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    required: [true, 'Название товара обязательно'],
    trim: true,
    maxlength: [200, 'Название товара не может быть длиннее 200 символов']
  },
  slug: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    required: false
  },
  description: {
    type: String,
    required: [true, 'Описание товара обязательно'],
    maxlength: [5000, 'Описание не может быть длиннее 5000 символов']
  },
  shortDescription: {
    type: String,
    maxlength: [500, 'Краткое описание не может быть длиннее 500 символов']
  },
  price: {
    type: Number,
    required: [true, 'Цена обязательна'],
    min: [0, 'Цена не может быть отрицательной']
  },
  comparePrice: {
    type: Number,
    min: [0, 'Сравнительная цена не может быть отрицательной']
  },
  costPrice: {
    type: Number,
    min: [0, 'Себестоимость не может быть отрицательной']
  },
  currency: {
    type: String,
    default: 'RUR'
  },
  sku: {
    type: String,
    trim: true
  },
  barcode: {
    type: String,
    trim: true
  },
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Категория обязательна']
  },
  images: [{
    type: String,
    default: []
  }],
  mainImage: {
    type: String,
    required: [true, 'Главное изображение обязательно']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  inStock: {
    type: Boolean,
    default: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  stockQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Количество на складе не может быть отрицательным']
  },
  weight: {
    type: Number,
    min: [0, 'Вес не может быть отрицательным']
  },
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 }
  },
  attributes: {
    type: Schema.Types.Mixed,
    default: {}
  },
  specifications: [{
    name: { type: String, required: true },
    value: { type: String, required: true }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  metaTitle: {
    type: String,
    maxlength: [60, 'Meta title не может быть длиннее 60 символов']
  },
  metaDescription: {
    type: String,
    maxlength: [160, 'Meta description не может быть длиннее 160 символов']
  }
}, {
  timestamps: true
});

// Indexes
productSchema.index({ ymlId: 1 });
productSchema.index({ categoryId: 1 });
productSchema.index({ isActive: 1, isFeatured: 1 });
productSchema.index({ inStock: 1, isAvailable: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ name: 'text', description: 'text' });

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.comparePrice && this.comparePrice > this.price) {
    return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
  }
  return 0;
});

// Ensure virtual fields are serialized
productSchema.set('toJSON', { virtuals: true });

export const Product = mongoose.model<IProduct>('Product', productSchema); 