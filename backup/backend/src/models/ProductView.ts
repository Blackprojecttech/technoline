import mongoose, { Document, Schema } from 'mongoose';

export interface IProductView extends Document {
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  viewedAt: Date;
  ip?: string;
  userAgent?: string;
}

const productViewSchema = new Schema<IProductView>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  viewedAt: {
    type: Date,
    default: Date.now
  },
  ip: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Индексы для быстрого поиска
productViewSchema.index({ userId: 1, productId: 1 });
productViewSchema.index({ userId: 1, viewedAt: -1 });
productViewSchema.index({ productId: 1, viewedAt: -1 });

export const ProductView = mongoose.model<IProductView>('ProductView', productViewSchema); 