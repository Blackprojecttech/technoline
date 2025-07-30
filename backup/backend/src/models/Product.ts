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
  characteristics?: Array<{
    characteristicId: mongoose.Types.ObjectId;
    value: string;
  }>;
  isDeleted: boolean;
  deletedAt: Date | null;
  isMainPage: boolean;
  isPromotion: boolean;
  isNewProduct: boolean;
  isBestseller: boolean;
  isFromDatabase: boolean;
  // Виртуальное поле
  isAccessory: boolean;
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
    required: false,
    default: 'Описание товара',
    maxlength: [50000, 'Описание не может быть длиннее 50000 символов']
  },
  shortDescription: {
    type: String,
    maxlength: [500, 'Краткое описание не может быть длиннее 500 символов']
  },
  price: {
    type: Number,
    required: false,
    min: [0, 'Цена не может быть отрицательной'],
    default: 0
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
    required: false,
    default: 'placeholder.jpg'
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
  },
  characteristics: [{
    characteristicId: { type: Schema.Types.ObjectId, ref: 'Characteristic', required: true },
    value: { type: String, required: true }
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  isMainPage: {
    type: Boolean,
    default: false
  },
  isPromotion: {
    type: Boolean,
    default: false
  },
  isNewProduct: {
    type: Boolean,
    default: false
  },
  isBestseller: {
    type: Boolean,
    default: false
  },
  isFromDatabase: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Добавляем виртуальное поле isAccessory
productSchema.virtual('isAccessory').get(function() {
  if (!this.categoryId) return false;
  // Проверяем, является ли категория или её родительская категория "Аксессуары"
  const category = this.categoryId as any;
  if (category.name && category.name.toLowerCase().includes('аксессуар')) return true;
  if (category.parentId && category.parentId.name && category.parentId.name.toLowerCase().includes('аксессуар')) return true;
  return false;
});

// Ensure virtual fields are serialized
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

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

export const Product = mongoose.model<IProduct>('Product', productSchema); 