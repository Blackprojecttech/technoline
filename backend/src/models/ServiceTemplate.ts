import mongoose, { Document, Schema } from 'mongoose';

export interface IServiceTemplate extends Document {
  name: string;
  price: number;
  costPrice: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const serviceTemplateSchema = new Schema<IServiceTemplate>({
  name: {
    type: String,
    required: true,
    unique: true,
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
  createdBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Индексы
serviceTemplateSchema.index({ name: 1 }, { unique: true });
serviceTemplateSchema.index({ createdBy: 1 });

export const ServiceTemplate = mongoose.model<IServiceTemplate>('ServiceTemplate', serviceTemplateSchema); 